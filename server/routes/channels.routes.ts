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
import * as channelsController from "../controllers/channels.controller";
import { validateRequest } from "../middlewares/validation.middleware";
import { insertChannelSchema } from "@shared/schema";
import { requireAuth, requireRole } from "server/middlewares/auth.middleware";
import { requireSubscription } from "server/middlewares/requireSubscription";
import multer from "multer";
import { db } from "../db";
import { whatsappChannels } from "@shared/schema";

const profileUpload = multer({ dest: "uploads/profile-photos/", limits: { fileSize: 5 * 1024 * 1024 } });

export function registerChannelRoutes(app: Express) {
  app.get("/api/channels/all", requireAuth, requireRole("superadmin"), async (req, res) => {
    try {
      const allChannels = await db.select({
        id: whatsappChannels.id,
        name: whatsappChannels.name,
        phoneNumber: whatsappChannels.phoneNumber,
      }).from(whatsappChannels);
      res.json({ success: true, data: allChannels });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.get("/api/channels", requireAuth, channelsController.getChannels);

  app.post("/api/channels/userid", requireAuth, channelsController.getChannelsByUserId)

  // Get active channel
  app.get("/api/channels/active",requireAuth, channelsController.getActiveChannel);

  // Create channel
  app.post("/api/channels",
    requireAuth, validateRequest(insertChannelSchema), requireSubscription("channel"),
    channelsController.createChannel
  );

  // embedded signup
   app.post(
  "/api/whatsapp/embedded-signup",
  requireAuth,
  requireSubscription("channel"),
  channelsController.embeddedSignup
);

  // Update channel
  app.put("/api/channels/:id",requireAuth,  channelsController.updateChannel);

  // Disconnect channel (deregister from Cloud API)
  app.post("/api/channels/:id/disconnect", requireAuth, channelsController.disconnectChannel);

  // Delete channel
  app.delete("/api/channels/:id", requireAuth, channelsController.deleteChannel);

  app.post("/api/channels/:id/health", requireAuth, channelsController.checkChannelHealth);
  app.post("/api/channels/health-check-all", requireAuth, channelsController.checkAllChannelsHealth);

  // WhatsApp Business Profile
  app.get("/api/channels/:id/profile", requireAuth, channelsController.getBusinessProfile);
  app.post("/api/channels/:id/profile", requireAuth, channelsController.updateBusinessProfile);
  app.post("/api/channels/:id/profile/photo", requireAuth, profileUpload.single("photo"), channelsController.uploadProfilePhoto);

  // Display Name Management
  app.get("/api/channels/:id/display-name", requireAuth, channelsController.getDisplayName);
  app.post("/api/channels/:id/display-name", requireAuth, channelsController.updateDisplayName);

  app.get("/api/channels/:id/messaging-limit", requireAuth, channelsController.getMessagingLimit);

  app.get("/api/whatsapp/test-credentials", requireAuth, requireRole("superadmin"), channelsController.testCredentials);

  app.get("/api/admin/channels", requireAuth, requireRole("superadmin"), channelsController.getAllChannelsAdmin);
  app.get("/api/admin/channel-signup-logs", requireAuth, requireRole("superadmin"), channelsController.getSignupLogs);

  // Webhook subscription management
  app.get("/api/channels/:id/webhook-subscription", requireAuth, channelsController.getWebhookSubscription);
  app.post("/api/channels/:id/webhook-resubscribe", requireAuth, channelsController.resubscribeWebhook);
  app.post("/api/channels/webhook-resubscribe-all", requireAuth, channelsController.resubscribeAllWebhooks);
}