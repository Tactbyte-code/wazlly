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

import type { Express } from "express";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import * as messagesController from "../controllers/messages.controller";
import { validateRequest } from "../middlewares/validation.middleware";
import { insertMessageSchema } from "@shared/schema";
import { handleDigitalOceanUpload, upload } from "../middlewares/upload.middleware";
import { requireAuth } from "../middlewares/auth.middleware";

export function registerMessageRoutes(app: Express) {
  // Get messages for conversation
  app.get("/api/conversations/:conversationId/messages", requireAuth, messagesController.getMessages);

  // Create message in conversation
  app.post("/api/conversations/:conversationId/messages", requireAuth, upload.single("media"), handleDigitalOceanUpload,
    messagesController.createMessage
  );

  // Send WhatsApp message
  app.post("/api/messages/send", requireAuth, messagesController.sendMessage);

  // get media url
  app.get("/api/messages/media-url", requireAuth, messagesController.getMediaUrl);

  // get media proxy
  app.get("/api/messages/media-proxy", requireAuth, messagesController.getMediaProxy);
  
}