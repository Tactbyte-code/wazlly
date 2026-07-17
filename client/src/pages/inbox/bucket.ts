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

import type { ConversationWithContact } from "./types";

export type BucketKey = "pinned" | "awaiting" | "unread" | "all";

export const SECTION_ORDER: BucketKey[] = [
  "pinned",
  "awaiting",
  "unread",
  "all",
];

// Map server-derived bucket strings to local section keys.
export const SERVER_BUCKET_MAP: Record<string, BucketKey> = {
  pinned: "pinned",
  awaiting_reply: "awaiting",
  unread: "unread",
  other: "all",
};

// Local copy of normalizeTime to keep this module free of React/lucide deps
// (so it can be unit-tested in a plain node environment).
function toMs(value: any): number {
  if (!value) return 0;

  if (typeof value === "string" && value.includes(" ")) {
    const iso = value.replace(" ", "T") + "Z";
    const parsed = Date.parse(iso);
    return isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value === "number") {
    return value < 1e12 ? value * 1000 : value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  const parsed = Date.parse(value);
  return isNaN(parsed) ? 0 : parsed;
}

export function bucketFor(
  conv: ConversationWithContact,
  pinnedIds: Set<string>
): BucketKey {
  if (pinnedIds.has(conv.id)) return "pinned";

  // Prefer server-derived bucket when present so client + server agree.
  const serverBucket = (conv as any).bucket as string | undefined;
  if (serverBucket && SERVER_BUCKET_MAP[serverBucket]) {
    const mapped = SERVER_BUCKET_MAP[serverBucket];
    // Server may also say "pinned" but pin state is per-user-client-truth,
    // so honor pinnedIds first (already handled above) and otherwise trust
    // server's awaiting/unread/other decision.
    if (mapped !== "pinned") return mapped;
  }

  const lastMsg = toMs((conv as any).lastMessageAt);
  const lastIn = toMs((conv as any).lastIncomingMessageAt);
  // "Awaiting Reply" requires that the most recent message is inbound — i.e.
  // no agent reply has happened since the last customer message. lastMessageAt
  // is updated on every message, so if lastIncomingMessageAt is strictly less
  // than lastMessageAt, the last message was outbound.
  const lastIsInbound = lastIn > 0 && (lastMsg === 0 || lastIn >= lastMsg);

  if (lastIsInbound) return "awaiting";
  if ((conv.unreadCount || 0) > 0) return "unread";
  return "all";
}
