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

export const COLORS = {
  whatsapp: "#25D366",
  whatsappDark: "#128C7E", 
  primaryBlue: "#3B82F6",
  accentOrange: "#F59E0B",
  accentPurple: "#8B5CF6",
  success: "#16A34A",
  warning: "#F59E0B",
  error: "#DC2626",
} as const;

export const CAMPAIGN_TYPES = {
  MARKETING: "marketing",
  TRANSACTIONAL: "transactional",
} as const;

export const API_TYPES = {
  CLOUD_API: "cloud_api",
  MM_LITE: "mm_lite",
} as const;

export const TEMPLATE_CATEGORIES = {
  MARKETING: "marketing",
  TRANSACTIONAL: "transactional", 
  AUTHENTICATION: "authentication",
  UTILITY: "utility",
} as const;

export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
} as const;

export const TEMPLATE_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export const CONTACT_STATUS = {
  ACTIVE: "active",
  BLOCKED: "blocked", 
  UNSUBSCRIBED: "unsubscribed",
} as const;

export const CONVERSATION_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  ASSIGNED: "assigned",
} as const;

export const MESSAGE_STATUS = {
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
} as const;

export const PRIORITY_LEVELS = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
  URGENT: "urgent",
} as const;
