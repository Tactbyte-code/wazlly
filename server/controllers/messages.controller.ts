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

import path from "path";
import type { Request, Response } from 'express';
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { storage } from '../storage';
import { insertMessageSchema} from '@shared/schema';
import { AppError, asyncHandler } from '../middlewares/error.middleware';
import { WhatsAppApiService } from '../services/whatsapp-api';
import type { RequestWithChannel } from '../middlewares/channel.middleware';
import { triggerService } from "../services/automation-execution-service";

export const getMessages = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 200);
  const rawBefore = req.query.before as string | undefined;
  let beforeTs: string | undefined;
  let beforeId: string | undefined;
  if (rawBefore) {
    if (rawBefore.includes("__")) {
      const parts = rawBefore.split("__");
      beforeTs = parts[0];
      beforeId = parts[1];
    } else {
      beforeTs = rawBefore;
    }
  }

  const result = await storage.getMessages(conversationId, limit, beforeTs, beforeId);

  await storage.updateConversation(conversationId, {
    unreadCount: null
  });

  res.setHeader("X-Has-More", result.hasMore ? "true" : "false");
  res.json(result.messages);
});

// export const createMessage = asyncHandler(async (req: Request, res: Response) => {
//   const { conversationId } = req.params;
//   const { content, fromUser } = req.body;
  
//   console.log("Req body : ===> "  , req.body)

export const createMessage = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { content, fromUser, caption, templateName, parameters } = req.body;
  const file = (req as any).file as Express.Multer.File & { cloudUrl?: string };

  const conversation = await storage.getConversation(conversationId);
  if (!conversation) throw new AppError(404, "Conversation not found");

  let msgBody = content;
  let messageType: string = "text";
  let result: any = null;
  let mediaId: string | null = null;
  let mediaUrl: string | null = null;
  let messageStatus: "sent" | "failed" = "sent";

  if (fromUser && (conversation.type === "whatsapp" || !conversation.type)) {
    if (!conversation.channelId) throw new Error("ChannelId is missing");
    if (!conversation.contactPhone) throw new Error("Contact phone is missing");

    const channel = await storage.getChannel(conversation.channelId);
    if (!channel) throw new AppError(404, "Channel not found");

    const whatsappApi = new WhatsAppApiService(channel);

    const lastIncoming = (conversation as any).lastIncomingMessageAt
      ? new Date((conversation as any).lastIncomingMessageAt).getTime()
      : conversation.lastMessageAt
      ? new Date(conversation.lastMessageAt).getTime()
      : 0;
    const is24HourExpired = lastIncoming > 0 && (Date.now() - lastIncoming > 24 * 60 * 60 * 1000);

    try {
      // TEMPLATE MESSAGE
      if (templateName) {
        const templateMatch = await storage.getTemplateByNameAndChannel(templateName, conversation.channelId)
          || (await storage.getTemplatesByName(templateName))[0];
        msgBody = templateMatch?.body || `[template: ${templateName}]`;
        messageType = "template";

        try {
          result = await whatsappApi.sendMessage(conversation.contactPhone, templateName, parameters || []);
        } catch (templateErr: any) {
          console.error("❌ Template send failed (payment/billing or other):", templateErr.message);
          messageStatus = "failed";

          const errorInfo: any = {
            title: templateErr.metaErrorTitle || "Template send failed",
            message: templateErr.message || "Failed to send template via WhatsApp",
            code: templateErr.metaErrorCode || null,
            errorData: templateErr.metaErrorDetails ? { details: templateErr.metaErrorDetails } : null,
          };

          const failedMessage = await storage.createMessage({
            conversationId,
            fromUser: true,
            direction: "outbound",
            content: msgBody,
            status: "failed",
            messageType,
            type: messageType,
            timestamp: new Date(),
            errorDetails: errorInfo,
            metadata: {},
          });

          await storage.updateConversation(conversationId, {
            lastMessageAt: new Date(),
            lastMessageText: msgBody,
          });

          if ((global as any).broadcastToConversation) {
            (global as any).broadcastToConversation(conversationId, {
              type: "new-message",
              message: failedMessage,
            });
          }

          return res.json(failedMessage);
        }

      // MEDIA MESSAGE (blocked if 24-hour window expired)
      } else if (file) {
        if (is24HourExpired) {
          throw new AppError(403, "24-hour messaging window has expired. Please use an approved template message instead.");
        }
        const mimeType = file.mimetype;
        const fs = await import('fs');
        const filePath = file.path;

        console.log(`📤 Processing media for WhatsApp. Local path: ${filePath}`);

        let buffer: Buffer;
        let shouldUnlink = false;

        if (filePath && fs.existsSync(filePath)) {
          buffer = fs.readFileSync(filePath);
          shouldUnlink = true; // Mark for cleanup
        } else if ((file as any).cloudUrl) {
          console.log(`📤 File not on disk, downloading from cloud: ${(file as any).cloudUrl}`);
          const dlResponse = await fetch((file as any).cloudUrl);
          if (!dlResponse.ok) throw new AppError(400, "Failed to download uploaded file from cloud storage");
          buffer = Buffer.from(await dlResponse.arrayBuffer());
        } else if (file.buffer) {
          buffer = file.buffer;
        } else {
          throw new AppError(400, "Uploaded file not found on disk or cloud");
        }

        console.log("📄 Uploading media to Meta:", {
          name: file.originalname,
          mimeType: mimeType,
          size: file.size
        });

        // 1️⃣ Check supported types
        const SUPPORTED_MIME_TYPES = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "video/mp4",
          "audio/ogg",
          "audio/mpeg",
          "application/pdf"
        ];
        if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
          // Cleanup before throwing
          if (shouldUnlink && filePath) try { fs.unlinkSync(filePath); } catch {}
          throw new Error(`❌ File type not supported by WhatsApp: ${mimeType}`);
        }

        // 2️⃣ Check file size
        const MAX_SIZE_MB = mimeType.startsWith("video") ? 16 : 5;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          // Cleanup before throwing
          if (shouldUnlink && filePath) try { fs.unlinkSync(filePath); } catch {}
          throw new Error(`❌ ${file.originalname} exceeds WhatsApp size limit (${MAX_SIZE_MB}MB).`);
        }

        try {
          // Upload to WhatsApp
          mediaId = await whatsappApi.uploadMediaBuffer(buffer, mimeType, file.originalname);
          console.log("✅ Media uploaded to WhatsApp, ID:", mediaId);

          // Get WhatsApp media URL (optional, for DB storage)
          try {
            mediaUrl = await whatsappApi.getMediaUrl(mediaId);
            console.log("🌐 Meta media URL retrieved:", mediaUrl);
          } catch (err) {
            console.warn("⚠️ Failed to get Meta media URL, using cloud/local fallback");
            mediaUrl = (file as any).cloudUrl || `/uploads/${path.basename(path.dirname(file.path))}/${file.filename || file.originalname}`;
          }

          // Determine message type
          if (mimeType.startsWith("image")) messageType = "image";
          else if (mimeType.startsWith("video")) messageType = "video";
          else if (mimeType.startsWith("audio")) messageType = "audio";
          else messageType = "document";

          // Send media message
          result = await whatsappApi.sendMediaMessagee(
            conversation.contactPhone,
            mediaId,
            messageType as any,
            caption || content
          );
          msgBody = caption || `[${messageType}]`;
        } finally {
          // 🗑️ CLEANUP: Always delete the local file after processing
          if (shouldUnlink && filePath && fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              console.log(`   🗑️ Local file cleaned up: ${filePath}`);
            } catch (err) {
              console.warn(`   ⚠️ Cleanup failed for ${filePath}:`, err);
            }
          }
        }

      // PLAIN TEXT (blocked if 24-hour window expired)
      } else {
        if (is24HourExpired) {
          throw new AppError(403, "24-hour messaging window has expired. Please use an approved template message instead.");
        }
        try {
          result = await whatsappApi.sendTextMessage(conversation.contactPhone, content);
        } catch (err: any) {
          console.warn("❌ WhatsApp send failed:", err.message || err);
          messageStatus = "failed";
        }
        msgBody = content;
        messageType = "text";
      }

      // Save message in DB
      const message = await storage.createMessage({
        conversationId,
        fromUser: true,
        direction: "outbound",
        content: msgBody,
        status: messageStatus,
        whatsappMessageId: result?.messages?.[0]?.id,
        messageType,
        type: messageType,
        timestamp: new Date(),
        mediaId: mediaId || undefined,
        mediaUrl: mediaUrl || file?.cloudUrl || undefined,
        mediaMimeType: file?.mimetype || undefined,
        metadata: file
          ? {
              mimeType: file.mimetype,
              originalName: file.originalname,
              cloudUrl: file.cloudUrl,
              isCloud: !!file.cloudUrl,
              fileSize: file.size,
            }
          : {}
      });

      await storage.updateConversation(conversationId, {
        lastMessageAt: new Date(),
        lastMessageText: msgBody
      });

      if ((global as any).broadcastToConversation) {
        (global as any).broadcastToConversation(conversationId, {
          type: "new-message",
          message
        });
      }

      return res.json(message);

    } catch (error) {
      console.error("❌ Error sending WhatsApp message:", error);
      throw new AppError(500, error instanceof Error ? error.message : "Failed to send message");
    }

  } else {
    // Incoming messages
    const validatedMessage = insertMessageSchema.parse({
      ...req.body,
      conversationId
    });

    const message = await storage.createMessage(validatedMessage);
    await storage.updateConversation(conversationId, {
      lastMessageAt: new Date(),
      lastMessageText: msgBody
    });

    if ((global as any).broadcastToConversation) {
      (global as any).broadcastToConversation(conversationId, {
        type: "new-message",
        message
      });
    }

    return res.json(message);
  }
});


export const createMessagennn = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { content, fromUser, caption, templateName, parameters } = req.body;
  const file = (req as any).file as Express.Multer.File & { cloudUrl?: string };

  // Get conversation
  const conversation = await storage.getConversation(conversationId);
  if (!conversation) throw new AppError(404, "Conversation not found");

  let msgBody = content || "";
  let messageType: "text" | "image" | "video" | "audio" | "document" | "template" = "text";
  let result: any = null;
  let mediaId: string | null = null;
  let mediaUrl: string | null = null;
  let messageStatus: "sent" | "failed" = "sent";

  // If message is from user, push it to WhatsApp
  if (fromUser && (conversation.type === "whatsapp" || !conversation.type)) {
    if (!conversation.channelId) throw new Error("ChannelId is missing");
    if (!conversation.contactPhone) throw new Error("Contact phone is missing");

    const channel = await storage.getChannel(conversation.channelId);
    if (!channel) throw new AppError(404, "Channel not found");

    const whatsappApi = new WhatsAppApiService(channel);

    try {
      if (templateName) {
        // Send template
        result = await whatsappApi.sendMessage(conversation.contactPhone, templateName, parameters || []);
        const newMsg = await storage.getTemplatesByName(templateName);
        msgBody = newMsg[0]?.body || `[template: ${templateName}]`;
        messageType = "template";
      } else if (file) {
        const mimeType = file.mimetype;

        // Determine if cloudUrl exists
        const isCloudFile = !!file.cloudUrl;
        const filePath = file.cloudUrl || file.path;

        console.log(`📤 Processing media: ${isCloudFile ? "Cloud" : "Local"}`);
        console.log(`   File location: ${filePath}`);
        console.log(`   MIME type: ${mimeType}`);

        // Upload media to WhatsApp
        try {
          if (isCloudFile) {
            // Download from cloud URL
            console.log("⬇️ Downloading from cloud for WhatsApp upload...");
            const response = await fetch(file.cloudUrl!);
            const buffer = Buffer.from(await response.arrayBuffer());
            mediaId = await whatsappApi.uploadMediaBuffer(buffer, mimeType, file.originalname);
            console.log("✅ Media uploaded to WhatsApp, ID:", mediaId);
          } else {
            // Upload from local file
            console.log("📁 Uploading local file to WhatsApp...");
            mediaId = await whatsappApi.uploadMedia(file.path, mimeType);
            console.log("✅ Media uploaded to WhatsApp, ID:", mediaId);
          }

          // Get media URL from WhatsApp
          try {
            mediaUrl = await whatsappApi.getMediaUrl(mediaId!);
            console.log("🌐 WhatsApp media URL retrieved:", mediaUrl);
          } catch (err) {
            console.warn("⚠️ Failed to get WhatsApp media URL, using fallback:", err);
            // Use absolute fallback URL if cloudUrl exists
            const host = process.env.SERVER_HOST || "http://localhost:3000";
            mediaUrl = file.cloudUrl ? file.cloudUrl : `${host}/uploads/${path.basename(path.dirname(file.path))}/${file.filename}`;
          }

          // Determine message type
          if (mimeType.startsWith("image")) messageType = "image";
          else if (mimeType.startsWith("video")) messageType = "video";
          else if (mimeType.startsWith("audio")) messageType = "audio";
          else messageType = "document";

          // Only send if mediaId is available
          if (!mediaId) throw new AppError(500, "Media upload failed, cannot send message");

          result = await whatsappApi.sendMediaMessage(
            conversation.contactPhone,
            mediaId,
            messageType,
            caption || content || `[${messageType}]`
          );
          msgBody = caption || `[${messageType}]`;

        } catch (err: any) {
          console.error("❌ WhatsApp send failed:", err.message || err);
          messageStatus = "failed";
          msgBody = `[${messageType}] Media not sent`;
        }

      } else {
        // Plain text
        try {
          result = await whatsappApi.sendTextMessage(conversation.contactPhone, content || "[No Content]");
        } catch (err: any) {
          console.warn("❌ WhatsApp send failed:", err.message || err);
          messageStatus = "failed";
          msgBody = "[Failed to send text message]";
        }
        messageType = "text";
      }

      // Save message
      const message = await storage.createMessage({
        conversationId,
        fromUser: true,
        direction: "outbound",
        content: msgBody,
        status: messageStatus,
        whatsappMessageId: result?.messages?.[0]?.id,
        messageType,
        type: messageType,
        timestamp: new Date(),
        mediaId: mediaId || undefined,
        mediaUrl: mediaUrl || file?.cloudUrl || undefined,
        mediaMimeType: file?.mimetype || undefined,
        metadata: file
          ? {
              mimeType: file.mimetype,
              originalName: file.originalname,
              cloudUrl: file.cloudUrl,
              isCloud: !!file.cloudUrl,
              fileSize: file.size,
            }
          : {},
      });

      await storage.updateConversation(conversationId, {
        lastMessageAt: new Date(),
        lastMessageText: msgBody,
      });

      if ((global as any).broadcastToConversation) {
        (global as any).broadcastToConversation(conversationId, {
          type: "new-message",
          message,
        });
      }

      return res.json(message);

    } catch (error: any) {
      console.error("❌ Error sending WhatsApp message:", error);
      throw new AppError(500, error.message || "Failed to send message");
    }

  } else {
    // Incoming message flow
    const validatedMessage = insertMessageSchema.parse({ ...req.body, conversationId });

    const message = await storage.createMessage(validatedMessage);

    try {
      if (!conversation.channelId) throw new Error("ChannelId is missing");
      if (!conversation.contactId) throw new Error("contactId is missing");

      await triggerService.handleMessageReceived(
        conversationId,
        message,
        conversation.channelId,
        conversation.contactId
      );
      console.log(`✅ Triggered automations for message: ${message.id}`);
    } catch (error) {
      console.error("❌ Failed to trigger message automations:", error);
    }

    await storage.updateConversation(conversationId, {
      lastMessageAt: new Date(),
      lastMessageText: msgBody,
    });

    if ((global as any).broadcastToConversation) {
      (global as any).broadcastToConversation(conversationId, {
        type: "new-message",
        message,
      });
    }

    return res.json(message);
  }
});



export const createMessageOld = asyncHandler(async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const { content, fromUser, caption, templateName, parameters } = req.body;
  const file = (req as any).file as Express.Multer.File & { cloudUrl?: string };

  // Get conversation
  const conversation = await storage.getConversation(conversationId);
  if (!conversation) throw new AppError(404, "Conversation not found");

  let msgBody = content;
  let messageType = "text";
  let result: any = null;
  let mediaId: string | null = null;
  let mediaUrl: string | null = null;

let messageStatus: "sent" | "failed" = "sent";
  

  // If message is from user, push it to WhatsApp
  if (fromUser && (conversation.type === "whatsapp" || !conversation.type)) {
    if (!conversation.channelId) throw new Error("ChannelId is missing");
    if (!conversation.contactPhone) throw new Error("Contact phone is missing");

    const channel = await storage.getChannel(conversation.channelId);
    if (!channel) throw new AppError(404, "Channel not found");

    const whatsappApi = new WhatsAppApiService(channel);

    try {
      if (templateName) {
        // Send template
        result = await whatsappApi.sendMessage(conversation.contactPhone, templateName, parameters || []);
        const newMsg = await storage.getTemplatesByName(templateName);
        msgBody = newMsg[0]?.body || `[template: ${templateName}]`;
        messageType = "template";
      } else if (file) {
        // Upload + send media
        const mimeType = file.mimetype;
        
        // Check if file was uploaded to cloud or is still local
        const isCloudFile = !!file.cloudUrl;
        const filePath = file.cloudUrl || file.path;
        
        console.log(`📤 Processing media: ${isCloudFile ? 'Cloud' : 'Local'}`);
        console.log(`   File location: ${filePath}`);
        console.log(`   MIME type: ${mimeType}`);
        
        // Upload media to WhatsApp
        // If cloud file, download first; if local, read directly
        if (isCloudFile) {
          // Download from cloud URL and upload to WhatsApp
          console.log("⬇️ Downloading from cloud for WhatsApp upload...");
          const response = await fetch(file.cloudUrl!);
          const buffer = Buffer.from(await response.arrayBuffer());
          
          // Upload buffer to WhatsApp
          mediaId = await whatsappApi.uploadMediaBuffer(buffer, mimeType, file.originalname);
          console.log("✅ Media uploaded to WhatsApp, ID:", mediaId);
        } else {
          // Upload from local file (fallback)
          console.log("📁 Uploading local file to WhatsApp...");
          mediaId = await whatsappApi.uploadMedia(file.path, mimeType);
          console.log("✅ Media uploaded to WhatsApp, ID:", mediaId);
        }

        // Get media URL from WhatsApp for display purposes
        try {
          mediaUrl = await whatsappApi.getMediaUrl(mediaId!);
          console.log("🌐 WhatsApp media URL retrieved:", mediaUrl);
        } catch (error) {
          console.warn("⚠️ Failed to get WhatsApp media URL:", error);
          // Use cloud URL as fallback
          mediaUrl = file.cloudUrl || null;
        }

        // Determine message type
        if (mimeType.startsWith("image")) messageType = "image";
        else if (mimeType.startsWith("video")) messageType = "video";
        else if (mimeType.startsWith("audio")) messageType = "audio";
        else messageType = "document";

        // Send media message via WhatsApp
        result = await whatsappApi.sendMediaMessage(
          conversation.contactPhone,
          mediaId!,
          messageType as any,
          caption || content
        );
        msgBody = caption || `[${messageType}]`;
      } else {
        // Plain text
        // result = await whatsappApi.sendTextMessage(conversation.contactPhone, content);
        try {
  result = await whatsappApi.sendTextMessage(conversation.contactPhone, content);
} catch (error: any) {
  console.warn("❌ WhatsApp send failed:", error.message || error);
  messageStatus = "failed"; // mark as failed
}

        msgBody = content;
        messageType = "text";
      }

      // Save message with media information
      const message = await storage.createMessage({
        conversationId,
        fromUser: true,
        direction: "outbound",
        content: msgBody,
        status: "sent",
        whatsappMessageId: result?.messages?.[0]?.id,
        messageType,
        type: messageType,
        timestamp: new Date(),
        mediaId: mediaId || undefined,
        mediaUrl: mediaUrl || file?.cloudUrl || undefined,
        mediaMimeType: file?.mimetype || undefined,
        metadata: file
          ? { 
              mimeType: file.mimetype, 
              originalName: file.originalname,
              cloudUrl: file.cloudUrl,
              isCloud: !!file.cloudUrl,
              fileSize: file.size
            }
          : {}
      });

      await storage.updateConversation(conversationId, {
        lastMessageAt: new Date(),
        lastMessageText: msgBody
      });

      if ((global as any).broadcastToConversation) {
        (global as any).broadcastToConversation(conversationId, {
          type: "new-message",
          message
        });
      }

      return res.json(message);
    } catch (error) {
      console.error("❌ Error sending WhatsApp message:", error);
      throw new AppError(500, error instanceof Error ? error.message : "Failed to send message");
    }
  } else {
    // Incoming message flow (unchanged)
    const validatedMessage = insertMessageSchema.parse({
      ...req.body,
      conversationId
    });

    const message = await storage.createMessage(validatedMessage);

    try {
      if (!conversation.channelId) throw new Error("ChannelId is missing");
      if (!conversation.contactId) throw new Error("contactId is missing");

      await triggerService.handleMessageReceived(
        conversationId,
        message,
        conversation.channelId,
        conversation.contactId
      );
      console.log(`✅ Triggered automations for message: ${message.id}`);
    } catch (error) {
      console.error("❌ Failed to trigger message automations:", error);
    }

    await storage.updateConversation(conversationId, {
      lastMessageAt: new Date(),
      lastMessageText: msgBody
    });

    if ((global as any).broadcastToConversation) {
      (global as any).broadcastToConversation(conversationId, {
        type: "new-message",
        message
      });
    }

    return res.json(message);
  }
});


export const getMediaById = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;

  // Get message with media info
  const message = await storage.getMessage(messageId);
  if (!message) {
    throw new AppError(404, "Message not found");
  }

  if (!message.mediaId) {
    throw new AppError(404, "No media found for this message");
  }

  if (!message.conversationId) {
    throw new AppError(400, "Message missing conversationId");
  }

  // Get conversation to access channel info
  const conversation = await storage.getConversation(message.conversationId);
  if (!conversation || !conversation.channelId) {
    throw new AppError(404, "Conversation or channel not found");
  }

  const channel = await storage.getChannel(conversation.channelId);
  if (!channel) {
    throw new AppError(404, "Channel not found");
  }

  try {
    const whatsappApi = new WhatsAppApiService(channel);
    
    // If we don't have the URL cached, fetch it
    let mediaUrl = message.mediaUrl;
    if (!mediaUrl) {
      mediaUrl = await whatsappApi.getMediaUrl(message.mediaId);
      
      // Update message with the URL for future use
      await storage.updateMessage(messageId, { mediaUrl });
    }

    if (!mediaUrl) {
      throw new AppError(500, "Failed to get media URL from WhatsApp");
    }

    // Fetch the actual media content
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${channel.accessToken}`,
      },
    });

    if (!mediaResponse.ok) {
      throw new AppError(500, "Failed to fetch media from WhatsApp");
    }

    // Set appropriate headers
    const contentType = message.mediaMimeType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day

    // Stream the media content
    const arrayBuffer = await mediaResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.send(buffer);
  } catch (error) {
    console.error("Error serving media:", error);
    throw new AppError(500, "Failed to serve media");
  }
});

// Get media URL without downloading
export const getMediaUrl = asyncHandler(async (req: Request, res: Response) => {
  const { messageId } = req.params;

  const message = await storage.getMessage(messageId);
  if (!message || !message.mediaId) {
    throw new AppError(404, "Message or media not found");
  }

  // Return cached URL if available
  if (message.mediaUrl) {
    return res.json({ url: `/api/media/${messageId}`, whatsappUrl: message.mediaUrl });
  }

  // Get fresh URL from WhatsApp
  if (!message.conversationId) {
    throw new AppError(400, "Message missing conversationId");
  }
  const conversation = await storage.getConversation(message.conversationId);
  const channel = await storage.getChannel(conversation!.channelId!);
  const whatsappApi = new WhatsAppApiService(channel!);

  try {
    const mediaUrl = await whatsappApi.getMediaUrl(message.mediaId);
    
    // Update message with the URL
    await storage.updateMessage(messageId, { mediaUrl });

    res.json({ 
      url: `/api/media/${messageId}`, 
      whatsappUrl: mediaUrl 
    });
  } catch (error) {
    console.error("Error getting media URL:", error);
    throw new AppError(500, "Failed to get media URL");
  }
});


export const getMediaProxy = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { messageId } = req.query;
    const { download } = req.query;

    console.log("Media proxy hit for messageId:", messageId, "download:", download);
    
    // Get message from database
    if (typeof messageId !== 'string') {
      return res.status(400).json({ error: 'Invalid messageId' });
    }
    const message = await storage.getMessage(messageId);
    if (!message || !message.mediaId) {
      return res.status(404).json({ error: 'Media not found' });
    }

    if (!message.conversationId) {
      return res.status(400).json({ error: 'Message missing conversationId' });
    }

    const conversation = await storage.getConversation(message.conversationId);
    const channel = await storage.getChannel(conversation!.channelId!);
    const whatsappApi = new WhatsAppApiService(channel!);

    console.log("Streaming media for mediaId:", message.mediaId);
    
    // Set appropriate headers before streaming
    const contentType = message.mediaMimeType || 'application/octet-stream';
    
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=300',
    });
    
    // If download is requested, set download header
    if (download === 'true') {
      const filename = message.metadata || `media_${messageId}`;
      res.set('Content-Disposition', `attachment; filename="${filename}"`);
    }

    // Stream media directly using WhatsApp service
    const success = await whatsappApi.streamMedia(message.mediaId, res);
    
    if (!success) {
      // If streaming failed, try buffer approach
      const mediaBuffer = await whatsappApi.getMedia(message.mediaId);
      
      if (!mediaBuffer) {
        return res.status(404).json({ error: 'Media not accessible' });
      }
      
      res.set('Content-Length', mediaBuffer.length.toString());
      res.send(mediaBuffer);
    }
    
  } catch (error) {
    console.error('Media proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});





export const sendMessageOODLL = asyncHandler(async (req: RequestWithChannel, res: Response) => {
  const { to, message, templateName, parameters, channelId: bodyChannelId, caption, type } = req.body;
  const file = (req as any).file; // multer adds this

  // Get channel
  let channelId = bodyChannelId;
  if (!channelId) {
    const activeChannel = await storage.getActiveChannel();
    if (!activeChannel) {
      throw new AppError(400, "No active channel found. Please select a channel.");
    }
    channelId = activeChannel.id;
  }

  const channel = await storage.getChannel(channelId);
  if (!channel) throw new AppError(404, "Channel not found");

  const whatsappApi = new WhatsAppApiService(channel);

  let result;
  let msgBody = message;
  let messageType = "text";

  if (templateName) {
    // Send template
    result = await whatsappApi.sendMessage(to, templateName, parameters || []);
    const newMsg = await storage.getTemplatesByName(templateName);
    msgBody = newMsg[0].body;
    messageType = "template";
  } else if (file) {
    // Handle media upload + send
    const mimeType = file.mimetype;
    const mediaId = await whatsappApi.uploadMedia(file.path, mimeType);

    // detect type automatically from mimetype
    if (mimeType.startsWith("image")) messageType = "image";
    else if (mimeType.startsWith("video")) messageType = "video";
    else if (mimeType.startsWith("audio")) messageType = "audio";
    else messageType = "document";

    result = await whatsappApi.sendMediaMessage(to, mediaId, messageType as any, caption || message);
    msgBody = caption || `[${messageType}]`;
  } else {
    // Text
    result = await whatsappApi.sendTextMessage(to, message);
    msgBody = message;
    messageType = "text";
  }

  // Conversation / contact logic (same as before)
  let conversation = await storage.getConversationByPhoneAndChannel(to, channelId);
  if (!conversation) {
    let contact = await storage.getContactByPhoneAndChannel(to, channelId);
    if (!contact) {
      contact = await storage.createContact({ name: to, phone: to, channelId });
    }
    conversation = await storage.createConversation({
      contactId: contact.id,
      contactPhone: to,
      contactName: contact.name || to,
      channelId,
      unreadCount: 0
    });
  }

  const createdMessage = await storage.createMessage({
    conversationId: conversation.id,
    content: msgBody,
    fromUser: true,
    direction: "outbound",
    status: "sent",
    whatsappMessageId: result.messages?.[0]?.id,
    messageType: messageType,
    timestamp: new Date(),
    metadata: file ? { mimeType: file.mimetype, originalName: file.originalname } : {}
  });

  await storage.updateConversation(conversation.id, {
    lastMessageAt: new Date(),
    lastMessageText: msgBody,
  });

  if ((global as any).broadcastToConversation) {
    (global as any).broadcastToConversation(conversation.id, {
      type: "new-message",
      message: createdMessage
    });
  }

  res.json({
    success: true,
    messageId: result.messages?.[0]?.id,
    conversationId: conversation.id
  });
});

export const sendMessage = asyncHandler(async (req: RequestWithChannel, res: Response) => {
  // Never log the full body — it contains recipient phone numbers and the
  // message payload (potentially PII / customer content).
  const {
    to,
    message,
    templateName,
    parameters,
    buttonParameters,
    cardBodyParameters,
    cardButtonParameters,
    carouselCardMediaIds,
    mediaId,
    channelId: bodyChannelId,
    caption,
    headerType,
    expirationTimeMs
  } = req.body;

  const file = (req as any).file;

  // ================= CHANNEL =================
  let channelId = bodyChannelId;
  if (!channelId) {
    const activeChannel = await storage.getActiveChannel();
    if (!activeChannel) {
      throw new AppError(400, "No active channel found");
    }
    channelId = activeChannel.id;
  }

  const channel = await storage.getChannel(channelId);
  if (!channel) throw new AppError(404, "Channel not found");

  const whatsappApi = new WhatsAppApiService(channel);

  let result: any;
  let msgBody = message || "";
  let messageType: string = "text";

  // ================= CONTACT (IMPORTANT) =================
  let contact =
    (await storage.getContactByPhoneAndChannel(to, channelId)) ||
    (await storage.createContact({
      name: to,
      phone: to,
      channelId,
    }));

  // ================= TEMPLATE =================
  if (templateName) {
    // 🔑 Resolve template parameters from contact
    const resolvedParams: string[] = [];

    if (Array.isArray(parameters) && parameters.length > 0) {
      for (const p of parameters) {
        let value = "";

        if (p.type === "fullName") value = contact.name || "";
        else if (p.type === "phone") value = contact.phone || "";
        else if (p.type === "custom") value = p.value || "";

        if (!value.trim()) {
          throw new AppError(400, "Template variable resolved to empty value");
        }

        resolvedParams.push(value);
      }
    }

    // ================= MESSAGE BODY (for UI / DB) =================
    const templateMatch = await storage.getTemplateByNameAndChannel(templateName, channelId)
      || (await storage.getTemplatesByName(templateName))[0];
    if (templateMatch) {
      msgBody = templateMatch.body;
      resolvedParams.forEach((val, i) => {
        msgBody = msgBody.replace(`{{${i + 1}}}`, val);
      });
    } else {
      msgBody = resolvedParams.join(" ");
    }

    messageType = "template";

    try {
      result = await whatsappApi.sendMessage(
        to,
        templateName,
        resolvedParams,
        mediaId,
        headerType,
        Array.isArray(buttonParameters) ? buttonParameters : undefined,
        cardBodyParameters || undefined,
        cardButtonParameters || undefined,
        expirationTimeMs ? Number(expirationTimeMs) : undefined,
        carouselCardMediaIds || undefined
      );
      console.log("✅ Template sent with params:", resolvedParams);
    } catch (err: any) {
      console.error("❌ Template send failed:", err.message);

      const errorInfo: any = {
        title: err.metaErrorTitle || "Template send failed",
        message: err.message || "Failed to send template via WhatsApp",
        code: err.metaErrorCode || null,
        errorData: err.metaErrorDetails ? { details: err.metaErrorDetails } : null,
      };

      let conversation = await storage.getConversationByPhoneAndChannel(to, channelId);
      if (!conversation) {
        conversation = await storage.createConversation({
          contactId: contact.id,
          contactPhone: to,
          contactName: contact.name || to,
          channelId,
          unreadCount: 0,
        });
      }

      const failedMessage = await storage.createMessage({
        conversationId: conversation.id,
        content: msgBody,
        fromUser: true,
        direction: "outbound",
        status: "failed",
        messageType,
        timestamp: new Date(),
        errorDetails: errorInfo,
        metadata: mediaId ? { headerMediaId: mediaId } : {},
      });

      await storage.updateConversation(conversation.id, {
        lastMessageAt: new Date(),
        lastMessageText: msgBody,
      });

      if ((global as any).broadcastToConversation) {
        (global as any).broadcastToConversation(conversation.id, {
          type: "new-message",
          message: failedMessage,
        });
      }

      return res.json({
        success: false,
        error: err.message || "Failed to send template via WhatsApp",
        conversationId: conversation.id,
        message: failedMessage,
      });
    }
  }

  // ================= MEDIA =================
  else if (mediaId) {
    const mimeType = file.mimetype;

    if (mimeType.startsWith("image")) messageType = "image";
    else if (mimeType.startsWith("video")) messageType = "video";
    else if (mimeType.startsWith("audio")) messageType = "audio";
    else messageType = "document";

    result = await whatsappApi.sendMediaMessagee(
      to,
      mediaId,
      messageType as any,
      caption || message,
    );

    msgBody = caption || `[${messageType}]`;
  }

  // ================= TEXT =================
  else {
    result = await whatsappApi.sendTextMessage(to, message);
    msgBody = message;
    messageType = "text";
  }

  // ================= CONVERSATION =================
  let conversation = await storage.getConversationByPhoneAndChannel(to, channelId);
  if (!conversation) {
    conversation = await storage.createConversation({
      contactId: contact.id,
      contactPhone: to,
      contactName: contact.name || to,
      channelId,
      unreadCount: 0,
    });
  }

  const createdMessage = await storage.createMessage({
    conversationId: conversation.id,
    content: msgBody,
    fromUser: true,
    direction: "outbound",
    status: "sent",
    whatsappMessageId: result.messages?.[0]?.id,
    messageType,
    timestamp: new Date(),
    metadata: file
      ? {
          mimeType: file.mimetype,
          originalName: file.originalname,
        }
      : mediaId
      ? { headerMediaId: mediaId }
      : {},
  });

  await storage.updateConversation(conversation.id, {
    lastMessageAt: new Date(),
    lastMessageText: msgBody,
  });

  // ================= SOCKET =================
  if ((global as any).broadcastToConversation) {
    (global as any).broadcastToConversation(conversation.id, {
      type: "new-message",
      message: createdMessage,
    });
  }

  res.json({
    success: true,
    messageId: result.messages?.[0]?.id,
    conversationId: conversation.id,
    message: createdMessage,
  });
});