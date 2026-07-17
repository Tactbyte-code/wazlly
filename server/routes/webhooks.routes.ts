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
import * as webhooksController from "../controllers/webhooks.controller";
import { requireAuth } from "../middlewares/auth.middleware";

export function registerWebhookRoutes(app: Express) {
  // Get webhook configs
  app.get("/api/webhook-configs-channel-id/:id", requireAuth, webhooksController.getWebhookConfigsByChannelId);

  app.get("/api/webhook-configs", requireAuth, webhooksController.getWebhookConfigs);

  // Create webhook config
  app.post("/api/webhook-configs", requireAuth, webhooksController.createWebhookConfig);

  // Update webhook config
  app.patch("/api/webhook-configs/:id", requireAuth, webhooksController.updateWebhookConfig);

  // Delete webhook config
  app.delete("/api/webhook-configs/:id", requireAuth, webhooksController.deleteWebhookConfig);

  // Test webhook
  app.post("/api/webhook-configs/:id/test", requireAuth, webhooksController.testWebhook);

  // Get global webhook URL
  app.get("/api/webhook/global-url", requireAuth, webhooksController.getGlobalWebhookUrl);

  // Global webhook endpoint
  app.all("/webhook/global", webhooksController.handleWebhook);
  app.all("/webhook/:id", webhooksController.handleWebhook);

  // ==================== PAYMENT WEBHOOKS ====================

  app.post('/webhooks/razorpay', webhooksController.razorpayWebhook);

  // Stripe Webhook
  app.post('/webhooks/stripe', webhooksController.stripeWebhook);

  // PayPal Webhook
  app.post('/webhooks/paypal', webhooksController.paypalWebhook);

  // Paystack Webhook
  app.post('/webhooks/paystack', webhooksController.paystackWebhook);

  // Mercado Pago Webhook
  app.post('/webhooks/mercadopago', webhooksController.mercadopagoWebhook);
} 
