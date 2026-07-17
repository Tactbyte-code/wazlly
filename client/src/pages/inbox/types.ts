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

import type { Conversation, Contact } from "@shared/schema";

export interface Message {
  id: string;
  conversationId: string;
  whatsappMessageId?: string;
  fromUser: boolean;
  direction: string;
  content: string;
  type: string;
  messageType: string;
  mediaId?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  status?: string;
  errorDetails?: any;
  metadata?: {
    filePath?: string;
    fileSize?: number;
    mimeType?: string;
    originalName?: string;
    cloudUrl?: string;
    fileName?: string;
    buttons?: { id?: string; text: string }[];
  };
  createdAt: string;
}

export type ConversationWithContact = Conversation & { contact?: Contact };
