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
import { paymentProviders, plans } from '@shared/schema';

// Plan columns whose values are produced by syncing to a specific provider
// in a specific mode (live vs sandbox). When the operator flips the mode
// these IDs become invalid (e.g. a sandbox PayPal plan_id sent to the live
// API returns 404), so they must be cleared so the next checkout/sync
// recreates them in the new mode.
const SYNCED_ID_COLUMNS_BY_PROVIDER: Record<string, (keyof typeof plans.$inferSelect)[]> = {
  stripe: ["stripeProductId", "stripePriceIdMonthly", "stripePriceIdAnnual"],
  paypal: ["paypalProductId", "paypalPlanIdMonthly", "paypalPlanIdAnnual"],
  razorpay: ["razorpayPlanIdMonthly", "razorpayPlanIdAnnual"],
  paystack: ["paystackPlanCodeMonthly", "paystackPlanCodeAnnual"],
  mercadopago: ["mercadopagoPlanIdMonthly", "mercadopagoPlanIdAnnual"],
};

// Build the currency → providers map from whatever the operator has
// explicitly configured. No hardcoded INR/USD fallback — if a provider
// has empty supportedCurrencies it does not appear under any currency.
export const getCurrencyGatewayMap = async (req: Request, res: Response) => {
  try {
    const providers = await db
      .select()
      .from(paymentProviders)
      .where(eq(paymentProviders.isActive, true));

    const currencyMap: Record<string, { providerKey: string; providerId: string; providerName: string }[]> = {};

    for (const provider of providers) {
      const currencies = Array.isArray(provider.supportedCurrencies)
        ? provider.supportedCurrencies
        : [];

      for (const cur of currencies) {
        const code = String(cur).toUpperCase();
        if (!currencyMap[code]) currencyMap[code] = [];
        currencyMap[code].push({
          providerKey: provider.providerKey,
          providerId: provider.id,
          providerName: provider.name,
        });
      }
    }

    const availableCurrencies = Object.keys(currencyMap).sort();

    res.status(200).json({
      success: true,
      data: {
        currencyMap,
        availableCurrencies,
        providers: providers.map(p => ({
          id: p.id,
          name: p.name,
          providerKey: p.providerKey,
          supportedCurrencies: Array.isArray(p.supportedCurrencies)
            ? p.supportedCurrencies
            : [],
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching currency gateway map', error });
  }
};

// Get all payment providers. Superadmin gets the full row including
// `config` (API secrets) for the Gateway Settings page; every other
// authenticated role gets a sanitized projection so credentials never
// leak to admin/team users who use this endpoint for the upgrade flow.
export const getAllProviders = async (req: Request, res: Response) => {
  try {
    const providers = await db.select().from(paymentProviders);
    const isSuper = req.user?.role === 'superadmin';

    const data = isSuper
      ? providers
      : providers.map(p => ({
          id: p.id,
          name: p.name,
          providerKey: p.providerKey,
          description: p.description,
          logo: p.logo,
          isActive: p.isActive,
          // Surface only the non-sensitive mode flag so the checkout UI
          // can render the correct Live/Test badge without exposing keys.
          isLive: p.config?.isLive === true,
          supportedCurrencies: Array.isArray(p.supportedCurrencies) ? p.supportedCurrencies : [],
          supportedMethods: Array.isArray(p.supportedMethods) ? p.supportedMethods : [],
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching providers', error });
  }
};

// Get active payment providers only
export const getActiveProviders = async (req: Request, res: Response) => {
  try {
    const providers = await db
      .select({
        id: paymentProviders.id,
        name: paymentProviders.name,
        providerKey: paymentProviders.providerKey,
        logo: paymentProviders.logo,
      })
      .from(paymentProviders)
      .where(eq(paymentProviders.isActive, true));

    res.status(200).json({ success: true, data: providers });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching active providers",
      error,
    });
  }
};

// Get single payment provider by ID
export const getProviderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const provider = await db
      .select()
      .from(paymentProviders)
      .where(eq(paymentProviders.id, id));
    
    if (provider.length === 0) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    
    res.status(200).json({ success: true, data: provider[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching provider', error });
  }
};

// Get provider by key (e.g., "razorpay", "stripe")
export const getProviderByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const provider = await db
      .select()
      .from(paymentProviders)
      .where(eq(paymentProviders.providerKey, key));
    
    if (provider.length === 0) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    
    res.status(200).json({ success: true, data: provider[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching provider', error });
  }
};

// Create new payment provider
export const createProvider = async (req: Request, res: Response) => {
  try {
    const {
      name,
      providerKey,
      description,
      logo,
      isActive,
      config,
      supportedCurrencies,
      supportedMethods
    } = req.body;

    const newProvider = await db
      .insert(paymentProviders)
      .values({
        name,
        providerKey,
        description,
        logo,
        isActive: isActive ?? true,
        config,
        supportedCurrencies,
        supportedMethods
      })
      .returning();

    res.status(201).json({ success: true, data: newProvider[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating provider', error });
  }
};

// Update payment provider
export const updateProvider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Read the existing row first so we can detect a live↔test mode flip
    // *before* applying the update. Reading the prior `isLive` from the
    // request body would be wrong — we need the previously-persisted value.
    const existingRows = await db
      .select()
      .from(paymentProviders)
      .where(eq(paymentProviders.id, id))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    const updatedProvider = await db
      .update(paymentProviders)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(paymentProviders.id, id))
      .returning();

    const after = updatedProvider[0];
    const wasLive = existing.config?.isLive === true;
    const isLive = after.config?.isLive === true;

    if (wasLive !== isLive) {
      const cols = SYNCED_ID_COLUMNS_BY_PROVIDER[after.providerKey];
      if (cols && cols.length > 0) {
        const clears = Object.fromEntries(cols.map(c => [c, null]));
        await db.update(plans).set({ ...clears, updatedAt: new Date() });
      }
    }

    const { resetGatewayInstances } = await import("../services/payment-gateway.service");
    resetGatewayInstances();

    res.status(200).json({ success: true, data: after });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating provider', error });
  }
};

// Toggle provider active status
export const toggleProviderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const updatedProvider = await db
      .update(paymentProviders)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(paymentProviders.id, id))
      .returning();

    if (updatedProvider.length === 0) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    const { resetGatewayInstances } = await import("../services/payment-gateway.service");
    resetGatewayInstances();

    res.status(200).json({ 
      success: true, 
      message: `Provider ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedProvider[0] 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error toggling provider status', error });
  }
};

// Delete payment provider
export const deleteProvider = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deletedProvider = await db
      .delete(paymentProviders)
      .where(eq(paymentProviders.id, id))
      .returning();

    if (deletedProvider.length === 0) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    res.status(200).json({ success: true, message: 'Provider deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting provider', error });
  }
};