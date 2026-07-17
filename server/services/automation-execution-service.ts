/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

// automation-execution.service.ts - Enhanced with Conditions Support
import { db } from "../db";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { sql } from "drizzle-orm";
import {
  automations,
  automationNodes,
  automationExecutions,
  automationExecutionLogs,
  automationEdges,
  contacts,
  messages,
  templates,
  channels,
  groups,
} from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------------

// How long we consider a `message_received` automation "recently fired" for a
// given (automation, conversation) pair. While a completed run is inside this
// window, additional inbound messages from the same contact will NOT restart
// the same flow from the top. The pending-resume path (`hasPendingExecution`)
// is unaffected — a contact mid `user_reply` always resumes its paused run.
const MESSAGE_RECEIVED_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

// WhatsApp Cloud API hard limit for the `body.text` of an interactive
// (button/list) message. Sending a longer body produces error #131009 and
// the customer never sees the buttons at all. We truncate with an ellipsis
// and emit one WARN per truncation so operators can fix the source template.
const INTERACTIVE_BODY_MAX_CHARS = 1024;


const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";

function truncateInteractiveBody(
  text: string | undefined | null,
  nodeId?: string,
): string {
  const value = text ?? "";
  if (value.length <= INTERACTIVE_BODY_MAX_CHARS) return value;
  const truncated = value.slice(0, INTERACTIVE_BODY_MAX_CHARS - 1) + "…";
  console.warn(
    `[Automation] Interactive body length ${value.length} exceeds WhatsApp limit ${INTERACTIVE_BODY_MAX_CHARS}; truncated${
      nodeId ? ` (node ${nodeId})` : ""
    }`,
  );
  return truncated;
}

// Sentinel used by readMediaBuffer/uploadNodeMedia so callers can recognise
// the "operator deleted the upload" case and log a single concise WARN
// instead of dumping a full Node stack on every send. Any other I/O / S3
// failure still surfaces with its original error + stack.
const MEDIA_FILE_NOT_FOUND = "MEDIA_FILE_NOT_FOUND";
import { sendBusinessMessage } from "../services/messageService";
import { WhatsAppApiService } from "./whatsapp-api";
import { storage } from "server/storage";
import { resolvePublicOrigin } from "./public-origin";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

interface ExecutionContext {
  executionId: string;
  automationId: string;
  contactId?: string;
  conversationId?: string;
  variables: Record<string, any>;
  triggerData: any;
  lastUserMessage?: string; // Add this to track user input for conditions
  // Loop / hop guards (not persisted; live for one in-process run)
  _visitedNodes?: Set<string>;
  _hopCount?: number;
}

// Hard cap on the number of node executions in a single run. Protects
// against runaway flows even when no node id is revisited (e.g. nodes
// generated dynamically). Configurable via env.
const AUTOMATION_MAX_HOPS = parseInt(process.env.AUTOMATION_MAX_HOPS || "500", 10);

// Variable keys reserved for internal automation state. User-provided
// triggerData (or any other untrusted source) must not be allowed to
// overwrite these.
const RESERVED_VARIABLE_KEYS = new Set<string>([
  "executionId",
  "automationId",
  "contactId",
  "conversationId",
  "lastConditionResult",
  "matchedKeyword",
]);

/**
 * Strip variable keys that start with `_` (reserved for internal markers
 * such as `_userReply_*`) and any names in RESERVED_VARIABLE_KEYS.
 * Used whenever variables come from an untrusted source (req.body,
 * webhook payloads, trigger data).
 */
export function sanitizeAutomationVariables(input: unknown): Record<string, any> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(input as Record<string, any>)) {
    if (typeof key !== "string") continue;
    if (key.startsWith("_")) continue;
    if (RESERVED_VARIABLE_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out;
}

interface PendingExecution {
  executionId: string;
  automationId: string;
  nodeId: string;
  conversationId: string;
  contactId?: string;
  context: ExecutionContext;
  saveAs?: string;
  timestamp: Date;
  status: 'waiting_for_response';
  expectedButtons?: any[];
}

export class AutomationExecutionService {
  private pendingExecutions = new Map<string, PendingExecution>();

  /**
   * Start automation execution (called from your controller)
   */
  async executeAutomation(executionId: string) {
    console.log(`Starting execution: ${executionId}`);
    
    try {
      // Get execution record
      const execution = await db.query.automationExecutions.findFirst({
        where: eq(automationExecutions.id, executionId),
      });

      if (!execution) {
        throw new Error(`Execution ${executionId} not found`);
      }

      // Get automation with nodes and edges
      const automation = await this.getAutomationWithFlow(execution.automationId);
      if (!automation) {
        throw new Error(`Automation ${execution.automationId} not found`);
      }

      // Update execution count
      await db.update(automations)
        .set({ 
          executionCount: automation.executionCount !== null ? automation.executionCount + 1 : null,
          lastExecutedAt: new Date()
        })
        .where(eq(automations.id, execution.automationId));

      // Create execution context
      const triggerData = execution.triggerData ?? {};
      // Sanitize anything coming from triggerData before merging it into
      // `variables`. Strips `_`-prefixed (internal-marker) and reserved keys
      // so an untrusted caller cannot overwrite executionId / contactId /
      // user-reply markers / etc.
      const safeTriggerVars = sanitizeAutomationVariables(triggerData);

      // Hydrate the visited-node loop guard from the persisted `executionPath`
      // so resumes after a server restart (or any other context rebuild) keep
      // honoring the loop guard. Fresh executions start with an empty array
      // because the column defaults to `[]`.
      const persistedPath = Array.isArray(execution.executionPath)
        ? (execution.executionPath as string[])
        : [];

      const context: ExecutionContext = {
        executionId: execution.id,
        automationId: execution.automationId,
        contactId: execution.contactId ?? undefined,
        conversationId: execution.conversationId ?? undefined,
        variables: {
          contactId: execution.contactId ?? undefined,
          conversationId: execution.conversationId ?? undefined,
          ...safeTriggerVars,
        },
        _visitedNodes: new Set<string>(persistedPath),
        _hopCount: 0,
        triggerData,
        lastUserMessage:
          (execution.triggerData as { message?: { content?: string; text?: string } }).message
            ?.content ||
          (execution.triggerData as { message?: { content?: string; text?: string } }).message
            ?.text ||
          "",
    };

      // Get first node = no incoming edges from real (saved) nodes
      // The builder stores a virtual 'start' source in edges but not in nodes.
      // Filter to only edges where both source and target are real nodes,
      // then find the node that has no incoming real edge.
      const nodeIdSet = new Set(automation.nodes.map((n: any) => n.nodeId));
      const realEdges = automation.edges.filter(
        (e: any) => nodeIdSet.has(e.sourceNodeId) && nodeIdSet.has(e.targetNodeId)
      );
      const firstNode = automation.nodes.find(
        (n: any) => !realEdges.some((e: any) => e.targetNodeId === n.nodeId)
      );

      if (firstNode) {
        await this.executeNode(firstNode, automation, context);
      } else {
        await this.completeExecution(executionId, 'completed', 'No start node found');
      }

    } catch (error) {
      console.error(`Error executing automation ${executionId}:`, error);
      await this.completeExecution(executionId, 'failed',  (error as Error).message);
      throw error;
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(node: any, automation: any, context: ExecutionContext) {
    const startTime = new Date();
    console.log(`Executing node ${node.nodeId} (${node.type})`);

    // ── Loop / hop guards ──────────────────────────────────────────────
    // Initialise lazily so callers (e.g. saved-state continuations) that
    // build a fresh context don't have to remember to set these.
    if (!context._visitedNodes) context._visitedNodes = new Set<string>();
    if (typeof context._hopCount !== "number") context._hopCount = 0;

    context._hopCount += 1;
    if (context._hopCount > AUTOMATION_MAX_HOPS) {
      const msg = `execution_hop_limit_exceeded: ${context._hopCount} > ${AUTOMATION_MAX_HOPS}`;
      console.error(`[Automation] ${msg} (execution=${context.executionId})`);
      await this.logNodeExecution(
        context.executionId,
        node.nodeId,
        node.type,
        "failed",
        node.data,
        null,
        msg
      );
      await this.completeExecution(context.executionId, "failed", msg);
      throw new Error(msg);
    }

    if (context._visitedNodes.has(node.nodeId)) {
      const msg = `execution_loop_detected: node ${node.nodeId} revisited`;
      console.error(`[Automation] ${msg} (execution=${context.executionId})`);
      await this.logNodeExecution(
        context.executionId,
        node.nodeId,
        node.type,
        "failed",
        node.data,
        null,
        msg
      );
      await this.completeExecution(context.executionId, "failed", msg);
      throw new Error(msg);
    }
    context._visitedNodes.add(node.nodeId);

    // Persist the visited-node set so a pause/resume (or a server restart
    // mid-flow) doesn't reset the loop guard. We write the full set on every
    // transition; the set is bounded by AUTOMATION_MAX_HOPS so it stays small.
    await db.update(automationExecutions)
      .set({ executionPath: Array.from(context._visitedNodes) })
      .where(eq(automationExecutions.id, context.executionId));

    try {
      // Log node start
      await this.logNodeExecution(
        context.executionId,
        node.nodeId,
        node.type,
        'running',
        node.data,
        null,
        null
      );

      let result: any = null;

      // Execute based on node type
      switch (node.type) {
        case "start":
          result = { action: "flow_started" };
          break;
        case "custom_reply":
          result = await this.executeCustomReply(node, context);
          break;

        case "user_reply":
          result = await this.executeUserReply(node, context);
          break;

        case "time_gap":
          result = await this.executeTimeGap(node, context);
          return; // Time gap handles its own continuation

        case "send_template":
          result = await this.executeSendTemplate(node, context);
          break;

        case "assign_user":
          result = await this.executeAssignUser(node, context);
          break;

        case "conditions":
          result = await this.executeConditions(node, automation, context);
          return; // Conditions handle their own routing

        case "add_to_group":
          result = await this.executeAddToGroup(node, context);
          break;

        case "update_contact":
          result = await this.executeUpdateContact(node, context);
          break;

        case "set_variable":
          result = await this.executeSetVariable(node, context);
          break;

        case "send_location":
          result = await this.executeSendLocation(node, context);
          break;

        case "send_list_message":
          result = await this.executeSendListMessage(node, context);
          break;

        case "send_media":
          result = await this.executeSendMedia(node, context);
          break;

        case "mark_as_read":
          result = await this.executeMarkAsRead(node, context);
          break;

        case "webhook":
          result = await this.executeWebhook(node, context);
          break;

        case "end":
          result = { action: "flow_ended" };
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      // Log success
      await this.logNodeExecution(
        context.executionId,
        node.nodeId,
        node.type,
        'completed',
        node.data,
        result,
        null
      );

      if (result?.action === 'execution_paused') {
        console.log(`⏸️  Node ${node.nodeId} paused execution, not continuing to next node`);
        return;
      }

      // Continue to next node
      await this.continueToNextNode(node, automation, context);

    } catch (error) {
      console.error(`Error executing node ${node.nodeId}:`, error);
      
      // Log error
      await this.logNodeExecution(
        context.executionId,
        node.nodeId,
        node.type,
        'failed',
        node.data,
        null,
        (error as Error).message
      );

      // Fail the entire execution
      await this.completeExecution(context.executionId, 'failed', `Node ${node.nodeId} failed: ${ (error as Error).message}`);
      throw error;
    }
  }

  /**
   * Execute conditions node - NEW
   */

  // Normalize + basic stemming
private normalizeText(text: string = ""): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, "")   // remove emoji & symbols
    .replace(/\s+/g, " ")
    .trim();
}

private stemWord(word: string = ""): string {
  return word
    .replace(/ing$|ed$|s$/g, "")   // interest vs interested
    .trim();
}


  private async executeConditions(node: any, automation: any, context: ExecutionContext) {
    const conditionData = node.data;
    const conditionType = conditionData.conditionType || 'keyword';
    const matchType = conditionData.matchType || 'any';
    const keywords = conditionData.keywords || [];

    console.log(`🔍 Evaluating condition: ${conditionType}, match: ${matchType}, keywords: ${keywords.join(', ')}`);

    let conditionMet = false;
    let matchedKeyword = null;
    let userInput = context.lastUserMessage || '';



    // ✅ NORMALIZED INPUT
  const lowerInput = this.normalizeText(userInput);
  const lowerKeywords = keywords.map((k: string) =>
    this.normalizeText(k)
  );

    switch (conditionType) {

 case "keyword":
    if (matchType === "any") {
      conditionMet = lowerKeywords.some(k =>
        lowerInput.includes(k)
      );
    } 
    else if (matchType === "all") {
      conditionMet = lowerKeywords.every(k =>
        lowerInput.includes(k)
      );
    }
    else if (matchType === "exact") {
      conditionMet = lowerKeywords.includes(lowerInput);
    }
    break;

  // -------------------------
  // EQUALS (fuzzy safe)
  // -------------------------
  case "equals":
    conditionMet = lowerKeywords.some(k =>
      lowerInput === k ||
      this.stemWord(lowerInput) === this.stemWord(k)
    );

    matchedKeyword = conditionMet ? lowerInput : null;
    break;

  // -------------------------
  // STARTS WITH (fuzzy safe)
  // -------------------------
  case "starts_with":
    conditionMet = lowerKeywords.some(k =>
      lowerInput.startsWith(k) ||
      this.stemWord(lowerInput).startsWith(this.stemWord(k))
    );

    matchedKeyword = conditionMet
      ? lowerKeywords.find(k =>
          lowerInput.startsWith(k) ||
          this.stemWord(lowerInput).startsWith(this.stemWord(k))
        )
      : null;

    break;

  // -------------------------
  // CONTAINS (fuzzy safe)
  // -------------------------
  case "contains":
    conditionMet = lowerKeywords.some(k =>
      lowerInput.includes(k) ||
      this.stemWord(lowerInput).includes(this.stemWord(k))
    );

    matchedKeyword = conditionMet
      ? lowerKeywords.find(k =>
          lowerInput.includes(k) ||
          this.stemWord(lowerInput).includes(this.stemWord(k))
        )
      : null;

    break;

  // -------------------------
  // REGEX
  // -------------------------
  case "regex":
    try {
      const pattern = new RegExp(keywords[0] || "", "i");
      conditionMet = pattern.test(userInput);
      matchedKeyword = conditionMet ? keywords[0] : null;
    } catch {
      console.error("Invalid regex pattern:", keywords[0]);
    }
    break;

  // -------------------------
  // VARIABLE
  // -------------------------
  case "variable":
    const variableCondition = keywords[0] || "";
    conditionMet = this.evaluateVariableCondition(
      variableCondition,
      context.variables
    );
    matchedKeyword = conditionMet ? variableCondition : null;
    break;

  default:
    console.warn(`Unknown condition type: ${conditionType}`);
}


    // Update context with condition result
    context.variables.lastConditionResult = conditionMet;
    context.variables.matchedKeyword = matchedKeyword;

    const result = {
      conditionMet,
      matchedKeyword,
      userInput,
      conditionType,
      matchType,
      keywords
    };

    // Log condition evaluation
    await this.logNodeExecution(
      context.executionId,
      node.nodeId,
      node.type,
      'completed',
      conditionData,
      result,
      null
    );

    console.log(`🎯 Condition ${conditionMet ? 'MET' : 'NOT MET'}: "${matchedKeyword || 'none'}"`);

    // Route based on condition result
    await this.routeFromCondition(node, automation, context, conditionMet);

    return result;
  }

  /**
   * Route execution based on condition result
   */
  private async routeFromCondition(
    conditionNode: any, 
    automation: any, 
    context: ExecutionContext, 
    conditionMet: boolean
  ) {
    const outgoingEdges = automation.edges.filter(
      (e: any) => e.sourceNodeId === conditionNode.nodeId
    );

    if (outgoingEdges.length === 0) {
      console.log(`⚠️  No outgoing edges from condition node ${conditionNode.nodeId}`);
      await this.completeExecution(context.executionId, 'completed', 'Condition evaluated but no next steps defined');
      return;
    }

    const branchHandle = conditionMet ? 'condition-true' : 'condition-false';
    const branchLabel = conditionMet ? 'TRUE' : 'FALSE';

    let selectedEdge: any = null;

    selectedEdge = outgoingEdges.find((e: any) => e.sourceHandle === branchHandle);

    if (!selectedEdge) {
      const oppositeHandle = conditionMet ? 'condition-false' : 'condition-true';
      const labeledOpposite = outgoingEdges.find((e: any) => e.sourceHandle === oppositeHandle);
      const remaining = outgoingEdges.filter((e: any) => e !== labeledOpposite);

      if (remaining.length === 1) {
        selectedEdge = remaining[0];
      } else if (remaining.length > 1) {
        selectedEdge = conditionMet ? remaining[0] : remaining[1];
      } else {
        const unlabeled = outgoingEdges.filter((e: any) => !e.sourceHandle);
        selectedEdge = conditionMet ? unlabeled[0] : (unlabeled.length > 1 ? unlabeled[1] : null);
      }
    }

    if (!selectedEdge) {
      console.log(`🛑 Condition ${branchLabel}: No ${branchLabel} path defined, ending execution`);
      await this.completeExecution(context.executionId, 'completed', `Condition ${branchLabel} and no ${branchLabel} path`);
      return;
    }

    const nextNode = automation.nodes.find((n: any) => n.nodeId === selectedEdge.targetNodeId);

    if (nextNode) {
      console.log(`➡️  Condition ${branchLabel}: Following path to ${nextNode.type} node`);
      await this.executeNode(nextNode, automation, context);
    } else {
      console.warn(`Node ${selectedEdge.targetNodeId} not found for ${branchLabel} path`);
      await this.completeExecution(context.executionId, 'completed', `${branchLabel} path node not found`);
    }
  }

  /**
   * Evaluate variable-based conditions
   */
  private evaluateVariableCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // Replace variables in condition string
      const resolvedCondition = this.replaceVariables(condition, variables);
      
      // Simple evaluation for common patterns
      // Example: "{{contactName}} === 'John'" becomes "John === 'John'"
      // This is a basic implementation - you might want to use a proper expression evaluator
      
      if (resolvedCondition.includes('===')) {
        const [left, right] = resolvedCondition.split('===').map(s => s.trim().replace(/['"]/g, ''));
        return left === right;
      }
      
      if (resolvedCondition.includes('!==')) {
        const [left, right] = resolvedCondition.split('!==').map(s => s.trim().replace(/['"]/g, ''));
        return left !== right;
      }
      
      if (resolvedCondition.includes('contains')) {
        const [left, right] = resolvedCondition.split('contains').map(s => s.trim().replace(/['"]/g, ''));
        return left.toLowerCase().includes(right.toLowerCase());
      }
      
      // Default: check if resolved condition is truthy
      return Boolean(resolvedCondition);
      
    } catch (error) {
      console.error('Error evaluating variable condition:', error);
      return false;
    }
  }

  /**
   * Continue to next node(s) using edges
   */
  private async continueToNextNode(currentNode: any, automation: any, context: ExecutionContext) {
    // Get outgoing edges
    const outgoingEdges = automation.edges.filter(
      (e: any) => e.sourceNodeId === currentNode.nodeId
    );

    if (outgoingEdges.length === 0) {
      // No more nodes → execution complete
      await this.completeExecution(context.executionId, 'completed', 'All nodes executed successfully');
      return;
    }

    // Follow each edge
    for (const edge of outgoingEdges) {
      const nextNode = automation.nodes.find((n: any) => n.nodeId === edge.targetNodeId);
      if (nextNode) {
        await this.executeNode(nextNode, automation, context);
      }
    }
  }

  /**
   * Execute custom reply node
   */
  // private async executeCustomReply(node: any, context: ExecutionContext) {
  //   const message = this.replaceVariables(node.data.message || '', context.variables);
  //   console.log(`Sending message to conversation ${context.conversationId}: "${message}"`);

  //   const getContact = await db.query.contacts.findFirst({
  //     where: eq(contacts?.id, context.contactId),
  //   });

  //   if (getContact?.phone) {
  //     await sendBusinessMessage({
  //       to: getContact?.phone,
  //       message,
  //       channelId: getContact?.channelId,
  //     });
  //   }
    
  //   console.log(`✅ Message sent: ${message}`);
    
  //   return {
  //     action: 'message_sent',
  //     message,
  //     conversationId: context.conversationId
  //   };
  // }

  /**
   * Enhanced handleUserResponse to update context with user message for conditions
   */
  async handleUserResponse(conversationId: string, userResponse: string, interactiveData?: any) {
    console.log(`📨 Received user response for conversation ${conversationId}: "${userResponse}"`);
    
    // Find pending execution for this conversation
    const pendingExecution = this.findPendingExecutionByConversation(conversationId);
    if (!pendingExecution) {
      console.warn(`No pending execution found for conversation ${conversationId}`);
      return null;
    }

    try {
      // Remove from pending
      this.pendingExecutions.delete(pendingExecution.pendingId);
      
      // Process the response
      let processedResponse = userResponse;
      let selectedButtonId = null;
      
      // If this was a button click response
      if (interactiveData && interactiveData.type === 'button_reply') {
        selectedButtonId = interactiveData.button_reply.id;
        processedResponse = interactiveData.button_reply.title;
        console.log(`🔘 Button clicked: ${selectedButtonId} - "${processedResponse}"`);
      } else if (pendingExecution.expectedButtons && pendingExecution.expectedButtons.length > 0) {
        // Try to match text response to button options
        const matchedButton = this.matchTextToButton(userResponse, pendingExecution.expectedButtons);
        if (matchedButton) {
          selectedButtonId = matchedButton.id;
          processedResponse = matchedButton.text;
          console.log(`🎯 Matched text "${userResponse}" to button: ${selectedButtonId} - "${processedResponse}"`);
        }
      }
      
      // Update context with user response
      const context = pendingExecution.context;
      context.lastUserMessage = processedResponse; // ✅ Update for conditions
      
      if (pendingExecution.saveAs) {
        context.variables[pendingExecution.saveAs] = processedResponse;
        
        // Also save button ID if available
        if (selectedButtonId) {
          context.variables[`${pendingExecution.saveAs}_button_id`] = selectedButtonId;
        }
        
        console.log(`💾 Saved user response to variable: ${pendingExecution.saveAs} = "${processedResponse}"`);
      }

      // Log the response received
      await this.logNodeExecution(
        context.executionId,
        pendingExecution.nodeId,
        'user_reply',
        'completed',
        { question: 'User response received', interactiveData },
        { 
          userResponse: processedResponse, 
          selectedButtonId,
          savedAs: pendingExecution.saveAs 
        },
        null
      );

      delete context.variables._userReply_waiting;
      delete context.variables._userReply_nodeId;
      delete context.variables._userReply_saveAs;
      delete context.variables._userReply_expectedButtons;

      await db.update(automationExecutions)
        .set({
          status: 'running',
          result: null,
          variables: context.variables,
        })
        .where(eq(automationExecutions.id, context.executionId));

      console.log(`▶️  Resuming execution ${context.executionId} with user response`);

      // Get fresh automation data and continue
      const automation = await this.getAutomationWithFlow(context.automationId);
      if (!automation) {
        throw new Error(`Automation ${context.automationId} not found during resume`);
      }

      const currentNode = automation.nodes.find((n: any) => n.nodeId === pendingExecution.nodeId);
      if (currentNode) {
        await this.continueToNextNode(currentNode, automation, context);
      } else {
        throw new Error(`Node ${pendingExecution.nodeId} not found during resume`);
      }

      return {
        success: true,
        executionId: context.executionId,
        userResponse: processedResponse,
        selectedButtonId,
        savedVariable: pendingExecution.saveAs,
        resumedAt: new Date()
      };

    } catch (error) {
      console.error(`Error resuming execution for conversation ${conversationId}:`, error);
      
      await this.completeExecution(
        pendingExecution.executionId, 
        'failed', 
        `Failed to resume after user response: ${ (error as Error).message}`
      );
      
      throw error;
    }
  }


private async executeCustomReply(node: any, context: ExecutionContext) {
  const message = this.replaceVariables(node.data.message || '', context.variables);
  const nodeData = node.data;

  if (!context.contactId) {
    throw new Error('contactId is required for automation execution');
  }

  console.log(`Sending message to conversation ${context.conversationId}: "${message}"`);

  const getContact = await db.query.contacts.findFirst({
    where: eq(contacts.id, context.contactId),
  });

  if (!getContact?.phone) {
    throw new Error('Contact phone number not found');
  }

  let effectiveChannelId = getContact.channelId;
  if (!effectiveChannelId) {
    const [automationRow] = await db
      .select({ channelId: automations.channelId })
      .from(automations)
      .where(eq(automations.id, context.automationId))
      .limit(1);
    effectiveChannelId = automationRow?.channelId ?? null;
  }

  if (!effectiveChannelId) {
    throw new Error('No channelId found on contact or automation — cannot send message');
  }

  const hasMedia = nodeData.imageFile?.path || nodeData.videoFile?.path || nodeData.audioFile?.path || nodeData.documentFile?.path;
  const buttons = nodeData.buttons || [];

  if (hasMedia && buttons.length > 0) {
    await this.sendMediaWithButtons(getContact, nodeData, message, buttons, context, effectiveChannelId);
  } else if (hasMedia && buttons.length === 0) {
    try {
      await this.sendMediaMessage(getContact, nodeData, message, context, effectiveChannelId);
    } catch (error) {
      console.error('Error sending media message, falling back to text:', error);
      await sendBusinessMessage({
        to: getContact.phone,
        message: `${message}\n\n[Media file: ${this.getMediaFileName(nodeData)}]`,
        channelId: effectiveChannelId,
      });
    }
  } else if (!hasMedia && buttons.length > 0) {
    await this.sendInteractiveMessage(
      getContact.phone,
      message,
      buttons,
      effectiveChannelId,
      context.conversationId,
      node?.id
    );
  }

  if (buttons.length > 0) {
    const pendingId = `${context.executionId}_${node.nodeId}_${Date.now()}`;

    if (!context.conversationId) {
      throw new Error('conversationId is required to wait for user response');
    }

    const pendingExecution: PendingExecution = {
      executionId: context.executionId,
      automationId: context.automationId,
      nodeId: node.nodeId,
      conversationId: context.conversationId,
      contactId: context.contactId,
      context: { ...context },
      saveAs: node.data.saveAs,
      timestamp: new Date(),
      status: 'waiting_for_response',
      expectedButtons: buttons
    };

    this.pendingExecutions.set(pendingId, pendingExecution);

    await db.update(automationExecutions)
      .set({
        status: 'paused',
        currentNodeId: node.nodeId,
        variables: {
          ...context.variables,
          _userReply_waiting: true,
          _userReply_nodeId: node.nodeId,
          _userReply_saveAs: node.data.saveAs || null,
          _userReply_expectedButtons: buttons,
        },
        result: `Waiting for button response to: "${message}"`
      })
      .where(eq(automationExecutions.id, context.executionId));

    await this.logNodeExecution(
      context.executionId,
      node.nodeId,
      node.type,
      'waiting_for_response',
      { ...node.data, message, buttons },
      { pendingId, action: 'interactive_message_sent_waiting' },
      null
    );

    console.log(`✅ Interactive message sent: ${message} with ${buttons.length} buttons`);
    console.log(`⏸️  Execution paused. Waiting for button response (pending ID: ${pendingId})`);

    return {
      action: 'execution_paused',
      message,
      buttons,
      hasMedia,
      conversationId: context.conversationId,
      pendingId,
      saveAs: node.data.saveAs
    };
  } else if (!hasMedia) {
    await sendBusinessMessage({
      to: getContact.phone,
      message,
      channelId: effectiveChannelId,
    });
  }
  
  console.log(`✅ Message sent: ${message}`);
  
  return {
    action: 'message_sent',
    message,
    conversationId: context.conversationId,
    hasMedia
  };
}

private async sendMediaWithButtons(
  contact: any,
  nodeData: any,
  message: string,
  buttons: any[],
  context: ExecutionContext,
  channelId: string
) {
  const channel = await storage.getChannel(channelId);
  if (!channel) throw new Error(`Channel ${channelId} not found`);

  const whatsappApi = new WhatsAppApiService(channel);
  const formattedPhone = this.formatPhoneNumber(contact.phone);

  let mediaId: string | null = null;
  let mediaType: string | null = null;
  try {
    const uploaded = await this.uploadNodeMedia(nodeData, whatsappApi);
    if (uploaded) {
      mediaId = uploaded.mediaId;
      mediaType = uploaded.mediaType;
    }
  } catch (err: any) {
    if (err && err.code === MEDIA_FILE_NOT_FOUND) {
      // Operator-cleaned-up upload. Single concise WARN — the fallback
      // (buttons without media header) below still delivers the message.
      console.warn(
        `[Automation] Skipping media header — upload missing on disk (node ${nodeData?.id ?? '?'}): ${err.message}`,
      );
    } else {
      console.error('⚠️ Media upload failed, sending buttons without media header:', err);
    }
  }

  if (mediaId && mediaType === 'audio') {
    try {
      const audioPayload = {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "audio",
        audio: { id: mediaId },
      };
      const audioResp = await fetch(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${channel.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${channel.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(audioPayload)
        }
      );
      if (!audioResp.ok) {
        const audioErr = await audioResp.json();
        console.error('⚠️ Audio send API error:', audioErr);
      } else {
        console.log(`📤 Audio sent before buttons to ${contact.phone}`);
      }
    } catch (err) {
      console.error('⚠️ Audio send failed, continuing with buttons:', err);
    }
  }

  const actionButtons = buttons.slice(0, 3).map((btn: any, index: number) => ({
    type: "reply",
    reply: {
      id: btn.id || `btn_${index}`,
      title: btn.text?.substring(0, 20) || `Option ${index + 1}`
    }
  }));

  const interactive: any = {
    type: "button",
    body: {
      text: truncateInteractiveBody(
        message || "Please choose an option:",
        nodeData?.id,
      ),
    },
    action: { buttons: actionButtons },
  };

  if (mediaId && mediaType && mediaType !== 'audio') {
    interactive.header = {
      type: mediaType,
      [mediaType]: { id: mediaId },
    };
  }

  const payload = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "interactive",
    interactive,
  };

  const result = await this.sendInteractiveMessageDirect(whatsappApi, payload);

  const messageContent = `${message}\n\nOptions:\n${buttons.map((btn: any, i: number) => `${i + 1}. ${btn.text}`).join('\n')}`;
  if (context.conversationId) {
    const conversation = await storage.getConversation(context.conversationId);
    if (conversation) {
      const createdMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: messageContent,
        status: "sent",
        whatsappMessageId: result.messages?.[0]?.id,
        messageType: "interactive",
        metadata: JSON.stringify({
          buttons,
          interactiveType: "button",
          mediaType: mediaType || undefined,
          mediaId: mediaId || undefined,
        })
      });

      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        lastMessageText: message,
      });

      if ((global as any).broadcastToConversation) {
        (global as any).broadcastToConversation(conversation.id, {
          type: "new-message",
          message: createdMessage,
        });
      }
    }
  }

  console.log(`✅ Interactive message with ${mediaType || 'no'} media sent to ${contact.phone}`);
  return result;
}

private getMediaFileInfo(nodeData: any): { file: any; mediaType: string } | null {
  if (nodeData.imageFile?.path) return { file: nodeData.imageFile, mediaType: 'image' };
  if (nodeData.videoFile?.path) return { file: nodeData.videoFile, mediaType: 'video' };
  if (nodeData.audioFile?.path) return { file: nodeData.audioFile, mediaType: 'audio' };
  if (nodeData.documentFile?.path) return { file: nodeData.documentFile, mediaType: 'document' };
  return null;
}

private async readMediaBuffer(filePath: string): Promise<Buffer> {
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    const publicOrigin = await resolvePublicOrigin();
    const allowedHosts = [
      publicOrigin,
      process.env.DO_SPACES_BUCKET ? `${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_REGION}.digitaloceanspaces.com` : null,
      process.env.DO_SPACES_BUCKET ? `${process.env.DO_SPACES_REGION}.digitaloceanspaces.com` : null,
    ].filter(Boolean);

    if (allowedHosts.length === 0) {
      throw new Error(`Remote media URLs not allowed: public origin has not been captured yet and no cloud storage is configured`);
    }
    const parsed = new URL(filePath);
    const isAllowed = allowedHosts.some(h => {
      try { return new URL(h!).hostname === parsed.hostname; } catch { return h === parsed.hostname; }
    });
    if (!isAllowed) {
      throw new Error(`Media URL host not allowed: ${parsed.hostname}`);
    }

    const resp = await fetch(filePath);
    if (!resp.ok) throw new Error(`Failed to fetch media from ${filePath}: ${resp.status}`);
    return Buffer.from(await resp.arrayBuffer());
  }

  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  const publicUploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  const resolved = path.resolve(process.cwd(), cleanPath);

  if (!resolved.startsWith(uploadsRoot) && !resolved.startsWith(publicUploadsRoot)) {
    throw new Error(`Media path outside allowed directories: ${filePath}`);
  }
  if (!fs.existsSync(resolved)) {
    const err = new Error(`Media file not found on disk: ${resolved}`) as Error & { code?: string };
    err.code = MEDIA_FILE_NOT_FOUND;
    throw err;
  }
  try {
    return fs.readFileSync(resolved);
  } catch (e: any) {
    if (e && e.code === 'ENOENT') {
      const err = new Error(`Media file not found on disk: ${resolved}`) as Error & { code?: string };
      err.code = MEDIA_FILE_NOT_FOUND;
      throw err;
    }
    throw e;
  }
}

private async uploadNodeMedia(
  nodeData: any,
  whatsappApi: WhatsAppApiService
): Promise<{ mediaId: string; mediaType: string; file: any } | null> {
  const info = this.getMediaFileInfo(nodeData);
  if (!info) return null;

  const buffer = await this.readMediaBuffer(info.file.path);
  const mediaId = await whatsappApi.uploadMediaBuffer(
    buffer,
    info.file.mimetype,
    info.file.filename || 'media'
  );
  console.log(`📤 Uploaded ${info.mediaType} to Meta: mediaId=${mediaId}`);
  return { mediaId, mediaType: info.mediaType, file: info.file };
}

private async sendMediaMessage(contact: any, nodeData: any, caption: string, context: ExecutionContext, channelId?: string | null) {
  const resolvedChannelId = channelId || contact.channelId;
  const channel = await storage.getChannel(resolvedChannelId);
  if (!channel) {
    throw new Error(`Channel ${resolvedChannelId} not found`);
  }

  const whatsappApi = new WhatsAppApiService(channel);
  const formattedPhone = this.formatPhoneNumber(contact.phone);

  const uploaded = await this.uploadNodeMedia(nodeData, whatsappApi);
  if (!uploaded) {
    throw new Error('No media file found in node data');
  }

  const { mediaId, mediaType } = uploaded;
  let mediaPayload: any = {
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: mediaType,
  };

  if (mediaType === 'image') {
    mediaPayload.image = { id: mediaId, caption: caption || undefined };
  } else if (mediaType === 'video') {
    mediaPayload.video = { id: mediaId, caption: caption || undefined };
  } else if (mediaType === 'audio') {
    mediaPayload.audio = { id: mediaId };
    if (caption) {
      await this.sendTextMessage(whatsappApi, formattedPhone, caption);
    }
  } else if (mediaType === 'document') {
    mediaPayload.document = {
      id: mediaId,
      filename: nodeData.documentFile?.filename,
      caption: caption || undefined,
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${channel.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${channel.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mediaPayload)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('WhatsApp Media API Error:', error);
    throw new Error(error.error?.message || 'Failed to send media message');
  }

  const result = await response.json();
  await this.saveMediaMessage(contact, nodeData, caption, context, result);
  console.log(`✅ Media message sent successfully to ${contact.phone}`);
  return result;
}

/**
 * Enhanced executeUserReply with media support
 */
private async executeUserReply(node: any, context: ExecutionContext) {
  const question = this.replaceVariables(node.data.question || '', context.variables);
  const buttons = node.data.buttons || [];
  const nodeData = node.data;
  
  console.log(`Asking question to conversation ${context.conversationId}: "${question}"`);
  console.log('Question buttons:', buttons);
  
  // Get contact information
  const getContact = await db.query.contacts.findFirst({
    where: eq(contacts?.id!, context.contactId!),
  });

  if (!getContact?.phone) {
    throw new Error('Contact phone number not found');
  }

  const hasMedia = nodeData.imageFile?.path || nodeData.videoFile?.path || nodeData.audioFile?.path || nodeData.documentFile?.path;

  if (!getContact?.channelId) {
    throw new Error('channelId not found');
  }

  if (hasMedia && buttons.length > 0) {
    await this.sendMediaWithButtons(getContact, nodeData, question, buttons, context, getContact.channelId);
  } else if (hasMedia) {
    try {
      await this.sendMediaMessage(getContact, nodeData, question, context, getContact.channelId);
    } catch (error) {
      console.error('Error sending media in user_reply, falling back to text:', error);
      await sendBusinessMessage({
        to: getContact.phone,
        message: `${question}\n\n[Media file: ${this.getMediaFileName(nodeData)}]`,
        channelId: getContact.channelId,
        conversationId: context.conversationId,
      });
    }
  }

  if (buttons.length > 0 && !hasMedia) {
    await this.sendInteractiveMessage(
      getContact.phone,
      question,
      buttons,
      getContact.channelId,
      context.conversationId,
      node?.id
    );
  } else if (!hasMedia && buttons.length === 0) {
    await sendBusinessMessage({
      to: getContact.phone,
      message: question,
      channelId: getContact.channelId,
      conversationId: context.conversationId,
    });
  }
  
  // Create a unique pending execution ID
  const pendingId = `${context.executionId}_${node.nodeId}_${Date.now()}`;
  
  if (!context.conversationId) {
    throw new Error('conversationId is required to wait for user response');
  }
  // Store the execution state for resumption
  const pendingExecution: PendingExecution = {
    executionId: context.executionId,
    automationId: context.automationId,
    nodeId: node.nodeId,
    conversationId: context.conversationId,
    contactId: context.contactId,
    context: { ...context },
    saveAs: node.data.saveAs,
    timestamp: new Date(),
    status: 'waiting_for_response',
    expectedButtons: buttons
  };
  
  this.pendingExecutions.set(pendingId, pendingExecution);
  
  await db.update(automationExecutions)
    .set({
      status: 'paused',
      currentNodeId: node.nodeId,
      variables: {
        ...context.variables,
        _userReply_waiting: true,
        _userReply_nodeId: node.nodeId,
        _userReply_saveAs: node.data.saveAs || null,
        _userReply_expectedButtons: buttons,
      },
      result: `Waiting for user response to: "${question}"`
    })
    .where(eq(automationExecutions.id, context.executionId));
  
  // Log that we're waiting
  await this.logNodeExecution(
    context.executionId,
    node.nodeId,
    node.type,
    'waiting_for_response',
    { ...node.data, question, buttons, hasMedia },
    { pendingId, action: 'interactive_question_sent' },
    null
  );
  
  console.log(`✅ Interactive question sent: ${question} with ${buttons.length} buttons and media: ${hasMedia}`);
  console.log(`⏸️  Execution paused. Waiting for user response (pending ID: ${pendingId})`);
  
  return {
    action: 'execution_paused',
    question,
    buttons,
    hasMedia,
    conversationId: context.conversationId,
    pendingId,
    saveAs: node.data.saveAs
  };
}

/**
 * Helper method to send text message
 */
private async sendTextMessage(whatsappApi: any, to: string, message: string) {
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: message }
  };

  const response = await fetch(
    `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${whatsappApi.channel.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappApi.channel.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to send text message');
  }

  return await response.json();
}

/**
 * Convert relative media path to public URL.
 * NOTE: No longer used for outbound WhatsApp media delivery (see uploadNodeMedia).
 * Retained only for persisting display URLs in message records (saveMediaMessage).
 */
private async getPublicMediaUrl(relativePath: string): Promise<string> {
  const baseUrl = await resolvePublicOrigin();
  if (!baseUrl) {
    throw new Error(
      "Cannot build public media URL: public origin has not been captured yet. " +
        "An authenticated HTTP request must be observed before media URLs can be built."
    );
  }
  const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Save media message to database
 */
private async saveMediaMessage(
  contact: any, 
  nodeData: any, 
  caption: string, 
  context: ExecutionContext, 
  whatsappResult: any
) {
  try {
    // Determine message type and content
    let messageType = 'text';
    let messageContent = caption;
    let metadata: any = {};

    if (nodeData.imageFile) {
      messageType = 'image';
      metadata = {
        mediaType: 'image',
        mediaPath: nodeData.imageFile.path,
        fileName: nodeData.imageFile.filename,
        fileSize: nodeData.imageFile.size,
        mimeType: nodeData.imageFile.mimetype
      };
    } else if (nodeData.videoFile) {
      messageType = 'video';
      metadata = {
        mediaType: 'video',
        mediaPath: nodeData.videoFile.path,
        fileName: nodeData.videoFile.filename,
        fileSize: nodeData.videoFile.size,
        mimeType: nodeData.videoFile.mimetype
      };
    } else if (nodeData.audioFile) {
      messageType = 'audio';
      metadata = {
        mediaType: 'audio',
        mediaPath: nodeData.audioFile.path,
        fileName: nodeData.audioFile.filename,
        fileSize: nodeData.audioFile.size,
        mimeType: nodeData.audioFile.mimetype
      };
    } else if (nodeData.documentFile) {
      messageType = 'document';
      metadata = {
        mediaType: 'document',
        mediaPath: nodeData.documentFile.path,
        fileName: nodeData.documentFile.filename,
        fileSize: nodeData.documentFile.size,
        mimeType: nodeData.documentFile.mimetype
      };
    }

    // Find conversation
    if (!context.conversationId) {
      console.warn('No conversationId in context, cannot save media message');
      return;
    }
    const conversation = await storage.getConversation(context.conversationId);
    if (!conversation) {
      console.warn('Conversation not found for media message');
      return;
    }

    console.log(`Saving ${messageType} message to conversation ${conversation.id}`);

    // Create message record
    const createdMessage = await storage.createMessage({
      conversationId: conversation.id,
      content: messageContent,
      status: "sent",
      whatsappMessageId: whatsappResult.messages?.[0]?.id,
      messageType,
      metadata: JSON.stringify(metadata),
      mediaUrl: await this.getPublicMediaUrl(metadata.mediaPath || ''),
    });

    // Update conversation
    await storage.updateConversation(conversation.id, {
      lastMessageAt: new Date(),
      lastMessageText: messageContent || `[${messageType}]`,
    });

    // Broadcast to websocket
    if ((global as any).broadcastToConversation) {
      (global as any).broadcastToConversation(conversation.id, {
        type: "new-message",
        message: createdMessage,
      });
    }

  } catch (error) {
    console.error('Error saving media message to database:', error);
  }
}

/**
 * Get media file name for fallback messages
 */
private getMediaFileName(nodeData: any): string {
  if (nodeData.imageFile) return nodeData.imageFile.filename;
  if (nodeData.videoFile) return nodeData.videoFile.filename;
  if (nodeData.audioFile) return nodeData.audioFile.filename;
  if (nodeData.documentFile) return nodeData.documentFile.filename;
  return 'media file';
}

/**
 * Enhanced sendInteractiveMessage to handle media better
 */
private async sendInteractiveMessage(
  to: string, 
  question: string, 
  buttons: any[], 
  channelId: string, 
  conversationId?: string,
  nodeId?: string,
) {
  try {
    // Get channel information
    const channel = await storage.getChannel(channelId);
    if (!channel) {
      throw new Error(`Channel ${channelId} not found`);
    }

    // Create WhatsApp interactive message payload
    const interactivePayload = {
      messaging_product: "whatsapp",
      to: this.formatPhoneNumber(to),
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: truncateInteractiveBody(question, nodeId)
        },
        action: {
          buttons: buttons.slice(0, 3).map((btn, index) => ({
            type: "reply",
            reply: {
              id: btn.id || `btn_${index}`,
              title: btn.text?.substring(0, 20) || `Option ${index + 1}`
            }
          }))
        }
      }
    };

    // Send via WhatsApp API
    const whatsappApi = new WhatsAppApiService(channel);
    const result = await this.sendInteractiveMessageDirect(whatsappApi, interactivePayload);

    // Save the message to database
    const messageContent = `${question}\n\nOptions:\n${buttons.map((btn, i) => `${i + 1}. ${btn.text}`).join('\n')}`;
    
    // Find conversation
    const conversation = conversationId
      ? await storage.getConversation(conversationId)
      : await storage.getConversationByPhone(to);

    if (conversation) {
      // Save message
      const createdMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: messageContent,
        status: "sent",
        whatsappMessageId: result.messages?.[0]?.id,
        messageType: "interactive",
        metadata: JSON.stringify({ buttons, interactiveType: "button" })
      });

      // Update conversation
      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        lastMessageText: question,
      });

      // Broadcast to websocket
      if ((global as any).broadcastToConversation) {
        (global as any).broadcastToConversation(conversation.id, {
          type: "new-message",
          message: createdMessage,
        });
      }
    }

    console.log(`✅ Interactive message sent successfully to ${to}`);
    return result;

  } catch (error) {
    console.error('Error sending interactive message:', error);
    
    // Fallback to regular text message with numbered options
    console.log('📱 Falling back to text message with options...');
    const fallbackMessage = `${question}\n\nReply with:\n${buttons.map((btn, i) => `${i + 1}. ${btn.text}`).join('\n')}`;
    
    return await sendBusinessMessage({
      to,
      message: fallbackMessage,
      channelId,
      conversationId
    });
  }
}

  private async sendInteractiveMessageDirect(whatsappApi: any, payload: any) {
    // Last-mile clamp: any caller that hands us a payload with an
    // over-1024-char interactive body would otherwise hit Meta error
    // #131009 and the buttons never reach the customer.
    const body = payload?.interactive?.body;
    if (body && typeof body.text === 'string') {
      body.text = truncateInteractiveBody(body.text);
    }
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${whatsappApi.channel.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappApi.channel.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('WhatsApp API Error:', error);
      throw new Error(error.error?.message || 'Failed to send interactive message');
    }

    return await response.json();
  }

  private matchTextToButton(text: string, buttons: any[]) {
    const lowerText = text.toLowerCase().trim();
    
    // Direct text match
    let match = buttons.find(btn => btn.text.toLowerCase() === lowerText);
    if (match) return match;
    
    // Check if it's a number (1, 2, 3...)
    const numberMatch = lowerText.match(/^(\d+)$/);
    if (numberMatch) {
      const index = parseInt(numberMatch[1]) - 1;
      if (index >= 0 && index < buttons.length) {
        return buttons[index];
      }
    }
    
    // Partial text match
    match = buttons.find(btn => 
      btn.text.toLowerCase().includes(lowerText) || 
      lowerText.includes(btn.text.toLowerCase())
    );
    
    return match;
  }

  private formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned;
  }

  private findPendingExecutionByConversation(conversationId: string) {
    for (const [pendingId, execution] of this.pendingExecutions.entries()) {
      if (execution.conversationId === conversationId) {
        return { pendingId, ...execution };
      }
    }
    
    return null;
  }

  async findPendingExecutionByConversationFromDb(conversationId: string) {
    const exec = await db.query.automationExecutions.findFirst({
      where: and(
        eq(automationExecutions.status, 'paused'),
        eq(automationExecutions.conversationId, conversationId),
      ),
    });

    if (!exec) return null;
    const vars = (exec.variables as Record<string, any>) || {};
    if (!vars._userReply_waiting) return null;

    const nodeId = vars._userReply_nodeId as string;
    if (!nodeId) return null;

    const cleanVars = { ...vars };
    delete cleanVars._userReply_waiting;
    delete cleanVars._userReply_nodeId;
    delete cleanVars._userReply_saveAs;
    delete cleanVars._userReply_expectedButtons;

    const persistedPath = Array.isArray(exec.executionPath)
      ? (exec.executionPath as string[])
      : [];

    const context: ExecutionContext = {
      executionId: exec.id,
      automationId: exec.automationId,
      contactId: exec.contactId ?? undefined,
      conversationId: exec.conversationId ?? undefined,
      variables: cleanVars,
      _visitedNodes: new Set<string>(persistedPath),
      _hopCount: persistedPath.length,
      triggerData: exec.triggerData,
      lastUserMessage: (cleanVars._lastUserMessage as string) || '',
    };

    const pendingId = `${exec.id}_${nodeId}_db_recovery`;
    const pendingExecution: PendingExecution = {
      executionId: exec.id,
      automationId: exec.automationId,
      nodeId,
      conversationId,
      contactId: exec.contactId ?? undefined,
      context,
      saveAs: vars._userReply_saveAs || undefined,
      timestamp: exec.startedAt ?? new Date(),
      status: 'waiting_for_response',
      expectedButtons: vars._userReply_expectedButtons || [],
    };

    this.pendingExecutions.set(pendingId, pendingExecution);
    console.log(`[user_reply DB fallback] Re-registered execution ${exec.id} for conversation ${conversationId}`);
    return { pendingId, ...pendingExecution };
  }

  private async executeTimeGap(node: any, context: ExecutionContext, automation?: any) {
    const delay = node.data?.delay || 60;
    const resumeAt = new Date(Date.now() + delay * 1000);

    console.log(`⏳ Delaying execution by ${delay} seconds (until ${resumeAt.toISOString()})`);

    await db.update(automationExecutions)
      .set({
        status: 'paused',
        currentNodeId: node.nodeId,
        variables: {
          ...context.variables,
          _timeGap_waitingUntil: resumeAt.toISOString(),
          _timeGap_waitingNodeId: node.nodeId,
        },
        result: `time_gap: waiting ${delay}s until ${resumeAt.toISOString()}`,
      })
      .where(eq(automationExecutions.id, context.executionId));

    const continueAfterDelay = async () => {
      try {
        console.log(`⏰ Delay completed for execution ${context.executionId}, continuing`);

        // Run continuation first — markers remain in DB until after success.
        // If the server crashes before this returns, status='paused' + markers
        // are still present, so startup recovery will re-schedule correctly.
        const freshAutomation = await this.getAutomationWithFlow(context.automationId);
        await this.continueToNextNode(node, freshAutomation, context);

        // Continuation succeeded — clean up time_gap markers from DB variables.
        // context.variables has no markers (they were only stored in the DB copy).
        await db.update(automationExecutions)
          .set({ variables: context.variables })
          .where(eq(automationExecutions.id, context.executionId));
      } catch (error) {
        console.error('Error continuing after delay:', error);
        await this.completeExecution(context.executionId, 'failed', `Delay continuation failed: ${(error as Error).message}`);
      }
    };

    setTimeout(continueAfterDelay, delay * 1000);

    return {
      action: 'delay_started',
      delay,
      scheduledFor: resumeAt,
    };
  }

  async recoverTimeGapExecutions() {
    try {
      const pausedExecs = await db.query.automationExecutions.findMany({
        where: eq(automationExecutions.status, 'paused'),
      });

      const timeGapExecs = pausedExecs.filter((exec) => {
        const vars = (exec.variables as Record<string, any>) || {};
        return !!vars._timeGap_waitingUntil;
      });

      if (timeGapExecs.length === 0) return;

      console.log(`[time_gap recovery] Found ${timeGapExecs.length} paused time_gap execution(s) — scheduling resumption`);

      for (const exec of timeGapExecs) {
        const vars = (exec.variables as Record<string, any>) || {};
        const waitingUntil = vars._timeGap_waitingUntil as string;
        const waitingNodeId = vars._timeGap_waitingNodeId as string;

        if (!waitingUntil || !waitingNodeId) continue;

        const resumeAt = new Date(waitingUntil);
        const remainingMs = Math.max(0, resumeAt.getTime() - Date.now());

        const cleanVars = { ...vars };
        delete cleanVars._timeGap_waitingUntil;
        delete cleanVars._timeGap_waitingNodeId;

        const persistedPath = Array.isArray(exec.executionPath)
          ? (exec.executionPath as string[])
          : [];

        const context: ExecutionContext = {
          executionId: exec.id,
          automationId: exec.automationId,
          contactId: exec.contactId ?? undefined,
          conversationId: exec.conversationId ?? undefined,
          variables: cleanVars,
          _visitedNodes: new Set<string>(persistedPath),
          _hopCount: persistedPath.length,
          triggerData: exec.triggerData,
          lastUserMessage: (cleanVars._lastUserMessage as string) || '',
        };

        const resume = async () => {
          try {
            console.log(`⏰ [time_gap recovery] Resuming execution ${exec.id}`);

            const automation = await this.getAutomationWithFlow(exec.automationId);
            if (!automation) {
              await this.completeExecution(exec.id, 'failed', 'Automation not found during time_gap recovery');
              return;
            }

            const currentNode = automation.nodes.find((n: any) => n.nodeId === waitingNodeId);
            if (!currentNode) {
              await this.completeExecution(exec.id, 'failed', `Node ${waitingNodeId} not found during time_gap recovery`);
              return;
            }

            // Run continuation first — markers stay in DB until success.
            // If server crashes here, next boot recovery re-schedules safely.
            await this.continueToNextNode(currentNode, automation, context);

            // Continuation succeeded — remove time_gap markers from DB variables.
            await db.update(automationExecutions)
              .set({ variables: cleanVars })
              .where(eq(automationExecutions.id, exec.id));
          } catch (err) {
            console.error(`[time_gap recovery] Failed to resume execution ${exec.id}:`, err);
            await this.completeExecution(exec.id, 'failed', `time_gap recovery failed: ${(err as Error).message}`).catch(() => {});
          }
        };

        if (remainingMs === 0) {
          console.log(`[time_gap recovery] Execution ${exec.id} is past-due — resuming immediately`);
          void resume();
        } else {
          console.log(`[time_gap recovery] Execution ${exec.id} resumes in ${Math.round(remainingMs / 1000)}s`);
          setTimeout(resume, remainingMs);
        }
      }
    } catch (err) {
      console.error('[time_gap recovery] Error during startup recovery:', err);
    }
  }

  async recoverUserReplyExecutions() {
    try {
      const pausedExecs = await db.query.automationExecutions.findMany({
        where: eq(automationExecutions.status, 'paused'),
      });

      const userReplyExecs = pausedExecs.filter((exec) => {
        const vars = (exec.variables as Record<string, any>) || {};
        return !!vars._userReply_waiting;
      });

      if (userReplyExecs.length === 0) return;

      console.log(`[user_reply recovery] Found ${userReplyExecs.length} paused user_reply execution(s) — re-registering`);

      for (const exec of userReplyExecs) {
        const vars = (exec.variables as Record<string, any>) || {};
        const nodeId = vars._userReply_nodeId as string;

        if (!nodeId || !exec.conversationId) continue;

        const cleanVars = { ...vars };
        delete cleanVars._userReply_waiting;
        delete cleanVars._userReply_nodeId;
        delete cleanVars._userReply_saveAs;
        delete cleanVars._userReply_expectedButtons;

        const persistedPath = Array.isArray(exec.executionPath)
          ? (exec.executionPath as string[])
          : [];

        const context: ExecutionContext = {
          executionId: exec.id,
          automationId: exec.automationId,
          contactId: exec.contactId ?? undefined,
          conversationId: exec.conversationId ?? undefined,
          variables: cleanVars,
          _visitedNodes: new Set<string>(persistedPath),
          _hopCount: persistedPath.length,
          triggerData: exec.triggerData,
          lastUserMessage: (cleanVars._lastUserMessage as string) || '',
        };

        const pendingId = `${exec.id}_${nodeId}_recovered`;
        const pendingExecution: PendingExecution = {
          executionId: exec.id,
          automationId: exec.automationId,
          nodeId,
          conversationId: exec.conversationId,
          contactId: exec.contactId ?? undefined,
          context,
          saveAs: vars._userReply_saveAs || undefined,
          timestamp: exec.startedAt ?? new Date(),
          status: 'waiting_for_response',
          expectedButtons: vars._userReply_expectedButtons || [],
        };

        this.pendingExecutions.set(pendingId, pendingExecution);
        console.log(`[user_reply recovery] Re-registered execution ${exec.id} for conversation ${exec.conversationId}`);
      }
    } catch (err) {
      console.error('[user_reply recovery] Error during startup recovery:', err);
    }
  }

private getBodyParamCount(body: string): number {
  if (!body) return 0;
  const matches = body.match(/\{\{\d+\}\}/g);
  return matches ? matches.length : 0;
}


private async executeSendTemplate(node: any, context: ExecutionContext) {
  const templateId = node.data?.templateId;
  const headerImageId = node.data?.headerImageId || null;
  const variableMapping = node.data?.variableMapping || {};

  if (!templateId) throw new Error("No template ID provided");
  if (!context.contactId) throw new Error("No contactId in context");

  // 🧩 Fetch contact
  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, context.contactId),
  });

  if (!contact?.phone) throw new Error("Contact phone not found");
  if (!contact.channelId) throw new Error("Contact channelId missing");

  // 🧩 Split contact name into first/last
  const [firstName = "", lastName = ""] = (contact.name || "").split(" ");

  // 🧩 Fetch WhatsApp template
  const template = await db.query.templates.findFirst({
    where: and(
      eq(templates.id, templateId),
      eq(templates.channelId, contact.channelId)
    ),
  });

  if (!template) throw new Error("Template not found");

  console.log(`📄 Sending template ${template.name} to ${contact.phone}`);

  /* ───── BUILD TEMPLATE VARIABLES ───── */
  const bodyParamCount = this.getBodyParamCount(template.body);
  const parameters: string[] = [];

  for (let i = 1; i <= bodyParamCount; i++) {
    const mapping = variableMapping[i] || {};
    let value = "";

    switch (mapping.type) {
      case "firstName":
        value = firstName;
        break;
      case "lastName":
        value = lastName;
        break;
      case "fullName":
        value = contact.name || "";
        break;
      case "phone":
        value = contact.phone || "";
        break;
      case "custom":
        value = mapping.value || "";
        break;
      default:
        value = "";
    }

    parameters.push(value);
  }

  console.log(`📦 Prepared variables for template:`, parameters);

  // 🟢 Send message through WhatsApp API
  await sendBusinessMessage({
    to: contact.phone,
    channelId: contact.channelId,
    templateName: template.name,
    parameters, // ✅ Body variables
    mediaId: headerImageId || template.mediaUrl || null, // ✅ Header image
  });

  console.log(`✅ Template sent successfully: ${template.name}`);

  return {
    action: "template_sent",
    templateId,
    parameters,
  };
}



  private async executeAssignUser(node: any, context: ExecutionContext) {
    const assigneeId = node.data?.assigneeId;
    
    if (!assigneeId) {
      throw new Error('No assignee ID provided');
    }
    
    console.log(`👤 Assigning conversation ${context.conversationId} to user ${assigneeId}`);

    if (!context.conversationId) {
  throw new Error("No conversationId provided in context");
}

    const conversation = await storage.updateConversation(context.conversationId, {assignedTo: assigneeId, status:"assigned"});
    
    if (!conversation) {
      throw new Error('Conversation not found for assignment');
    }
    console.log(`✅ Conversation assigned to: ${assigneeId}`);
    
    return {
      action: 'user_assigned',
      assigneeId,
      conversationId: context.conversationId
    };
  }

  private async executeAddToGroup(node: any, context: ExecutionContext) {
    const groupId = node.data?.groupId;
    if (!groupId) throw new Error('No group ID provided');
    if (!context.contactId) throw new Error('No contact ID in context');

    console.log(`👥 Adding contact ${context.contactId} to group ${groupId}`);

    const contact = await db.query.contacts.findFirst({
      where: eq(contacts.id, context.contactId),
    });
    if (!contact) throw new Error('Contact not found');

    const group = await db.query.groups.findFirst({
      where: eq(groups.id, groupId),
    });
    const groupName = group?.name || groupId;

    const existingGroups: string[] = contact.groups || [];
    if (!existingGroups.includes(groupName)) {
      existingGroups.push(groupName);
      await db.update(contacts)
        .set({ groups: existingGroups })
        .where(eq(contacts.id, context.contactId));
    }

    return { action: 'added_to_group', groupId, groupName, contactId: context.contactId };
  }

  private async executeUpdateContact(node: any, context: ExecutionContext) {
    const field = node.data?.contactField;
    let value = node.data?.contactFieldValue || '';
    if (!field) throw new Error('No contact field specified');
    if (!context.contactId) throw new Error('No contact ID in context');

    value = this.replaceVariables(value, context.variables);

    console.log(`📝 Updating contact ${context.contactId} field "${field}" to "${value}"`);

    const updateData: Record<string, any> = {};
    if (field === 'name') updateData.name = value;
    else if (field === 'email') updateData.email = value;
    else if (field === 'notes') updateData.notes = value;
    else if (field === 'tags') {
      const tagList = value.split(',').map((t: string) => t.trim()).filter(Boolean);
      updateData.tags = tagList;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(contacts).set(updateData).where(eq(contacts.id, context.contactId));
    }

    return { action: 'contact_updated', field, value, contactId: context.contactId };
  }

  private async executeSetVariable(node: any, context: ExecutionContext) {
    const varName = node.data?.variableName;
    const source = node.data?.variableSource || 'static';
    let varValue = node.data?.variableValue || '';

    if (!varName) throw new Error('No variable name specified');

    console.log(`🔧 Setting variable "${varName}" (source: ${source})`);

    if (source === 'static') {
      varValue = this.replaceVariables(varValue, context.variables);
    } else if (source === 'from_message') {
      varValue = context.lastUserMessage || '';
    } else if (source === 'from_webhook') {
      const path = varValue;
      const webhookData = context.variables['_lastWebhookResponse'] || {};
      varValue = this.getNestedValue(webhookData, path) || '';
    }

    context.variables[varName] = varValue;

    return { action: 'variable_set', name: varName, value: varValue };
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  private async executeSendLocation(node: any, context: ExecutionContext) {
    const { latitude, longitude, locationName, locationAddress } = node.data || {};
    if (!latitude || !longitude) throw new Error('Latitude and longitude are required');
    if (!context.conversationId) throw new Error('No conversation ID in context');

    console.log(`📍 Sending location: ${locationName || ''} (${latitude}, ${longitude})`);

    const conversation = await storage.getConversation(context.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, conversation.channelId || ''),
    });
    if (!channel) throw new Error('Channel not found');

    const payload = {
      messaging_product: "whatsapp",
      to: conversation.contactPhone,
      type: "location",
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        name: locationName || undefined,
        address: locationAddress || undefined,
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(result.error)}`);

    const locationText = `📍 ${locationName || 'Location'}: ${latitude}, ${longitude}`;
    await storage.createMessage({
      conversationId: context.conversationId,
      content: locationText,
      status: 'sent',
      messageType: 'location',
      whatsappMessageId: result?.messages?.[0]?.id,
    });

    return { action: 'location_sent', latitude, longitude, locationName };
  }

  private async executeSendListMessage(node: any, context: ExecutionContext) {
    const { message, listButtonText, listSections } = node.data || {};
    if (!message) throw new Error('List message body text is required');
    if (!listSections || listSections.length === 0) throw new Error('At least one section is required');
    if (!context.conversationId) throw new Error('No conversation ID in context');

    console.log(`📋 Sending list message with ${listSections.length} sections`);

    const conversation = await storage.getConversation(context.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, conversation.channelId || ''),
    });
    if (!channel) throw new Error('Channel not found');

    const bodyText = this.replaceVariables(message, context.variables);

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conversation.contactPhone,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: truncateInteractiveBody(bodyText, node?.id) },
        action: {
          button: listButtonText || "View Options",
          sections: listSections.map((section: any) => ({
            title: section.title,
            rows: section.rows.map((row: any) => ({
              id: row.id || `row_${Math.random().toString(36).slice(2, 8)}`,
              title: row.title,
              ...(row.description ? { description: row.description } : {}),
            })),
          })),
        },
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(result.error)}`);

    await storage.createMessage({
      conversationId: context.conversationId,
      content: bodyText,
      status: 'sent',
      messageType: 'interactive',
      whatsappMessageId: result?.messages?.[0]?.id,
      metadata: JSON.stringify({ listSections, interactiveType: "list" }),
    });

    const allRows = listSections.flatMap((s: any) => s.rows || []);
    const pendingId = `${context.executionId}_${node.nodeId}_${Date.now()}`;

    const pendingExecution: PendingExecution = {
      executionId: context.executionId,
      automationId: context.automationId,
      nodeId: node.nodeId,
      conversationId: context.conversationId,
      contactId: context.contactId,
      context: { ...context },
      saveAs: node.data.saveAs,
      timestamp: new Date(),
      status: 'waiting_for_response',
      expectedButtons: allRows.map((r: any) => ({ id: r.id, text: r.title })),
    };

    this.pendingExecutions.set(pendingId, pendingExecution);

    await db.update(automationExecutions)
      .set({
        status: 'paused',
        currentNodeId: node.nodeId,
        variables: {
          ...context.variables,
          _userReply_waiting: true,
          _userReply_nodeId: node.nodeId,
          _userReply_saveAs: node.data.saveAs || null,
          _userReply_expectedButtons: allRows.map((r: any) => ({ id: r.id, text: r.title })),
        },
        result: `Waiting for list selection: "${bodyText}"`,
      })
      .where(eq(automationExecutions.id, context.executionId));

    await this.logNodeExecution(
      context.executionId,
      node.nodeId,
      node.type,
      'waiting_for_response',
      { ...node.data, message: bodyText, listSections },
      { pendingId, action: 'list_message_sent_waiting' },
      null,
    );

    console.log(`📋 List message sent, pausing for user selection (pending ID: ${pendingId})`);

    return {
      action: 'execution_paused',
      message: bodyText,
      listSections,
      conversationId: context.conversationId,
      pendingId,
      saveAs: node.data.saveAs,
    };
  }

  private async executeSendMedia(node: any, context: ExecutionContext) {
    const { mediaType, mediaUrl, mediaId, mediaSourceType, mediaCaption, mediaFileName } = node.data || {};
    const useUpload = mediaSourceType === "upload" || (!mediaSourceType && !!mediaId && !mediaUrl);
    const hasMedia = useUpload ? !!mediaId : !!mediaUrl;
    if (!mediaType || !hasMedia) throw new Error('Media type and media source (URL or uploaded file) are required');
    if (!context.conversationId) throw new Error('No conversation ID in context');

    console.log(`📎 Sending ${mediaType}: ${useUpload ? `mediaId:${mediaId}` : mediaUrl}`);

    const conversation = await storage.getConversation(context.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, conversation.channelId || ''),
    });
    if (!channel) throw new Error('Channel not found');

    const caption = mediaCaption ? this.replaceVariables(mediaCaption, context.variables) : undefined;

    const mediaPayload: any = useUpload
      ? {
          id: mediaId,
          ...(mediaType === 'document' && mediaFileName ? { filename: mediaFileName } : {}),
          ...(caption && mediaType !== 'audio' ? { caption } : {}),
        }
      : {
          link: mediaUrl,
          ...(mediaType === 'document' && mediaFileName ? { filename: mediaFileName } : {}),
          ...(caption && mediaType !== 'audio' ? { caption } : {}),
        };

    const payload: any = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: conversation.contactPhone,
      type: mediaType,
      [mediaType]: mediaPayload,
    };

    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(`WhatsApp API error: ${JSON.stringify(result.error)}`);

    await storage.createMessage({
      conversationId: context.conversationId,
      content: caption || `[${mediaType}]`,
      status: 'sent',
      messageType: mediaType,
      whatsappMessageId: result?.messages?.[0]?.id,
    });

    return { action: 'media_sent', mediaType, mediaUrl };
  }

  private async executeMarkAsRead(node: any, context: ExecutionContext) {
    if (!context.conversationId) throw new Error('No conversation ID in context');

    console.log(`✅ Marking conversation ${context.conversationId} as read`);

    const conversation = await storage.getConversation(context.conversationId);
    if (!conversation) throw new Error('Conversation not found');

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, conversation.channelId || ''),
    });
    if (!channel) throw new Error('Channel not found');

    const lastMsgId = context.triggerData?.messageId;
    if (lastMsgId) {
      await fetch(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${channel.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${channel.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            status: "read",
            message_id: lastMsgId,
          }),
        }
      );
    }

    await storage.updateConversation(context.conversationId, { unreadCount: 0 });

    return { action: 'marked_as_read', conversationId: context.conversationId };
  }

  private async executeWebhook(node: any, context: ExecutionContext) {
    const url = this.replaceVariables(node.data?.webhookUrl || '', context.variables);
    const method = (node.data?.webhookMethod || 'POST').toUpperCase();
    const customHeaders = node.data?.webhookHeaders || {};
    const customBody = node.data?.webhookBody || '';

    if (!url) throw new Error('No webhook URL provided');

    console.log(`🌐 Executing webhook: ${method} ${url}`);

    const contact = context.contactId
      ? await db.query.contacts.findFirst({ where: eq(contacts.id, context.contactId) })
      : null;

    const conversation = context.conversationId
      ? await storage.getConversation(context.conversationId)
      : null;

    let channelData: any = null;
    if (conversation?.channelId) {
      channelData = await db.query.channels.findFirst({
        where: eq(channels.id, conversation.channelId),
      });
    }

    const automationPayload = {
      event: 'automation_webhook',
      timestamp: new Date().toISOString(),
      automation: {
        id: context.automationId,
        executionId: context.executionId,
        nodeId: node.nodeId,
      },
      contact: contact ? {
        id: contact.id,
        name: contact.name || '',
        phone: contact.phone || '',
        email: (contact as any).email || '',
        groups: contact.groups || [],
        tags: (contact as any).tags || [],
        source: contact.source || '',
        createdAt: contact.createdAt,
      } : null,
      conversation: conversation ? {
        id: conversation.id,
        status: conversation.status,
        lastMessageText: conversation.lastMessageText || '',
        unreadCount: conversation.unreadCount || 0,
      } : null,
      channel: channelData ? {
        id: channelData.id,
        name: channelData.name || '',
        phoneNumber: channelData.phoneNumber || '',
      } : null,
      lastUserMessage: context.lastUserMessage || '',
      variables: { ...context.variables },
    };

    delete automationPayload.variables['_lastWebhookResponse'];

    let body: string | undefined;
    const headers: Record<string, string> = {
      'User-Agent': 'WhatsApp-Marketing-Platform/1.0',
      ...customHeaders,
    };

    const templateVars = {
      ...context.variables,
      contact_name: contact?.name || '',
      contact_phone: contact?.phone || '',
      contact_email: (contact as any)?.email || '',
      contact_groups: JSON.stringify(contact?.groups || []),
      last_message: context.lastUserMessage || '',
      conversation_id: context.conversationId || '',
      channel_name: channelData?.name || '',
      channel_phone: channelData?.phoneNumber || '',
    };

    let finalUrl = url;

    if (method === 'POST' || method === 'PUT') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
      if (customBody.trim()) {
        body = this.replaceVariables(customBody, templateVars);
      } else {
        body = JSON.stringify(automationPayload);
      }
    } else if (method === 'GET') {
      const flatParams: Record<string, string> = {};
      for (const [k, v] of Object.entries(templateVars)) {
        if (k.startsWith('_')) continue;
        flatParams[k] = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
      }
      const queryParams = new URLSearchParams(flatParams);
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${separator}${queryParams.toString()}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const fetchOptions: any = { method, headers, signal: controller.signal };
      if (body && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = body;
      }

      const response = await fetch(finalUrl, fetchOptions);
      clearTimeout(timeout);

      const responseStatus = response.status;
      let responseData: any = null;
      const responseText = await response.text();

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { text: responseText };
      }

      context.variables['_lastWebhookResponse'] = responseData;
      context.variables['_lastWebhookStatus'] = responseStatus;

      console.log(`✅ Webhook response: ${responseStatus} - ${responseText.substring(0, 200)}`);

      if (!response.ok) {
        console.warn(`⚠️ Webhook returned non-OK status: ${responseStatus}`);
      }

      return {
        action: 'webhook_executed',
        url: finalUrl,
        method,
        status: responseStatus,
        response: responseData,
      };
    } catch (error: any) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.error(`⏱️ Webhook timed out after 30s: ${finalUrl}`);
        context.variables['_lastWebhookResponse'] = { error: 'timeout' };
        context.variables['_lastWebhookStatus'] = 408;
        return {
          action: 'webhook_timeout',
          url: finalUrl,
          method,
          error: 'Request timed out after 30 seconds',
        };
      }
      throw error;
    }
  }

  private replaceVariables(text: string, variables: Record<string, any>): string {
    return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
      const trimmed = varName.trim();
      const val = this.resolveVariable(trimmed, variables);
      return val !== undefined ? String(val) : match;
    });
  }

  private resolveVariable(path: string, variables: Record<string, any>): any {
    if (variables[path] !== undefined) return variables[path];

    const parts = path.split('.');
    let current: any = variables;
    for (const part of parts) {
      if (current == null || typeof current !== 'object') return undefined;
      current = current[part];
    }
    return current;
  }

  getPendingExecutions() {
    return Array.from(this.pendingExecutions.entries()).map(([pendingId, execution]) => ({
      pendingId,
      executionId: execution.executionId,
      conversationId: execution.conversationId,
      nodeId: execution.nodeId,
      contactId: execution.contactId,
      saveAs: execution.saveAs,
      timestamp: execution.timestamp,
      waitingTime: Date.now() - execution.timestamp.getTime()
    }));
  }

  hasPendingExecution(conversationId: string): boolean {
    return this.findPendingExecutionByConversation(conversationId) !== null;
  }

  async hasPendingExecutionAsync(conversationId: string): Promise<boolean> {
    if (this.findPendingExecutionByConversation(conversationId)) return true;
    const dbResult = await this.findPendingExecutionByConversationFromDb(conversationId);
    return dbResult !== null;
  }

  async cleanupExpiredExecutions(timeoutMs: number = 30 * 60 * 1000) { // 30 minutes default
    const now = Date.now();
    const expired: { pendingId: string; execution: PendingExecution }[] = [];

    for (const [pendingId, execution] of this.pendingExecutions.entries()) {
      if (now - execution.timestamp.getTime() > timeoutMs) {
        expired.push({ pendingId, execution });
      }
    }
    
    for (const { pendingId, execution } of expired) {
      this.pendingExecutions.delete(pendingId);
      
      // Mark execution as failed due to timeout
      await this.completeExecution(
        execution.executionId,
        'failed',
        'Execution timed out waiting for user response'
      );
      
      console.warn(`⚠️  Cleaned up expired execution: ${pendingId} (conversation: ${execution.conversationId})`);
    }
    
    return expired.length;
  }

  async cancelExecution(conversationId: string): Promise<boolean> {
    const pending = this.findPendingExecutionByConversation(conversationId);
    if (pending) {
      this.pendingExecutions.delete(pending.pendingId);
      await this.completeExecution(pending.executionId, 'failed', 'Execution cancelled by user');
      console.log(`❌ Cancelled execution for conversation: ${conversationId}`);
      return true;
    }
    return false;
  }

  private async completeExecution(executionId: string, status: 'completed' | 'failed', result: string) {
    await db.update(automationExecutions)
      .set({
        status,
        completedAt: new Date(),
        result
      })
      .where(eq(automationExecutions.id, executionId));

    console.log(`🏁 Execution ${executionId} ${status}: ${result}`);
  }

  private async logNodeExecution(
    executionId: string,
    nodeId: string,
    nodeType: string,
    status: string,
    input: any,
    output: any,
    error: string | null
  ) {
    await db.insert(automationExecutionLogs).values({
      executionId,
      nodeId,
      nodeType,
      status,
      input: JSON.stringify(input),
      output: JSON.stringify(output),
      error
    });
  }

  private async getAutomationWithFlow(automationId: string) {
    // Get automation
    const automation = await db.query.automations.findFirst({
      where: eq(automations.id, automationId),
      with: {
        nodes: true,
        edges: true,
      },
    });
  
    return automation;
  }
}

// Trigger Manager - handles when automations should start
export class AutomationTriggerService {
  private executionService: AutomationExecutionService;

  constructor() {
    this.executionService = new AutomationExecutionService();
  }

  /**
   * Handle new conversation trigger
   */
  async handleNewConversation(conversationId: string, channelId: string, contactId?: string): Promise<boolean> {
    console.log(`🎯 New conversation trigger: ${conversationId}`);
    
    // Find active automations with "new_conversation" trigger
    const activeAutomations = await db.select()
      .from(automations)
      .where(and(
        eq(automations.channelId, channelId),
        eq(automations.trigger, 'new_conversation'),
        eq(automations.status, 'active')
      ));

    console.log(`Found ${activeAutomations.length} active automation(s)`);

    if (activeAutomations.length === 0) {
      return false;
    }

    // Start execution for each automation
    for (const automation of activeAutomations) {
      try {
        const [execution] = await db.insert(automationExecutions).values({
          automationId: automation.id,
          contactId,
          conversationId,
          triggerData: {
            trigger: 'new_conversation',
            channelId,
            timestamp: new Date()
          },
          status: 'running'
        }).returning();

        await this.executionService.executeAutomation(execution.id);

      } catch (error) {
        console.error(`Failed to execute automation ${automation.id}:`, error);
      }
    }

    return true;
  }

  /**
   * Handle message received trigger - ENHANCED for conditions
   */
  // async handleMessageReceived(conversationId: string, message: any, channelId: string, contactId?: string) {
  //   console.log(`💬 Message received trigger: ${conversationId}`);
    
  //   // First, check if this is a response to a pending user_reply node
  //   if (this.executionService.hasPendingExecution(conversationId)) {
  //     console.log(`📨 Processing as user response to pending execution`);
  //     try {
  //       await this.executionService.handleUserResponse(conversationId, message.content || message.text || message, message.interactive);
  //       return; // Don't trigger new automations if this was a response
  //     } catch (error) {
  //       console.error(`Error handling user response:`, error);
  //       // Continue to trigger new automations as fallback
  //     }
  //   }
    
  //   // Normal message-based automation triggers
  //   const activeAutomations = await db.select()
  //     .from(automations)
  //     .where(and(
  //       eq(automations.channelId, channelId),
  //       eq(automations.trigger, 'message_received'),
  //       eq(automations.status, 'active')
  //     ));

  //   for (const automation of activeAutomations) {
  //     try {
  //       const [execution] = await db.insert(automationExecutions).values({
  //         automationId: automation.id,
  //         contactId,
  //         conversationId,
  //         triggerData: {
  //           trigger: 'message_received',
  //           message,
  //           channelId,
  //           timestamp: new Date()
  //         },
  //         status: 'running'
  //       }).returning();

  //       await this.executionService.executeAutomation(execution.id);
  //     } catch (error) {
  //       console.error(`Failed to execute automation ${automation.id}:`, error);
  //     }
  //   }
  // }

  async handleMessageReceived(conversationId: string, message: any, channelId: string, contactId?: string): Promise<boolean> {
    console.log(`💬 Message received trigger: ${conversationId}`);
    console.log(`🔍 Channel ID: ${channelId}, Contact ID: ${contactId}`);
    console.log(`📝 Message: "${message.content || message.text || message}"`);
    
    // First, check if this is a response to a pending user_reply node
    if (this.executionService.hasPendingExecution(conversationId)) {
      console.log(`📨 Processing as user response to pending execution`);
      try {
        await this.executionService.handleUserResponse(conversationId, message.content || message.text || message, message.interactive);
        return true; // Pending execution handled this message
      } catch (error) {
        console.error(`Error handling user response:`, error);
        // Fall through to try new automation triggers
      }
    }
    
    // Find active automations with 'message_received' trigger only
    const activeAutomations = await db.select()
      .from(automations)
      .where(and(
        eq(automations.channelId, channelId),
        eq(automations.trigger, 'message_received'),
        eq(automations.status, 'active')
      ));
  
    console.log(`🎯 Found ${activeAutomations.length} active message_received automation(s)`);
    
    if (activeAutomations.length === 0) {
      return false;
    }

    // Resolve the incoming WhatsApp message ID for deduplication
    const whatsappMessageId: string | null =
      message.whatsappMessageId ?? message.id ?? null;

    for (const automation of activeAutomations) {
      console.log(`🚀 Starting automation: ${automation.id} - "${automation.name}"`);
      
      try {
        // Check if automation has nodes
        const nodeCount = await db.select({ count: sql`count(*)` })
          .from(automationNodes)
          .where(eq(automationNodes.automationId, automation.id));
          
        if (!nodeCount[0]?.count || nodeCount[0].count === 0) {
          console.warn(`⚠️ Automation ${automation.id} has no nodes, skipping`);
          continue;
        }

        // Per-(automation, conversation) cooldown for `message_received`.
        // Without this, a contact who has just finished a flow (welcome menu
        // → fell through to default → terminal node) gets the welcome menu
        // re-sent on every subsequent message until they happen to land on
        // a `user_reply` node mid-flow. We treat a recent `completed` run
        // as "this contact already saw this automation" and skip restarting
        // it for COOLDOWN_MS. The pending-resume path above is unaffected.
        const cooldownSince = new Date(Date.now() - MESSAGE_RECEIVED_COOLDOWN_MS);
        // Use COALESCE(completed_at, started_at) so legacy/inconsistent rows
        // with a null completion timestamp still respect the cooldown — we
        // fall back to the trigger time so the gate cannot be bypassed.
        // Include `running` and `paused` runs too — without them, a contact
        // who is mid-flow on a `user_reply` (status='paused') would spawn a
        // brand-new parallel execution every time they sent another message.
        const recentCompleted = await db.select({ id: automationExecutions.id })
          .from(automationExecutions)
          .where(and(
            eq(automationExecutions.automationId, automation.id),
            eq(automationExecutions.conversationId, conversationId),
            inArray(automationExecutions.status, ['completed', 'running', 'paused']),
            sql`COALESCE(${automationExecutions.completedAt}, ${automationExecutions.startedAt}) >= ${cooldownSince}`,
          ))
          .limit(1);

        if (recentCompleted.length > 0) {
          console.log(
            `⏭️ Cooldown skip for automation ${automation.id} on conversation ${conversationId} (recent run within ${MESSAGE_RECEIVED_COOLDOWN_MS / 60000}m)`,
          );
          continue;
        }

        // Atomic idempotency: the unique index on (automationId, conversationId, triggerMessageId)
        // prevents concurrent duplicates at the DB level. onConflictDoNothing() turns a unique
        // violation into a no-op so Meta webhook retries are silently dropped.
        const inserted = await db.insert(automationExecutions).values({
          automationId: automation.id,
          contactId,
          conversationId,
          triggerMessageId: whatsappMessageId,
          triggerData: {
            trigger: 'message_received',
            whatsappMessageId,
            message,
            channelId,
            timestamp: new Date()
          },
          status: 'running'
        }).onConflictDoNothing().returning();

        if (!inserted || inserted.length === 0) {
          console.log(`⏭️ Skipping duplicate execution for automation ${automation.id} (message ${whatsappMessageId} already processed)`);
          continue;
        }

        const execution = inserted[0];
        console.log(`✅ Created execution record: ${execution.id}`);
        
        await this.executionService.executeAutomation(execution.id);
        
        console.log(`🎉 Automation ${automation.id} execution completed`);
        
      } catch (error) {
        console.error(`❌ Failed to execute automation ${automation.id}:`, error);
        console.error(`Stack trace:`,  (error as Error).stack);
      }
    }

    return true;
  }

  /**
   * Get execution service for external access
   */
  getExecutionService() {
    return this.executionService;
  }
}

// Export singleton instances
export const executionService = new AutomationExecutionService();
export const triggerService = new AutomationTriggerService();

// Periodic cleanup (run this somewhere in your app)
setInterval(() => {
  executionService.cleanupExpiredExecutions();
}, 5 * 60 * 1000); // Every 5 minutes