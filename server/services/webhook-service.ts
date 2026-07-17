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

import crypto from "crypto";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { db } from "../db";
import { messages, conversations, messageQueue, webhookConfigs } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage";

export interface WhatsAppWebhookPayload {
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: "text" | "image" | "document" | "audio" | "video" | "location" | "sticker" | "contacts";
          text?: {
            body: string;
          };
          image?: {
            mime_type: string;
            sha256: string;
            id: string;
          };
          // Add other message types as needed
        }>;
        statuses?: Array<{
          id: string;
          status: "sent" | "delivered" | "read" | "failed";
          timestamp: string;
          recipient_id: string;
          conversation?: {
            id: string;
            origin: {
              type: "marketing_lite" | "marketing" | "utility" | "authentication" | "service" | "referral_conversion" | string;
            };
          };
          pricing?: {
            billable: boolean;
            pricing_model: string;
            category: "marketing_lite" | "marketing" | "utility" | "authentication" | "service" | string;
          };
        }>;
        errors?: Array<{
          code: number;
          title: string;
          message: string;
          error_data: any;
        }>;
      };
      field: string;
    }>;
  }>;
}

export class WebhookService {
  /**
   * Verify webhook signature using app secret
   */
  static verifySignature(
    payload: string,
    signature: string,
    appSecret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", appSecret)
      .update(payload)
      .digest("hex");
    
    return `sha256=${expectedSignature}` === signature;
  }

  /**
   * Handle webhook verification (for initial setup)
   */
  static handleVerification(
    mode: string,
    token: string,
    challenge: string,
    expectedToken: string
  ): { verified: boolean; challenge?: string } {
    if (mode === "subscribe" && token === expectedToken) {
      return { verified: true, challenge };
    }
    return { verified: false };
  }

  /**
   * Process incoming webhook payload
   */
  static async processWebhook(
    payload: WhatsAppWebhookPayload,
    channelId: string
  ): Promise<void> {
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field === "messages") {
          await this.processMessages(change.value, channelId);
        } else if (change.field === "message_template_status_update") {
          // Import and use WebhookHandler for template updates
          const { WebhookHandler } = await import("./webhook-handler");
          await WebhookHandler.handleTemplateStatusUpdate(change.value);
        }
      }
    }
  }

  /**
   * Process messages from webhook
   */
  private static async processMessages(
    value: WhatsAppWebhookPayload["entry"][0]["changes"][0]["value"],
    channelId: string
  ): Promise<void> {
    // Process incoming messages
    if (value.messages && value.messages.length > 0) {
      for (const message of value.messages) {
        await this.handleIncomingMessage(message, value.contacts?.[0], channelId);
      }
    }

    // Process message statuses
    if (value.statuses && value.statuses.length > 0) {
      for (const status of value.statuses) {
        await this.handleMessageStatus(status);
      }
    }

    // Process errors
    if (value.errors && value.errors.length > 0) {
      for (const error of value.errors) {
        console.error("WhatsApp webhook error:", error);
        // You might want to update message status or log errors
      }
    }
  }

  /**
   * Handle incoming message
   */
  private static async handleIncomingMessage(
    message: NonNullable<WhatsAppWebhookPayload["entry"][0]["changes"][0]["value"]["messages"]>[0],
    contact: WhatsAppWebhookPayload["entry"][0]["changes"][0]["value"]["contacts"] extends Array<infer T> ? T | undefined : undefined,
    channelId: string
  ): Promise<void> {
    try {
      // Handle reaction messages before any conversation updates
      if (message.type === 'reaction' && (message as any).reaction) {
        const reaction = (message as any).reaction;
        const emoji = reaction.emoji || '';
        const reactedMessageId = reaction.message_id;

        if (reactedMessageId) {
          const reactedMessage = await storage.getMessageByWhatsAppId(reactedMessageId);
          if (reactedMessage) {
            const existingMeta = (reactedMessage.metadata as any) || {};
            let reactions = existingMeta.reactions || [];

            if (!emoji) {
              reactions = reactions.filter((r: any) => r.from !== message.from);
              console.log(`Reaction removed from message ${reactedMessageId} by ${message.from}`);
            } else {
              reactions = reactions.filter((r: any) => r.from !== message.from);
              reactions.push({
                emoji,
                from: message.from,
                timestamp: message.timestamp,
              });
              console.log(`Reaction ${emoji} added to message ${reactedMessageId} by ${message.from}`);
            }

            await storage.updateMessage(reactedMessage.id, {
              metadata: { ...existingMeta, reactions },
            });

            try {
              const { getIO } = await import('../socket');
              const io = getIO();
              io.to(`conversation:${reactedMessage.conversationId}`).emit('message_reaction', {
                conversationId: reactedMessage.conversationId,
                messageId: reactedMessage.id,
                reactions: [...reactions],
              });
            } catch (socketErr) {
              console.warn('Failed to emit reaction socket event:', socketErr);
            }
          }
        }
        return;
      }

      // Find or create conversation
      let conversation = await storage.getConversationByPhone(message.from);
      
      if (!conversation) {
        // Create new conversation
        conversation = await storage.createConversation({
          contactId: message.from, // Using phone as contactId for now
          contactPhone: message.from,
          contactName: contact?.profile?.name || message.from,
          lastMessageAt: new Date(parseInt(message.timestamp) * 1000),
          lastMessageText:message.text?.body || "",
          unreadCount: 1,
        });
      } else {
        // Update conversation

        console.log("WEBhook msg else hit" , message)

        await storage.updateConversation(conversation.id, {
          lastMessageAt: new Date(parseInt(message.timestamp) * 1000),
          unreadCount: (conversation.unreadCount || 0) + 1,
          lastMessageText:message.text?.body || "",
        });
      }

      console.log("WEBhook msg create" , message)

      // Create message record
      await storage.createMessage({
        conversationId: conversation.id,
        whatsappMessageId: message.id,
        fromUser: false,
        direction: "inbound",
        status: "received",
        content: message.text?.body || "",
        messageType: message.type,
        timestamp: new Date(parseInt(message.timestamp) * 1000),
        metadata: {
          channelId,
          from: message.from,
          type: message.type,
          ...(message.image && { image: message.image }),
        },
      });

      console.log(`Received message from ${message.from}: ${message.text?.body || message.type}`);
    } catch (error) {
      console.error("Error handling incoming message:", error);
    }
  }

  /**
   * Handle message status update
   */
  private static async handleMessageStatus(
    status: NonNullable<WhatsAppWebhookPayload["entry"][0]["changes"][0]["value"]["statuses"]>[0]
  ): Promise<void> {
    try {
      // Update message status in database
      const message = await storage.getMessageByWhatsAppId(status.id);
      if (message) {
        await storage.updateMessage(message.id, {
          status: status.status,
          metadata: {
            ...message.metadata,
            conversationId: status.conversation?.id,
            pricing: status.pricing,
          },
        });
      }

      // Update message queue status if applicable
      await db
        .update(messageQueue)
        .set({
          status: status.status === "failed" ? "failed" : status.status === "delivered" ? "delivered" : "sent",
          conversationId: status.conversation?.id,
        })
        .where(eq(messageQueue.whatsappMessageId, status.id));

      console.log(`Message ${status.id} status updated to ${status.status}`);
    } catch (error) {
      console.error("Error handling message status:", error);
    }
  }

  /**
   * Register webhook configuration
   */
  static async registerWebhook(
    channelId: string,
    webhookUrl: string,
    verifyToken: string,
    events?: string[]
  ): Promise<void> {
    await storage.createWebhookConfig({
      channelId,
      webhookUrl,
      verifyToken,
      events: events || ["messages", "message_status", "message_template_status_update"],
      isActive: true,
    });
  }
}