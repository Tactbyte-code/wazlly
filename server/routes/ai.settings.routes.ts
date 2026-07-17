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
  getAISettings,
  createAISettings,
  updateAISettings,
  deleteAISettings,
  getAISettingByChannelId,
  getAISettingsDiagnostics
} from "../controllers/ai.settings.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import type { Express } from "express";

export function registerAISettingsRoutes(app: Express) {

// Tenant admins manage AI settings for the channels THEY own; superadmin
// retains full system-wide access. Per-row tenant scoping (so an admin
// cannot read/write another tenant's channel) is enforced inside each
// controller — opening the role gate alone would be a data leak.
const aiRoles = requireRole("superadmin", "admin");

app.get("/api/ai-settings", requireAuth, aiRoles, getAISettings);
// Diagnostics must be registered BEFORE the /:id parameterised route is added
// (none today, but defending against future routes shadowing the literal path).
app.get("/api/ai-settings/diagnostics", requireAuth, aiRoles, getAISettingsDiagnostics);
app.post("/api/ai-settings", requireAuth, aiRoles, createAISettings);
app.put("/api/ai-settings/:id", requireAuth, aiRoles, updateAISettings);
app.delete("/api/ai-settings/:id", requireAuth, aiRoles, deleteAISettings);
app.get("/api/ai-settings/channel/:channelId", requireAuth, aiRoles, getAISettingByChannelId);

}
