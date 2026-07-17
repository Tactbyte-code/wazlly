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
import * as dashboardController from "../controllers/dashboard.controller";
import { extractChannelId } from "../middlewares/channel.middleware";
import { requireAuth, requirePermission } from "../middlewares/auth.middleware";
import { PERMISSIONS } from "@shared/schema";


export function registerDashboardRoutes(app: Express) {
  // Get dashboard statistics
  app.get("/api/dashboard/stats",
    requireAuth,
    extractChannelId,
    dashboardController.getDashboardStats
  );

  app.get("/api/dashboard/admin/stats", requireAuth, dashboardController.getDashboardStatsForAdmin);
  app.get("/api/dashboard/user/stats", requireAuth, dashboardController.getDashboardStatsForUser);

  // Get analytics data
  app.get("/api/analytics",
    requireAuth,
    extractChannelId,
    requirePermission(PERMISSIONS.ANALYTICS_VIEW),
    dashboardController.getAnalytics
  );

  // Create analytics entry
  app.post("/api/analytics", requireAuth, dashboardController.createAnalytics);
}