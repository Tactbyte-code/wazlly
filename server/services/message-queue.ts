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

import { db } from "../db";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { messageQueue, channels, campaigns, users, conversations, messages, templates } from "@shared/schema";
import { eq, and, lte, or, isNull, sql, inArray, notInArray, gt, asc } from "drizzle-orm";
import { WhatsAppApiService } from "./whatsapp-api";
import { storage } from '../storage';
import { getWhatsAppError } from '@shared/whatsapp-error-codes';
import { cacheGet, CACHE_KEYS, CACHE_TTL } from './cache';
import { initBullQueue, isBullQueueAvailable, addBulkMessagesToBullQueue, getBullQueueStats, addMessageToBullQueue } from './bull-queue';
import { onRedisStateChange } from './redis';
import { triggerNotification, NOTIFICATION_EVENTS } from './notification.service';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const SEND_DELAY_MS = parseInt(process.env.MESSAGE_SEND_DELAY_MS || "0", 10);

export class MessageQueueService {
  private static isProcessing = false;
  private static processingTimeout: NodeJS.Timeout | null = null;
  private static currentBackoffMs = 5000;
  private static readonly MIN_BACKOFF_MS = 5000;
  private static readonly MAX_BACKOFF_MS = 30000;
  private static readonly BATCH_SIZE = process.env.MESSAGE_QUEUE_BATCH_SIZE
    ? parseInt(process.env.MESSAGE_QUEUE_BATCH_SIZE, 10)
    : 200;
  /**
   * Single source of truth for the global retry cap, shared by both the
   * DB-polling engine and the BullMQ engine. Mirrored as a default in
   * `bull-queue.ts` (jobOptions.attempts). A row whose `attempts` field
   * has reached this value MUST NOT be eligible for another send in
   * either engine.
   */
  static readonly MAX_ATTEMPTS = parseInt(
    process.env.MESSAGE_QUEUE_MAX_ATTEMPTS || "3",
    10
  );
  private static usingBullMQ = false;

  // Cached interval used when (re)starting DB polling on Redis outage.
  private static dbPollIntervalMs = 5000;
  private static redisListenerRegistered = false;

  static async startProcessing(intervalMs: number = 5000) {
    if (this.processingTimeout || this.usingBullMQ) {
      return;
    }

    this.dbPollIntervalMs = process.env.MESSAGE_QUEUE_INTERVAL_MS
      ? parseInt(process.env.MESSAGE_QUEUE_INTERVAL_MS, 10)
      : intervalMs;

    this.registerRedisStateListener();

    const bullInitialized = await initBullQueue();
    if (bullInitialized) {
      this.usingBullMQ = true;
      console.log("[MessageQueue] Using BullMQ for message processing (Redis-backed)");
      return;
    }

    this.currentBackoffMs = this.dbPollIntervalMs;
    this.scheduleNext();

    const defaultConcurrency = WhatsAppApiService.getConcurrencyForTier();
    console.log(`[MessageQueue] Using DB polling (batch: ${this.BATCH_SIZE}, concurrency: ${defaultConcurrency}, interval: ${this.currentBackoffMs}ms)`);
  }

  /**
   * Subscribe once to Redis connect/disconnect events so we can switch the
   * active queue engine at runtime. Guarantees exactly one engine is active
   * at any time (BullMQ when Redis is up, DB polling when it isn't).
   */
  private static registerRedisStateListener() {
    if (this.redisListenerRegistered) return;
    this.redisListenerRegistered = true;
    onRedisStateChange(async (available) => {
      try {
        if (available && !this.usingBullMQ) {
          // Redis came back: stop DB polling and try to bring BullMQ up.
          if (this.processingTimeout) {
            clearTimeout(this.processingTimeout);
            this.processingTimeout = null;
            console.log("[MessageQueue] Redis available — stopping DB polling, switching to BullMQ");
          }
          // Handoff barrier: wait for any in-flight DB poll cycle to finish
          // before flipping to BullMQ. Without this, the polling worker and
          // the BullMQ worker could both pick up the same row briefly,
          // re-introducing the dual-processing bug this task targets.
          await this.waitForPollCycleToDrain();
          const ok = await initBullQueue();
          if (ok) {
            this.usingBullMQ = true;
            console.log("[MessageQueue] Switched to BullMQ engine (Redis reconnected)");
            // Re-enqueue any DB-queued rows that accumulated while we were
            // running on the DB-polling fallback. addMessageToBullQueue uses
            // jobId = messageId, so re-enqueues are idempotent.
            await this.reconcileQueuedMessagesToBull();
          } else {
            // BullMQ init failed despite Redis reporting available — fall
            // back to DB polling so the queue keeps moving.
            this.currentBackoffMs = this.dbPollIntervalMs;
            this.scheduleNext();
            console.warn("[MessageQueue] BullMQ init failed after Redis reconnect — staying on DB polling");
          }
        } else if (!available && this.usingBullMQ) {
          // Redis went down: tear down BullMQ and resume DB polling so
          // messages keep flowing instead of stalling indefinitely.
          console.warn("[MessageQueue] Redis lost — tearing down BullMQ and resuming DB polling");
          try {
            const { shutdownBullQueue } = await import("./bull-queue");
            await shutdownBullQueue();
          } catch (err) {
            console.error("[MessageQueue] Error shutting down BullMQ on Redis loss:", (err as Error).message);
          }
          this.usingBullMQ = false;
          this.currentBackoffMs = this.dbPollIntervalMs;
          this.scheduleNext();
          console.log("[MessageQueue] Now running on DB polling (Redis-down fallback)");
        }
      } catch (err) {
        console.error("[MessageQueue] Engine reconciliation error:", (err as Error).message);
      }
    });
  }

  /**
   * Block until any in-flight DB poll cycle finishes. Used as a handoff
   * barrier when switching from DB-polling to BullMQ on Redis reconnect,
   * so a poll-cycle batch and a BullMQ worker cannot process the same row
   * simultaneously. Bounded so we never hang the engine switch.
   */
  private static async waitForPollCycleToDrain(timeoutMs = 30_000): Promise<void> {
    const start = Date.now();
    while (this.isProcessing) {
      if (Date.now() - start > timeoutMs) {
        console.warn("[MessageQueue] Handoff barrier timeout — proceeding with engine switch");
        return;
      }
      await sleep(50);
    }
  }

  private static scheduleNext() {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
    }
    this.processingTimeout = setTimeout(async () => {
      if (!this.isProcessing) {
        await this.processQueue();
      }
      this.scheduleNext();
    }, this.currentBackoffMs);
  }

  /**
   * Re-enqueue any DB rows that are still in `queued` status into BullMQ.
   * Called after Redis comes back so messages accumulated during the
   * DB-polling fallback period are picked up by the BullMQ worker.
   *
   * Idempotent: bull-queue.ts uses `messageId` as the BullMQ jobId, so
   * a re-enqueue of an already-known job is a no-op.
   */
  static async reconcileQueuedMessagesToBull(): Promise<number> {
    if (!this.usingBullMQ || !isBullQueueAvailable()) return 0;

    const MAX_ATTEMPTS = MessageQueueService.MAX_ATTEMPTS;
    let totalEnqueued = 0;
    let totalExpired = 0;
    const batchSize = 500;
    // Keyset pagination by id: each pass fetches rows strictly greater than
    // the last id we saw, so we cannot re-read the same batch even when an
    // earlier pass left rows in `status='queued'` (e.g. addMessageToBullQueue
    // returned false). Combined with jobId=messageId on the BullMQ side this
    // gives at-most-once enqueue with no starvation at scale.
    let lastSeenId: string | null = null;

    while (true) {
      const whereClause = lastSeenId
        ? and(eq(messageQueue.status, "queued"), gt(messageQueue.id, lastSeenId))
        : eq(messageQueue.status, "queued");
      const rows = await db
        .select({
          id: messageQueue.id,
          channelId: messageQueue.channelId,
          recipientPhone: messageQueue.recipientPhone,
          templateName: messageQueue.templateName,
          templateParams: messageQueue.templateParams,
          messageType: messageQueue.messageType,
          campaignId: messageQueue.campaignId,
          scheduledFor: messageQueue.scheduledFor,
          attempts: messageQueue.attempts,
        })
        .from(messageQueue)
        .where(whereClause)
        .orderBy(asc(messageQueue.id))
        .limit(batchSize);

      if (rows.length === 0) break;
      lastSeenId = rows[rows.length - 1].id;

      for (const row of rows) {
        const dbAttempts = row.attempts ?? 0;

        // Already at/over the global retry budget across both engines —
        // do not give it another attempt in BullMQ; mark failed instead.
        if (dbAttempts >= MAX_ATTEMPTS) {
          try {
            await db
              .update(messageQueue)
              .set({
                status: "failed",
                errorMessage: `Exceeded max attempts (${MAX_ATTEMPTS}) before reconciliation`,
                processedAt: new Date(),
              })
              .where(eq(messageQueue.id, row.id));
            totalExpired += 1;
          } catch (err) {
            console.error(
              `[MessageQueue] Failed to expire over-budget message ${row.id}:`,
              (err as Error).message
            );
          }
          continue;
        }

        // Remaining budget for BullMQ = total budget − DB attempts already
        // consumed. Guarantees combined attempts never exceed MAX_ATTEMPTS.
        const remainingAttempts = Math.max(1, MAX_ATTEMPTS - dbAttempts);

        try {
          const enqueued = await addMessageToBullQueue({
            messageId: row.id,
            channelId: row.channelId ?? "",
            recipientPhone: row.recipientPhone,
            templateName: row.templateName ?? "",
            templateParams: (row.templateParams as any[]) || [],
            messageType: row.messageType ?? "marketing",
            campaignId: row.campaignId ?? undefined,
            scheduledFor: row.scheduledFor ?? undefined,
            attempts: remainingAttempts,
            baseAttempts: dbAttempts,
          });
          if (enqueued) {
            totalEnqueued += 1;
          } else {
            // BullMQ rejected the enqueue (queue not initialized or transient
            // Redis error). The row stays `status='queued'` in the DB so the
            // next poll-cycle (if Redis flips back down) or the next
            // reconciliation pass picks it up — no message is lost.
            console.warn(
              `[MessageQueue] addMessageToBullQueue returned false for ${row.id} — leaving row queued for next reconciliation`
            );
          }
        } catch (err) {
          console.error(
            `[MessageQueue] Failed to reconcile message ${row.id} into BullMQ:`,
            (err as Error).message
          );
        }
      }

      if (rows.length < batchSize) break;
    }

    if (totalEnqueued > 0 || totalExpired > 0) {
      console.log(
        `[MessageQueue] Reconciliation complete — re-enqueued ${totalEnqueued} DB row(s) into BullMQ, marked ${totalExpired} over-budget row(s) as failed`
      );
    }
    return totalEnqueued;
  }

  static async stopProcessing() {
    if (this.usingBullMQ) {
      const { shutdownBullQueue } = await import('./bull-queue');
      await shutdownBullQueue();
      this.usingBullMQ = false;
      console.log("[MessageQueue] BullMQ processing stopped");
      return;
    }
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout);
      this.processingTimeout = null;
      console.log("[MessageQueue] DB polling processing stopped");
    }
  }

  private static async processQueue() {
    // Hard guard: if BullMQ is the active engine, never let DB-polling run.
    // Prevents the same queued row from being processed twice when Redis
    // is intermittently available.
    if (this.usingBullMQ) {
      return;
    }

    this.isProcessing = true;

    try {
      // Stable 32-bit advisory-lock key derived from "diploy:message-queue"
      // Namespaced so it does not collide with other advisory-lock users in
      // the same PostgreSQL instance.
      const lockResult = await db.execute(sql`SELECT pg_try_advisory_lock(hashtext('diploy:message-queue')::int) AS acquired`);
      const acquired = (lockResult as any).rows?.[0]?.acquired ?? (lockResult as any)[0]?.acquired;
      if (!acquired) {
        return;
      }

      try {
        await db
          .update(messageQueue)
          .set({ status: "queued" })
          .where(
            and(
              eq(messageQueue.status, "processing"),
              sql`${messageQueue.processedAt} < NOW() - INTERVAL '5 minutes'`
            )
          );

        // Defensive guard: any row that has already consumed the global retry
        // budget MUST be marked failed before it can be picked up again. This
        // catches legacy rows / inconsistent state and guarantees we never
        // produce attempt #(MAX_ATTEMPTS + 1) on the DB-polling path.
        await db
          .update(messageQueue)
          .set({
            status: "failed",
            errorMessage: `Exceeded max attempts (${MessageQueueService.MAX_ATTEMPTS})`,
            processedAt: new Date(),
          })
          .where(
            and(
              eq(messageQueue.status, "queued"),
              sql`${messageQueue.attempts} >= ${MessageQueueService.MAX_ATTEMPTS}`
            )
          );

        const messages = await db
          .select({ mq: messageQueue })
          .from(messageQueue)
          .leftJoin(campaigns, eq(messageQueue.campaignId, campaigns.id))
          .where(
            and(
              eq(messageQueue.status, "queued"),
              // Strictly less than — a row already at the cap is NOT eligible
              // for another attempt (the defensive update above will have
              // marked it failed; this is belt-and-braces).
              sql`${messageQueue.attempts} < ${MessageQueueService.MAX_ATTEMPTS}`,
              or(
                isNull(messageQueue.scheduledFor),
                sql`${messageQueue.scheduledFor} <= NOW()`
              ),
              or(
                isNull(messageQueue.campaignId),
                eq(campaigns.status, "sending")
              )
            )
          )
          .limit(this.BATCH_SIZE)
          .then((rows) => rows.map((r) => r.mq));

        if (messages.length === 0) {
          this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, this.MAX_BACKOFF_MS);
          return;
        }

        this.currentBackoffMs = this.MIN_BACKOFF_MS;

        const messageIds = messages.map(m => m.id);
        await db
          .update(messageQueue)
          .set({
            status: "processing",
            processedAt: new Date()
          })
          .where(inArray(messageQueue.id, messageIds));

        const channelIds = [...new Set(messages.map(m => m.channelId).filter(Boolean))];
        const channelCache = new Map<string, any>();
        if (channelIds.length > 0) {
          const fetchedChannels = await db
            .select()
            .from(channels)
            .where(inArray(channels.id, channelIds));
          for (const ch of fetchedChannels) {
            channelCache.set(ch.id, ch);
          }
        }

        const messagesByChannel = new Map<string, any[]>();
        for (const msg of messages) {
          const chId = msg.channelId || "_unknown";
          if (!messagesByChannel.has(chId)) messagesByChannel.set(chId, []);
          messagesByChannel.get(chId)!.push(msg);
        }

        const channelPromises: Promise<void>[] = [];
        for (const [chId, chMessages] of messagesByChannel) {
          const channel = channelCache.get(chId);
          const tier = (channel?.healthDetails as any)?.messaging_limit as string | undefined;
          const concurrency = WhatsAppApiService.getConcurrencyForTier(tier);

          channelPromises.push(
            this.processChannelBatch(chMessages, channelCache, concurrency)
          );
        }
        await Promise.all(channelPromises);

        await this.checkCampaignCompletions(messages);
      } finally {
        await db.execute(sql`SELECT pg_advisory_unlock(hashtext('diploy:message-queue')::int)`);
      }
    } catch (error) {
      console.error("[MessageQueue] Error processing queue:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private static async processChannelBatch(
    messages: any[],
    channelCache: Map<string, any>,
    concurrency: number
  ): Promise<void> {
    let active = 0;
    let index = 0;

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let completed = 0;
      const total = messages.length;

      const launchNext = () => {
        while (active < concurrency && index < total) {
          const msg = messages[index++];
          active++;

          (async () => {
            try {
              await this.processMessage(msg, channelCache);
            } catch (err) {
              console.error(`[MessageQueue] Unhandled error processing message ${msg.id}:`, err);
            } finally {
              active--;
              completed++;

              if (SEND_DELAY_MS > 0) {
                await sleep(SEND_DELAY_MS);
              }

              if (completed === total && !settled) {
                settled = true;
                resolve();
              } else {
                launchNext();
              }
            }
          })();
        }

        if (completed === total && !settled) {
          settled = true;
          resolve();
        }
      };

      launchNext();
    });
  }

  // private static async checkCampaignCompletions(processedMessages: any[]) {
  //   const campaignIds = [...new Set(
  //     processedMessages.map((m) => m.campaignId).filter(Boolean)
  //   )];

  //   for (const campaignId of campaignIds) {
  //     try {
  //       const pending = await db
  //         .select({ id: messageQueue.id })
  //         .from(messageQueue)
  //         .where(
  //           and(
  //             eq(messageQueue.campaignId, campaignId),
  //             notInArray(messageQueue.status, ["sent", "failed"])
  //           )
  //         )
  //         .limit(1);

  //       if (pending.length > 0) continue;

  //       const campaign = await storage.getCampaign(campaignId);
  //       if (!campaign || campaign.status === "completed") continue;

  //       await storage.updateCampaign(campaignId, {
  //         status: "completed",
  //         completedAt: new Date(),
  //       });

  //       console.log(`[MessageQueue] Campaign ${campaignId} completed`);

  //       try {
  //         const ch = campaign.channelId
  //           ? await db
  //             .select()
  //             .from(channels)
  //             .where(eq(channels.id, campaign.channelId))
  //             .limit(1)
  //           : [];
  //         const channelName = ch[0]?.name || "Unknown";
  //         const ownerId = ch[0]?.createdBy;
  //         if (ownerId) {
  //           const ownerAndTeam = await db
  //             .select()
  //             .from(users)
  //             .where(eq(users.id, ownerId));
  //           const teamMembers = await db
  //             .select()
  //             .from(users)
  //             .where(eq(users.createdBy, ownerId));
  //           const targetUserIds = [
  //             ...new Set([...ownerAndTeam].map((u) => u.id)),
  //           ];
  //           const hasFailed = (campaign.failedCount || 0) > (campaign.sentCount || 0);
  //           const eventType = hasFailed
  //             ? NOTIFICATION_EVENTS.CAMPAIGN_FAILED
  //             : NOTIFICATION_EVENTS.CAMPAIGN_COMPLETED;
  //           await triggerNotification(
  //             eventType,
  //             {
  //               campaignName: campaign.name || "Untitled Campaign",
  //               totalSent: String(campaign.sentCount || 0),
  //               deliveredCount: String(
  //                 (campaign.sentCount || 0) - (campaign.failedCount || 0)
  //               ),
  //               readCount: String(campaign.readCount || 0),
  //               failedCount: String(campaign.failedCount || 0),
  //               errorMessage: hasFailed ? "Some messages could not be delivered" : "",
  //               channelName,
  //             },
  //             targetUserIds,
  //             campaign.channelId || undefined
  //           );
  //         }
  //       } catch (notifyErr) {
  //         console.error(`[MessageQueue] Error sending completion notification for ${campaignId}:`, notifyErr);
  //       }
  //     } catch (err) {
  //       console.error(`[MessageQueue] Error checking completion for campaign ${campaignId}:`, err);
  //     }
  //   }
  // }



  public static async checkCampaignCompletions(processedMessages: any[]) {
  console.log('[checkCampaignCompletions] ENTERED:', JSON.stringify(processedMessages));

  const campaignIds = [...new Set(
    processedMessages.map((m) => m.campaignId).filter(Boolean)
  )];

  console.log('[checkCampaignCompletions] campaignIds:', campaignIds);

  for (const campaignId of campaignIds) {
    try {
      // Messages jo abhi is batch mein complete hue — exclude karo DB read se
      // kyunki connection pool pe read-after-write guarantee nahi hai
      const justCompletedIds = processedMessages
        .filter(m => m.campaignId === campaignId && m.justCompletedMessageId)
        .map(m => m.justCompletedMessageId);

      console.log(`[checkCampaignCompletions] ${campaignId} — justCompletedIds:`, justCompletedIds);

      // Total aur done count ek hi query mein lo
      const [counts] = await db
        .select({
          total: sql<number>`count(*)`,
          done: sql<number>`count(*) filter (where status in ('sent', 'failed'))`,
        })
        .from(messageQueue)
        .where(eq(messageQueue.campaignId, campaignId));

      console.log(`[checkCampaignCompletions] ${campaignId} — DB counts: total=${counts?.total} done=${counts?.done}`);

      // justCompleted ko effectively "done" maan lo (race condition bypass)
      const effectiveDone = Number(counts?.done ?? 0) + justCompletedIds.length;
      const total = Number(counts?.total ?? 0);

      console.log(`[checkCampaignCompletions] ${campaignId} — effectiveDone=${effectiveDone} total=${total}`);

      if (total === 0) {
        console.log(`[checkCampaignCompletions] ${campaignId} — no messages found, skipping`);
        continue;
      }

      if (effectiveDone < total) {
        console.log(`[checkCampaignCompletions] ${campaignId} — still pending (${total - effectiveDone} left), skipping`);
        continue;
      }

      // Sab done — campaign complete karo
      const campaign = await storage.getCampaign(campaignId);
      console.log(`[checkCampaignCompletions] ${campaignId} — campaign status from DB:`, campaign?.status);

      if (!campaign) {
        console.log(`[checkCampaignCompletions] ${campaignId} — campaign not found, skipping`);
        continue;
      }

      if (campaign.status === "completed") {
        console.log(`[checkCampaignCompletions] ${campaignId} — already completed, skipping`);
        continue;
      }

      await storage.updateCampaign(campaignId, {
        status: "completed",
        completedAt: new Date(),
      });

      console.log(`[checkCampaignCompletions] ${campaignId} — marked COMPLETED ✅`);

      // Notification bhejo
      try {
        const ch = campaign.channelId
          ? await db
              .select()
              .from(channels)
              .where(eq(channels.id, campaign.channelId))
              .limit(1)
          : [];

        const channelName = ch[0]?.name || "Unknown";
        const ownerId = ch[0]?.createdBy;

        console.log(`[checkCampaignCompletions] ${campaignId} — channelName=${channelName} ownerId=${ownerId}`);

        if (ownerId) {
          const ownerAndTeam = await db
            .select()
            .from(users)
            .where(eq(users.id, ownerId));

          const targetUserIds = [
            ...new Set([...ownerAndTeam].map((u) => u.id)),
          ];

          console.log(`[checkCampaignCompletions] ${campaignId} — notifying userIds:`, targetUserIds);

          const hasFailed = (campaign.failedCount || 0) > (campaign.sentCount || 0);
          const eventType = hasFailed
            ? NOTIFICATION_EVENTS.CAMPAIGN_FAILED
            : NOTIFICATION_EVENTS.CAMPAIGN_COMPLETED;

          console.log(`[checkCampaignCompletions] ${campaignId} — eventType=${eventType} hasFailed=${hasFailed}`);

          await triggerNotification(
            eventType,
            {
              campaignName: campaign.name || "Untitled Campaign",
              totalSent: String(campaign.sentCount || 0),
              deliveredCount: String(
                (campaign.sentCount || 0) - (campaign.failedCount || 0)
              ),
              readCount: String(campaign.readCount || 0),
              failedCount: String(campaign.failedCount || 0),
              errorMessage: hasFailed
                ? "Some messages could not be delivered"
                : "",
              channelName,
            },
            targetUserIds,
            campaign.channelId || undefined
          );

          console.log(`[checkCampaignCompletions] ${campaignId} — notification sent ✅`);
        } else {
          console.log(`[checkCampaignCompletions] ${campaignId} — no ownerId, skipping notification`);
        }
      } catch (notifyErr) {
        console.error(
          `[checkCampaignCompletions] notification error ${campaignId}:`,
          notifyErr
        );
      }
    } catch (err) {
      console.error(
        `[checkCampaignCompletions] ERROR for ${campaignId}:`,
        err
      );
    }
  }
}

//   private static async processMessage(message: any, channelCache?: Map<string, any>) {
//      let templateContent = `Template: ${message.templateName}`;
//     try {
     

      
//       if (message.templateName) {
//         let tmplRow: { body: string } | undefined;
//         if (message.channelId) {
//           [tmplRow] = await db
//             .select({ body: templates.body })
//             .from(templates)
//             .where(and(eq(templates.name, message.templateName), eq(templates.channelId, message.channelId)))
//             .limit(1);
//         }
//         if (!tmplRow) {
//           [tmplRow] = await db
//             .select({ body: templates.body })
//             .from(templates)
//             .where(eq(templates.name, message.templateName))
//             .limit(1);
//         }
//         if (tmplRow?.body) templateContent = tmplRow.body;
//       }

//       let channel = channelCache?.get(message.channelId);
//       if (!channel) {
//         channel = await cacheGet(
//           CACHE_KEYS.channel(message.channelId),
//           CACHE_TTL.channel,
//           async () => {
//             const [ch] = await db
//               .select()
//               .from(channels)
//               .where(eq(channels.id, message.channelId))
//               .limit(1);
//             return ch || null;
//           }
//         );
//       }

//       if (!channel) {
//         throw new Error(`Channel not found: ${message.channelId}`);
//       }

//       const channelTier = (channel.healthDetails as any)?.messaging_limit as string | undefined;
//       const canSend = await WhatsAppApiService.checkRateLimit(channel.id, channelTier);
//       if (!canSend) {
//         await db
//           .update(messageQueue)
//           .set({
//             status: "queued",
//             scheduledFor: new Date(Date.now() + 5000)
//           })
//           .where(eq(messageQueue.id, message.id));
//         return;
//       }

//       const isMarketing = message.messageType === "marketing" &&
//         message.sentVia !== "cloud_api";


//         console.log("[Campaign Runtime Debug]", {
//   templateName: message.templateName,
//   messageType: message.messageType,
//   sentVia: message.sentVia,
//   isMarketing
// });

//       let response;
//       if (message.templateName) {
//         const language = (message as any).templateLanguage || "en_US";
//         response = await WhatsAppApiService.sendTemplateMessage(
//           channel,
//           message.recipientPhone,
//           message.templateName,
//           message.templateParams || [],
//           language,
//           isMarketing
//         );
//       } else {
//         throw new Error("Non-template messages not yet implemented");
//       }

//       const waMessageId = response.messages?.[0]?.id;

//       await db
//         .update(messageQueue)
//         .set({
//           status: "sent",
//           whatsappMessageId: waMessageId,
//           sentVia: isMarketing ? "marketing_messages" : "cloud_api",
//           attempts: message.attempts + 1
//         })
//         .where(eq(messageQueue.id, message.id));

//       if (message.campaignId) {
//         await db
//           .update(campaigns)
//           .set({
//             sentCount: sql`${campaigns.sentCount} + 1`
//           })
//           .where(eq(campaigns.id, message.campaignId));
//       }



//       //campaignRecipients insert
// if (message.campaignId) {
//   try {
//     const { campaignRecipients } = await import("@shared/schema");
//     await db
//       .insert(campaignRecipients)
//       .values({
//         campaignId: message.campaignId,
//         phone: message.recipientPhone,
//         name: message.recipientPhone,
//         status: "sent",
//         sentAt: new Date(),
//         whatsappMessageId: waMessageId || null,
//         templateParams: message.templateParams || [],
//       })
//       .onConflictDoUpdate({
//         target: [campaignRecipients.campaignId, campaignRecipients.phone],
//         set: {
//           status: "sent",
//           sentAt: new Date(),
//           whatsappMessageId: waMessageId || null,
//         },
//       });
//   } catch (err) {
//     // Non-fatal — analytics fallback messages table use karega
//     console.error(`[MessageQueue] Failed to insert campaignRecipient for ${message.recipientPhone}:`, err);
//   }
// }

//       try {
//         const [existingConv] = await db
//           .select({ id: conversations.id })
//           .from(conversations)
//           .where(and(
//             eq(conversations.channelId, message.channelId),
//             eq(conversations.contactPhone, message.recipientPhone)
//           ))
//           .limit(1);

//         let conversationId = existingConv?.id;
//         if (!conversationId) {
//           const [newConv] = await db
//             .insert(conversations)
//             .values({
//               channelId: message.channelId,
//               contactPhone: message.recipientPhone,
//               contactName: message.recipientPhone,
//               status: "open",
//               type: "whatsapp",
//               lastMessageAt: new Date(),
//             })
//             .returning({ id: conversations.id });
//           conversationId = newConv.id;
//         } else {
//           await db
//             .update(conversations)
//             .set({ lastMessageAt: new Date() })
//             .where(eq(conversations.id, conversationId));
//         }

//         await db.insert(messages).values({
//           conversationId,
//           campaignId: message.campaignId || null,
//           whatsappMessageId: waMessageId || null,
//           content: templateContent,
//           type: "template",
//           messageType: "template",
//           direction: "outbound",
//           fromUser: false,
//           fromType: "campaign",
//           status: "sent",
//         });

        
//       } catch (logErr) {
//         console.error(`[MessageQueue] Failed to write message log for ${message.id}:`, logErr);
//       }

//       console.log(`[MessageQueue] Message sent: ${message.id}`);
//     } catch (error) {
//       console.error(`[MessageQueue] Failed to send message ${message.id}:`, error);

//       const err = error as any;
//       await db
//         .update(messageQueue)
//         .set({
//           // Final attempt = the (current+1)th try has reached the global cap.
//           status: (message.attempts + 1) >= MessageQueueService.MAX_ATTEMPTS ? "failed" : "queued",
//           attempts: message.attempts + 1,
//           errorCode: err?.metaErrorCode
//             ? String(err.metaErrorCode)
//             : err instanceof Error ? err.name : "UNKNOWN_ERROR",
//           errorMessage: err instanceof Error
//             ? [err.metaErrorTitle, err.message].filter(Boolean).join(" — ")
//             : String(err),
//           scheduledFor: (message.attempts + 1) < MessageQueueService.MAX_ATTEMPTS
//             ? new Date(Date.now() + Math.pow(2, message.attempts + 1) * 1000)
//             : null
//         })
//         .where(eq(messageQueue.id, message.id));

//       if (message.campaignId && (message.attempts + 1) >= MessageQueueService.MAX_ATTEMPTS) {
//         await db
//           .update(campaigns)
//           .set({
//             failedCount: sql`${campaigns.failedCount} + 1`
//           })
//           .where(eq(campaigns.id, message.campaignId));
//       }

//       // Log to messages table on first failure or final failure
//       if (message.attempts === 0 || (message.attempts + 1) >= MessageQueueService.MAX_ATTEMPTS) {
//         try {
//           const [existingConv] = await db
//             .select({ id: conversations.id })
//             .from(conversations)
//             .where(and(
//               eq(conversations.channelId, message.channelId),
//               eq(conversations.contactPhone, message.recipientPhone)
//             ))
//             .limit(1);

//           let conversationId = existingConv?.id;
//           if (!conversationId) {
//             const [newConv] = await db
//               .insert(conversations)
//               .values({
//                 channelId: message.channelId,
//                 contactPhone: message.recipientPhone,
//                 contactName: message.recipientPhone,
//                 status: "open",
//                 type: "whatsapp",
//                 lastMessageAt: new Date(),
//               })
//               .returning({ id: conversations.id });
//             conversationId = newConv.id;
//           }

//           const rawMetaCode = err?.metaErrorCode;
//           const errorCode = rawMetaCode
//             ? String(rawMetaCode)
//             : err instanceof Error ? err.name : "UNKNOWN_ERROR";
//           const rawErrorMsg = err instanceof Error ? err.message : String(err);

//           const waError = rawMetaCode ? getWhatsAppError(rawMetaCode) : null;
//           const errorTitle = err?.metaErrorTitle || waError?.title || "Message Failed";
//           const suggestion = waError?.suggestion || null;
//           const description = waError?.description || null;
//           const humanMessage = description || rawErrorMsg;

//           const rawMetaPayload = err?.rawResponse || err?.metaErrorData || null;

//           await db
//             .update(conversations)
//             .set({ lastMessageAt: new Date() })
//             .where(eq(conversations.id, conversationId));

//           await db.insert(messages).values({
//             conversationId,
//             campaignId: message.campaignId || null,
//             content: templateContent,
//             type: "template",
//             messageType: "template",
//             direction: "outbound",
//             fromUser: false,
//             fromType: "campaign",
//             status: "failed",
//             errorCode,
//             errorMessage: [errorTitle, humanMessage].filter(Boolean).join(" — "),
//             errorDetails: {
//               code: errorCode,
//               title: errorTitle,
//               message: humanMessage,
//               ...(rawErrorMsg !== humanMessage ? { rawMessage: rawErrorMsg } : {}),
//               ...(suggestion ? { suggestion } : {}),
//               ...(rawMetaPayload ? { errorData: rawMetaPayload } : {}),
//             },
//           });



//           if (message.campaignId && (message.attempts + 1) >= MessageQueueService.MAX_ATTEMPTS) {
//             try {
//               const { campaignRecipients } = await import("@shared/schema");
//               await db
//                 .insert(campaignRecipients)
//                 .values({
//                   campaignId: message.campaignId,
//                   phone: message.recipientPhone,
//                   name: message.recipientPhone,
//                   status: "failed",
//                   sentAt: new Date(),
//                   errorCode: errorCode || null,
//                   errorMessage: rawErrorMsg || null,
//                 })
//                 .onConflictDoUpdate({
//                   target: [campaignRecipients.campaignId, campaignRecipients.phone],
//                   set: {
//                     status: "failed",
//                     errorCode: errorCode || null,
//                     errorMessage: rawErrorMsg || null,
//                   },
//                 });
//             } catch (recipientErr) {
//               console.error(`[MessageQueue] Failed to insert failed campaignRecipient for ${message.recipientPhone}:`, recipientErr);
//             }
//           }
//         } catch (logErr) {
//           console.error(`[MessageQueue] Failed to write failure log for ${message.id}:`, logErr);
//         }
//       }
//     }
//   }


private static async processMessage(message: any, channelCache?: Map<string, any>) {
  let templateContent = `Template: ${message.templateName}`;
  try {
    if (message.templateName) {
      let tmplRow: { body: string } | undefined;
      if (message.channelId) {
        [tmplRow] = await db
          .select({ body: templates.body })
          .from(templates)
          .where(and(eq(templates.name, message.templateName), eq(templates.channelId, message.channelId)))
          .limit(1);
      }
      if (!tmplRow) {
        [tmplRow] = await db
          .select({ body: templates.body })
          .from(templates)
          .where(eq(templates.name, message.templateName))
          .limit(1);
      }
      if (tmplRow?.body) templateContent = tmplRow.body;
    }

    let channel = channelCache?.get(message.channelId);
    if (!channel) {
      channel = await cacheGet(
        CACHE_KEYS.channel(message.channelId),
        CACHE_TTL.channel,
        async () => {
          const [ch] = await db
            .select()
            .from(channels)
            .where(eq(channels.id, message.channelId))
            .limit(1);
          return ch || null;
        }
      );
    }

    if (!channel) {
      throw new Error(`Channel not found: ${message.channelId}`);
    }

    const channelTier = (channel.healthDetails as any)?.messaging_limit as string | undefined;
    const canSend = await WhatsAppApiService.checkRateLimit(channel.id, channelTier);
    if (!canSend) {
      await db
        .update(messageQueue)
        .set({
          status: "queued",
          scheduledFor: new Date(Date.now() + 5000)
        })
        .where(eq(messageQueue.id, message.id));
      return;
    }

    const isMarketing = message.messageType === "marketing" &&
      message.sentVia !== "cloud_api";

    console.log("[Campaign Runtime Debug]", {
      templateName: message.templateName,
      messageType: message.messageType,
      sentVia: message.sentVia,
      isMarketing
    });

    let response;
    if (message.templateName) {
      const language = (message as any).templateLanguage || "en_US";
      response = await WhatsAppApiService.sendTemplateMessage(
        channel,
        message.recipientPhone,
        message.templateName,
        message.templateParams || [],
        language,
        isMarketing
      );
    } else {
      throw new Error("Non-template messages not yet implemented");
    }

    const waMessageId = response.messages?.[0]?.id;

    await db
      .update(messageQueue)
      .set({
        status: "sent",
        whatsappMessageId: waMessageId,
        sentVia: isMarketing ? "marketing_messages" : "cloud_api",
        attempts: message.attempts + 1
      })
      .where(eq(messageQueue.id, message.id));

    if (message.campaignId) {
      await db
        .update(campaigns)
        .set({
          sentCount: sql`${campaigns.sentCount} + 1`
        })
        .where(eq(campaigns.id, message.campaignId));
    }

    if (message.campaignId) {
      try {
        const { campaignRecipients } = await import("@shared/schema");
        await db
          .insert(campaignRecipients)
          .values({
            campaignId: message.campaignId,
            phone: message.recipientPhone,
            name: message.recipientPhone,
            status: "sent",
            sentAt: new Date(),
            whatsappMessageId: waMessageId || null,
            templateParams: message.templateParams || [],
          })
          .onConflictDoUpdate({
            target: [campaignRecipients.campaignId, campaignRecipients.phone],
            set: {
              status: "sent",
              sentAt: new Date(),
              whatsappMessageId: waMessageId || null,
            },
          });
      } catch (err) {
        console.error(`[MessageQueue] Failed to insert campaignRecipient for ${message.recipientPhone}:`, err);
      }
    }

    try {
      const [existingConv] = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(
          eq(conversations.channelId, message.channelId),
          eq(conversations.contactPhone, message.recipientPhone)
        ))
        .limit(1);

      let conversationId = existingConv?.id;
      if (!conversationId) {
        const [newConv] = await db
          .insert(conversations)
          .values({
            channelId: message.channelId,
            contactPhone: message.recipientPhone,
            contactName: message.recipientPhone,
            status: "open",
            type: "whatsapp",
            lastMessageAt: new Date(),
          })
          .returning({ id: conversations.id });
        conversationId = newConv.id;
      } else {
        await db
          .update(conversations)
          .set({ lastMessageAt: new Date() })
          .where(eq(conversations.id, conversationId));
      }

      await db.insert(messages).values({
        conversationId,
        campaignId: message.campaignId || null,
        whatsappMessageId: waMessageId || null,
        content: templateContent,
        type: "template",
        messageType: "template",
        direction: "outbound",
        fromUser: false,
        fromType: "campaign",
        status: "sent",
      });

    } catch (logErr) {
      console.error(`[MessageQueue] Failed to write message log for ${message.id}:`, logErr);
    }

    console.log(`[MessageQueue] Message sent: ${message.id}`);
  } catch (error) {
    console.error(`[MessageQueue] Failed to send message ${message.id}:`, error);

    const err = error as any;
    await db
      .update(messageQueue)
      .set({
        status: (message.attempts + 1) >= MessageQueueService.MAX_ATTEMPTS ? "failed" : "queued",
        attempts: message.attempts + 1,
        errorCode: err?.metaErrorCode
          ? String(err.metaErrorCode)
          : err instanceof Error ? err.name : "UNKNOWN_ERROR",
        errorMessage: err instanceof Error
          ? [err.metaErrorTitle, err.message].filter(Boolean).join(" — ")
          : String(err),
        scheduledFor: (message.attempts + 1) < MessageQueueService.MAX_ATTEMPTS
          ? new Date(Date.now() + Math.pow(2, message.attempts + 1) * 1000)
          : null
      })
      .where(eq(messageQueue.id, message.id));

    if (message.campaignId && (message.attempts + 1) >= MessageQueueService.MAX_ATTEMPTS) {
      await db
        .update(campaigns)
        .set({
          failedCount: sql`${campaigns.failedCount} + 1`
        })
        .where(eq(campaigns.id, message.campaignId));
    }

    // ✅ FIXED: attempts === 0 pe INSERT, final attempt pe sirf UPDATE
    if (message.attempts === 0) {
      try {
        const [existingConv] = await db
          .select({ id: conversations.id })
          .from(conversations)
          .where(and(
            eq(conversations.channelId, message.channelId),
            eq(conversations.contactPhone, message.recipientPhone)
          ))
          .limit(1);

        let conversationId = existingConv?.id;
        if (!conversationId) {
          const [newConv] = await db
            .insert(conversations)
            .values({
              channelId: message.channelId,
              contactPhone: message.recipientPhone,
              contactName: message.recipientPhone,
              status: "open",
              type: "whatsapp",
              lastMessageAt: new Date(),
            })
            .returning({ id: conversations.id });
          conversationId = newConv.id;
        }

        const rawMetaCode = err?.metaErrorCode;
        const errorCode = rawMetaCode
          ? String(rawMetaCode)
          : err instanceof Error ? err.name : "UNKNOWN_ERROR";
        const rawErrorMsg = err instanceof Error ? err.message : String(err);

        const waError = rawMetaCode ? getWhatsAppError(rawMetaCode) : null;
        const errorTitle = err?.metaErrorTitle || waError?.title || "Message Failed";
        const suggestion = waError?.suggestion || null;
        const description = waError?.description || null;
        const humanMessage = description || rawErrorMsg;
        const rawMetaPayload = err?.rawResponse || err?.metaErrorData || null;

        await db
          .update(conversations)
          .set({ lastMessageAt: new Date() })
          .where(eq(conversations.id, conversationId));

        await db.insert(messages).values({
          conversationId,
          campaignId: message.campaignId || null,
          content: templateContent,
          type: "template",
          messageType: "template",
          direction: "outbound",
          fromUser: false,
          fromType: "campaign",
          status: "failed",
          errorCode,
          errorMessage: [errorTitle, humanMessage].filter(Boolean).join(" — "),
          errorDetails: {
            code: errorCode,
            title: errorTitle,
            message: humanMessage,
            ...(rawErrorMsg !== humanMessage ? { rawMessage: rawErrorMsg } : {}),
            ...(suggestion ? { suggestion } : {}),
            ...(rawMetaPayload ? { errorData: rawMetaPayload } : {}),
          },
        });

        if (message.campaignId) {
          try {
            const { campaignRecipients } = await import("@shared/schema");
            await db
              .insert(campaignRecipients)
              .values({
                campaignId: message.campaignId,
                phone: message.recipientPhone,
                name: message.recipientPhone,
                status: "failed",
                sentAt: new Date(),
                errorCode: errorCode || null,
                errorMessage: rawErrorMsg || null,
              })
              .onConflictDoUpdate({
                target: [campaignRecipients.campaignId, campaignRecipients.phone],
                set: {
                  status: "failed",
                  errorCode: errorCode || null,
                  errorMessage: rawErrorMsg || null,
                },
              });
          } catch (recipientErr) {
            console.error(`[MessageQueue] Failed to insert failed campaignRecipient for ${message.recipientPhone}:`, recipientErr);
          }
        }
      } catch (logErr) {
        console.error(`[MessageQueue] Failed to write failure log for ${message.id}:`, logErr);
      }

    } else if ((message.attempts + 1) >= MessageQueueService.MAX_ATTEMPTS) {
      // ✅ Final retry pe sirf existing message row UPDATE karo
      try {
        const [existingConv] = await db
          .select({ id: conversations.id })
          .from(conversations)
          .where(and(
            eq(conversations.channelId, message.channelId),
            eq(conversations.contactPhone, message.recipientPhone)
          ))
          .limit(1);

        if (existingConv) {
          const rawMetaCode = err?.metaErrorCode;
          const errorCode = rawMetaCode
            ? String(rawMetaCode)
            : err instanceof Error ? err.name : "UNKNOWN_ERROR";
          const rawErrorMsg = err instanceof Error ? err.message : String(err);

          const waError = rawMetaCode ? getWhatsAppError(rawMetaCode) : null;
          const errorTitle = err?.metaErrorTitle || waError?.title || "Message Failed";
          const suggestion = waError?.suggestion || null;
          const description = waError?.description || null;
          const humanMessage = description || rawErrorMsg;
          const rawMetaPayload = err?.rawResponse || err?.metaErrorData || null;

          const [existingMsg] = await db
            .select({ id: messages.id })
            .from(messages)
            .where(and(
              eq(messages.conversationId, existingConv.id),
              eq(messages.campaignId, message.campaignId || null),
              eq(messages.direction, "outbound"),
              eq(messages.fromType, "campaign"),
            ))
            .limit(1);

          if (existingMsg) {
            await db
              .update(messages)
              .set({
                status: "failed",
                errorCode,
                errorMessage: [errorTitle, humanMessage].filter(Boolean).join(" — "),
                errorDetails: {
                  code: errorCode,
                  title: errorTitle,
                  message: humanMessage,
                  ...(rawErrorMsg !== humanMessage ? { rawMessage: rawErrorMsg } : {}),
                  ...(suggestion ? { suggestion } : {}),
                  ...(rawMetaPayload ? { errorData: rawMetaPayload } : {}),
                },
              })
              .where(eq(messages.id, existingMsg.id));
          }

          if (message.campaignId) {
            try {
              const { campaignRecipients } = await import("@shared/schema");
              await db
                .insert(campaignRecipients)
                .values({
                  campaignId: message.campaignId,
                  phone: message.recipientPhone,
                  name: message.recipientPhone,
                  status: "failed",
                  sentAt: new Date(),
                  errorCode: errorCode || null,
                  errorMessage: rawErrorMsg || null,
                })
                .onConflictDoUpdate({
                  target: [campaignRecipients.campaignId, campaignRecipients.phone],
                  set: {
                    status: "failed",
                    errorCode: errorCode || null,
                    errorMessage: rawErrorMsg || null,
                  },
                });
            } catch (recipientErr) {
              console.error(`[MessageQueue] Failed to update failed campaignRecipient for ${message.recipientPhone}:`, recipientErr);
            }
          }
        }
      } catch (logErr) {
        console.error(`[MessageQueue] Failed to update failure log for ${message.id}:`, logErr);
      }
    }
  }
}

  static async queueCampaignMessages(
    campaignId: string,
    channelId: string,
    recipients: string[],
    templateName: string,
    templateParams: any[] = [],
    messageType: string = "marketing",
    scheduledFor?: Date
  ): Promise<number> {
    const messagesToQueue = recipients.map(phone => ({
      campaignId,
      channelId,
      recipientPhone: phone,
      templateName,
      templateParams,
      messageType,
      status: "queued" as const,
      scheduledFor
    }));

    const batchSize = 100;
    let totalQueued = 0;

    for (let i = 0; i < messagesToQueue.length; i += batchSize) {
      const batch = messagesToQueue.slice(i, i + batchSize);
      const inserted = await db.insert(messageQueue).values(batch).returning({ id: messageQueue.id });
      totalQueued += batch.length;

      if (this.usingBullMQ && isBullQueueAvailable()) {
        const bullJobs = inserted.map((row, idx) => ({
          messageId: row.id,
          channelId,
          recipientPhone: batch[idx].recipientPhone,
          templateName,
          templateParams,
          messageType,
          campaignId,
          scheduledFor,
        }));
        await addBulkMessagesToBullQueue(bullJobs);
      }
    }

    return totalQueued;
  }

  static async getQueueStats() {
    const stats = await db
      .select({
        status: messageQueue.status,
        count: sql<number>`count(*)::int`
      })
      .from(messageQueue)
      .groupBy(messageQueue.status);

    const dbStats = stats.reduce((acc, stat) => {
      if (stat.status) {
        acc[stat.status] = stat.count;
      }
      return acc;
    }, {} as Record<string, number>);

    if (this.usingBullMQ) {
      const bullStats = await getBullQueueStats();
      if (bullStats) {
        return { ...dbStats, bullmq: bullStats, engine: "bullmq" as const };
      }
    }

    return { ...dbStats, engine: "db-polling" as const };
  }

  static async clearOldFailedMessages(daysOld: number = 7) {
    const result = await db
      .delete(messageQueue)
      .where(
        and(
          eq(messageQueue.status, "failed"),
          sql`${messageQueue.createdAt} < NOW() - INTERVAL '${daysOld} days'`
        )
      );

    return result;
  }
}
