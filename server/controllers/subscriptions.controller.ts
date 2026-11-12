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

import { Request, Response } from "express";
import {
  DiployError,
  asyncHandler as _dHandler,
  diployLogger,
  HTTP_STATUS,
} from "@diploy/core";
import { db } from "../db";
import { subscriptions, users, plans, transactions } from "@shared/schema";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import {
  cancelStripeSubscription,
  cancelRazorpaySubscription,
  cancelPayPalSubscription,
  cancelPaystackSubscription,
  cancelMercadoPagoSubscription,
  upgradeOrDowngradeStripe,
  upgradeOrDowngradeRazorpay,
  createStripeSubscription,
  createRazorpaySubscription,
} from "../services/payment-gateway.service";

type BillingCycle = "monthly" | "quarterly" | "annual";

const normalizeBillingCycle = (value: unknown): BillingCycle | null => {
  const cycle = String(value || "").toLowerCase();

  if (cycle === "monthly") return "monthly";
  if (cycle === "quarterly") return "quarterly";
  if (cycle === "annual" || cycle === "yearly") return "annual";

  return null;
};

const addBillingPeriod = (date: Date, billingCycle: BillingCycle): Date => {
  const result = new Date(date);

  const monthsToAdd =
    billingCycle === "monthly" ? 1 : billingCycle === "quarterly" ? 3 : 12;

  // Preserve the original day where possible.
  // For example, adding one month to January 31
  // should result in February 28/29, not March 3.
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + monthsToAdd);

  const lastDayOfMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();

  result.setDate(Math.min(originalDay, lastDayOfMonth));

  return result;
};

const createPlanSnapshot = (plan: any) => ({
  name: plan.name,
  description: plan.description,
  monthlyPrice: plan.monthlyPrice,
  quarterlyPrice: plan.quarterlyPrice,
  annualPrice: plan.annualPrice,
  multiCurrencyPrices: plan.multiCurrencyPrices,
  permissions: plan.permissions,
  features: plan.features,
});

export const getAllSubscriptions = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(subscriptions);

    const total = Number(count);
    const totalPages = Math.ceil(total / limit);

    const latestTransactionSubquery = db
      .select({
        subscriptionId: transactions.subscriptionId,
        latestCreatedAt: sql<string>`MAX(${transactions.createdAt})`.as(
          "latest_created_at",
        ),
      })
      .from(transactions)
      .groupBy(transactions.subscriptionId)
      .as("latest_transaction_subquery");

    const paginatedSubscriptions = await db
      .select({
        subscription: subscriptions,
        user: {
          id: users.id,
          username: users.username,
        },
        plan: {
          id: plans.id,
          name: plans.name,
          description: plans.description,
          icon: plans.icon,
          monthlyPrice: plans.monthlyPrice,
          annualPrice: plans.annualPrice,
          features: plans.features,
          permissions: plans.permissions,
        },
        transaction: {
          amount: transactions.amount,
          currency: transactions.currency,
          paymentMethod: transactions.paymentMethod,
          status: transactions.status,
          createdAt: transactions.createdAt,
        },
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .leftJoin(
        latestTransactionSubquery,
        eq(subscriptions.id, latestTransactionSubquery.subscriptionId),
      )
      .leftJoin(
        transactions,
        and(
          eq(
            transactions.subscriptionId,
            latestTransactionSubquery.subscriptionId,
          ),
          eq(transactions.createdAt, latestTransactionSubquery.latestCreatedAt),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit)
      .offset(offset);

    console.log("CHECK SUBSCRIPTION DATA", paginatedSubscriptions);

    res.status(200).json({
      success: true,
      data: paginatedSubscriptions,
      pagination: { total, totalPages, page, limit },
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching subscriptions",
      error,
    });
  }
};

export const getActivePaidUsersCount = async () => {
  const activeSubs = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  return new Set(activeSubs.map((s: any) => s.userId)).size;
};

export const getSubscriptionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subscription = await db
      .select({
        subscription: subscriptions,
        user: users,
        plan: plans,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(eq(subscriptions.id, id));

    if (subscription.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    res.status(200).json({ success: true, data: subscription[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching subscription",
      error,
    });
  }
};

export const getSubscriptionsByUserId = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const latestTransactionSubquery = db
      .select({
        subscriptionId: transactions.subscriptionId,
        latestCreatedAt: sql<string>`MAX(${transactions.createdAt})`.as(
          "latest_created_at",
        ),
      })
      .from(transactions)
      .groupBy(transactions.subscriptionId)
      .as("latest_transaction_subquery");

    const userSubscriptions = await db
      .select({
        subscription: subscriptions,
        user: {
          id: users.id,
          username: users.username,
        },
        transaction: {
          amount: transactions.amount,
          currency: transactions.currency,
          status: transactions.status,
          createdAt: transactions.createdAt,
        },
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(
        latestTransactionSubquery,
        eq(subscriptions.id, latestTransactionSubquery.subscriptionId),
      )
      .leftJoin(
        transactions,
        and(
          eq(
            transactions.subscriptionId,
            latestTransactionSubquery.subscriptionId,
          ),
          eq(transactions.createdAt, latestTransactionSubquery.latestCreatedAt),
        ),
      )
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      )
      .orderBy(desc(subscriptions.createdAt));

    res.status(200).json({ success: true, data: userSubscriptions });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching user subscriptions",
      error,
    });
  }
};

export const getActiveSubscriptionByUserId = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = req.params;
    const activeSubscription = await db
      .select({
        subscription: subscriptions,
        plan: plans,
      })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    if (activeSubscription.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No active subscription found" });
    }

    res.status(200).json({ success: true, data: activeSubscription[0] });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active subscription",
      error,
    });
  }
};

export const AssignSubscription = async (req: Request, res: Response) => {
  try {
    const { userId, planId, billingCycle: requestedCycle } = req.body;

    if (!userId || !planId) {
      return res.status(400).json({
        success: false,
        message: "userId and planId are required",
      });
    }

    const billingCycle = normalizeBillingCycle(requestedCycle);

    if (!billingCycle) {
      return res.status(400).json({
        success: false,
        message: "Invalid billing cycle. Use monthly, quarterly, or annual.",
      });
    }

    const plan = await db.query.plans.findFirst({
      where: (p: any) => eq(p.id, planId),
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan not found",
      });
    }

    const startDate = new Date();
    const endDate = addBillingPeriod(startDate, billingCycle);

    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        autoRenew: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      );

    const newSubscription = await db
      .insert(subscriptions)
      .values({
        userId,
        planId,
        planData: createPlanSnapshot(plan),
        status: "active",
        billingCycle,
        startDate,
        endDate,
        autoRenew: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Subscription assigned successfully",
      data: newSubscription[0],
    });
  } catch (error) {
    console.error("Error assigning subscription:", error);

    return res.status(500).json({
      success: false,
      message: "Error creating subscription",
      error,
    });
  }
};

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      planId,
      billingCycle: requestedCycle,
      startDate,
      endDate,
      autoRenew,
    } = req.body;

    if (!userId || !planId || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "userId, planId, startDate, and endDate are required",
      });
    }

    const billingCycle = normalizeBillingCycle(requestedCycle);

    if (!billingCycle) {
      return res.status(400).json({
        success: false,
        message: "Invalid billing cycle. Use monthly, quarterly, or annual.",
      });
    }

    const parsedStartDate = new Date(startDate);
    const parsedEndDate = new Date(endDate);

    if (
      Number.isNaN(parsedStartDate.getTime()) ||
      Number.isNaN(parsedEndDate.getTime()) ||
      parsedEndDate <= parsedStartDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription start or end date",
      });
    }

    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        autoRenew: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      );

    const newSubscription = await db
      .insert(subscriptions)
      .values({
        userId,
        planId,
        status: "active",
        billingCycle,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        autoRenew: autoRenew ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: newSubscription[0],
    });
  } catch (error) {
    console.error("Error creating subscription:", error);

    return res.status(500).json({
      success: false,
      message: "Error creating subscription",
      error,
    });
  }
};

export const updateSubscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedSubscription = await db
      .update(subscriptions)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();

    if (updatedSubscription.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    res.status(200).json({
      success: true,
      message: "Subscription updated successfully",
      data: updatedSubscription[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating subscription",
      error,
    });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { immediately } = req.body || {};

    const subData = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);

    if (subData.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    const sub = subData[0];

    if (sub.gatewaySubscriptionId && sub.gatewayProvider) {
      try {
        if (sub.gatewayProvider === "stripe") {
          await cancelStripeSubscription(
            sub.gatewaySubscriptionId,
            immediately === true,
          );
        } else if (sub.gatewayProvider === "razorpay") {
          await cancelRazorpaySubscription(
            sub.gatewaySubscriptionId,
            immediately === true,
          );
        } else if (sub.gatewayProvider === "paypal") {
          await cancelPayPalSubscription(
            sub.gatewaySubscriptionId,
            immediately === true,
          );
        } else if (sub.gatewayProvider === "paystack") {
          await cancelPaystackSubscription(sub.gatewaySubscriptionId);
        } else if (sub.gatewayProvider === "mercadopago") {
          await cancelMercadoPagoSubscription(sub.gatewaySubscriptionId);
        }
      } catch (err: any) {
        console.error("Gateway cancellation error:", err.message);
      }
    }

    if (immediately === true) {
      const cancelledSubscription = await db
        .update(subscriptions)
        .set({
          status: "cancelled",
          autoRenew: false,
          gatewayStatus: "cancelled",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, id))
        .returning();

      res.status(200).json({
        success: true,
        message: "Subscription cancelled immediately",
        data: cancelledSubscription[0],
      });
    } else {
      const cancelledSubscription = await db
        .update(subscriptions)
        .set({
          autoRenew: false,
          gatewayStatus: "cancel_at_period_end",
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, id))
        .returning();

      res.status(200).json({
        success: true,
        message: `Subscription will be cancelled at the end of your billing period (${sub.endDate ? new Date(sub.endDate).toLocaleDateString() : "end of period"})`,
        data: cancelledSubscription[0],
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error cancelling subscription",
      error,
    });
  }
};

export const changePlan = async (req: Request, res: Response) => {
  try {
    const { userId, newPlanId, billingCycle: requestedCycle } = req.body;

    if (!userId || !newPlanId) {
      return res.status(400).json({
        success: false,
        message: "userId and newPlanId are required",
      });
    }

    const cycle = normalizeBillingCycle(requestedCycle);

    if (!cycle) {
      return res.status(400).json({
        success: false,
        message: "Invalid billing cycle. Use monthly, quarterly, or annual.",
      });
    }

    const activeSub = await db
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      )
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);

    const newPlanData = await db
      .select()
      .from(plans)
      .where(eq(plans.id, newPlanId))
      .limit(1);

    if (!newPlanData.length) {
      return res.status(404).json({
        success: false,
        message: "New plan not found",
      });
    }

    if (activeSub.length === 0) {
      return res.status(402).json({
        success: false,
        message:
          "No active subscription found. Please use the checkout to subscribe.",
      });
    }

    const currentSub = activeSub[0];

    // Cancel the existing gateway subscription before replacing it.
    // The replacement subscription should ideally be initiated through
    // the payment checkout flow rather than activated locally.
    if (currentSub.gatewaySubscriptionId && currentSub.gatewayProvider) {
      try {
        if (currentSub.gatewayProvider === "stripe") {
          await cancelStripeSubscription(
            currentSub.gatewaySubscriptionId,
            true,
          );
        } else if (currentSub.gatewayProvider === "razorpay") {
          await cancelRazorpaySubscription(
            currentSub.gatewaySubscriptionId,
            true,
          );
        }
      } catch (err: any) {
        console.error(
          "Gateway cancellation error during plan change:",
          err.message,
        );

        return res.status(502).json({
          success: false,
          message:
            "Could not cancel the existing gateway subscription. The plan was not changed.",
        });
      }
    }

    await db
      .update(subscriptions)
      .set({
        status: "cancelled",
        autoRenew: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.status, "active"),
        ),
      );

    const newPlan = newPlanData[0];

    const startDate = new Date();
    const endDate = addBillingPeriod(startDate, cycle);

    const newSubscription = await db
      .insert(subscriptions)
      .values({
        userId,
        planId: newPlanId,
        planData: createPlanSnapshot(newPlan),
        status: "active",
        billingCycle: cycle,
        startDate,
        endDate,
        autoRenew: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    await db
      .update(users)
      .set({
        planId: newPlanId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return res.status(200).json({
      success: true,
      message: "Plan changed successfully",
      data: newSubscription[0],
    });
  } catch (error: any) {
    console.error("Error changing plan:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Error changing plan",
    });
  }
};

export const renewSubscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const currentSub = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, id))
      .limit(1);

    if (currentSub.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    const subscription = currentSub[0];

    const billingCycle = normalizeBillingCycle(subscription.billingCycle);

    if (!billingCycle) {
      return res.status(400).json({
        success: false,
        message: "Invalid billing cycle on subscription",
      });
    }

    const now = new Date();

    const existingEndDate = subscription.endDate
      ? new Date(subscription.endDate)
      : null;

    // Extend from the existing period end if it is still valid.
    // Otherwise, begin a new period from the current date.
    const newStartDate =
      existingEndDate &&
      !Number.isNaN(existingEndDate.getTime()) &&
      existingEndDate > now
        ? existingEndDate
        : now;

    const newEndDate = addBillingPeriod(newStartDate, billingCycle);

    const renewedSubscription = await db
      .update(subscriptions)
      .set({
        status: "active",
        billingCycle,
        startDate: newStartDate,
        endDate: newEndDate,
        autoRenew: true,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, id))
      .returning();

    return res.status(200).json({
      success: true,
      message: "Subscription renewed successfully",
      data: renewedSubscription[0],
    });
  } catch (error) {
    console.error("Error renewing subscription:", error);

    return res.status(500).json({
      success: false,
      message: "Error renewing subscription",
      error,
    });
  }
};

export const toggleAutoRenew = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { autoRenew } = req.body;

    const updatedSubscription = await db
      .update(subscriptions)
      .set({ autoRenew, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();

    if (updatedSubscription.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found" });
    }

    res.status(200).json({
      success: true,
      message: `Auto-renew ${autoRenew ? "enabled" : "disabled"} successfully`,
      data: updatedSubscription[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error toggling auto-renew",
      error,
    });
  }
};

export const checkExpiredSubscriptions = async (
  req: Request,
  res: Response,
) => {
  try {
    const now = new Date();

    const expiredSubscriptions = await db
      .update(subscriptions)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(eq(subscriptions.status, "active"), lt(subscriptions.endDate, now)),
      )
      .returning();

    res.status(200).json({
      success: true,
      message: `${expiredSubscriptions.length} subscriptions marked as expired`,
      data: expiredSubscriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking expired subscriptions",
      error,
    });
  }
};
