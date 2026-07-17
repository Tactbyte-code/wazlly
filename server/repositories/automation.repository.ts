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

import { db } from "../db";
import { automations, automationNodes, automationExecutions, automationExecutionLogs } from "@shared/schema";
import type { 
  Automation, 
  InsertAutomation, 
  AutomationNode, 
  InsertAutomationNode,
  AutomationExecution,
  InsertAutomationExecution,
  AutomationExecutionLog,
  InsertAutomationExecutionLog
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export class AutomationRepository {
  // Automations CRUD
  async create(data: InsertAutomation): Promise<Automation> {
    const [automation] = await db.insert(automations).values(data).returning();
    return automation;
  }

  async findById(id: string): Promise<Automation | undefined> {
    const [automation] = await db
      .select()
      .from(automations)
      .where(eq(automations.id, id));
    return automation;
  }

  async findByChannel(channelId: string): Promise<Automation[]> {
    if (!channelId) {
      // Return all automations if no channelId is provided
      return await db
        .select()
        .from(automations)
        .orderBy(desc(automations.createdAt));
    }
    
    return await db
      .select()
      .from(automations)
      .where(eq(automations.channelId, channelId))
      .orderBy(desc(automations.createdAt));
  }

  async update(id: string, data: Partial<InsertAutomation>): Promise<Automation> {
    const [automation] = await db
      .update(automations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(automations.id, id))
      .returning();
    return automation;
  }

  async delete(id: string): Promise<void> {
    await db.delete(automations).where(eq(automations.id, id));
  }

  // Automation Nodes CRUD
  async createNode(data: InsertAutomationNode): Promise<AutomationNode> {
    const [node] = await db.insert(automationNodes).values(data).returning();
    return node;
  }

  async createNodes(data: InsertAutomationNode[]): Promise<AutomationNode[]> {
    if (data.length === 0) return [];
    return await db.insert(automationNodes).values(data).returning();
  }

  async findNodesByAutomation(automationId: string): Promise<AutomationNode[]> {
    return await db
      .select()
      .from(automationNodes)
      .where(eq(automationNodes.automationId, automationId));
  }

  async updateNode(id: string, data: Partial<InsertAutomationNode>): Promise<AutomationNode> {
    const [node] = await db
      .update(automationNodes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(automationNodes.id, id))
      .returning();
    return node;
  }

  async deleteNodesByAutomation(automationId: string): Promise<void> {
    await db.delete(automationNodes).where(eq(automationNodes.automationId, automationId));
  }

  // Automation Executions
  async createExecution(data: InsertAutomationExecution): Promise<AutomationExecution> {
    const [execution] = await db.insert(automationExecutions).values(data).returning();
    return execution;
  }

  async findExecutionById(id: string): Promise<AutomationExecution | undefined> {
    const [execution] = await db
      .select()
      .from(automationExecutions)
      .where(eq(automationExecutions.id, id));
    return execution;
  }

  async findExecutionsByAutomation(automationId: string, limit = 50): Promise<AutomationExecution[]> {
    return await db
      .select()
      .from(automationExecutions)
      .where(eq(automationExecutions.automationId, automationId))
      .orderBy(desc(automationExecutions.startedAt))
      .limit(limit);
  }

  async updateExecution(id: string, data: Partial<InsertAutomationExecution>): Promise<AutomationExecution> {
    const [execution] = await db
      .update(automationExecutions)
      .set(data)
      .where(eq(automationExecutions.id, id))
      .returning();
    return execution;
  }

  // Execution Logs
  async createExecutionLog(data: InsertAutomationExecutionLog): Promise<AutomationExecutionLog> {
    const [log] = await db.insert(automationExecutionLogs).values(data).returning();
    return log;
  }

  async findExecutionLogs(executionId: string): Promise<AutomationExecutionLog[]> {
    return await db
      .select()
      .from(automationExecutionLogs)
      .where(eq(automationExecutionLogs.executionId, executionId))
      .orderBy(automationExecutionLogs.executedAt);
  }

  // Helper methods
  async getActiveAutomationsByTrigger(trigger: string, channelId?: string): Promise<Automation[]> {
    const conditions = [
      eq(automations.trigger, trigger),
      eq(automations.status, 'active')
    ];
    
    if (channelId) {
      conditions.push(eq(automations.channelId, channelId));
    }
    
    return await db
      .select()
      .from(automations)
      .where(and(...conditions));
  }

  async incrementExecutionCount(id: string): Promise<void> {
    const [automation] = await db
      .select()
      .from(automations)
      .where(eq(automations.id, id));
    
    if (automation) {
      await db
        .update(automations)
        .set({
          executionCount: automation.executionCount !== null ? automation.executionCount + 1 : null,
          lastExecutedAt: new Date()
        })
        .where(eq(automations.id, id));
    }
  }
}