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

import { z } from "zod";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import type { Express } from "express";

import { insertAutomationSchema, insertAutomationNodeSchema } from "@shared/schema";
import { requireAuth } from "../middlewares/auth.middleware";
import { extractChannelId } from "../middlewares/channel.middleware";
// import * as automationController from "../controllers/automation.controller";

import {
  getAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  saveAutomationNodes,
  saveAutomationEdges,
  startAutomationExecution,
  logAutomationNodeExecution,
  getExecutionStatus,
  getAutomationExecutions,
  triggerNewConversation,
  triggerMessageReceived,
  seedAutomationTemplates
} from "../controllers/automation.controller";
import { cleanupExpiredExecutions, getAllPendingExecutions } from "server/controllers/webhooks.controller";
import { handleDigitalOceanUpload, upload } from "server/middlewares/upload.middleware";
import { requireSubscription } from "server/middlewares/requireSubscription";

// Schema for automation + nodes (used for builder save)
const automationWithNodesSchema = z.object({
  automation: insertAutomationSchema,
  nodes: z.array(insertAutomationNodeSchema),
});





export function registerAutomationRoutes(app: Express) {
  //
  // ─── AUTOMATION CRUD ──────────────────────────────────────────────
  //


  // Get all automations
  app.get(
    "/api/automations",
    requireAuth,
    extractChannelId,
    getAutomations
  );

  // Get single automation with nodes
  app.get(
    "/api/automations/:id",
    requireAuth,
    extractChannelId,
    getAutomation
  );

  // Create automation
  app.post(
    "/api/automations",
    requireAuth,
    extractChannelId,
    requireSubscription("automation"),
    upload.any(),
    handleDigitalOceanUpload,
    createAutomation
  );

  // Update automation
  app.put(
    "/api/automations/:id",
    requireAuth,
    extractChannelId,
    upload.any(),
    handleDigitalOceanUpload,
    updateAutomation
  );

  // Delete automation
  app.delete(
    "/api/automations/:id",
    requireAuth,
    extractChannelId,
    deleteAutomation
  );

  // Toggle status active/inactive
  app.post(
    "/api/automations/:id/toggle",
    requireAuth,
    extractChannelId,
    toggleAutomation
  );

  //
  // ─── NODES (visual builder) ──────────────────────────────────────
  //

  // Save automation nodes (bulk replace from builder)
  app.post(
    "/api/automations/:automationId/nodes",
    requireAuth,
    extractChannelId,
    saveAutomationNodes
  );

    // Save automation edges (bulk replace from builder)
  app.post(
    "/api/automations/:automationId/edges",
    requireAuth,
    extractChannelId,
    saveAutomationEdges
  );

  //
  // ─── EXECUTION ───────────────────────────────────────────────────
  //

  // Start execution for a contact/conversation
  app.post(
    "/api/automations/:automationId/executions",
    requireAuth,
    extractChannelId,
    startAutomationExecution
  );

  // Log node execution (worker will call this per node)
  app.post(
    "/api/automations/executions/:executionId/logs",
    requireAuth,
    extractChannelId,
    logAutomationNodeExecution
  );

  // Alias kept for backward compatibility with older clients.
  app.post("/api/automations/:automationId/execute", requireAuth, startAutomationExecution);
  app.get("/api/automations/:id/executions", requireAuth, getAutomationExecutions);
  app.get("/api/automations/executions/:executionId/status", requireAuth, getExecutionStatus);

  app.post("/api/automations/triggers/new-conversation", requireAuth, triggerNewConversation);
  app.post("/api/automations/triggers/message-received", requireAuth, triggerMessageReceived);

  app.get('/api/automations/pending-executions', requireAuth, getAllPendingExecutions);
  app.post('/api/automations/cleanup-expired', requireAuth, cleanupExpiredExecutions);

  app.post('/api/automations/seed-templates', requireAuth, seedAutomationTemplates);
}
