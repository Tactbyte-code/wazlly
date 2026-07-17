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

import { NewPanelConfig, panelConfig } from "@shared/schema";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { cacheGet, cacheInvalidate, CACHE_KEYS, CACHE_TTL } from './cache';

export const createPanelConfig = async (data: NewPanelConfig) => {
  const result = await db.insert(panelConfig).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning();
  await cacheInvalidate(CACHE_KEYS.panelConfig());
  return result[0];
};

export const getPanelConfigs = async () => {
  return cacheGet(CACHE_KEYS.panelConfig(), CACHE_TTL.panelConfig, async () => {
    return db.select().from(panelConfig).orderBy(desc(panelConfig.createdAt));
  });
};

export const getPanelConfigById = async (id: string) => {
  const result = await db.select().from(panelConfig).where(eq(panelConfig.id, id));
  return result[0] || null;
};

export const updatePanelConfig = async (id: string, data: Partial<NewPanelConfig>) => {
  const updateData = {
    ...data,
    updatedAt: new Date()
  };

  // Remove undefined values
  Object.keys(updateData).forEach(key => {
    if (updateData[key as keyof typeof updateData] === undefined) {
      delete updateData[key as keyof typeof updateData];
    }
  });

  const result = await db.update(panelConfig)
    .set(updateData)
    .where(eq(panelConfig.id, id))
    .returning();
  await cacheInvalidate(CACHE_KEYS.panelConfig());
  return result[0] || null;
};

export const deletePanelConfig = async (id: string) => {
  await db.delete(panelConfig).where(eq(panelConfig.id, id));
  await cacheInvalidate(CACHE_KEYS.panelConfig());
  return true;
};

// Helper functions for brand settings compatibility
export const getFirstPanelConfig = async () => {
  const result = await db.select().from(panelConfig).orderBy(desc(panelConfig.createdAt)).limit(1);
  return result[0] || null;
};

export const updateFirstPanelConfig = async (data: Partial<NewPanelConfig>) => {
  // Try to get the first config
  const existingConfig = await getFirstPanelConfig();
  
  if (existingConfig) {
    // Update existing config
    return updatePanelConfig(existingConfig.id, data);
  } else {
    // Create new config if none exists
    const newConfigData: NewPanelConfig = {
      name: data.name || "Your App Name",
      tagline: data.tagline || "",
      description: data.description || "",
      companyName: data.companyName || "",
      companyWebsite: data.companyWebsite || "",
      supportEmail: data.supportEmail || "",
      defaultLanguage: data.defaultLanguage || "en",
      supportedLanguages: data.supportedLanguages || ["en"],
      logo: data.logo,
      favicon: data.favicon,
    };
    return createPanelConfig(newConfigData);
  }
};