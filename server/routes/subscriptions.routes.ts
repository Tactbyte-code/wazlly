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

import { requireAuth, requireRole } from "server/middlewares/auth.middleware";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import {
  getActiveSubscriptionByUserId,
  getAllSubscriptions,
  getSubscriptionById,
  getSubscriptionsByUserId,
  createSubscription,
  AssignSubscription,
  updateSubscription,
  cancelSubscription,
  renewSubscription,
  toggleAutoRenew,
  checkExpiredSubscriptions,
} from "../controllers/subscriptions.controller";
import type { Express } from "express";

export function registerSubscriptionsRoutes(app: Express) {
  app.get("/api/subscriptions", requireAuth, requireRole("superadmin"), getAllSubscriptions);

  app.get("/api/admin/subscriptions/:id", requireAuth, requireRole("superadmin"), getSubscriptionById);

  app.get("/api/subscriptions/user/:userId", requireAuth, getSubscriptionsByUserId);

  app.get("/api/subscriptions/active/:userId", requireAuth, getActiveSubscriptionByUserId);

  app.post("/api/subscriptions", requireAuth, createSubscription);

  app.post("/api/assignSubscription", requireAuth, requireRole("superadmin"), AssignSubscription);

  app.put("/api/admin/subscriptions/:id", requireAuth, requireRole("superadmin"), updateSubscription);

  app.delete("/api/subscriptions/:id", requireAuth, cancelSubscription);

  app.put("/api/subscriptions/renew/:id", requireAuth, renewSubscription);

  app.put("/api/subscriptions/toggle-autorenew/:id", requireAuth, toggleAutoRenew);

  app.put("/api/admin/subscriptions/expire", requireAuth, requireRole("superadmin"), checkExpiredSubscriptions);
}
