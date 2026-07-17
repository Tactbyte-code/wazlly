import { describe, it, expect } from "vitest";
import { bucketFor } from "../bucket";
import type { ConversationWithContact } from "../types";

function conv(partial: Partial<ConversationWithContact> & { id: string }): ConversationWithContact {
  return {
    id: partial.id,
    unreadCount: 0,
    ...partial,
  } as ConversationWithContact;
}

describe("bucketFor", () => {
  it("pinned wins over every other signal (including server bucket and unread)", () => {
    const c = conv({
      id: "c1",
      unreadCount: 5,
      lastMessageAt: "2026-01-02T10:00:00Z",
      lastIncomingMessageAt: "2026-01-02T10:00:00Z",
      bucket: "awaiting_reply",
    } as any);
    expect(bucketFor(c, new Set(["c1"]))).toBe("pinned");
  });

  it("inbound-last with no agent reply since → 'awaiting'", () => {
    // Last incoming time equals the last message time → last message is inbound.
    const c = conv({
      id: "c2",
      unreadCount: 0,
      lastMessageAt: "2026-01-02T10:00:00Z",
      lastIncomingMessageAt: "2026-01-02T10:00:00Z",
    } as any);
    expect(bucketFor(c, new Set())).toBe("awaiting");
  });

  it("inbound-last (incoming strictly newer than lastMessage) → 'awaiting'", () => {
    const c = conv({
      id: "c2b",
      unreadCount: 0,
      lastMessageAt: "2026-01-02T09:59:00Z",
      lastIncomingMessageAt: "2026-01-02T10:00:00Z",
    } as any);
    expect(bucketFor(c, new Set())).toBe("awaiting");
  });

  it("agent replies after inbound → falls out of 'awaiting'", () => {
    // lastMessageAt is strictly newer than lastIncomingMessageAt → agent replied last.
    // No unread and no inbound-last → falls into the 'all' bucket.
    const c = conv({
      id: "c3",
      unreadCount: 0,
      lastMessageAt: "2026-01-02T11:00:00Z",
      lastIncomingMessageAt: "2026-01-02T10:00:00Z",
    } as any);
    expect(bucketFor(c, new Set())).toBe("all");
  });

  it("unread but already replied (agent replied last) → 'unread' bucket", () => {
    const c = conv({
      id: "c4",
      unreadCount: 3,
      lastMessageAt: "2026-01-02T11:00:00Z",
      lastIncomingMessageAt: "2026-01-02T10:00:00Z",
    } as any);
    expect(bucketFor(c, new Set())).toBe("unread");
  });

  it("no inbound, no unread, no agent reply context → 'all'", () => {
    const c = conv({ id: "c5", unreadCount: 0 });
    expect(bucketFor(c, new Set())).toBe("all");
  });

  it("respects server-derived bucket when present (awaiting_reply → 'awaiting')", () => {
    // Even when timestamps would otherwise classify as 'all' (agent replied last),
    // a server bucket of awaiting_reply takes precedence.
    const c = conv({
      id: "c6",
      unreadCount: 0,
      lastMessageAt: "2026-01-02T11:00:00Z",
      lastIncomingMessageAt: "2026-01-02T10:00:00Z",
      bucket: "awaiting_reply",
    } as any);
    expect(bucketFor(c, new Set())).toBe("awaiting");
  });

  it("server bucket 'pinned' is ignored when not in pinnedIds (pin truth is per-user-client)", () => {
    // Server says pinned but user's local pin set doesn't include it. The server
    // 'pinned' value must not promote to 'pinned' — fall back to timestamp logic.
    const c = conv({
      id: "c7",
      unreadCount: 0,
      lastMessageAt: "2026-01-02T10:00:00Z",
      lastIncomingMessageAt: "2026-01-02T10:00:00Z",
      bucket: "pinned",
    } as any);
    expect(bucketFor(c, new Set())).toBe("awaiting");
  });

  it("server bucket 'other' maps to 'all'", () => {
    const c = conv({ id: "c8", unreadCount: 0, bucket: "other" } as any);
    expect(bucketFor(c, new Set())).toBe("all");
  });
});
