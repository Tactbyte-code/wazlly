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

import { Request, Response } from 'express';
import { DiployError, asyncHandler as _dHandler, diployLogger, HTTP_STATUS } from "@diploy/core";
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { plans } from '@shared/schema';
import {
  syncPlanToAllGateways,
  syncPlanToStripe,
  syncPlanToRazorpay,
} from '../services/payment-gateway.service';
import { cacheGet, cacheInvalidate, CACHE_KEYS, CACHE_TTL } from '../services/cache';

export const getAllPlans = async (req: Request, res: Response) => {
  try {
    const allPlans = await cacheGet(CACHE_KEYS.subscriptionPlans(), CACHE_TTL.subscriptionPlans, async () => {
      return db.select().from(plans);
    });
    res.status(200).json({ success: true, data: allPlans });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching plans', error });
  }
};

export const getPlanById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const plan = await db.select().from(plans).where(eq(plans.id, id));

    if (plan.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    res.status(200).json({ success: true, data: plan[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching plan', error });
  }
};

export const createPlan = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      icon,
      popular,
      badge,
      color,
      buttonColor,
      monthlyPrice,
      annualPrice,
      multiCurrencyPrices,
      permissions,
      features
    } = req.body;

    const newPlan = await db.insert(plans).values({
      name,
      description,
      icon,
      popular: popular || false,
      badge,
      color,
      buttonColor,
      monthlyPrice,
      annualPrice,
      multiCurrencyPrices: multiCurrencyPrices || {},
      permissions,
      features
    }).returning();

    await cacheInvalidate(CACHE_KEYS.subscriptionPlans());

    const syncResult = await syncPlanToAllGateways(newPlan[0].id);
    const syncWarnings = formatSyncWarnings(syncResult.errors);

    res.status(201).json({ success: true, data: newPlan[0], syncWarnings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating plan', error });
  }
};

function formatSyncWarnings(errors: string[]): { gateway: string; error: string }[] {
  return errors.map((entry) => {
    const [gateway, ...rest] = entry.split(':');
    return { gateway: gateway.trim(), error: rest.join(':').trim() };
  });
}

type PlanRow = typeof plans.$inferSelect;
const PRICE_FIELDS = ['monthlyPrice', 'annualPrice'] as const satisfies readonly (keyof PlanRow)[];

export const updatePlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const updatedPlan = await db
      .update(plans)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(plans.id, id))
      .returning();

    if (updatedPlan.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    await cacheInvalidate(CACHE_KEYS.subscriptionPlans());
    await cacheInvalidate(CACHE_KEYS.planById(id));

    const before = existing[0];
    const after = updatedPlan[0];
    const beforeCurrency = (before as Record<string, unknown>).currency;
    const afterCurrency =
      updateData && 'currency' in updateData
        ? (updateData as Record<string, unknown>).currency
        : beforeCurrency;
    const priceChanged =
      PRICE_FIELDS.some(
        (field) => String(before[field] ?? '') !== String(after[field] ?? ''),
      ) ||
      String(beforeCurrency ?? '') !== String(afterCurrency ?? '') ||
      JSON.stringify(before.multiCurrencyPrices ?? {}) !== JSON.stringify(after.multiCurrencyPrices ?? {});

    let syncWarnings: { gateway: string; error: string }[] = [];
    if (priceChanged) {
      const syncResult = await syncPlanToAllGateways(id);
      syncWarnings = formatSyncWarnings(syncResult.errors);
    }

    res.status(200).json({ success: true, data: updatedPlan[0], syncWarnings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating plan', error });
  }
};

export const deletePlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedPlan = await db
      .delete(plans)
      .where(eq(plans.id, id))
      .returning();

    if (deletedPlan.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    await cacheInvalidate(CACHE_KEYS.subscriptionPlans());
    await cacheInvalidate(CACHE_KEYS.planById(id));

    res.status(200).json({ success: true, message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting plan', error });
  }
};

export const syncPlanToGateway = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { gateway } = req.body;

    const plan = await db.select().from(plans).where(eq(plans.id, id)).limit(1);
    if (!plan.length) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    let result;
    if (gateway === 'stripe') {
      result = await syncPlanToStripe(id);
    } else if (gateway === 'razorpay') {
      result = await syncPlanToRazorpay(id);
    } else {
      result = await syncPlanToAllGateways(id);
    }

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    const msg = error.message || (typeof error === "string" ? error : JSON.stringify(error));
    res.status(500).json({
      success: false,
      message: `Error syncing plan to gateway: ${msg}`,
    });
  }
};

export const syncAllPlansToGateways = async (_req: Request, res: Response) => {
  try {
    const allPlans = await db.select().from(plans);
    const results: { planId: string; planName: string; result: any }[] = [];
    let syncedCount = 0;
    let partialCount = 0;
    let failedCount = 0;

    for (const plan of allPlans) {
      try {
        const result = await syncPlanToAllGateways(plan.id);
        results.push({ planId: plan.id, planName: plan.name, result });
        
        if (result.errors.length === 0) {
          syncedCount++;
        } else {
          partialCount++;
        }
      } catch (err: any) {
        failedCount++;
        const msg = err.message || (typeof err === "string" ? err : JSON.stringify(err));
        results.push({ planId: plan.id, planName: plan.name, result: { errors: [msg] } });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        total: allPlans.length,
        synced: syncedCount,
        partial: partialCount,
        failed: failedCount,
        results,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Error syncing plans: ${error.message}`,
    });
  }
};
