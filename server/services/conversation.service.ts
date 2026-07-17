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

import { conversations, messages, users , contacts  } from "@shared/schema";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { eq,desc,and, sql } from "drizzle-orm";
import { db } from "../db";


export async function getConversationsFromDB(channelId: string) {
  const rows = await db
    .select({
      conversation: conversations,
      contact: contacts,
      assignedToName:
        sql`${users.firstName} || ' ' || ${users.lastName}`.as("assignedBy"),
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .leftJoin(users, eq(conversations.assignedTo, users.id))
    .where(eq(conversations.channelId, channelId))
    .orderBy(desc(conversations.lastMessageAt));

  return rows.map(row => ({
    ...row.conversation,
    lastMessageAt: row.conversation.lastMessageAt || null,
    lastMessageText: row.conversation.lastMessageText || null,
    assignedToName: row.assignedToName || null,
    contact: row.contact || null,
  }));
}
