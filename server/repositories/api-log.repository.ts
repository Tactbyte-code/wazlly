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

import { db } from "../db";
import { eq, desc } from "drizzle-orm";
import { 
  apiLogs, 
  type ApiLog, 
  type InsertApiLog 
} from "@shared/schema";

export class ApiLogRepository {
  async create(insertLog: InsertApiLog): Promise<ApiLog> {
    const [log] = await db
      .insert(apiLogs)
      .values(insertLog)
      .returning();
    return log;
  }

  async getRecent(limit: number = 100): Promise<ApiLog[]> {
    return await db
      .select()
      .from(apiLogs)
      .orderBy(desc(apiLogs.createdAt))
      .limit(limit);
  }

  async getByChannel(channelId: string, limit: number = 100): Promise<ApiLog[]> {
    return await db
      .select()
      .from(apiLogs)
      .where(eq(apiLogs.channelId, channelId))
      .orderBy(desc(apiLogs.createdAt))
      .limit(limit);
  }
}