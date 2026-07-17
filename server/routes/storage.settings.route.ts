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

import express from "express";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import {
  getStorageSettings,
  getActiveStorage,
  updateStorageSetting,
  deleteStorageSetting,
  testStorageConnection,
} from "../controllers/storage.settings.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import type { Express } from "express";

export function registerStorageSettingsRoutes(app: Express) {
  app.get("/api/storage-settings", requireAuth, requireRole("superadmin"), getStorageSettings);
  app.get("/api/storage-settings/active", requireAuth, requireRole("superadmin"), getActiveStorage);
  app.post("/api/storage-settings/update", requireAuth, requireRole("superadmin"), updateStorageSetting);
  app.post("/api/storage-settings/test", requireAuth, requireRole("superadmin"), testStorageConnection);
  app.delete("/api/storage-settings/:id", requireAuth, requireRole("superadmin"), deleteStorageSetting);
}
