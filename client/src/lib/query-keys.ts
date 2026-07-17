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

/**
 * Centralized React-Query key factory.
 *
 * Keep all query keys defined here so that invalidations and cache lookups use
 * the same structure and typos can be caught at the call site. The key shape
 * mirrors the REST URL for the data (paired with any scoping params).
 */

export const queryKeys = {
  channels: {
    active: () => ["/api/channels/active"] as const,
    byUser: (userId?: string) => ["/api/channels", { userId }] as const,
  },
  conversations: {
    all: () => ["/api/conversations"] as const,
    list: (channelId?: string) => ["/api/conversations", channelId] as const,
    detail: (conversationId?: string) =>
      ["/api/conversations", conversationId] as const,
    messages: (conversationId?: string) =>
      ["/api/conversations", conversationId, "messages"] as const,
    pins: (channelId?: string) =>
      ["/api/conversations/pins", channelId] as const,
  },
  campaigns: {
    all: () => ["/api/campaigns"] as const,
    list: (scope?: Record<string, unknown>) =>
      scope ? (["/api/campaigns", scope] as const) : (["/api/campaigns"] as const),
    byChannel: (channelId?: string) => ["/api/campaigns", channelId] as const,
    detail: (id: string) => ["/api/campaigns", id] as const,
  },
  templates: {
    all: () => ["/api/templates"] as const,
    list: (scope?: Record<string, unknown>) =>
      scope ? (["/api/templates", scope] as const) : (["/api/templates"] as const),
    byChannel: (channelId?: string) => ["/api/templates", channelId] as const,
    detail: (id: string) => ["/api/templates", id] as const,
  },
  automations: {
    all: () => ["/api/automations"] as const,
    list: (channelId?: string) => ["/api/automations", channelId] as const,
    detail: (id: string) => ["/api/automations", id] as const,
  },
  contacts: {
    all: () => ["/api/contacts"] as const,
    list: (params: Record<string, unknown>) => ["/api/contacts", params] as const,
    detail: (id: string) => ["/api/contacts", id] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
