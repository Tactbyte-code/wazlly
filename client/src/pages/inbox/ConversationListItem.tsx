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

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { MessageCircle, Bot, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatLastSeen } from "./utils";
import type { ConversationWithContact } from "./types";
import { isDemoUser, maskName, maskPhone, maskContent } from "@/utils/maskUtils";
import { useTranslation } from "@/lib/i18n";

const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
];

function getAvatarColor(name: string | null | undefined): string {
  if (!name) return "bg-gray-400";
  const charCode = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
}

function getMessagePreview(message: any, shouldMask: boolean): string {
  if (!message) return "";
  if (shouldMask) return maskContent();

  if (typeof message === "object") {
    if (typeof message.content === "string") {
      return message.content.length > 40
        ? message.content.substring(0, 40) + "..."
        : message.content;
    }

    if (typeof message.text === "string") {
      return message.text.length > 40
        ? message.text.substring(0, 40) + "..."
        : message.text;
    }

    return "[Media]";
  }

  const safeMessage = String(message);

  return safeMessage.length > 40
    ? safeMessage.substring(0, 40) + "..."
    : safeMessage;
}

const ConversationListItem = ({
  conversation,
  isSelected,
  onClick,
  user,
  isPinned = false,
  onTogglePin,
}: {
  conversation: ConversationWithContact;
  isSelected: boolean;
  onClick: () => void;
  user?: any;
  isPinned?: boolean;
  onTogglePin?: (conversationId: string, currentlyPinned: boolean) => void;
}) => {
  const { t } = useTranslation();
  const lastMessageTime = conversation.lastMessageAt
    ? formatLastSeen(conversation.lastMessageAt)
    : "";
  const demo = isDemoUser(user?.username);

  const displayName = demo
    ? maskName(conversation.contactName || "")
    : conversation.contactName;
  const displayPhone = demo
    ? maskPhone(conversation.contactPhone || "")
    : conversation.contactPhone;

  const avatarColor = getAvatarColor(conversation.contactName);

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePin) onTogglePin(conversation.id, isPinned);
  };

  const row = (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3.5 cursor-pointer transition-all duration-150",
        isSelected
          ? "bg-green-50/80 border-l-[3px] border-l-green-500 shadow-sm"
          : "border-l-[3px] border-l-transparent hover:bg-gray-50/80"
      )}
    >
      <Avatar className="h-11 w-11 flex-shrink-0">
        <AvatarFallback className={cn("text-white font-semibold text-sm", avatarColor)}>
          {demo ? "*" : (conversation.contactName?.[0]?.toUpperCase() || "?")}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h4 className="font-semibold text-[14px] text-gray-900 truncate leading-tight flex items-center gap-1">
            {isPinned && (
              <Pin
                className="w-3 h-3 text-gray-500 flex-shrink-0 fill-current"
                aria-label={t("inbox.pin.pinned")}
              />
            )}
            <span className="truncate">
              {displayName || displayPhone || "Unknown"}
            </span>
          </h4>
          <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0 font-medium">
            {lastMessageTime}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center min-w-0">
            {conversation.type === "whatsapp" && (
              <MessageCircle className="w-3.5 h-3.5 text-green-500 inline-block mr-1.5 flex-shrink-0" />
            )}
            {conversation.type === "messenger" && (
              <MessageCircle className="w-3.5 h-3.5 text-blue-500 inline-block mr-1.5 flex-shrink-0" />
            )}
            {conversation.type === "chatbot" && (
              <Bot className="w-3.5 h-3.5 text-green-500 inline-block mr-1.5 flex-shrink-0" />
            )}
            <p className="text-[13px] text-gray-500 truncate leading-tight">
              {getMessagePreview(conversation.lastMessageText, demo) ||
                "Tap to open conversation"}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onTogglePin && (
              <button
                type="button"
                onClick={handlePinClick}
                title={isPinned ? t("inbox.pin.unpin") : t("inbox.pin.pin")}
                aria-label={isPinned ? t("inbox.pin.unpin") : t("inbox.pin.pin")}
                className={cn(
                  "p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition",
                  // Always visible on touch (no hover), reveal on hover for desktop.
                  isPinned
                    ? "opacity-100"
                    : "opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                )}
              >
                {isPinned ? (
                  <PinOff className="w-3.5 h-3.5" />
                ) : (
                  <Pin className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {conversation.unreadCount && conversation.unreadCount > 0 ? (
              <Badge className="ml-1 bg-green-500 hover:bg-green-500 text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center rounded-full px-1.5 font-semibold">
                {conversation.unreadCount}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  if (!onTogglePin) return row;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => onTogglePin(conversation.id, isPinned)}
        >
          {isPinned ? (
            <>
              <PinOff className="w-4 h-4 mr-2" />
              {t("inbox.pin.unpin")}
            </>
          ) : (
            <>
              <Pin className="w-4 h-4 mr-2" />
              {t("inbox.pin.pin")}
            </>
          )}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ConversationListItem;
