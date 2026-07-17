/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * ============================================================
 *
 * Canonical Role enum shared across server and client.
 *
 * Tenancy / ownership model: `createdBy` (varchar FK → users.id).
 * See replit.md for the canonical tenancy decision.
 */

export const Role = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  TEAM: "team",
  MANAGER: "manager",
  AGENT: "agent",
  USER: "user",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_VALUES: Role[] = [
  Role.SUPERADMIN,
  Role.ADMIN,
  Role.TEAM,
  Role.MANAGER,
  Role.AGENT,
  Role.USER,
];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLE_VALUES as string[]).includes(value);
}

/** Roles that represent tenant owners (top-level accounts). */
export const OWNER_ROLES: Role[] = [Role.SUPERADMIN, Role.ADMIN];

/** Status values used by `users.status`. */
export const UserStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BANNED: "banned",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
export const USER_STATUS_VALUES: UserStatus[] = [
  UserStatus.ACTIVE,
  UserStatus.INACTIVE,
  UserStatus.BANNED,
];

/** Status values used by `campaigns.status`. */
export const CampaignStatus = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;
export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];
export const CAMPAIGN_STATUS_VALUES: CampaignStatus[] = [
  CampaignStatus.DRAFT,
  CampaignStatus.SCHEDULED,
  CampaignStatus.ACTIVE,
  CampaignStatus.PAUSED,
  CampaignStatus.COMPLETED,
  CampaignStatus.FAILED,
];

/** Status values used by `messages.status`. */
export const MessageStatus = {
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
  RECEIVED: "received",
  PENDING: "pending",
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];
export const MESSAGE_STATUS_VALUES: MessageStatus[] = [
  MessageStatus.SENT,
  MessageStatus.DELIVERED,
  MessageStatus.READ,
  MessageStatus.FAILED,
  MessageStatus.RECEIVED,
  MessageStatus.PENDING,
];
