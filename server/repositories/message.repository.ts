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
import { eq, and, lt, or, desc, SQL } from "drizzle-orm";
import {
  messages,
  type Message,
  type InsertMessage
} from "@shared/schema";

export class MessageRepository {
  async getByConversation(
    conversationId: string,
    limit = 100,
    beforeTs?: string,
    beforeId?: string
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const conditions: SQL[] = [eq(messages.conversationId, conversationId)];
    if (beforeTs) {
      const ts = new Date(beforeTs);
      if (beforeId) {
        conditions.push(
          or(
            lt(messages.createdAt, ts),
            and(eq(messages.createdAt, ts), lt(messages.id, beforeId))!
          )!
        );
      } else {
        conditions.push(lt(messages.createdAt, ts));
      }
    }

    const rows = await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt), desc(messages.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return { messages: slice.reverse(), hasMore };
  }

  async create(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async update(id: string, message: Partial<Message>): Promise<Message | undefined> {
    const [updated] = await db
      .update(messages)
      .set(message)
      .where(eq(messages.id, id))
      .returning();
    return updated || undefined;
  }

  async getByWhatsAppId(whatsappMessageId: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.whatsappMessageId, whatsappMessageId));
    return message || undefined;
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }


  async getById(id: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    return message || undefined;
  }
}