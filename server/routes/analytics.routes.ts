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
import * as analyticsController from "../controllers/analytics.controller";
import * as dashboardController from "../controllers/dashboard.controller";
import { extractChannelId } from "../middlewares/channel.middleware";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware";
import { PERMISSIONS } from "@shared/schema";


export function registerAnalyticsRoutes(app: Express) {
  // Legacy analytics endpoint for backward compatibility
  app.get("/api/analytics",requireAuth,
  requirePermission(PERMISSIONS.ANALYTICS_VIEW), dashboardController.getAnalytics);
  
  app.get("/api/analytics/messages", requireAuth, requirePermission(PERMISSIONS.ANALYTICS_VIEW), analyticsController.getMessageAnalytics);
  app.get("/api/analytics/campaigns", requireAuth, requirePermission(PERMISSIONS.ANALYTICS_VIEW), analyticsController.getCampaignAnalytics);
  app.get("/api/analytics/campaigns/:campaignId", requireAuth, requirePermission(PERMISSIONS.ANALYTICS_VIEW), analyticsController.getCampaignAnalyticsById);
  app.get("/api/analytics/export",requireAuth,
  requirePermission(PERMISSIONS.ANALYTICS_EXPORT), analyticsController.exportAnalytics);
}