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


import { notifications, sentNotifications, notificationTemplates, userNotificationPreferences, users } from "@shared/schema";
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { and, desc, eq, inArray, or, isNull, sql } from "drizzle-orm";
import { Request, Response } from "express";
import { db } from "server/db";
import { getUserNotificationPreferences, updateUserNotificationPreference } from "server/services/notification.service";

/**
 * Admin: Create a notification (draft)
 */
// export const adminCreateNotification = async (req: Request, res: Response) => {
//   try {
//     const [notif] = await db
//       .insert(notifications)
//       .values({
//         title: req.body.title,
//         message: req.body.message,
//         type: req.body.type ?? "general",
//         targetType: req.body.targetType,
//         targetIds: req.body.targetIds ?? [],
//         createdBy: req.user.id,
//         status: "draft",
//       })
//       .returning();

//     res.json({ success: true, notification: notif });
//   } catch (err) {
//     console.error("Create Notification Error:", err);
//     res.status(500).json({ error: "Failed to create notification" });
//   }
// };



export const adminCreateNotification = async (req: Request, res: Response) => {
  try {
    const targetIds = Array.isArray(req.body.targetIds)
      ? req.body.targetIds
      : [];

    const [notif] = await db
      .insert(notifications)
      .values({
        title: req.body.title,
        message: req.body.message,
        type: req.body.type ?? "general",
        targetType: req.body.targetType ?? "all",
        targetIds,
        createdBy: req.user.id,
        status: "draft",
      })
      .returning();

    res.json({
      success: true,
      notification: notif,
    });
  } catch (err) {
    console.error("Create Notification Error:", err);

    res.status(500).json({
      error: "Failed to create notification",
      details: err instanceof Error ? err.message : err,
    });
  }
};
/**
 * Admin: Send a notification
 */
export const adminSendNotification = async (req: Request, res: Response) => {
  try {
    const [notif] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, req.params.id));

    if (!notif) {
      return res.status(404).json({ error: "Notification not found" });
    }

    let targetUsers: { id: string }[] = [];

    if (notif.targetType === "all") {
      targetUsers = await db.select({ id: users.id }).from(users);
    } else if (notif.targetType === "specific") {
      targetUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(inArray(users.id, notif.targetIds));
    } else if (notif.targetType === "single") {
      targetUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, notif.targetIds[0]));
    }

    for (const u of targetUsers) {
      await db.insert(sentNotifications).values({
        notificationId: notif.id,
        userId: u.id,
      });
    }

    await db
      .update(notifications)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(notifications.id, notif.id));

    res.json({ success: true });
  } catch (err) {
    console.error("Send Notification Error:", err);
    res.status(500).json({ error: "Failed to send notification" });
  }
};

/**
 * Admin: Get all notifications
 */
export const adminGetNotifications = async (req: Request, res: Response) => {
  try {
    const list = await db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt));

    res.json(list);
  } catch (err) {
    console.error("Get Notifications Error:", err);
    res.status(500).json({ error: "Failed to load notifications" });
  }
};





/**
 * User: Get all notifications (channel-scoped)
 */
export const userGetNotifications = async (req: Request, res: Response) => {
  try {
    const channelId = req.query.channelId as string | undefined;

    const conditions: any[] = [eq(sentNotifications.userId, req.user.id)];
    if (channelId) {
      conditions.push(
        or(eq(notifications.channelId, channelId), isNull(notifications.channelId))
      );
    }

    const rows = await db
      .select({
        id: sentNotifications.id,
        isRead: sentNotifications.isRead,
        readAt: sentNotifications.readAt,
        sentAt: sentNotifications.sentAt,
        notification: notifications,
      })
      .from(sentNotifications)
      .innerJoin(
        notifications,
        eq(sentNotifications.notificationId, notifications.id)
      )
      .where(and(...conditions))
      .orderBy(desc(sentNotifications.sentAt));

    res.json(rows);
  } catch (err) {
    console.error("User Get Notifications Error:", err);
    res.status(500).json({ error: "Failed to load notifications" });
  }
};

/**
 * User: Mark as read
 */
export const userMarkAsRead = async (req: Request, res: Response) => {
  try {
    await db
      .update(sentNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(sentNotifications.id, req.params.id),
          eq(sentNotifications.userId, req.user.id)
        )
      );

    res.json({ success: true });
  } catch (err) {
    console.error("Mark as Read Error:", err);
    res.status(500).json({ error: "Failed to mark as read" });
  }
};


/**
 * User: Mark all read
 */
export const userMarkAllRead = async (req: Request, res: Response) => {
  try {
    await db
    .update(sentNotifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(sentNotifications.userId, req.user.id));

  res.json({ success: true });
  } catch (err) {
    console.error("Mark as Read Error:", err);
    res.status(500).json({ error: "Failed to mark as read" });
  }
};

/**
 * User: Unread count (channel-scoped)
 */
export const userUnreadCount = async (req: Request, res: Response) => {
  try {
    const channelId = req.query.channelId as string | undefined;

    const conditions = [
      eq(sentNotifications.userId, req.user!.id as string),
      eq(sentNotifications.isRead, false),
    ];

    let query;
    if (channelId) {
      query = db
        .select({ id: sentNotifications.id })
        .from(sentNotifications)
        .innerJoin(notifications, eq(sentNotifications.notificationId, notifications.id))
        .where(and(...conditions, or(eq(notifications.channelId, channelId), isNull(notifications.channelId))));
    } else {
      query = db
        .select({ id: sentNotifications.id })
        .from(sentNotifications)
        .where(and(...conditions));
    }

    const list = await query;
    res.json({ count: list.length });
  } catch (err) {
    console.error("Unread Count Error:", err);
    res.status(500).json({ error: "Failed to load unread count" });
  }
};

export const getNotificationTemplates = async (req: Request, res: Response) => {
  try {
    const templates = await db
      .select()
      .from(notificationTemplates)
      .orderBy(notificationTemplates.id);

    res.json(templates);
  } catch (err) {
    console.error("Get Notification Templates Error:", err);
    res.status(500).json({ error: "Failed to load notification templates" });
  }
};

export const updateNotificationTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject, htmlBody, isEmailEnabled, isInAppEnabled, label, description } = req.body;

    const [updated] = await db
      .update(notificationTemplates)
      .set({
        ...(subject !== undefined && { subject }),
        ...(htmlBody !== undefined && { htmlBody }),
        ...(isEmailEnabled !== undefined && { isEmailEnabled }),
        ...(isInAppEnabled !== undefined && { isInAppEnabled }),
        ...(label !== undefined && { label }),
        ...(description !== undefined && { description }),
        updatedAt: new Date(),
      })
      .where(eq(notificationTemplates.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Template not found" });
    }

    res.json({ success: true, template: updated });
  } catch (err) {
    console.error("Update Notification Template Error:", err);
    res.status(500).json({ error: "Failed to update notification template" });
  }
};

export const getUserPreferences = async (req: Request, res: Response) => {
  try {
    const prefs = await getUserNotificationPreferences(req.user.id);
    res.json(prefs);
  } catch (err) {
    console.error("Get User Preferences Error:", err);
    res.status(500).json({ error: "Failed to load notification preferences" });
  }
};

export const updateUserPreference = async (req: Request, res: Response) => {
  try {
    const { eventType, inAppEnabled, emailEnabled, soundEnabled } = req.body;

    if (!eventType) {
      return res.status(400).json({ error: "eventType is required" });
    }

    const updated = await updateUserNotificationPreference(req.user.id, eventType, {
      inAppEnabled,
      emailEnabled,
      soundEnabled,
    });

    res.json({ success: true, preference: updated });
  } catch (err) {
    console.error("Update User Preference Error:", err);
    res.status(500).json({ error: "Failed to update notification preference" });
  }
};

export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db
      .delete(sentNotifications)
      .where(
        and(
          eq(sentNotifications.id, parseInt(id)),
          eq(sentNotifications.userId, req.user.id)
        )
      );

    res.json({ success: true });
  } catch (err) {
    console.error("Delete Notification Error:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
};