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

import type { Request, Response } from 'express';
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { storage } from '../storage';
import { AppError, asyncHandler } from '../middlewares/error.middleware';
import type { RequestWithChannel } from '../middlewares/channel.middleware';
import { conversations, messages, users , contacts , conversationAssignments , conversationPins, insertConversationAssignmentSchema, insertConversationSchema } from "@shared/schema";
import { eq,desc,and, sql } from "drizzle-orm";
import { db, dbRead } from "../db";

// Derive a section bucket for a conversation row. Pin membership is layered
// in by the caller because it's per-user.
function deriveBucket(row: any): "awaiting_reply" | "unread" | "other" {
  const lastMsgAt = row.lastMessageAt ? new Date(row.lastMessageAt).getTime() : 0;
  const lastInAt = row.lastIncomingMessageAt
    ? new Date(row.lastIncomingMessageAt).getTime()
    : 0;
  const lastIsInbound = lastInAt > 0 && (lastMsgAt === 0 || lastInAt >= lastMsgAt);
  if (lastIsInbound) return "awaiting_reply";
  if ((row.unreadCount || 0) > 0) return "unread";
  return "other";
}
import { triggerService } from "../services/automation-execution-service";


// export const getConversations = asyncHandler(async (req: RequestWithChannel, res: Response) => {
//   const channelId = req.query.channelId as string | undefined;
//   const conversations = channelId 
//     ? await storage.getConversationsByChannelNew(channelId)
//     : await storage.getConversationsNew();
//   res.json(conversations);
// });

export async function getConversations(req: Request, res: Response) {
  try {
    const channelId = (req as RequestWithChannel).channelId || String(req.query.channelId || "");
    if (!channelId) {
      return res.json([]);
    }
    const user = (req.session as any)?.user;
    
    if (user && user.role !== 'superadmin') {
      const ownerId = user.role === 'team' ? user.createdBy : user.id;
      const channels = await storage.getChannelsByUserId(ownerId);
      const channelIds = channels.map((ch: any) => ch.id);
      if (!channelIds.includes(channelId)) {
        return res.status(403).json({ error: 'Access denied to this channel' });
      }
    }

    const rows = await dbRead
      .select({
        conversation: conversations,
        contact: contacts,
        assignedToName: sql`${users.firstName} || ' ' || ${users.lastName}`.as("assignedBy"),
      })
      .from(conversations)
      .leftJoin(contacts, eq(conversations.contactId, contacts.id))
      .leftJoin(users, eq(conversations.assignedTo, users.id))
      .where(eq(conversations.channelId, channelId))
      .orderBy(desc(conversations.lastMessageAt));

    let pinnedSet = new Set<string>();
    if (user?.id) {
      try {
        const pinRows = await dbRead
          .select({ conversationId: conversationPins.conversationId })
          .from(conversationPins)
          .where(
            and(
              eq(conversationPins.userId, user.id),
              eq(conversationPins.channelId, channelId)
            )
          );
        pinnedSet = new Set(
          pinRows.map((r: any) => r.conversationId as string)
        );
      } catch (e) {
        console.error("Pin lookup failed (non-fatal):", e);
      }
    }

    const formatted = rows.map((row) => {
      const conv = row.conversation;
      const base = {
        ...conv,
        lastMessageAt: conv.lastMessageAt || null,
        lastMessageText: conv.lastMessageText || null,
        assignedToName: row.assignedToName || null,
        contact: row.contact || null,
      };
      const bucket = pinnedSet.has(conv.id) ? "pinned" : deriveBucket(conv);
      return { ...base, bucket };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ error: "Unexpected error" });
  }
}


export async function fetchConversationList(channelId: string) {
  const rows = await dbRead
    .select({
      conversation: conversations,
      contact: contacts,
      assignedToName: sql`${users.firstName} || ' ' || ${users.lastName}`.as(
        "assignedBy"
      ),
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .leftJoin(users, eq(conversations.assignedTo, users.id))
    .where(eq(conversations.channelId, channelId))
    .orderBy(desc(conversations.lastMessageAt));

  return rows.map((row) => {
    const conv = row.conversation;
    return {
      ...conv,
      lastMessageAt: conv.lastMessageAt || null,
      lastMessageText: conv.lastMessageText || null,
      assignedToName: row.assignedToName || null,
      contact: row.contact || null,
      // Bucket here doesn't know about per-user pins — clients layer pins on top.
      bucket: deriveBucket(conv),
    };
  });
}


export const getConversation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const conversation = await storage.getConversation(id);
  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  res.json(conversation);
});

export const createConversation = asyncHandler(async (req: RequestWithChannel, res: Response) => {
  const validatedConversation = insertConversationSchema.parse(req.body);
  
  // Get active channel if channelId not provided
  let channelId = validatedConversation.channelId;
  if (!channelId) {
    const activeChannel = await storage.getActiveChannel();
    if (activeChannel) {
      channelId = activeChannel.id;
    }
  }
  
  const conversation = await storage.createConversation({
    ...validatedConversation,
    channelId
  });

  try {
    if (!validatedConversation.channelId) {
      throw new Error("channelId is missing");
    }
    if (!validatedConversation.contactId) {
      throw new Error("contactId is missing");
    }
    await triggerService.handleNewConversation(
      conversation.id, 
      validatedConversation.channelId, 
      validatedConversation.contactId
    );
    console.log(`Triggered automations for new conversation: ${conversation.id}`);
  } catch (error) {
    console.error(`Failed to trigger automations:`, error);
    // Don't fail the conversation creation if automation fails
  }
  
  res.json(conversation);
});

export const updateConversation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const conversation = await storage.updateConversation(id, {
    assignedTo: req.body.assignedTo || null,
    status: req.body.status
  });

  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }

  if (req.body.status === "assigned" && req.body.assignedTo) {
    // Validate and transform body to match insert schema
    const validatedConversation = insertConversationAssignmentSchema.parse({
      conversationId: id,
      userId: req.body.assignedTo,
      assignedBy: req.user?.id,
      assignedAt: req.body.assignedAt ? new Date(req.body.assignedAt) : new Date(),
      status: req.body.status,
    });

    await db
      .insert(conversationAssignments)
      .values(validatedConversation)
      .returning();
  }

  res.json({
    ...conversation,
    assignedToName: req.body.assignedToName || null
  });
});

export const deleteConversation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const success = await storage.deleteConversation(id);
  if (!success) {
    throw new AppError(404, 'Conversation not found');
  }
  res.status(204).send();
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const conversation = await storage.updateConversation(id, {
    unreadCount: 0
  });
  if (!conversation) {
    throw new AppError(404, 'Conversation not found');
  }
  res.json(conversation);
});