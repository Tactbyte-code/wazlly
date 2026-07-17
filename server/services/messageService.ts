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

// import { storage } from '../storage';
// import { AppError } from '../middlewares/error.middleware';
// import { WhatsAppApiService } from '../services/whatsapp-api';

// export async function sendBusinessMessage({ to, message, templateName, parameters, channelId, conversationId }: {
//     to: string;
//     message?: string;
//     templateName?: string;
//     parameters?: any[];
//     channelId?: string;
//     conversationId?: string;  // ✅ allow explicit conversation link
//   }) {
//   // Get channelId (or fallback to active channel)
//   if (!channelId) {
//     const activeChannel = await storage.getActiveChannel();
//     if (!activeChannel) {
//       throw new AppError(400, "No active channel found. Please select a channel.");
//     }
//     channelId = activeChannel.id;
//   }

//   const channel = await storage.getChannel(channelId);
//   if (!channel) {
//     throw new AppError(404, "Channel not found");
//   }
// console.log('Sending message via channel:', channelId, 'to:', to);
//   const whatsappApi = new WhatsAppApiService(channel);

//   // Send via WhatsApp API
//   let result;
//   if (templateName) {
//     // console.log('Sending template message:', templateName, 'with parameters:', parameters);
//     result = await whatsappApi.sendMessage(to, templateName, parameters || []);
//   } else {
//     // console.log('Sending text message:', message);
//     result = await whatsappApi.sendTextMessage(to, message|| "Test message");
//   }
// console.log('WhatsApp API result:', result);
//   // Find or create conversation
//   let conversation = conversationId
//     ? await storage.getConversation(conversationId)
//     : await storage.getConversationByPhone(to);
// // console.log('Using conversation:', conversation?.id);
//   if (!conversation) {
//     let contact = await storage.getContactByPhone(to);
//     if (!contact) {
//       contact = await storage.createContact({
//         name: to,
//         phone: to,
//         channelId,
//       });
//     }

//     conversation = await storage.createConversation({
//       contactId: contact.id,
//       contactPhone: to,
//       contactName: contact.name || to,
//       channelId,
//       unreadCount: 0,
//     });
//   }

//   let newMsg = templateName ? (await storage.getTemplatesByName(templateName))[0] : null;

// console.log('Using template for message body:',{
//     conversationId: conversation.id,
//     content: message || newMsg?.body,
//     sender: "business",
//     status: "sent",
//     whatsappMessageId: result.messages?.[0]?.id,
//   });
//   // Save message
//   const createdMessage = await storage.createMessage({
//     conversationId: conversation.id,
//     content: message ?? newMsg?.body ?? "",
//     status: "sent",
//     whatsappMessageId: result.messages?.[0]?.id,
//   });

  
// // console.log('Created message:', createdMessage);
//   // Update conversation last message
//   await storage.updateConversation(conversation.id, {
//     lastMessageAt: new Date(),
//     lastMessageText: message || newMsg?.body,
//   });

//   // Broadcast to websocket
//   if ((global as any).broadcastToConversation) {
//     (global as any).broadcastToConversation(conversation.id, {
//       type: "new-message",
//       message: createdMessage,
//     });
//   }
// console.log('Broadcasted new message to conversation:', conversation.id);
// // console.log('sendBusinessMessage completed successfully' , {    success: true,
// // messageId: result.messages?.[0]?.id,
// // conversationId: conversation.id,
// // createdMessage});
//   return {
//     success: true,
//     messageId: result.messages?.[0]?.id,
//     conversationId: conversation.id,
//     createdMessage,
//   };
// }



import { storage } from "../storage";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { AppError } from "../middlewares/error.middleware";
import { db } from "../db";
import { contacts as contactsTable, conversations as conversationsTable, messages as messagesTable } from "@shared/schema";
import { and, eq } from "drizzle-orm";


const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || "v25.0";

export async function sendBusinessMessage({
  to,
  message,
  templateName,
  parameters,
  mediaId,
  channelId,
  conversationId,
}: {
  to: string;
  message?: string;
  templateName?: string;
  parameters?: string[];
  mediaId?: string | null;
  channelId?: string;
  conversationId?: string;
}) {
  /* ───── Resolve channel ───── */
  if (!channelId) {
    const active = await storage.getActiveChannel();
    if (!active) throw new AppError(400, "No active channel");
    channelId = active.id;
  }

  const channel = await storage.getChannel(channelId);
  if (!channel) throw new AppError(404, "Channel not found");

  let result;
  let sentText = message || "";

  /* ───────── TEMPLATE MESSAGE ───────── */
  if (templateName) {
    const components: any[] = [];

    // HEADER IMAGE
    if (mediaId) {
      components.push({
        type: "header",
        parameters: [
          {
            type: "image",
            image: { id: mediaId },
          },
        ],
      });
    }

    // BODY VARIABLES
    if (parameters && parameters.length > 0) {
      components.push({
        type: "body",
        parameters: parameters.map((val) => ({
          type: "text",
          text: String(val),
        })),
      });
    }

    const payload = {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: "en_US" },
        ...(components.length > 0 ? { components } : {}), // ✅ SAFE
      },
    };

    console.log(
      "🚀 FINAL WhatsApp TEMPLATE PAYLOAD:",
      JSON.stringify(payload, null, 2)
    );

    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error("WhatsApp API Error:", err);
      throw new Error(err.error?.message || "Template send failed");
    }

    result = await response.json();
    sentText = templateName; // fallback for conversation
  }

  /* ───────── TEXT MESSAGE ───────── */
  else {
    const payload = {
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "text",
      text: { body: message || "Test message" },
    };

    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${channel.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${channel.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Text send failed");
    }

    result = await response.json();
  }

  /* ───── Conversation handling (transactional) ─────
   * Wrap contact-resolve, conversation-create, message-insert and the
   * conversation last-message status update in a single DB transaction.
   * If anything in this block fails, we don't end up with an orphan
   * contact or conversation that has no message attached.
   */
  const { conversation, createdMessage } = await db.transaction(async (tx) => {
    let conv: any = null;
    if (conversationId) {
      const [row] = await tx.select().from(conversationsTable).where(eq(conversationsTable.id, conversationId)).limit(1);
      conv = row || null;
    } else {
      const [row] = await tx.select().from(conversationsTable).where(eq(conversationsTable.contactPhone, to)).limit(1);
      conv = row || null;
    }

    if (!conv) {
      let [contact] = await tx.select().from(contactsTable).where(eq(contactsTable.phone, to)).limit(1);
      if (!contact) {
        // Tenant-scope the new contact to the channel owner so it shows up in
        // tenant-aware queries like getContactsByTenant. createdBy is set to
        // the same id so audit/ownership matches the tenant.
        const ownerId = (channel as any)?.createdBy || "";
        [contact] = await tx.insert(contactsTable).values({
          name: to,
          phone: to,
          channelId: channelId!,
          tenantId: ownerId || null,
          createdBy: ownerId || "",
        }).returning();
      }

      [conv] = await tx.insert(conversationsTable).values({
        contactId: contact.id,
        contactPhone: to,
        contactName: contact.name || to,
        channelId: channelId!,
        unreadCount: 0,
      }).returning();
    }

    const [msg] = await tx.insert(messagesTable).values({
      conversationId: conv.id,
      content: sentText,
      status: "sent",
      whatsappMessageId: result.messages?.[0]?.id,
    }).returning();

    await tx.update(conversationsTable)
      .set({ lastMessageAt: new Date(), lastMessageText: sentText })
      .where(eq(conversationsTable.id, conv.id));

    return { conversation: conv, createdMessage: msg };
  });

  if ((global as any).broadcastToConversation) {
    (global as any).broadcastToConversation(conversation.id, {
      type: "new-message",
      message: createdMessage,
    });
  }

  return {
    success: true,
    messageId: result.messages?.[0]?.id,
    conversationId: conversation.id,
  };
}
