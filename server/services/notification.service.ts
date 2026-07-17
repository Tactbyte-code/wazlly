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

import { eq, and, inArray } from "drizzle-orm";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import {
  notifications,
  sentNotifications,
  notificationTemplates,
  userNotificationPreferences,
  users,
} from "@shared/schema";
import { db } from "server/db";
import nodemailer from "nodemailer";
import { resolvePublicOrigin } from "./public-origin";

// Build the absolute-URL template variables that seeded notification
// templates rely on (`{{appUrl}}`, `{{inboxUrl}}`, etc).
//
// When the public origin has not been captured yet (fresh install before
// any authenticated request), every URL var is set to the empty string AND
// the caller is told to strip action-button anchors from the rendered HTML
// so users never receive a broken `http:///inbox` link.
async function buildUrlVariables(): Promise<{
  vars: Record<string, string>;
  origin: string | null;
}> {
  const origin = await resolvePublicOrigin();
  if (!origin) {
    return {
      vars: {
        appUrl: "",
        inboxUrl: "",
        templatesUrl: "",
        campaignsUrl: "",
        settingsUrl: "",
        supportUrl: "",
      },
      origin: null,
    };
  }
  return {
    vars: {
      appUrl: origin,
      inboxUrl: `${origin}/inbox`,
      templatesUrl: `${origin}/templates`,
      campaignsUrl: `${origin}/campaigns`,
      settingsUrl: `${origin}/settings`,
      supportUrl: `${origin}/support`,
    },
    origin,
  };
}

// Strip action-button anchors whose href references a URL template var
// (e.g. `{{appUrl}}/inbox`, `{{inboxUrl}}`) so a missing public origin
// can never produce a broken `http:///inbox` link in a delivered email.
// The visible link text is kept as a plain paragraph.
export function stripUrlVarAnchors(html: string): string {
  return html.replace(
    /<a\s+href="\{\{[a-zA-Z]+(?:Url|URL)\}\}[^"]*"[^>]*>([\s\S]*?)<\/a>/gi,
    '<p style="color:#374151;font-size:14px;margin-top:8px">$1 — log in to your dashboard.</p>'
  );
}

// Build the fallback inline-HTML body used for the digest email when the
// notification template row is missing or has email delivery disabled.
// When `origin` is captured we render the absolute "Open Inbox" anchor;
// when it is not, we render a button-free plain-text guidance paragraph
// so the recipient never sees a broken `http:///inbox` link.
export function buildDigestEmailHtml(
  digestMessage: string,
  origin: string | null
): string {
  return origin
    ? `<p>${digestMessage}</p><p><a href="${origin}/inbox">Open Inbox</a></p>`
    : `<p>${digestMessage}</p><p>Log in to your inbox to view and respond.</p>`;
}

export const NOTIFICATION_EVENTS = {
  NEW_MESSAGE: 'new_message',
  NEW_MESSAGE_DIGEST: 'new_message_digest',
  TEMPLATE_APPROVED: 'template_approved',
  TEMPLATE_REJECTED: 'template_rejected',
  CAMPAIGN_COMPLETED: 'campaign_completed',
  CAMPAIGN_FAILED: 'campaign_failed',
  CHANNEL_HEALTH_WARNING: 'channel_health_warning',
  TICKET_REPLY: 'ticket_reply',
} as const;

function replaceVariables(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
}

async function getEmailTransporter() {
  const { getSMTPConfig } = await import("server/controllers/smtp.controller");
  const config = await getSMTPConfig();
  if (config) {
    const port = parseInt(config.port, 10);
    const secure = port === 465;
    return nodemailer.createTransport({
      host: config.host,
      port,
      secure,
      ...(!secure && (port === 587 || !!config.secure) ? { requireTLS: true } : {}),
      auth: {
        user: config.user,
        pass: config.password,
      },
    });
  }
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

// ---------------------------------------------------------------------------
// SMTP retry helper
// Retries sending on transient (4xx) SMTP errors such as Hostinger's
// "451 4.7.1 Ratelimit" rejection, which explicitly asks us to try later.
// Attempts: immediate → 30s → 60s → give up.
// ---------------------------------------------------------------------------
const SMTP_RETRY_DELAYS_MS = [30_000, 60_000];
const MAX_SMTP_ATTEMPTS = 3;

function _isTransientSmtpError(error: any): boolean {
  if (!error) return false;
  // Nodemailer wraps SMTP errors — responseCode is the numeric SMTP reply code
  const code: number | undefined = error.responseCode ?? error.response?.code;
  if (code !== undefined && code >= 400 && code < 500) return true;
  // Some versions surface this as a string in error.code (e.g. 'EMESSAGE')
  // combined with the response string containing '4'
  if (typeof error.response === 'string' && /^4\d\d/.test(error.response.trim())) return true;
  return false;
}

async function _sendMailWithRetry(
  mailOptions: Record<string, any>,
  attempt: number = 1
): Promise<{ success: boolean; retryScheduled?: boolean; messageId?: string; error?: any }> {
  try {
    const transporter = await getEmailTransporter();
    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ [Notification Email] Sent to: ${mailOptions.to}` + (attempt > 1 ? ` (attempt ${attempt}/${MAX_SMTP_ATTEMPTS})` : ""));
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    if (_isTransientSmtpError(error) && attempt < MAX_SMTP_ATTEMPTS) {
      const delay = SMTP_RETRY_DELAYS_MS[attempt - 1] ?? 30_000;
      console.warn(
        `⚠️ [Notification Email] Transient SMTP error for ${mailOptions.to} (attempt ${attempt}/${MAX_SMTP_ATTEMPTS}), retrying in ${delay / 1000}s — ${error?.response || error?.message || "unknown error"}`
      );
      setTimeout(() => {
        _sendMailWithRetry(mailOptions, attempt + 1).catch(() => {});
      }, delay);
      // retryScheduled: true lets callers distinguish "will retry" from permanent failure
      return { success: false, retryScheduled: true, error };
    }
    console.error(
      `❌ [Notification Email] Permanent failure sending to ${mailOptions.to}` +
        (attempt > 1 ? ` (gave up after ${attempt} attempt(s))` : "") +
        ` — ${error?.response || error?.message || error}`
    );
    return { success: false, retryScheduled: false, error };
  }
}

export async function sendNotificationEmail(to: string, subject: string, htmlBody: string) {
  const { getSMTPConfig } = await import("server/controllers/smtp.controller");
  const config = await getSMTPConfig();
  const fromName = config?.fromName || "Notifications";
  const fromEmail = config?.fromEmail || "noreply@example.com";

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html: htmlBody,
  };

  return _sendMailWithRetry(mailOptions);
}


export async function getUserNotificationPreferences(userId: string) {
  const prefs = await db
    .select()
    .from(userNotificationPreferences)
    .where(eq(userNotificationPreferences.userId, userId));

  if (prefs.length === 0) {
    const defaults: Record<string, { inAppEnabled: boolean; emailEnabled: boolean; soundEnabled: boolean }> = {};
    for (const event of Object.values(NOTIFICATION_EVENTS)) {
      defaults[event] = {
        inAppEnabled: true,
        emailEnabled: true,
        soundEnabled: true,
      };
    }
    return defaults;
  }

  const result: Record<string, { inAppEnabled: boolean; emailEnabled: boolean; soundEnabled: boolean }> = {};
  for (const pref of prefs) {
    result[pref.eventType] = {
      inAppEnabled: pref.inAppEnabled ?? true,
      emailEnabled: pref.emailEnabled ?? true,
      soundEnabled: pref.soundEnabled ?? true,
    };
  }

  for (const event of Object.values(NOTIFICATION_EVENTS)) {
    if (!result[event]) {
      result[event] = {
        inAppEnabled: true,
        emailEnabled: true,
        soundEnabled: true,
      };
    }
  }

  return result;
}

export async function updateUserNotificationPreference(
  userId: string,
  eventType: string,
  prefs: { inAppEnabled?: boolean; emailEnabled?: boolean; soundEnabled?: boolean }
) {
  const existing = await db
    .select()
    .from(userNotificationPreferences)
    .where(
      and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.eventType, eventType)
      )
    );

  if (existing.length > 0) {
    const [updated] = await db
      .update(userNotificationPreferences)
      .set(prefs)
      .where(
        and(
          eq(userNotificationPreferences.userId, userId),
          eq(userNotificationPreferences.eventType, eventType)
        )
      )
      .returning();
    return updated;
  } else {
    const [inserted] = await db
      .insert(userNotificationPreferences)
      .values({
        userId,
        eventType,
        inAppEnabled: prefs.inAppEnabled ?? true,
        emailEnabled: prefs.emailEnabled ?? true,
        soundEnabled: prefs.soundEnabled ?? true,
      })
      .returning();
    return inserted;
  }
}

function generateCleanMessage(eventType: string, variables: Record<string, string>): string {
  switch (eventType) {
    case NOTIFICATION_EVENTS.NEW_MESSAGE:
      return `New message from ${variables.contactName || variables.contactPhone || "Unknown"}: ${variables.messagePreview || ""}`;
    case NOTIFICATION_EVENTS.TEMPLATE_APPROVED:
      return `Your template "${variables.templateName || ""}" has been approved and is ready to use.`;
    case NOTIFICATION_EVENTS.TEMPLATE_REJECTED:
      return `Your template "${variables.templateName || ""}" was rejected. ${variables.rejectionReason ? "Reason: " + variables.rejectionReason : ""}`;
    case NOTIFICATION_EVENTS.CAMPAIGN_COMPLETED:
      return `Campaign "${variables.campaignName || ""}" completed. Sent: ${variables.totalSent || "0"}, Delivered: ${variables.deliveredCount || "0"}, Failed: ${variables.failedCount || "0"}.`;
    case NOTIFICATION_EVENTS.CAMPAIGN_FAILED:
      return `Campaign "${variables.campaignName || ""}" had issues. Failed: ${variables.failedCount || "0"}. ${variables.errorMessage || ""}`;
    case NOTIFICATION_EVENTS.CHANNEL_HEALTH_WARNING:
      return `Channel ${variables.channelName || ""} (${variables.channelPhone || ""}) health: ${variables.healthStatus || "Warning"}. Quality: ${variables.qualityRating || "Unknown"}.`;
    case NOTIFICATION_EVENTS.TICKET_REPLY:
      return `New reply on ticket "${variables.ticketTitle || ""}": ${variables.messagePreview || ""}`;
    default:
      return variables.messagePreview || "You have a new notification.";
  }
}

function getNotificationLink(eventType: string): string {
  switch (eventType) {
    case NOTIFICATION_EVENTS.NEW_MESSAGE:
      return "/inbox";
    case NOTIFICATION_EVENTS.TEMPLATE_APPROVED:
    case NOTIFICATION_EVENTS.TEMPLATE_REJECTED:
      return "/templates";
    case NOTIFICATION_EVENTS.CAMPAIGN_COMPLETED:
    case NOTIFICATION_EVENTS.CAMPAIGN_FAILED:
      return "/campaigns";
    case NOTIFICATION_EVENTS.CHANNEL_HEALTH_WARNING:
      return "/settings";
    case NOTIFICATION_EVENTS.TICKET_REPLY:
      return "/support";
    default:
      return "/notifications";
  }
}

// Phase 1: after first message, wait 1 min before sending the first digest email.
// Phase 2: after each digest is sent, enter a 15-min cooldown. Messages during
//          cooldown accumulate silently. When cooldown expires, flush if any pending.
const DIGEST_QUICK_FLUSH_MS = 1 * 60 * 1000;  // 1 minute
const DIGEST_COOLDOWN_MS    = 15 * 60 * 1000; // 15 minutes

interface DigestEntry {
  count: number;
  contacts: Set<string>;
  channelId?: string;
  channelName: string;
  quickFlushTimer: ReturnType<typeof setTimeout> | null;
  cooldownTimer: ReturnType<typeof setTimeout> | null;
  inCooldown: boolean;
}

const digestMap = new Map<string, DigestEntry>();

function isUserOnline(userId: string): boolean {
  const io = (global as any).io;
  if (!io) return false;
  const room = io.sockets.adapter.rooms.get(`user:${userId}`);
  return !!room && room.size > 0;
}

async function flushDigest(key: string) {
  const entry = digestMap.get(key);
  if (!entry || entry.count === 0) {
    digestMap.delete(key);
    return;
  }

  const parts = key.split(":");
  const userId = parts[0];
  const contactList = Array.from(entry.contacts);
  const contactSummary = contactList.length <= 3
    ? contactList.join(", ")
    : `${contactList.slice(0, 3).join(", ")} and ${contactList.length - 3} more`;

  const digestMessage = entry.count === 1
    ? `New message from ${contactSummary} on ${entry.channelName}`
    : `You have ${entry.count} new messages from ${contactList.length} contact${contactList.length > 1 ? "s" : ""} (${contactSummary}) on ${entry.channelName}`;

  const digestTitle = `${entry.count} new message${entry.count > 1 ? "s" : ""}`;

  // Snapshot and reset the count/contacts so messages that arrive during the
  // async DB/email work are buffered into a fresh batch for the next cycle.
  const flushedCount = entry.count;
  const flushedContacts = contactList;
  entry.count = 0;
  entry.contacts = new Set();

  // Clear the quick-flush timer and enter cooldown.
  if (entry.quickFlushTimer) {
    clearTimeout(entry.quickFlushTimer);
    entry.quickFlushTimer = null;
  }
  if (entry.cooldownTimer) {
    clearTimeout(entry.cooldownTimer);
  }
  entry.inCooldown = true;
  entry.cooldownTimer = setTimeout(() => {
    const e = digestMap.get(key);
    if (!e) return;
    e.inCooldown = false;
    e.cooldownTimer = null;
    if (e.count > 0) {
      void flushDigest(key);
    } else {
      digestMap.delete(key);
    }
  }, DIGEST_COOLDOWN_MS);

  try {
    const io = (global as any).io;
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', {
        id: `digest-${Date.now()}`,
        title: digestTitle,
        message: digestMessage,
        type: NOTIFICATION_EVENTS.NEW_MESSAGE,
        link: "/inbox",
        channelId: entry.channelId || null,
        createdAt: new Date().toISOString(),
        soundEnabled: true,
      });
    }

    const [notif] = await db
      .insert(notifications)
      .values({
        title: digestTitle,
        message: digestMessage,
        type: NOTIFICATION_EVENTS.NEW_MESSAGE,
        createdBy: "system",
        channelId: entry.channelId || null,
        targetType: "single",
        targetIds: [userId],
        status: "sent",
        sentAt: new Date(),
      })
      .returning();

    await db.insert(sentNotifications).values({
      notificationId: notif.id,
      userId,
    });

    if (!isUserOnline(userId)) {
      const userRows = await db.select().from(users).where(eq(users.id, userId));
      if (userRows.length > 0 && userRows[0].email) {
        const userPrefs = await getUserNotificationPreferences(userId);
        const eventPrefs = userPrefs[NOTIFICATION_EVENTS.NEW_MESSAGE] || { emailEnabled: true };
        if (eventPrefs.emailEnabled) {
          const [digestTemplate] = await db
            .select()
            .from(notificationTemplates)
            .where(eq(notificationTemplates.eventType, NOTIFICATION_EVENTS.NEW_MESSAGE_DIGEST));

          const userName = userRows[0].username || userRows[0].email || "User";
          const { vars: urlVars, origin } = await buildUrlVariables();
          const templateVars: Record<string, string> = {
            messageCount: String(flushedCount),
            contactCount: String(flushedContacts.length),
            contactSummary,
            channelName: entry.channelName,
            userName,
            ...urlVars,
          };

          let emailSubject = digestTitle;
          let emailHtml = buildDigestEmailHtml(digestMessage, origin);

          if (digestTemplate?.isEmailEnabled) {
            const rawHtml = origin
              ? digestTemplate.htmlBody
              : stripUrlVarAnchors(digestTemplate.htmlBody);
            emailSubject = replaceVariables(digestTemplate.subject, templateVars);
            emailHtml = replaceVariables(rawHtml, templateVars);
          }

          await sendNotificationEmail(userRows[0].email, emailSubject, emailHtml);
        }
      }
    }

    console.log(`[Notification Digest] Sent digest for user ${userId}: ${flushedCount} messages from ${flushedContacts.length} contacts — cooldown ${DIGEST_COOLDOWN_MS / 60000} min`);
  } catch (error) {
    console.error("[Notification Digest] Error flushing digest:", error);
  }
}

export async function triggerThrottledNotification(
  variables: Record<string, string>,
  targetUserIds: string[],
  channelId?: string
) {
  const contactName = variables.contactName || variables.contactPhone || "Unknown";
  const channelName = variables.channelName || "Unknown";

  for (const userId of targetUserIds) {
    const key = `${userId}:${channelId || "default"}`;
    const existing = digestMap.get(key);

    if (existing) {
      // Always accumulate into the buffer.
      existing.count++;
      existing.contacts.add(contactName);

      // If NOT in the 15-min cooldown and no quick-flush timer is running,
      // start one so the buffered messages eventually flush.
      if (!existing.inCooldown && !existing.quickFlushTimer) {
        existing.quickFlushTimer = setTimeout(() => flushDigest(key), DIGEST_QUICK_FLUSH_MS);
      }
      continue;
    }

    // First message — create entry and start the 1-min quick-flush timer.
    digestMap.set(key, {
      count: 1,
      contacts: new Set([contactName]),
      channelId,
      channelName,
      quickFlushTimer: setTimeout(() => flushDigest(key), DIGEST_QUICK_FLUSH_MS),
      cooldownTimer: null,
      inCooldown: false,
    });

    // Fire an instant in-app notification (no email) so the user sees it live.
    try {
      await triggerNotification(
        NOTIFICATION_EVENTS.NEW_MESSAGE,
        variables,
        [userId],
        channelId,
        true // skipEmail — the digest handles the email after the quick-flush delay
      );
    } catch (err) {
      console.error(`[Notification Digest] Error sending in-app notification to ${userId}:`, err);
    }
  }
}




export async function triggerNotification(
  eventType: string,
  variables: Record<string, string>,
  targetUserIds: string[],
  channelId?: string,
  skipEmail: boolean = false
) {
  try {
    const [template] = await db
      .select()
      .from(notificationTemplates)
      .where(eq(notificationTemplates.eventType, eventType));

    if (!template) {
      console.warn(`[Notification] No template found for event: ${eventType}`);
      return { success: false, reason: "Template not found" };
    }

    const filteredUsers = await db
      .select()
      .from(users)
      .where(inArray(users.id, targetUserIds));

    const { vars: urlVars, origin } = await buildUrlVariables();
    const safeHtmlBody = origin ? template.htmlBody : stripUrlVarAnchors(template.htmlBody);
    const cleanMessage = generateCleanMessage(eventType, variables);
    const link = getNotificationLink(eventType);

    for (const user of filteredUsers) {
      const userPrefs = await getUserNotificationPreferences(user.id);
      const eventPrefs = userPrefs[eventType] || { inAppEnabled: true, emailEnabled: true, soundEnabled: true };

      const userVariables = {
        ...variables,
        ...urlVars,
        userName: user.username || user.email || "User",
      };
      const userResolvedTitle = replaceVariables(template.subject, userVariables);
      const userResolvedHtmlBody = replaceVariables(safeHtmlBody, userVariables);

      if (template.isInAppEnabled && eventPrefs.inAppEnabled) {
        const [notif] = await db
          .insert(notifications)
          .values({
            title: userResolvedTitle,
            message: cleanMessage,
            type: eventType,
            createdBy: "system",
            channelId: channelId || null,
            targetType: "single",
            targetIds: [user.id],
            status: "sent",
            sentAt: new Date(),
          })
          .returning();

        await db.insert(sentNotifications).values({
          notificationId: notif.id,
          userId: user.id,
        });

        const io = (global as any).io;
        if (io) {
          io.to(`user:${user.id}`).emit('notification:new', {
            id: notif.id,
            title: userResolvedTitle,
            message: cleanMessage,
            type: eventType,
            link,
            channelId: channelId || null,
            createdAt: notif.createdAt,
            soundEnabled: eventPrefs.soundEnabled !== false,
          });
        }
      }

      if (!skipEmail && template.isEmailEnabled && eventPrefs.emailEnabled && user.email) {
        await sendNotificationEmail(user.email, userResolvedTitle, userResolvedHtmlBody);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("[Notification] Error triggering notification:", error);
    return { success: false, error };
  }
}
