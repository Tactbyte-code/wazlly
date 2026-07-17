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

import { Request, Response } from "express";
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { storageSettings } from "@shared/schema";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { invalidateDOClientCache } from "../config/digitalOceanConfig";

// ✅ Get all storage configs
export const getStorageSettings = async (req: Request, res: Response) => {
  try {
    const [settings] = await db.select().from(storageSettings);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch storage settings" });
  }
};

// ✅ Get active storage config
export const getActiveStorage = async (req: Request, res: Response) => {
  try {
    const active = await db
      .select()
      .from(storageSettings)
      .where(eq(storageSettings.isActive, true))
      .limit(1);
    res.json(active[0] || null);
  } catch {
    res.status(500).json({ error: "Failed to fetch active storage" });
  }
};

// ✅ Update or create storage
export const updateStorageSetting = async (req: Request, res: Response) => {
  try {
    const {
      id,
      spaceName,
      endpoint,
      region,
      accessKey,
      secretKey,
      isActive,
    } = req.body;

    if (!spaceName || !endpoint || !region || !accessKey || !secretKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (isActive) {
      // deactivate all others
      await db.update(storageSettings).set({ isActive: false });
    }

    if (id) {
      // update existing
      await db
        .update(storageSettings)
        .set({
          spaceName,
          endpoint,
          region,
          accessKey,
          secretKey,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(storageSettings.id, id));
    } else {
      // insert new
      await db.insert(storageSettings).values({
        spaceName,
        endpoint,
        region,
        accessKey,
        secretKey,
        isActive,
      });
    }

    invalidateDOClientCache();
    res.json({ success: true });
  } catch (error) {
    console.error("Storage update error:", error);
    res.status(500).json({ error: "Failed to update storage" });
  }
};

export const testStorageConnection = async (req: Request, res: Response) => {
  try {
    const [config] = await db
      .select()
      .from(storageSettings)
      .where(eq(storageSettings.isActive, true))
      .limit(1);

    if (!config) {
      return res.json({ success: false, status: "offline", error: "No active storage configuration found" });
    }

    let cleanEndpoint = config.endpoint.trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(cleanEndpoint)) {
      cleanEndpoint = `https://${cleanEndpoint}`;
    }
    const urlParts = new URL(cleanEndpoint);
    const hostParts = urlParts.host.split('.');
    if (hostParts.length > 3) {
      hostParts.shift();
      urlParts.host = hostParts.join('.');
      cleanEndpoint = urlParts.toString();
    }

    const s3Client = new S3Client({
      endpoint: cleanEndpoint,
      region: config.region,
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: false,
    });

    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: config.spaceName }));
      return res.json({ success: true, status: "online" });
    } finally {
      s3Client.destroy();
    }
  } catch (error: any) {
    const message = error?.name === "NotFound"
      ? "Bucket not found"
      : error?.name === "CredentialsProviderError" || error?.Code === "InvalidAccessKeyId"
        ? "Invalid credentials"
        : error?.message || "Connection failed";
    return res.json({ success: false, status: "offline", error: message });
  }
};

// ✅ Delete
export const deleteStorageSetting = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(storageSettings).where(eq(storageSettings.id, id));
    invalidateDOClientCache();
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete storage" });
  }
};
