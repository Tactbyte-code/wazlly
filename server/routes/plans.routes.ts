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
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  syncPlanToGateway,
  syncAllPlansToGateways,
} from "../controllers/plans.controller";
import type { Express } from "express";

export function registerPlansRoutes(app: Express) {
  app.get("/api/admin/plans", getAllPlans);

  app.get("/api/admin/plans/:id", requireAuth, getPlanById);

  app.post("/api/admin/plans", requireAuth, requireRole("superadmin"), createPlan);

  app.put("/api/admin/plans/:id", requireAuth, requireRole("superadmin"), updatePlan);

  app.delete("/api/admin/plans/:id", requireAuth, requireRole("superadmin"), deletePlan);

  app.post("/api/admin/plans/:id/sync-gateway", requireAuth, requireRole("superadmin"), syncPlanToGateway);

  app.post("/api/admin/plans/sync-all-gateways", requireAuth, requireRole("superadmin"), syncAllPlansToGateways);
}
