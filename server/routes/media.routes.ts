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
import crypto from "crypto";
import { requireAuth } from "../middlewares/auth.middleware";

export function registerMediaRoutes(app: Express) {
  // Get media upload URL
  app.post("/api/media/upload-url", requireAuth, async (req, res) => {
    try {
      const { fileName, fileType } = req.body;
      
      // Generate a unique file name
      const fileExtension = fileName.split('.').pop();
      const uniqueFileName = `${crypto.randomBytes(16).toString('hex')}.${fileExtension}`;
      
      // Mock upload URL for now
      const uploadUrl = `https://storage.example.com/upload/${uniqueFileName}`;
      const fileUrl = `https://storage.example.com/files/${uniqueFileName}`;
      
      res.json({
        uploadUrl,
        fileUrl
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });
}