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

import type { Request, Response } from "express";
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { db } from "../db"; 
import {
  automations,
  automationNodes,
  automationExecutions,
  automationExecutionLogs,
  insertAutomationSchema,
  automationEdges,
} from "@shared/schema";
import { eq , and, inArray } from "drizzle-orm";
import { AppError, asyncHandler } from "../middlewares/error.middleware";
import { storage } from "../storage";
import { executionService, triggerService, sanitizeAutomationVariables } from "../services/automation-execution-service";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
//
// ─── AUTOMATIONS (flows) ───────────────────────────────────────────────
//


// ─── Node & Edge Types ─────────────────────────
interface Node {
  id: string;
  automationId: string;
  nodeId: string;
  type: string;
  subtype?: string | null;
  position: Record<string, any>;
  measured: Record<string, any>;
  data: Record<string, any>;
  connections: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Edge {
  id: string;
  automationId: string;
  sourceNodeId: string;
  targetNodeId: string;
  animated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Automation Type ─────────────────────────
interface Automation {
  id: string;
  channelId: string | null;
  name: string;
  description?: string | null;
  trigger: string;
  triggerConfig: any;
  status: string;
  executionCount: number;
  lastExecutedAt?: Date | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  automation_nodes: Node[];
  automation_edges: Edge[];
}

// ─── Tenant scoping helpers ──────────────────
// Resolves the channels owned by the calling user. Mirrors the pattern in
// webhooks.controller.ts / ai.settings.controller.ts: superadmin sees all,
// admin sees their own channels, team members inherit from their parent admin.
async function resolveOwnerChannelIds(
  req: Request,
): Promise<{ user: any; isSuperadmin: boolean; ownedChannelIds: string[] }> {
  const user = (req.session as any)?.user ?? (req as any).user;
  if (!user) throw new AppError(401, "Not authenticated");
  if (user.role === "superadmin") {
    return { user, isSuperadmin: true, ownedChannelIds: [] };
  }
  const ownerId = user.role === "team" ? user.createdBy : user.id;
  const owned = await storage.getChannelsByUserId(ownerId);
  return { user, isSuperadmin: false, ownedChannelIds: owned.map((c: any) => c.id) };
}

async function assertAutomationOwned(req: Request, automationId: string) {
  const automation = await db.query.automations.findFirst({
    where: eq(automations.id, automationId),
  });
  if (!automation) throw new AppError(404, "Automation not found");
  const { isSuperadmin, ownedChannelIds } = await resolveOwnerChannelIds(req);
  if (!isSuperadmin) {
    if (!automation.channelId || !ownedChannelIds.includes(automation.channelId)) {
      // Don't leak existence of another tenant's automation.
      throw new AppError(404, "Automation not found");
    }
  }
  return automation;
}

async function assertExecutionOwned(req: Request, executionId: string) {
  const execution = await db.query.automationExecutions.findFirst({
    where: eq(automationExecutions.id, executionId),
  });
  if (!execution) throw new AppError(404, "Execution not found");
  const automation = await db.query.automations.findFirst({
    where: eq(automations.id, execution.automationId),
  });
  if (!automation) throw new AppError(404, "Execution not found");
  const { isSuperadmin, ownedChannelIds } = await resolveOwnerChannelIds(req);
  if (!isSuperadmin) {
    if (!automation.channelId || !ownedChannelIds.includes(automation.channelId)) {
      throw new AppError(404, "Execution not found");
    }
  }
  return { execution, automation };
}

async function assertChannelOwned(req: Request, channelId: string) {
  const { isSuperadmin, ownedChannelIds } = await resolveOwnerChannelIds(req);
  if (isSuperadmin) return;
  if (!channelId || !ownedChannelIds.includes(channelId)) {
    throw new AppError(403, "Access denied to this channel");
  }
}

// Activation guard. Mirrors the executor's start-node selection so we never
// activate a flow the executor would immediately abandon with
// "No start node found". Start node = a real node with no incoming real edge;
// it must additionally have at least one outgoing real edge.
//
// Exported for tests so the rule lives in one place.
export function findActivationProblem(
  nodes: { nodeId: string }[],
  edges: { sourceNodeId: string; targetNodeId: string }[],
): string | null {
  if (nodes.length === 0 || edges.length === 0) {
    return "Cannot activate an automation without at least one node and one connection";
  }
  const nodeIdSet = new Set(nodes.map((n) => n.nodeId));
  const realEdges = edges.filter(
    (e) => nodeIdSet.has(e.sourceNodeId) && nodeIdSet.has(e.targetNodeId),
  );
  if (realEdges.length === 0) {
    return "Cannot activate an automation without at least one valid connection between nodes";
  }
  const incoming = new Set(realEdges.map((e) => e.targetNodeId));
  const outgoing = new Set(realEdges.map((e) => e.sourceNodeId));
  const startNodes = nodes.filter((n) => !incoming.has(n.nodeId));
  if (startNodes.length === 0) {
    return "Cannot activate an automation: no start node found (every node has an incoming connection)";
  }
  const startWithOutgoing = startNodes.find((n) => outgoing.has(n.nodeId));
  if (!startWithOutgoing) {
    return "Cannot activate an automation: the start node has no outgoing connection";
  }
  return null;
}

// GET all automations (optionally by channelId)
export const getAutomations = asyncHandler(async (req: Request, res: Response) => {
  const channelId = req.query.channelId as string | undefined;
  const user = (req.session as any)?.user;
  if (!user) return res.status(401).json({ error: 'Not authenticated' });

  // Tenant scoping: non-superadmin callers may only read automations for
  // channels they own (admin) or channels owned by their parent admin (team).
  // Superadmin sees everything.
  let allowedChannelIds: string[] | null = null;
  if (user.role !== 'superadmin') {
    const ownerId = user.role === 'team' ? user.createdBy : user.id;
    const ownedChannels = await storage.getChannelsByUserId(ownerId);
    allowedChannelIds = ownedChannels.map((c: any) => c.id);

    if (channelId && !allowedChannelIds.includes(channelId)) {
      return res.status(403).json({ error: 'Access denied to this channel' });
    }
    if (allowedChannelIds.length === 0) {
      return res.json([]);
    }
  }

  const baseQuery = db.select()
    .from(automations)
    .leftJoin(automationNodes, eq(automations.id, automationNodes.automationId))
    .leftJoin(automationEdges, eq(automations.id, automationEdges.automationId));

  let rows;
  if (channelId) {
    rows = await baseQuery.where(eq(automations.channelId, channelId));
  } else if (allowedChannelIds) {
    rows = await baseQuery.where(inArray(automations.channelId, allowedChannelIds));
  } else {
    rows = await baseQuery;
  }

  const automationMap = new Map<string, Automation>();

  for (const row of rows) {
    const automationRow = row.automations as Omit<Automation, "automation_nodes" | "automation_edges">;
    const node = row.automation_nodes as Node | null;
    const edge = row.automation_edges as Edge | null;

    if (!automationMap.has(automationRow.id)) {
      automationMap.set(automationRow.id, {
        ...automationRow,
        automation_nodes: [],
        automation_edges: [],
      });
    }

    const automationEntry = automationMap.get(automationRow.id)!;

    // Add node if not already in the array
    if (node && !automationEntry.automation_nodes.some((n: Node) => n.id === node.id)) {
      automationEntry.automation_nodes.push(node);
    }

    // Add edge if not already in the array
    if (edge && !automationEntry.automation_edges.some((e: Edge) => e.id === edge.id)) {
      automationEntry.automation_edges.push(edge);
    }
  }

  const result = Array.from(automationMap.values());
  res.json(result);
});


// GET single automation (with nodes)
export const getAutomation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const automation = await assertAutomationOwned(req, id);

  const nodes = await db.select().from(automationNodes).where(eq(automationNodes.automationId, id));

  res.json({ ...automation, nodes });
});

// CREATE automation (empty flow or with initial nodes)
// export const createAutomation = asyncHandler(async (req: Request, res: Response) => {
//   const { name, description, trigger, triggerConfig, nodes = [], edges = [] } = req.body;
//   console.log("Creating automation with data:", req.body); // Debug log
//   const validatedAutomation = insertAutomationSchema.parse(req.body);
  
//   // Get active channel if channelId not provided
//   let channelId = validatedAutomation.channelId;
//   if (!channelId) {
//     const activeChannel = await storage.getActiveChannel();
//     if (activeChannel) {
//       channelId = activeChannel.id;
//     }
//   }
  
//   const [automation] = await db.insert(automations).values({
//     name,
//     description,
//     channelId,
//     trigger,
//     triggerConfig,
//   }).returning();

//   // Process nodes and handle file uploads
//   if (nodes.length) {
//     const processedNodes = await Promise.all(
//       nodes.map(async (node: any) => {
//         const processedData = { ...node.data };
        
//         // Handle file uploads in custom_reply and user_reply nodes
//         if (node.type === 'custom_reply' || node.type === 'user_reply') {
//           // Handle image files
//           if (processedData.imageFile && Object.keys(processedData.imageFile).length > 0) {
//             try {
//               const savedFile = await saveUploadedFile(processedData.imageFile, 'images');
//               processedData.imageFile = savedFile;
//               // Update imagePreview to use the saved file path
//               processedData.imagePreview = `/uploads/images/${savedFile.filename}`;
//             } catch (error) {
//               console.error('Error saving image file:', error);
//               processedData.imageFile = null;
//               processedData.imagePreview = null;
//             }
//           }
          
//           // Handle video files
//           if (processedData.videoFile && Object.keys(processedData.videoFile).length > 0) {
//             try {
//               const savedFile = await saveUploadedFile(processedData.videoFile, 'videos');
//               processedData.videoFile = savedFile;
//               processedData.videoPreview = `/uploads/videos/${savedFile.filename}`;
//             } catch (error) {
//               console.error('Error saving video file:', error);
//               processedData.videoFile = null;
//               processedData.videoPreview = null;
//             }
//           }
          
//           // Handle audio files
//           if (processedData.audioFile && Object.keys(processedData.audioFile).length > 0) {
//             try {
//               const savedFile = await saveUploadedFile(processedData.audioFile, 'audio');
//               processedData.audioFile = savedFile;
//               processedData.audioPreview = `/uploads/audio/${savedFile.filename}`;
//             } catch (error) {
//               console.error('Error saving audio file:', error);
//               processedData.audioFile = null;
//               processedData.audioPreview = null;
//             }
//           }
          
//           // Handle document files
//           if (processedData.documentFile && Object.keys(processedData.documentFile).length > 0) {
//             try {
//               const savedFile = await saveUploadedFile(processedData.documentFile, 'documents');
//               processedData.documentFile = savedFile;
//               processedData.documentPreview = `/uploads/documents/${savedFile.filename}`;
//             } catch (error) {
//               console.error('Error saving document file:', error);
//               processedData.documentFile = null;
//               processedData.documentPreview = null;
//             }
//           }
//         }
        
//         return {
//           automationId: automation.id,
//           nodeId: node.id,
//           type: node.type,
//           subtype: node.subtype,
//           position: node.position,
//           data: processedData,
//           connections: node.connections,
//           measured: node.measured,
//         };
//       })
//     );
    
//     await db.insert(automationNodes).values(processedNodes);
//   }

//   if (edges.length) {
//     await db.insert(automationEdges).values(
//       edges.map((edge: any) => ({
//         id: edge.id,
//         automationId: automation.id,
//         sourceNodeId: edge.source,
//         targetNodeId: edge.target,
//         animated: edge.animated,
//       }))
//     );
//   }

//   res.status(201).json(automation);
// });



export const createAutomation = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { name, description, trigger, triggerConfig, nodes, edges } = req.body;

    const validatedAutomation = insertAutomationSchema.parse(req.body);

    // ✅ Get active channel if not provided
    let channelId = validatedAutomation.channelId;
    if (!channelId) {
      const activeChannel = await storage.getActiveChannel();
      if (activeChannel) channelId = activeChannel.id;
    }

    if (!channelId) {
      throw new AppError(400, "channelId is required (no active channel resolved)");
    }
    await assertChannelOwned(req, channelId);

    // ✅ Parse nodes & edges safely
    let parsedNodes: any[] = [];
    let parsedEdges: any[] = [];

    try {
      parsedNodes = typeof nodes === "string" ? JSON.parse(nodes) : nodes;
      if (!Array.isArray(parsedNodes)) parsedNodes = [];
    } catch {
      parsedNodes = [];
    }

    try {
      parsedEdges = typeof edges === "string" ? JSON.parse(edges) : edges;
      if (!Array.isArray(parsedEdges)) parsedEdges = [];
    } catch {
      parsedEdges = [];
    }

    // ✅ Normalize node data: ensure variableMapping + cleanup previews
    for (const node of parsedNodes) {
      if (!node.data) node.data = {};

      // Handle "send_template" nodes specially
      if (node.type === "send_template") {
        if (!node.data.variableMapping) node.data.variableMapping = {};

        // If template requires header image, ensure placeholder
        if (node.data.templateMeta?.headerType === "IMAGE" && !node.data.headerImageId) {
          node.data.headerImageId = null;
        }

        // Remove frontend-only preview or temp fields
        delete node.data.templateMeta;
        delete node.data.imagePreview;
        delete node.data.videoPreview;
        delete node.data.audioPreview;
        delete node.data.documentPreview;
      }
    }

    // ✅ Handle uploaded media (works for local & cloud uploads)
    if (req.files && Array.isArray(req.files)) {
      const files = req.files as (Express.Multer.File & { cloudUrl?: string })[];

      for (const file of files) {
        // Field name format: <nodeId>_<field> where nodeId starts with "node_"
        // e.g. "node_1775717245932_abc123_imageFile"
        const match = file.fieldname.match(/^node_(.+)_(imageFile|videoFile|audioFile|documentFile)$/);
        if (!match) continue;

        const nodeId = `node_${match[1]}`;
        const field = match[2];
        const node = parsedNodes.find((n) => n.id === nodeId);
        if (!node || !node.data) continue;

        const filePath = file.cloudUrl
          ? file.cloudUrl
          : `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`;

        node.data[field] = {
          filename: file.filename,
          mimetype: file.mimetype,
          size: file.size,
          path: filePath,
        };

        // Optional preview path
        node.data[`${field.replace("File", "Preview")}`] = filePath;
      }
    }

    // ✅ Clear any media file fields that are empty objects (JSON-serialised File objects)
    const mediaFileFields = ["imageFile", "videoFile", "audioFile", "documentFile"];
    for (const node of parsedNodes) {
      if (!node.data) continue;
      for (const field of mediaFileFields) {
        const val = node.data[field];
        if (val && typeof val === "object" && !val.path) {
          delete node.data[field];
        }
      }
    }

    // ✅ Create automation record
    const [automation] = await db
      .insert(automations)
      .values({
        name,
        description,
        channelId,
        trigger,
        triggerConfig: triggerConfig
        ? typeof triggerConfig === "string"
          ? JSON.parse(triggerConfig)
          : triggerConfig
        : {},
      })
      .returning();

    // ✅ Insert all nodes (includes variableMapping)
    for (const node of parsedNodes) {
      await db.insert(automationNodes).values({
        automationId: automation.id,
        nodeId: node.id,
        type: node.type,
        subtype: node.subtype || node.type,
        position: node.position,
        measured: node.measured,
        data: node.data,
        connections: node.connections || [],
      });
    }

    for (const edge of parsedEdges) {
      await db.insert(automationEdges).values({
        id: crypto.randomUUID(),
        automationId: automation.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourceHandle: edge.sourceHandle || null,
        animated: !!edge.animated,
      });
    }

    res.json({
      success: true,
      automation,
      nodes: parsedNodes,
      edges: parsedEdges,
    });
  } catch (err: any) {
    console.error("❌ Automation creation failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});





// Helper function to save uploaded files
async function saveUploadedFile(file: Express.Multer.File, folder: string) {
  const uploadPath = path.join("uploads", folder);
  await fs.mkdir(uploadPath, { recursive: true });

  const filename = Date.now() + "-" + file.originalname;
  const destPath = path.join(uploadPath, filename);

  if (file.buffer) {
    // memoryStorage
    await fs.writeFile(destPath, file.buffer);
  } else if (file.path) {
    // diskStorage
    await fs.copyFile(file.path, destPath);
  }

  return {
    filename,
    path: `/uploads/${folder}/${filename}`,
  };
}


// UPDATE automation

// Lightweight Zod schema for update payloads. Nodes/edges can come in as
// strings (multipart form) or arrays (JSON body), so we accept both and parse
// below. Unknown fields are stripped so tenants can't overwrite ownership
// columns like tenantId/createdBy through this endpoint.
const updateAutomationSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    trigger: z.string().max(100).optional(),
    triggerConfig: z.union([z.string(), z.record(z.any())]).optional(),
    nodes: z.union([z.string(), z.array(z.any())]).optional(),
    edges: z.union([z.string(), z.array(z.any())]).optional(),
    status: z.enum(["active", "inactive", "draft", "paused"]).optional(),
    isActive: z.boolean().optional(),
  })
  .partial();

export const updateAutomation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await assertAutomationOwned(req, id);
  const parsed = updateAutomationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new AppError(400, "Invalid automation payload: " + JSON.stringify(parsed.error.flatten()));
  }
  const { name, description, trigger, triggerConfig, nodes, edges, ...rest } = parsed.data;

  // If the caller is publishing (status -> active or isActive=true), make sure
  // the flow is wired up. Without this, toggling an empty automation to
  // `active` produces a runtime "No start node found" error that the user
  // never sees — they just notice nothing happens on triggers.
  const goingActive = rest.status === "active" || rest.isActive === true;
  if (goingActive) {
    const parsedNodesPreview = (() => {
      if (Array.isArray(nodes)) return nodes;
      if (typeof nodes === "string") {
        try { const v = JSON.parse(nodes); return Array.isArray(v) ? v : []; } catch { return []; }
      }
      return [];
    })();
    const parsedEdgesPreview = (() => {
      if (Array.isArray(edges)) return edges;
      if (typeof edges === "string") {
        try { const v = JSON.parse(edges); return Array.isArray(v) ? v : []; } catch { return []; }
      }
      return [];
    })();

    // Resolve the effective node/edge sets: prefer what's in the request, fall
    // back to what's persisted (status-only flips don't re-send the flow).
    let effectiveNodes: { nodeId: string }[] = [];
    let effectiveEdges: { sourceNodeId: string; targetNodeId: string }[] = [];
    if (parsedNodesPreview.length > 0 || parsedEdgesPreview.length > 0) {
      effectiveNodes = parsedNodesPreview.map((n: any) => ({ nodeId: n.id }));
      effectiveEdges = parsedEdgesPreview.map((e: any) => ({
        sourceNodeId: e.source,
        targetNodeId: e.target,
      }));
    } else {
      const [dbNodes, dbEdges] = await Promise.all([
        db.select({ nodeId: automationNodes.nodeId }).from(automationNodes).where(eq(automationNodes.automationId, id)),
        db.select({
          sourceNodeId: automationEdges.sourceNodeId,
          targetNodeId: automationEdges.targetNodeId,
        }).from(automationEdges).where(eq(automationEdges.automationId, id)),
      ]);
      effectiveNodes = dbNodes;
      effectiveEdges = dbEdges;
    }
    const problem = findActivationProblem(effectiveNodes, effectiveEdges);
    if (problem) throw new AppError(400, problem);
  }

  // ✅ Parse nodes and edges safely. Track whether the caller actually sent
  // them — a status-only PUT (or one that omits these fields) must NOT wipe
  // the existing graph.
  const nodesProvided = nodes !== undefined;
  const edgesProvided = edges !== undefined;
  let parsedNodes: any[] = [];
  let parsedEdges: any[] = [];

  if (nodesProvided) {
    try {
      parsedNodes = typeof nodes === "string" ? JSON.parse(nodes) : nodes;
      if (!Array.isArray(parsedNodes)) parsedNodes = [];
    } catch {
      parsedNodes = [];
    }
  }

  if (edgesProvided) {
    try {
      parsedEdges = typeof edges === "string" ? JSON.parse(edges) : edges;
      if (!Array.isArray(parsedEdges)) parsedEdges = [];
    } catch {
      parsedEdges = [];
    }
  }

  // ✅ Normalize node data for variableMapping and remove previews
  for (const node of parsedNodes) {
    if (!node.data) node.data = {};

    if (node.type === "send_template") {
      if (!node.data.variableMapping) node.data.variableMapping = {};

      // Add placeholder headerImageId for IMAGE templates
      if (node.data.templateMeta?.headerType === "IMAGE" && !node.data.headerImageId) {
        node.data.headerImageId = null;
      }

      // Remove UI-only preview/temp fields
      delete node.data.templateMeta;
      delete node.data.imagePreview;
      delete node.data.videoPreview;
      delete node.data.audioPreview;
      delete node.data.documentPreview;
    }
  }

  // ✅ Handle uploaded media (both local + cloud)
  if (req.files && Array.isArray(req.files)) {
    const files = req.files as (Express.Multer.File & { cloudUrl?: string })[];

    for (const file of files) {
      // Field name format: <nodeId>_<field> where nodeId starts with "node_"
      const match = file.fieldname.match(/^node_(.+)_(imageFile|videoFile|audioFile|documentFile)$/);
      if (!match) continue;

      const nodeId = `node_${match[1]}`;
      const field = match[2];
      const node = parsedNodes.find((n) => n.id === nodeId);
      if (!node || !node.data) continue;

      const filePath = file.cloudUrl
        ? file.cloudUrl
        : `/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`;

      console.log(`📤 Updating media for node ${nodeId}: ${filePath}`);

      node.data[field] = {
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        path: filePath,
      };

      node.data[`${field.replace("File", "Preview")}`] = filePath;
    }
  }

  // ✅ Clear any media file fields that are empty objects (JSON-serialised File objects)
  const mediaFileFields = ["imageFile", "videoFile", "audioFile", "documentFile"];
  for (const node of parsedNodes) {
    if (!node.data) continue;
    for (const field of mediaFileFields) {
      const val = node.data[field];
      if (val && typeof val === "object" && !val.path) {
        delete node.data[field];
      }
    }
  }

  // ✅ Update main automation record
  const [automation] = await db
    .update(automations)
    .set({
      name,
      description,
      trigger,
      triggerConfig: triggerConfig
        ? typeof triggerConfig === "string"
          ? JSON.parse(triggerConfig)
          : triggerConfig
        : {},
      ...rest,
    })
    .where(eq(automations.id, id))
    .returning();

  if (!automation) throw new AppError(404, "Automation not found");

  console.log(`🔄 Updating automation: ${automation.id}`);

  // Only replace nodes/edges when the caller explicitly sent them. A
  // status-only or metadata-only update must preserve the existing graph.
  if (nodesProvided) {
    await db.delete(automationNodes).where(eq(automationNodes.automationId, automation.id));
    if (parsedNodes.length > 0) {
      await db.insert(automationNodes).values(
        parsedNodes.map((node: any) => ({
          automationId: automation.id,
          nodeId: node.id,
          type: node.type,
          subtype: node.subtype || node.type,
          position: node.position,
          measured: node.measured,
          data: node.data, // includes variableMapping + headerImageId
          connections: node.connections || [],
        }))
      );
    }
  }

  if (edgesProvided) {
    // Atomic replace inside a transaction so a duplicate-edge violation
    // (23505) doesn't wipe the previously-saved graph.
    try {
      await db.transaction(async (tx) => {
        await tx
          .delete(automationEdges)
          .where(eq(automationEdges.automationId, automation.id));

        if (parsedEdges.length > 0) {
          await tx.insert(automationEdges).values(
            parsedEdges.map((edge: any) => ({
              id: edge.id,
              automationId: automation.id,
              sourceNodeId: edge.source,
              targetNodeId: edge.target,
              sourceHandle: edge.sourceHandle || null,
              animated: !!edge.animated,
            })),
          );
        }
      });
    } catch (err: any) {
      if (err?.code === "23505") {
        throw new AppError(400, "Duplicate edge: an identical connection already exists");
      }
      throw err;
    }
  }

  console.log(
    "✅ Updated automation nodes:",
    parsedNodes.map((n) => ({
      id: n.id,
      type: n.type,
      variableMapping: n.data?.variableMapping || {},
    }))
  );

  res.json({
    success: true,
    automation,
    nodes: parsedNodes,
    edges: parsedEdges,
  });
});




// DELETE automation (cascade deletes nodes + executions due to schema)
export const deleteAutomation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await assertAutomationOwned(req, id);

  const deleted = await db
    .delete(automations)
    .where(eq(automations.id, id))
    .returning();

  // console.log("Deleted rows:", deleted, deleted.length); // Debug log

  if (!deleted.length) throw new AppError(404, "Automation not found");

  // Return a success response properly
  res.status(200).json({ deleted: deleted[0] }); // or res.status(204).send()
});


// Toggle active/inactive
export const toggleAutomation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const automation = await assertAutomationOwned(req, id);

  const nextStatus = automation.status === "active" ? "inactive" : "active";

  // Block publishing an empty/disconnected flow — see updateAutomation for the
  // same guard. Without this, the trigger fires but `executeAutomation` bails
  // out at `No start node found` and the user just sees nothing happen.
  if (nextStatus === "active") {
    const [dbNodes, dbEdges] = await Promise.all([
      db.select({ nodeId: automationNodes.nodeId })
        .from(automationNodes)
        .where(eq(automationNodes.automationId, id)),
      db.select({
        sourceNodeId: automationEdges.sourceNodeId,
        targetNodeId: automationEdges.targetNodeId,
      }).from(automationEdges).where(eq(automationEdges.automationId, id)),
    ]);
    const problem = findActivationProblem(dbNodes, dbEdges);
    if (problem) throw new AppError(400, problem);
  }

  const [updated] = await db.update(automations)
    .set({ status: nextStatus })
    .where(eq(automations.id, id))
    .returning();

  res.json(updated);
});


//
// ─── NODES ─────────────────────────────────────────────────────────────
//

// Add or update nodes (bulk save from visual builder)
export const saveAutomationNodes = asyncHandler(async (req: Request, res: Response) => {
  const { automationId } = req.params;
  await assertAutomationOwned(req, automationId);
  const { nodes } = req.body;
console.log("Saving nodes for automationId:", automationId, "Nodes:", nodes); // Debug log
  // Delete old nodes
const getDelete =   await db.delete(automationNodes).where(eq(automationNodes.automationId, automationId));
console.log("Deleted nodes result:", getDelete); // Debug log
  // Insert new nodes
  if (nodes?.length) {
  const getNodes =   await db.insert(automationNodes).values(
      nodes.map((n: any) => ({
        automationId,
        nodeId: n.id,
        type: n.type,
        subtype: n.subtype,
        position: n.position,
        data: n.data,
        connections: n.connections,
      }))
      );
      console.log("Inserted nodes result:", getNodes)
  }

  res.json({ success: true });
});


// Add or update edges (bulk save from visual builder)
export const saveAutomationEdges = asyncHandler(async (req: Request, res: Response) => {
  const { automationId } = req.params;
  await assertAutomationOwned(req, automationId);
  const { edges } = req.body;

  // Atomic replace: delete + reinsert run in a single transaction so a
  // duplicate-edge violation (23505) doesn't wipe the existing graph.
  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(automationEdges)
        .where(eq(automationEdges.automationId, automationId));

      if (edges?.length) {
        await tx.insert(automationEdges).values(
          edges.map((n: any) => ({
            id: n.id,
            automationId: automationId,
            sourceNodeId: n.source,
            targetNodeId: n.target,
            sourceHandle: n.sourceHandle || null,
            animated: n.animated,
          })),
        );
      }
    });
  } catch (err: any) {
    // 23505 = unique_violation. Surface the unique-handle conflict as a 400
    // so the builder can show a sensible error instead of a generic 500.
    // The transaction has already rolled back, so the prior edges are intact.
    if (err?.code === "23505") {
      throw new AppError(
        400,
        "Duplicate edge: each (source node, target node, source handle) combination must be unique",
      );
    }
    throw err;
  }

  res.json({ success: true });
});


//
// ─── EXECUTION ─────────────────────────────────────────────────────────
//

// Start execution for a contact/conversation
// export const startAutomationExecution = asyncHandler(async (req: Request, res: Response) => {
//   const { automationId } = req.params;
//   const { contactId, conversationId, triggerData } = req.body;

//   const [execution] = await db.insert(automationExecutions).values({
//     automationId,
//     contactId,
//     conversationId,
//     triggerData,
//     status: "running",
//   }).returning();

//   // TODO: kick off worker/queue to actually run nodes step-by-step

//   res.status(201).json(execution);
// });

// Log node execution (for debugging/history)
export const logAutomationNodeExecution = asyncHandler(async (req: Request, res: Response) => {
  const { executionId } = req.params;
  await assertExecutionOwned(req, executionId);
  const { nodeId, nodeType, status, input, output, error } = req.body;

  const [log] = await db.insert(automationExecutionLogs).values({
    executionId,
    nodeId,
    nodeType,
    status,
    input,
    output,
    error,
  }).returning();

  res.status(201).json(log);
});



// UPDATED: Start execution for a contact/conversation
export const startAutomationExecution = asyncHandler(async (req: Request, res: Response) => {
  const { automationId } = req.params;
  await assertAutomationOwned(req, automationId);
  const { contactId, conversationId, triggerData } = req.body;

  // Strip internal-marker (`_`-prefixed) and reserved keys from any
  // client-supplied triggerData so they cannot overwrite execution-internal
  // variables (executionId, contactId, _userReply_*, etc.).
  const safeTriggerData = sanitizeAutomationVariables(triggerData);

  // Create execution record
  const [execution] = await db.insert(automationExecutions).values({
    automationId,
    contactId,
    conversationId,
    triggerData: safeTriggerData,
    status: "running",
  }).returning();

  // Start actual execution using the service
  try {
    // Execute in background (don't await to avoid timeout)
    executionService.executeAutomation(execution.id).catch((error) => {
      console.error(`Background execution failed for ${execution.id}:`, error);
    });

    res.status(201).json({
      ...execution,
      message: "Execution started successfully"
    });
  } catch (error) {
    console.error(`Failed to start execution:`, error);
    
    // Update execution status to failed
    await db.update(automationExecutions)
      .set({ 
        status: 'failed', 
        completedAt: new Date(),
        result: (error as Error).message
      })
      .where(eq(automationExecutions.id, execution.id));

    throw new AppError(500, `Failed to start automation execution: ${(error as Error).message}`);
  }
});


export const startAutomationExecutionFunction = asyncHandler(
  async (contactId: string, conversationId: string, triggerData: any = {}) => {
    // Create execution record in the database

    const getAutomations = await db.query.automations.findMany({
      where: (fields) => 
        and(
          eq(fields.trigger, 'new_conversation'),
          eq(fields.status, 'active')
        )
    }); 
    
    for (const automation of getAutomations) {
      console.log("Found automation for new conversation trigger:", automation.id, automation.name);
 

    const [execution] = await db.insert(automationExecutions).values({
      automationId:automation.id,
      contactId,
      conversationId,
      triggerData,
      status: "running",
    }).returning();

    try {
      // Start automation in background
      executionService.executeAutomation(execution.id).catch((error) => {
        console.error(`Background execution failed for ${execution.id}:`, error);
      });

      // Return execution info (or you could log it, etc.)
      return {
        ...execution,
        message: "Execution started successfully"
      };
    } catch (error: any) {
      console.error(`Failed to start execution:`, error);

      // Mark execution as failed in DB
      await db.update(automationExecutions)
        .set({ 
          status: 'failed', 
          completedAt: new Date(),
          result: error.message 
        })
        .where(eq(automationExecutions.id, execution.id));

      throw new AppError(500, `Failed to start automation execution: ${error.message}`);
    }
  }
  }
);

// Get execution status and logs
export const getExecutionStatus = asyncHandler(async (req: Request, res: Response) => {
  const { executionId } = req.params;
  const { execution } = await assertExecutionOwned(req, executionId);

  // Get logs
  const logs = await db.select()
    .from(automationExecutionLogs)
    .where(eq(automationExecutionLogs.executionId, executionId))
    .orderBy(automationExecutionLogs.executedAt);

  res.json({
    execution,
    logs,
    logCount: logs.length
  });
});

// NEW: Get automation execution history
export const getAutomationExecutions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  await assertAutomationOwned(req, id);
  const { limit = 10, offset = 0 } = req.query;

  const executions = await db.select()
    .from(automationExecutions)
    .where(eq(automationExecutions.automationId, id))
    .limit(parseInt(limit as string))
    .offset(parseInt(offset as string))
    .orderBy(automationExecutions.startedAt);

  res.json(executions);
});

// NEW: Trigger automation for new conversation (call this from your conversation controller)
export const triggerNewConversation = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId, channelId, contactId } = req.body;

  if (!conversationId || !channelId) {
    throw new AppError(400, "conversationId and channelId are required");
  }
  await assertChannelOwned(req, channelId);

  try {
    await triggerService.handleNewConversation(conversationId, channelId, contactId);
    
    res.json({
      success: true,
      message: "New conversation triggers processed",
      conversationId,
      channelId
    });
  } catch (error) {
    console.error("Error processing new conversation triggers:", error);
    throw new AppError(500, `Failed to process triggers: ${(error as Error).message}`);
  }
});

export const seedAutomationTemplates = asyncHandler(async (req: Request, res: Response) => {
  const { channelId } = req.body;
  if (!channelId) throw new AppError(400, "channelId is required");

  const user = (req as any).user;
  if (!user) throw new AppError(401, "Not authenticated");

  const { channels } = await import("@shared/schema");
  const channel = await db.query.channels.findFirst({
    where: eq(channels.id, channelId),
  });
  if (!channel) throw new AppError(404, "Channel not found");

  if (user.role !== "superadmin") {
    const ownerId = user.role === "team" ? user.createdBy : user.id;
    if (channel.createdBy !== ownerId) {
      throw new AppError(403, "Not authorized for this channel");
    }
  }

  const templates = [
    {
      name: "Welcome New Customer",
      description: "Automatically greets new customers when they start a conversation. Sends a welcome message, marks the chat as read, and adds them to a 'New Leads' group.",
      trigger: "new_conversation",
      nodes: [
        { nodeId: "start", type: "start", position: { x: 300, y: 50 }, data: { kind: "start", label: "Start" } },
        { nodeId: "n1", type: "mark_as_read", position: { x: 300, y: 180 }, data: { kind: "mark_as_read", label: "Mark as Read" } },
        { nodeId: "n2", type: "custom_reply", position: { x: 300, y: 310 }, data: { kind: "custom_reply", label: "Welcome Message", message: "👋 Hi there! Welcome to our business.\n\nWe're glad you reached out. How can we help you today?\n\n1️⃣ Product Information\n2️⃣ Place an Order\n3️⃣ Support\n4️⃣ Talk to an Agent" } },
        { nodeId: "n3", type: "add_to_group", position: { x: 300, y: 460 }, data: { kind: "add_to_group", label: "Add to New Leads", groupId: "new_leads" } },
        { nodeId: "n4", type: "end", position: { x: 300, y: 590 }, data: { kind: "end", label: "End" } },
      ],
      edges: [
        { source: "start", target: "n1" },
        { source: "n1", target: "n2" },
        { source: "n2", target: "n3" },
        { source: "n3", target: "n4" },
      ],
    },
    {
      name: "Lead Qualification Bot",
      description: "Qualifies leads by asking for their name and interest. Saves responses as variables, updates the contact record, and routes hot leads to an agent.",
      trigger: "new_conversation",
      nodes: [
        { nodeId: "start", type: "start", position: { x: 300, y: 50 }, data: { kind: "start", label: "Start" } },
        { nodeId: "n1", type: "custom_reply", position: { x: 300, y: 180 }, data: { kind: "custom_reply", label: "Greeting", message: "Hi! 👋 I'd love to help you. Let me ask a few quick questions." } },
        { nodeId: "n2", type: "user_reply", position: { x: 300, y: 310 }, data: { kind: "user_reply", label: "Ask Name", question: "What's your name?", saveAs: "customer_name" } },
        { nodeId: "n3", type: "update_contact", position: { x: 300, y: 440 }, data: { kind: "update_contact", label: "Save Name", contactField: "name", contactFieldValue: "{{customer_name}}" } },
        { nodeId: "n4", type: "user_reply", position: { x: 300, y: 570 }, data: { kind: "user_reply", label: "Ask Interest", question: "Great, {{customer_name}}! What are you interested in?\n\n• Pricing\n• Demo\n• Partnership\n• Other", saveAs: "interest" } },
        { nodeId: "n5", type: "conditions", position: { x: 300, y: 720 }, data: { kind: "conditions", label: "Check Interest", conditionType: "contains", keywords: ["demo", "pricing", "partnership"], matchType: "any" } },
        { nodeId: "n6", type: "assign_user", position: { x: 100, y: 870 }, data: { kind: "assign_user", label: "Assign to Sales" } },
        { nodeId: "n7", type: "custom_reply", position: { x: 500, y: 870 }, data: { kind: "custom_reply", label: "General Reply", message: "Thanks {{customer_name}}! We'll get back to you shortly with more information. 📩" } },
      ],
      edges: [
        { source: "start", target: "n1" },
        { source: "n1", target: "n2" },
        { source: "n2", target: "n3" },
        { source: "n3", target: "n4" },
        { source: "n4", target: "n5" },
        { source: "n5", target: "n6" },
        { source: "n5", target: "n7" },
      ],
    },
    {
      name: "Order Status Lookup",
      description: "Lets customers check their order status. Collects the order ID, calls an external webhook/API to fetch details, and sends the result back.",
      trigger: "message_received",
      nodes: [
        { nodeId: "start", type: "start", position: { x: 300, y: 50 }, data: { kind: "start", label: "Start" } },
        { nodeId: "n1", type: "custom_reply", position: { x: 300, y: 180 }, data: { kind: "custom_reply", label: "Ask for Order", message: "📦 Sure! I can look up your order status.\n\nPlease share your Order ID (e.g., ORD-12345)." } },
        { nodeId: "n2", type: "user_reply", position: { x: 300, y: 310 }, data: { kind: "user_reply", label: "Get Order ID", question: "Please enter your Order ID:", saveAs: "order_id" } },
        { nodeId: "n3", type: "set_variable", position: { x: 300, y: 440 }, data: { kind: "set_variable", label: "Store Order ID", variableName: "order_id", variableSource: "from_message", variableValue: "" } },
        { nodeId: "n4", type: "webhook", position: { x: 300, y: 570 }, data: { kind: "webhook", label: "Fetch Order Status", webhookUrl: "https://your-api.com/orders/{{order_id}}", webhookMethod: "GET" } },
        { nodeId: "n5", type: "custom_reply", position: { x: 300, y: 700 }, data: { kind: "custom_reply", label: "Send Status", message: "📋 Here's your order update:\n\nOrder: {{order_id}}\nStatus: Order details will appear here from your API response.\n\nNeed more help? Just ask!" } },
      ],
      edges: [
        { source: "start", target: "n1" },
        { source: "n1", target: "n2" },
        { source: "n2", target: "n3" },
        { source: "n3", target: "n4" },
        { source: "n4", target: "n5" },
      ],
    },
    {
      name: "Auto-Reply & Agent Handoff",
      description: "Instantly acknowledges incoming messages, sends a helpful auto-reply, waits briefly, then assigns the conversation to an available agent.",
      trigger: "message_received",
      nodes: [
        { nodeId: "start", type: "start", position: { x: 300, y: 50 }, data: { kind: "start", label: "Start" } },
        { nodeId: "n1", type: "mark_as_read", position: { x: 300, y: 180 }, data: { kind: "mark_as_read", label: "Mark Read" } },
        { nodeId: "n2", type: "custom_reply", position: { x: 300, y: 310 }, data: { kind: "custom_reply", label: "Auto Reply", message: "Thanks for your message! 🙏\n\nOne of our team members will be with you shortly. In the meantime, feel free to share any details about your query." } },
        { nodeId: "n3", type: "time_gap", position: { x: 300, y: 440 }, data: { kind: "time_gap", label: "Wait 30s", delay: 30 } },
        { nodeId: "n4", type: "assign_user", position: { x: 300, y: 570 }, data: { kind: "assign_user", label: "Assign Agent" } },
        { nodeId: "n5", type: "end", position: { x: 300, y: 700 }, data: { kind: "end", label: "End" } },
      ],
      edges: [
        { source: "start", target: "n1" },
        { source: "n1", target: "n2" },
        { source: "n2", target: "n3" },
        { source: "n3", target: "n4" },
        { source: "n4", target: "n5" },
      ],
    },
    {
      name: "Store Locator with Media",
      description: "Sends product images/catalog and store location when a customer asks about visiting. Great for retail businesses wanting to share directions and visuals.",
      trigger: "message_received",
      nodes: [
        { nodeId: "start", type: "start", position: { x: 300, y: 50 }, data: { kind: "start", label: "Start" } },
        { nodeId: "n1", type: "custom_reply", position: { x: 300, y: 180 }, data: { kind: "custom_reply", label: "Store Info", message: "🏪 We'd love to see you! Here are our store details:" } },
        { nodeId: "n2", type: "send_media", position: { x: 300, y: 310 }, data: { kind: "send_media", label: "Store Photo", mediaType: "image", mediaUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800", mediaCaption: "📸 Our flagship store - open Mon-Sat, 9 AM to 8 PM" } },
        { nodeId: "n3", type: "send_location", position: { x: 300, y: 460 }, data: { kind: "send_location", label: "Store Location", latitude: "28.6139", longitude: "77.2090", locationName: "Our Flagship Store", locationAddress: "123 Main Street, New Delhi, India" } },
        { nodeId: "n4", type: "custom_reply", position: { x: 300, y: 610 }, data: { kind: "custom_reply", label: "Follow Up", message: "📍 Here's our location above! You can click it for directions in Google Maps.\n\nWould you like to:\n• Book an appointment\n• Check product availability\n• Talk to our team" } },
        { nodeId: "n5", type: "end", position: { x: 300, y: 740 }, data: { kind: "end", label: "End" } },
      ],
      edges: [
        { source: "start", target: "n1" },
        { source: "n1", target: "n2" },
        { source: "n2", target: "n3" },
        { source: "n3", target: "n4" },
        { source: "n4", target: "n5" },
      ],
    },
    {
      name: "Interactive Menu with List",
      description: "Sends an interactive list message letting customers pick from services/products. Great for restaurants, service businesses, or support ticket categories.",
      trigger: "new_conversation",
      nodes: [
        { nodeId: "start", type: "start", position: { x: 300, y: 50 }, data: { kind: "start", label: "Start" } },
        { nodeId: "n1", type: "custom_reply", position: { x: 300, y: 180 }, data: { kind: "custom_reply", label: "Welcome", message: "Welcome! 🎉 Let me show you what we can help with." } },
        { nodeId: "n2", type: "send_list_message", position: { x: 300, y: 330 }, data: { kind: "send_list_message", label: "Service Menu", message: "Please select from our services below:", listButtonText: "View Services", listSections: [{ title: "Sales & Products", rows: [{ id: "pricing", title: "💰 Pricing Info", description: "Get our latest pricing and offers" }, { id: "catalog", title: "📦 Product Catalog", description: "Browse our full product range" }, { id: "demo", title: "🎯 Book a Demo", description: "Schedule a personalized demo" }] }, { title: "Support", rows: [{ id: "technical", title: "🔧 Technical Support", description: "Get help with technical issues" }, { id: "billing", title: "💳 Billing Help", description: "Questions about invoices or payments" }, { id: "agent", title: "👤 Talk to Agent", description: "Connect with a human agent" }] }] } },
        { nodeId: "n3", type: "set_variable", position: { x: 300, y: 500 }, data: { kind: "set_variable", label: "Save Choice", variableName: "menu_choice", variableSource: "from_message", variableValue: "" } },
        { nodeId: "n4", type: "custom_reply", position: { x: 300, y: 640 }, data: { kind: "custom_reply", label: "Confirm", message: "Great choice! You selected: {{menu_choice}}\n\nLet me connect you with the right team. 🔄" } },
        { nodeId: "n5", type: "assign_user", position: { x: 300, y: 770 }, data: { kind: "assign_user", label: "Route to Team" } },
      ],
      edges: [
        { source: "start", target: "n1" },
        { source: "n1", target: "n2" },
        { source: "n2", target: "n3" },
        { source: "n3", target: "n4" },
        { source: "n4", target: "n5" },
      ],
    },
  ];

  const created = [];

  for (const tpl of templates) {
    const existing = await db.query.automations.findFirst({
      where: and(eq(automations.channelId, channelId), eq(automations.name, tpl.name)),
    });
    if (existing) continue;

    const [automation] = await db.insert(automations).values({
      channelId,
      name: tpl.name,
      description: tpl.description,
      trigger: tpl.trigger,
      status: "inactive",
    }).returning();

    for (const node of tpl.nodes) {
      await db.insert(automationNodes).values({
        id: `${automation.id}_${node.nodeId}`,
        automationId: automation.id,
        nodeId: node.nodeId,
        type: node.type,
        position: node.position,
        data: node.data,
      });
    }

    for (const edge of tpl.edges) {
      await db.insert(automationEdges).values({
        id: `${automation.id}_${edge.source}_${edge.target}`,
        automationId: automation.id,
        sourceNodeId: edge.source,
        targetNodeId: edge.target,
        sourceHandle: edge.sourceHandle || null,
      });
    }

    created.push({ id: automation.id, name: automation.name });
  }

  res.json({
    success: true,
    message: `Created ${created.length} automation templates`,
    created,
  });
});

// NEW: Trigger automation for message received
export const triggerMessageReceived = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId, message, channelId, contactId } = req.body;

  if (!conversationId || !message || !channelId) {
    throw new AppError(400, "conversationId, message, and channelId are required");
  }
  await assertChannelOwned(req, channelId);

  try {
    await triggerService.handleMessageReceived(conversationId, message, channelId, contactId);
    
    res.json({
      success: true,
      message: "Message received triggers processed",
      conversationId,
      channelId
    });
  } catch (error) {
    console.error("Error processing message triggers:", error);
    throw new AppError(500, `Failed to process triggers: ${(error as Error).message}`);
  }
});