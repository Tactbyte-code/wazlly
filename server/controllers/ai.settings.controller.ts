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
import { eq, ne, and, inArray } from "drizzle-orm";
import { aiSettings } from "@shared/schema";
import { storage } from "../storage";

// ---------------------------------------------------------------------------
// Tenant scoping helpers
// ---------------------------------------------------------------------------
//
// AI settings rows reference a channel; channels are owned by a tenant admin
// user (resolved via storage.getChannelsByUserId, the same helper used by
// templates/contacts/webhooks). A tenant admin may only read or modify rows
// whose channel is in their owned set; superadmin bypasses the check.
// `team` users inherit their parent admin's owned channels via `createdBy`,
// matching how other tenant-scoped controllers behave.

type SessionUser = { id: string; role: string; createdBy?: string | null };

function getSessionUser(req: Request): SessionUser | null {
  const u = (req as any).session?.user ?? req.user;
  return u ? (u as SessionUser) : null;
}

async function getOwnedChannelIds(user: SessionUser): Promise<string[]> {
  const ownerId = user.role === "team" ? (user.createdBy ?? user.id) : user.id;
  const channels = await storage.getChannelsByUserId(ownerId);
  return channels.map((c: any) => c.id);
}

// ✅ Fetch AI settings (scoped per tenant)
export const getAISettings = async (req: Request, res: Response) => {
  try {
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    if (user.role === "superadmin") {
      const settings = await db.select().from(aiSettings);
      return res.json(settings);
    }

    const ownedChannelIds = await getOwnedChannelIds(user);
    if (ownedChannelIds.length === 0) {
      return res.json([]);
    }
    const settings = await db
      .select()
      .from(aiSettings)
      .where(inArray(aiSettings.channelId, ownedChannelIds));
    res.json(settings);
  } catch (error) {
    console.error("❌ Error fetching AI settings:", error);
    res.status(500).json({ error: "Failed to fetch AI settings" });
  }
};

export const getAISettingByChannelId = async (req: Request, res: Response) => {
  try {
    const { channelId } = req.params;
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    if (user.role !== "superadmin") {
      const ownedChannelIds = await getOwnedChannelIds(user);
      if (!ownedChannelIds.includes(channelId)) {
        return res.status(403).json({ error: "Access denied to this channel" });
      }
    }

    const settings = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.channelId, channelId))
      .limit(1);

    return res.status(200).json(settings[0] ?? null);
  } catch (error) {
    console.error("❌ Error fetching AI setting by channelId:", error);
    return res.status(500).json({
      error: "Failed to fetch AI settings for channel",
    });
  }
};


// ✅ Create new AI settings
export const createAISettings = async (req: Request, res: Response) => {
  try {
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const {
      provider,
      channelId,
      apiKey,
      model,
      endpoint,
      temperature,
      maxTokens,
      isActive,
      words
    } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }

    // Tenant admins must scope settings to one of their own channels.
    // (Superadmin may create channel-less / system rows, matching prior
    // behaviour.)
    if (user.role !== "superadmin") {
      if (!channelId) {
        return res.status(400).json({ error: "channelId is required" });
      }
      const ownedChannelIds = await getOwnedChannelIds(user);
      if (!ownedChannelIds.includes(channelId)) {
        return res.status(403).json({ error: "Access denied to this channel" });
      }
    }

    // 🔥 Prevent multiple settings for same channel
    if (channelId) {
      const existing = await db
        .select()
        .from(aiSettings)
        .where(eq(aiSettings.channelId, channelId))
        .limit(1);

      if (existing.length > 0) {
        return res.status(400).json({
          error: "AI settings already exist for this channel",
          data: existing[0],
        });
      }
    }

    // Normalize words input
    let wordsArray: string[] = [];
    if (typeof words === "string") {
      try {
        wordsArray = JSON.parse(words);
      } catch {
        wordsArray = words
          .split(",")
          .map((w: string) => w.trim())
          .filter(Boolean);
      }
    } else if (Array.isArray(words)) {
      wordsArray = words.map((w) => w.trim()).filter(Boolean);
    }

    // If activating this setting, deactivate others
    if (isActive && channelId) {
      await db
        .update(aiSettings)
        .set({ isActive: false })
        .where(eq(aiSettings.channelId, channelId));
    }

    const [inserted] = await db
      .insert(aiSettings)
      .values({
        provider: provider || "openai",
        channelId: channelId || null,
        apiKey,
        model: model || "gpt-4o-mini",
        endpoint: endpoint || "https://api.openai.com/v1",
        temperature: temperature?.toString() || "0.7",
        maxTokens: maxTokens?.toString() || "2048",
        isActive: !!isActive,
        words: wordsArray,
      })
      .returning();

    res.status(201).json(inserted);
  } catch (error) {
    console.error("❌ Error creating AI setting:", error);
    res.status(500).json({ error: "Failed to create AI setting" });
  }
};


// ✅ Update existing AI settings
export const updateAISettings = async (req: Request, res: Response) => {
  try {
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const { id } = req.params;
    const { apiKey, provider, model, endpoint, temperature, maxTokens, isActive, words } = req.body;

    const existing = await db.query.aiSettings.findFirst({
      where: (table, { eq }) => eq(table.id, id),
    });

    if (!existing) {
      return res.status(404).json({ error: "Setting not found" });
    }

    // Tenant scoping: an admin may only update rows attached to one of
    // their channels. A row with no channelId (legacy / system row) is
    // superadmin-only.
    if (user.role !== "superadmin") {
      if (!existing.channelId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const ownedChannelIds = await getOwnedChannelIds(user);
      if (!ownedChannelIds.includes(existing.channelId)) {
        return res.status(403).json({ error: "Access denied to this channel" });
      }
    }

    // Normalize words input
    let wordsArray: string[] | undefined;
    if (typeof words === "string") {
      try {
        wordsArray = JSON.parse(words);
      } catch {
        wordsArray = words.split(",").map((w: string) => w.trim()).filter(Boolean);
      }
    } else if (Array.isArray(words)) {
      wordsArray = words.map((w) => w.trim()).filter(Boolean);
    }

    // If activating this setting, deactivate other settings for the same channel only
    if (isActive && existing.channelId) {
      await db.update(aiSettings)
        .set({ isActive: false })
        .where(and(eq(aiSettings.channelId, existing.channelId), ne(aiSettings.id, id)));
    }

    const [updated] = await db
      .update(aiSettings)
      .set({
        provider: provider ?? existing.provider,
        apiKey: apiKey ?? existing.apiKey,
        channelId: existing.channelId,
        model: model ?? existing.model,
        endpoint: endpoint ?? existing.endpoint,
        temperature: temperature?.toString() ?? existing.temperature,
        maxTokens: maxTokens?.toString() ?? existing.maxTokens,
        isActive: isActive ?? existing.isActive,
        words: wordsArray ?? existing.words,
        siteId: req.body.siteId ?? existing.siteId,
        updatedAt: new Date(),
      })
      .where(eq(aiSettings.id, id))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("❌ Error updating AI setting:", error);
    res.status(500).json({ error: "Failed to update AI setting" });
  }
};

// ✅ Diagnostics — answers "why isn't the AI replying?" without DB access.
// Reads the live state of the channel's row plus the lastSkipReason / At
// columns the webhook handler writes on every silent skip branch.
export const getAISettingsDiagnostics = async (req: Request, res: Response) => {
  try {
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const channelId = (req.query.channelId as string | undefined)?.trim();
    if (!channelId) {
      return res.status(400).json({ error: "channelId is required" });
    }

    if (user.role !== "superadmin") {
      const ownedChannelIds = await getOwnedChannelIds(user);
      if (!ownedChannelIds.includes(channelId)) {
        return res.status(403).json({ error: "Access denied to this channel" });
      }
    }

    const rows = await db
      .select()
      .from(aiSettings)
      .where(eq(aiSettings.channelId, channelId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      // No row at all is itself a diagnostic — surface it explicitly.
      return res.json({
        active: false,
        hasApiKey: false,
        model: null,
        triggerWords: [],
        lastSkipReason: "no-settings",
        lastSkipAt: null,
      });
    }

    const triggerWords = Array.isArray(row.words) ? row.words : [];

    // Find associated site
    const [site] = await db
      .select()
      .from(sites)
      .where(row.siteId ? eq(sites.id, row.siteId) : eq(sites.channelId, channelId))
      .limit(1);

    return res.json({
      active: !!row.isActive,
      hasApiKey: !!row.apiKey,
      model: row.model ?? null,
      triggerWords,
      siteId: site?.id || null,
      siteName: site?.name || null,
      lastSkipReason: row.lastSkipReason ?? null,
      lastSkipAt: row.lastSkipAt ?? null,
    });
  } catch (error) {
    console.error("❌ Error reading AI diagnostics:", error);
    res.status(500).json({ error: "Failed to read AI diagnostics" });
  }
};

// ✅ Delete AI settings
export const deleteAISettings = async (req: Request, res: Response) => {
  try {
    const user = getSessionUser(req);
    if (!user) return res.status(401).json({ error: "Authentication required" });

    const { id } = req.params;

    const existing = await db.query.aiSettings.findFirst({
      where: (table, { eq }) => eq(table.id, id),
    });
    if (!existing) {
      return res.status(404).json({ error: "Setting not found" });
    }

    if (user.role !== "superadmin") {
      if (!existing.channelId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const ownedChannelIds = await getOwnedChannelIds(user);
      if (!ownedChannelIds.includes(existing.channelId)) {
        return res.status(403).json({ error: "Access denied to this channel" });
      }
    }

    await db.delete(aiSettings).where(eq(aiSettings.id, id));
    res.json({ message: "AI setting deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting AI setting:", error);
    res.status(500).json({ error: "Failed to delete AI setting" });
  }
};
