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

// import { Request, Response, NextFunction } from "express";
// import { eq } from "drizzle-orm";
// import { db } from "server/db";
// import { plans, subscriptions , channels, automations, campaigns, contacts, users, sites } from "@shared/schema";

// export const requireSubscription = (
//     requiredPermission: "channel" | "contacts" | "automation" | "campaign"
//   ) => {
//     return async (req: Request, res: Response, next: NextFunction) => {
//       try {
//         let userId: string | null = null;
  
//         const sessionUser = (req.session as any).user;
//         const siteId = req.body.siteId;
  
//         // 🔹 CASE 1: Normal authenticated API
//         if (sessionUser) {
//           userId = sessionUser.id;
//         }
  
//         // 🔹 CASE 2: Public widget API — no session
//         else if (siteId) {
//           // Get site
//           const [site] = await db
//             .select()
//             .from(sites)
//             .where(eq(sites.id, siteId));
  
//           if (!site) {
//             return res.status(404).json({ error: "Invalid siteId." });
//           }
  
//           // Site → channel
//           const [channel] = await db
//             .select()
//             .from(channels)
//             .where(eq(channels.id, site.channelId));
  
//           if (!channel) {
//             return res.status(404).json({ error: "Channel not found." });
//           }
  
//           // Channel → User (owner)
//           userId = channel.createdBy;
//         }
  
//         // ❌ No session + no siteId → reject
//         else {
//           return res.status(401).json({ error: "Unauthorized" });
//         }
  
//         // Now userId always exists — public or private API
//         // 1️⃣ Get subscription
//         const [sub] = await db
//           .select()
//           .from(subscriptions)
//           .where(eq(subscriptions.userId, userId));
  
//         if (!sub) {
//           return res.status(403).json({ error: "Subscription required." });
//         }
  
//         if (sub.status !== "active") {
//           return res.status(403).json({ error: "Subscription not active." });
//         }
  
//         if (new Date(sub.endDate) < new Date()) {
//           return res.status(403).json({ error: "Subscription expired." });
//         }
  
//         // 2️⃣ Get plan
//         const [plan] = await db
//           .select()
//           .from(plans)
//           .where(eq(plans.id, sub.planId));
  
//         if (!plan) return res.status(500).json({ error: "Plan not found." });
  
//         const limit = Number(plan.permissions?.[requiredPermission]);
//         if (!limit || limit <= 0) {
//           return res.status(403).json({
//             error: `Your plan does not allow ${requiredPermission}.`,
//           });
//         }
  
//         // 3️⃣ Count usage
//         let currentCount = 0;
  
//         if (requiredPermission === "contacts") {
//           const data = await db
//             .select()
//             .from(contacts)
//             .leftJoin(channels, eq(contacts.channelId, channels.id))
//             .where(eq(channels.createdBy, userId));
//           currentCount = data.length;
//         }
  
//         // channels limit
//         if (requiredPermission === "channel") {
//           const data = await db
//             .select()
//             .from(channels)
//             .where(eq(channels.createdBy, userId));
//           currentCount = data.length;
//         }
  
//         // automation limit
//         if (requiredPermission === "automation") {
//           const data = await db
//             .select()
//             .from(automations)
//             .where(eq(automations.createdBy, userId));
//           currentCount = data.length;
//         }
  
//         // campaign limit
//         if (requiredPermission === "campaign") {
//           const data = await db
//             .select()
//             .from(campaigns)
//             .where(eq(campaigns.createdBy, userId));
//           currentCount = data.length;
//         }
  
//         // 4️⃣ Validate
//         if (currentCount >= limit) {
//           return res.status(403).json({
//             error: `You have reached the limit for ${requiredPermission}. Allowed: ${limit}`,
//           });
//         }
  
//         next();
//       } catch (err) {
//         console.error("Subscription check error:", err);
//         return res.status(500).json({ error: "Server error checking subscription." });
//       }
//     };
//   };
  



import { Request, Response, NextFunction } from "express";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { and, eq, desc } from "drizzle-orm";
import { db } from "server/db";
import { plans, subscriptions, channels, automations, campaigns, contacts, sites } from "@shared/schema";

export const requireSubscription = (
    requiredPermission: "channel" | "contacts" | "automation" | "campaign"
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            let userId: string | null = null;

            const sessionUser = (req.session as any).user;
            const siteId = req.body.siteId;

            if (sessionUser) {
                userId = sessionUser.role === "team" && sessionUser.createdBy
                    ? sessionUser.createdBy
                    : sessionUser.id;
            }

            // 🔹 CASE 2: Public widget
            else if (siteId) {
                const [site] = await db
                    .select()
                    .from(sites)
                    .where(eq(sites.id, siteId));

                if (!site) {
                    return res.status(404).json({ error: "Invalid siteId." });
                }

                const [channel] = await db
                    .select()
                    .from(channels)
                    .where(eq(channels.id, site.channelId));

                if (!channel) {
                    return res.status(404).json({ error: "Channel not found." });
                }

                userId = channel.createdBy;
            }

            // ❌ No identity → Reject
            else {
                return res.status(401).json({ error: "Unauthorized" });
            }


            // ------------------------------------------
            // 🔥 FETCH ACTIVE SUBSCRIPTION (LATEST IF MULTIPLE)
            // ------------------------------------------

            // ------------------------------------------
// 🔥 FETCH ACTIVE SUBSCRIPTION (CORRECT FILTER)
// ------------------------------------------
const activeSubs = await db
  .select()
  .from(subscriptions)
  .where(
    and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.status, "active")
    )
  )
  .orderBy(desc(subscriptions.createdAt));

// ❌ No Active Subscription
if (activeSubs.length === 0) {
  return res.status(403).json({ error: "Subscription required." });
}

           

            // ⚠️ If more than one, log but pick latest
            if (activeSubs.length > 1) {
                console.warn("⚠ Multiple active plans for user:", userId);
            }

            const sub = activeSubs[0]; // Use latest active plan


            // ❌ Expired
            if (new Date(sub.endDate) < new Date()) {
                return res.status(403).json({ error: "Subscription expired." });
            }


            // ------------------------------------------
            // 🔥 FETCH PLAN
            // ------------------------------------------
            const [plan] = await db
                .select()
                .from(plans)
                .where(eq(plans.id, sub.planId));

            if (!plan) {
                return res.status(500).json({ error: "Plan not found." });
            }

            const permissionValue = plan.permissions?.[requiredPermission];

            if (permissionValue === undefined || permissionValue === null || permissionValue === "" || permissionValue === "0") {
                return res.status(403).json({
                    error: `Your plan does not allow ${requiredPermission}.`,
                });
            }

            if (String(permissionValue).toLowerCase() === "unlimited") {
                return next();
            }

            const limit = Number(permissionValue);

            if (isNaN(limit) || limit <= 0) {
                return res.status(403).json({
                    error: `Your plan does not allow ${requiredPermission}.`,
                });
            }


            // ------------------------------------------
            // 🔥 COUNT USAGE
            // ------------------------------------------

            let currentCount = 0;

            if (requiredPermission === "contacts") {
                const data = await db
                    .select()
                    .from(contacts)
                    .leftJoin(channels, eq(contacts.channelId, channels.id))
                    .where(eq(channels.createdBy, userId));

                currentCount = data.length;
            }

            if (requiredPermission === "channel") {
                const data = await db
                    .select()
                    .from(channels)
                    .where(eq(channels.createdBy, userId));

                currentCount = data.length;
            }

            if (requiredPermission === "automation") {
                const data = await db
                    .select()
                    .from(automations)
                    .where(eq(automations.createdBy, userId));

                currentCount = data.length;
            }

            if (requiredPermission === "campaign") {
                const data = await db
                    .select()
                    .from(campaigns)
                    .where(eq(campaigns.createdBy, userId));

                currentCount = data.length;
            }


            // ------------------------------------------
            // 🔥 FINAL LIMIT CHECK
            // ------------------------------------------
            if (currentCount >= limit) {
                return res.status(403).json({
                    error: `You have reached the limit for ${requiredPermission}. Allowed: ${limit}`,
                });
            }

            next();

        } catch (err) {
            console.error("Subscription check error:", err);
            return res.status(500).json({ error: "Server error checking subscription." });
        }
    };
};
