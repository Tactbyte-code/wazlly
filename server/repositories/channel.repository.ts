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
import { eq, desc, sql, and } from "drizzle-orm";
import { 
  channels, 
  templates,
  campaigns,
  apiLogs,
  aiSettings,
  clientApiKeys,
  clientApiUsageLogs,
  clientWebhooks,
  automationExecutions,
  messageQueue,
  contacts,
  conversations,
  type Channel, 
  type InsertChannel 
} from "@shared/schema";
import { inArray } from "drizzle-orm";

export class ChannelRepository {
  async getAll(): Promise<Channel[]> {
    return await db.select().from(channels).orderBy(desc(channels.createdAt));
  }

  async getAllByUserId(userId: string): Promise<Channel[]> {
    return await db
      .select()
      .from(channels)
      .where(eq(channels.createdBy, userId))
      .orderBy(desc(channels.createdAt));
  }

  async getByUser(
  userId: string,
  page: number = 1,
  limit: number = 10
) {
  const offset = (page - 1) * limit;

  // Fetch paginated channels
  const channelsList = await db
    .select()
    .from(channels)
    .where(eq(channels.createdBy, userId))
    .orderBy(desc(channels.createdAt))
    .limit(limit)
    .offset(offset);

  // Fetch total count
  const totalResult = await db
    .select({ total: sql<number>`COUNT(*)` })
    .from(channels)
    .where(eq(channels.createdBy, userId));

  const total = totalResult[0]?.total ?? 0;

  return {
    data: channelsList,
    pagination: {
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit),
    },
  };
}



  async getById(id: string): Promise<Channel | undefined> {
    const [channel] = await db.select().from(channels).where(eq(channels.id, id));
    return channel || undefined;
  }

  async getByPhoneNumberId(phoneNumberId: string): Promise<Channel | undefined> {
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.phoneNumberId, phoneNumberId));
    return channel || undefined;
  }

  async getByPhoneNumber(phoneNumber: string): Promise<Channel[]> {
    return await db
      .select()
      .from(channels)
      .where(eq(channels.phoneNumber, phoneNumber))
      .orderBy(desc(channels.createdAt));
  }

  async create(insertChannel: InsertChannel): Promise<Channel> {
    const [channel] = await db
      .insert(channels)
      .values(insertChannel)
      .returning();
    return channel;
  }

  async update(id: string, channel: Partial<Channel>): Promise<Channel | undefined> {
    const [updated] = await db
      .update(channels)
      .set(channel)
      .where(eq(channels.id, id))
      .returning();
    return updated || undefined;
  }

  async delete(id: string): Promise<boolean> {
    // Perform all channel-child cleanup in a single transaction so the row
    // deletion is atomic. FK cascades in the schema handle most children
    // (contacts, conversations → messages, campaigns → recipients/message_queue,
    // templates, automations → nodes/edges/executions/logs), but a few tables
    // have soft links without ON DELETE set, so we clean those up explicitly
    // within the same transaction.
    return await db.transaction(async (tx) => {
      // Child rows pointing at channel directly via soft links
      await tx.delete(clientApiUsageLogs).where(eq(clientApiUsageLogs.channelId, id));
      await tx.delete(clientWebhooks).where(eq(clientWebhooks.channelId, id));
      await tx.delete(clientApiKeys).where(eq(clientApiKeys.channelId, id));
      await tx.delete(apiLogs).where(eq(apiLogs.channelId, id));
      await tx.delete(aiSettings).where(eq(aiSettings.channelId, id));

      // automation_executions may link to contacts/conversations owned by this
      // channel but have no FK cascade to channel — wipe in one pass via IN.
      await tx.execute(sql`
        DELETE FROM automation_executions
        WHERE contact_id IN (SELECT id FROM contacts WHERE channel_id = ${id})
           OR conversation_id IN (SELECT id FROM conversations WHERE channel_id = ${id})
      `);


      const result = await tx.delete(channels).where(eq(channels.id, id)).returning();
      return result.length > 0;
    });
  }

  async getActive(): Promise<Channel | undefined> {
    const [channel] = await db
      .select()
      .from(channels)
      .where(eq(channels.isActive, true))
      .orderBy(desc(channels.createdAt));
    return channel || undefined;
  }

  async getActiveByUserId(userId: string): Promise<Channel | undefined> {
    const [channel] = await db
      .select()
      .from(channels)
      .where(
        and(
          eq(channels.isActive, true),
          eq(channels.createdBy, userId)
        )
      )
      .orderBy(desc(channels.createdAt));
  
    return channel || undefined;
  }

  async getTotalChannelsByUser(createdBy: string): Promise<number> {
  const result = await db
    .select({ id: channels.id })
    .from(channels)
    .where(eq(channels.createdBy, createdBy));

  return result.length;
}

}