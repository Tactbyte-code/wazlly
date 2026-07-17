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

import { Express } from "express";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import {
  saveWhatsappConfig,
  getMyWhatsappConfig,
  updateWhatsappConfig,
  deleteWhatsappConfig,
} from "../controllers/whatsappConfig.controller";
import { requireAuth, requireRole } from
  "server/middlewares/auth.middleware";

export function registerWhatsappConfigRoutes(
  app: Express
) {

  // Get config (all authenticated users can read - needed for embedded signup flow)
  app.get(
    "/api/embedded/config",
    requireAuth,
    getMyWhatsappConfig
  );

  // Create / Update (superadmin only)
  app.post(
    "/api/embedded/config",
    requireAuth,
    requireRole("superadmin"),
    saveWhatsappConfig
  );

  // Update by id (superadmin only)
  app.put(
    "/api/embedded/config/:id",
    requireAuth,
    requireRole("superadmin"),
    updateWhatsappConfig
  );

  // Delete (superadmin only)
  app.delete(
    "/api/embedded/config",
    requireAuth,
    requireRole("superadmin"),
    deleteWhatsappConfig
  );
}
