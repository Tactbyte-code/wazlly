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

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Send,
  Paperclip,
  AlertCircle,
} from "lucide-react";
import { TemplatePickerDialog } from "@/components/shared/TemplatePickerDialog";
import type { Conversation } from "@shared/schema";


interface MessageComposerProps {
  selectedConversation: Conversation;
  messageText: string;
  onTyping: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onSendMessage: () => void;
  onFileAttachment: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectTemplate: (template: any, variables: { type?: string; value?: string }[], mediaId?: string, headerType?: string | null, buttonParameters?: string[], expirationTimeMs?: number, carouselCardMediaIds?: Record<number, string>) => void;
  is24HourWindowExpired: boolean;
  activeChannelId?: string;
  sendMessagePending: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const MessageComposer = ({
  selectedConversation,
  messageText,
  onTyping,
  onSendMessage,
  onFileAttachment,
  onFileChange,
  onSelectTemplate,
  is24HourWindowExpired,
  activeChannelId,
  sendMessagePending,
  fileInputRef,
}: MessageComposerProps) => {
  return (
    <div className="bg-white border-t border-gray-200 p-3 md:p-4">
      {is24HourWindowExpired &&
        selectedConversation.type === "whatsapp" && (
          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">
                  24-hour window expired
                </p>
                <p className="text-yellow-700">
                  You can only send template messages now
                </p>
              </div>
            </div>
          </div>
        )}

      <div className="flex items-end gap-1 md:gap-2">
        <div className="flex gap-1">
          {selectedConversation.type === "whatsapp" && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 md:h-9 md:w-9"
                      onClick={onFileAttachment}
                      disabled={false}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach File</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={onFileChange}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
              />

                <TemplatePickerDialog
                  channelId={activeChannelId}
                  onSelectTemplate={onSelectTemplate}
                />
            </>
          )}


          
        </div>

        

        <textarea
          placeholder={
            is24HourWindowExpired &&
            selectedConversation.type === "whatsapp"
              ? "Templates only"
              : "Type a message..."
          }
          value={messageText}
          onChange={onTyping}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 120) + "px";
          }}
          disabled={
            is24HourWindowExpired &&
            selectedConversation.type === "whatsapp"
          }
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minHeight: "36px", maxHeight: "120px" }}
        />

        <Button
          onClick={onSendMessage}
          disabled={
            !messageText.trim() ||
                (is24HourWindowExpired &&
                  selectedConversation.type === "whatsapp") ||
                sendMessagePending
          }
          size="icon"
          className="h-8 w-8 md:h-9 md:w-9 bg-emerald-500 hover:bg-emerald-600"
          data-testid="button-send-message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default MessageComposer;
