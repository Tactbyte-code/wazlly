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

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/ui/loading";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ConversationListItem from "./ConversationListItem";
import { normalizeTime } from "./utils";
import type { ConversationWithContact } from "./types";
import type { Conversation } from "@shared/schema";
import { useTranslation } from "@/lib/i18n";
import { bucketFor, SECTION_ORDER, type BucketKey } from "./bucket";

interface ConversationListProps {
  conversations: ConversationWithContact[];
  conversationsLoading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterTab: string;
  onFilterTabChange: (tab: string) => void;
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: ConversationWithContact) => void;
  user?: any;
  pinnedIds?: Set<string>;
  pinOrder?: Record<string, number>;
  onTogglePin?: (conversationId: string, currentlyPinned: boolean) => void;
}

const COLLAPSE_KEY_BASE = "inbox.sectionCollapsed";

function collapseKey(userId: string | undefined, bucket: BucketKey): string {
  return `${COLLAPSE_KEY_BASE}.${userId || "anon"}.${bucket}`;
}

function loadCollapsed(userId: string | undefined): Record<BucketKey, boolean> {
  if (typeof window === "undefined") {
    return { pinned: false, awaiting: false, unread: false, all: false };
  }
  const result: Record<BucketKey, boolean> = {
    pinned: false,
    awaiting: false,
    unread: false,
    all: false,
  };
  for (const k of SECTION_ORDER) {
    try {
      const raw = window.localStorage.getItem(collapseKey(userId, k));
      result[k] = raw === "1";
    } catch {
      // ignore
    }
  }
  return result;
}

const ConversationList = ({
  conversations,
  conversationsLoading,
  searchQuery,
  onSearchChange,
  filterTab,
  onFilterTabChange,
  selectedConversation,
  onSelectConversation,
  user,
  pinnedIds,
  pinOrder,
  onTogglePin,
}: ConversationListProps) => {
  const { t } = useTranslation();
  const pinSet = pinnedIds ?? new Set<string>();

  const userId: string | undefined = user?.id;
  const [collapsed, setCollapsed] = useState<Record<BucketKey, boolean>>(() =>
    loadCollapsed(userId)
  );

  // Re-load collapsed state when the user changes (e.g. switch accounts).
  useEffect(() => {
    setCollapsed(loadCollapsed(userId));
  }, [userId]);

  const toggleSection = (key: BucketKey) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(
          collapseKey(userId, key),
          next[key] ? "1" : "0"
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  const sections = useMemo(() => {
    const groups: Record<BucketKey, ConversationWithContact[]> = {
      pinned: [],
      awaiting: [],
      unread: [],
      all: [],
    };
    for (const conv of conversations) {
      groups[bucketFor(conv, pinSet)].push(conv);
    }
    for (const key of SECTION_ORDER) {
      if (key === "pinned" && pinOrder) {
        groups[key].sort((a, b) => {
          const ai = pinOrder[a.id] ?? Number.MAX_SAFE_INTEGER;
          const bi = pinOrder[b.id] ?? Number.MAX_SAFE_INTEGER;
          if (ai !== bi) return ai - bi;
          return (
            normalizeTime((b as any).lastMessageAt) -
            normalizeTime((a as any).lastMessageAt)
          );
        });
      } else {
        groups[key].sort(
          (a, b) =>
            normalizeTime((b as any).lastMessageAt) -
            normalizeTime((a as any).lastMessageAt)
        );
      }
    }
    return groups;
  }, [conversations, pinSet, pinOrder]);

  const sectionTitles: Record<BucketKey, string> = {
    pinned: t("inbox.sections.pinned"),
    awaiting: t("inbox.sections.awaitingReply"),
    unread: t("inbox.sections.unread"),
    all: t("inbox.sections.all"),
  };

  return (
    <div
      className={cn(
        "bg-white border-r border-gray-200 flex flex-col shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)]",
        selectedConversation
          ? "hidden md:flex md:w-[340px] lg:w-[400px]"
          : "w-full md:w-[340px] lg:w-[400px]"
      )}
    >
      <div className="p-2 sm:p-3 md:p-4 border-b border-gray-200 bg-white">
        <div className="relative mb-2 sm:mb-3">
          <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-7 sm:pl-9 pr-2 sm:pr-3 bg-gray-50 text-xs sm:text-sm w-full h-8 sm:h-10 rounded-lg"
          />
        </div>

        <Tabs value={filterTab} onValueChange={onFilterTabChange}>
          <div className="overflow-x-auto -mx-2 sm:-mx-3 md:-mx-4 px-2 sm:px-3 md:px-4 [&::-webkit-scrollbar]:h-[2px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
            <TabsList className="inline-flex w-auto h-7 sm:h-9 md:h-10 gap-1 sm:gap-1.5 md:gap-2 bg-gray-100 p-0.5 sm:p-1 rounded-lg">
              <TabsTrigger value="all" className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md">All</TabsTrigger>
              <TabsTrigger value="whatsapp" className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md">WA</TabsTrigger>
              <TabsTrigger value="chatbot" className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md">Widget</TabsTrigger>
              <TabsTrigger value="assigned" className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md">Assigned</TabsTrigger>
              <TabsTrigger value="unread" className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md">Unread</TabsTrigger>
              <TabsTrigger value="open" className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md">Open</TabsTrigger>
              <TabsTrigger value="resolved" className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap px-2 sm:px-3 md:px-4 h-full rounded-md">Resolved</TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      <ScrollArea className="flex-1 ">
        {conversationsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loading />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No conversations found
          </div>
        ) : (
          SECTION_ORDER.map((key) => {
            const items = sections[key];
            if (items.length === 0) return null;
            const isCollapsed = collapsed[key];
            return (
              <div key={key} className="border-b border-gray-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  aria-expanded={!isCollapsed}
                  className="w-full sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm px-4 py-2 flex items-center justify-between text-left hover:bg-gray-100 transition"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
                    {isCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    {sectionTitles[key]}
                    <span className="ml-1 text-gray-400 normal-case font-medium">
                      ({items.length})
                    </span>
                  </span>
                </button>
                {!isCollapsed &&
                  items.map((conversation) => (
                    <ConversationListItem
                      key={conversation.id}
                      conversation={conversation}
                      isSelected={selectedConversation?.id === conversation.id}
                      onClick={() => onSelectConversation(conversation)}
                      user={user}
                      isPinned={pinSet.has(conversation.id)}
                      onTogglePin={onTogglePin}
                    />
                  ))}
              </div>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
};

export default ConversationList;
