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
import { eq } from "drizzle-orm";
import { 
  whatsappChannels, 
  type WhatsappChannel, 
  type InsertWhatsappChannel 
} from "@shared/schema";

export class WhatsappChannelRepository {
  async getByChannelId(channelId: string): Promise<WhatsappChannel | undefined> {
    const [channel] = await db
      .select()
      .from(whatsappChannels)
      .where(eq(whatsappChannels.id, channelId));
    return channel || undefined;
  }

  async create(insertChannel: InsertWhatsappChannel): Promise<WhatsappChannel> {
    const [channel] = await db
      .insert(whatsappChannels)
      .values(insertChannel)
      .returning();
    return channel;
  }

  async update(id: string, channel: Partial<WhatsappChannel>): Promise<WhatsappChannel | undefined> {
    const [updated] = await db
      .update(whatsappChannels)
      .set(channel)
      .where(eq(whatsappChannels.id, id))
      .returning();
    return updated || undefined;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(whatsappChannels).where(eq(whatsappChannels.id, id)).returning();
    return result.length > 0;
  }
}