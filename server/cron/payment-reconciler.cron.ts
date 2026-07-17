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

import * as cron from 'node-cron';
import axios from 'axios';
import { db } from '../db';
import { transactions, paymentProviders } from '@shared/schema';
import { sql, eq } from 'drizzle-orm';
import {
  getStripe,
  getRazorpay,
  getPayPalAccessToken,
  getPayPalBaseUrl,
  getPaystackSecretKey,
  getMercadoPagoAccessToken,
} from '../services/payment-gateway.service';
import { activateSubscriptionFromTransaction } from '../controllers/webhooks.controller';

export type ReconcileLookupResult =
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'pending'
  | 'not_found';

const RECONCILE_BATCH_SIZE = 100;
const RECONCILE_MIN_AGE_MINUTES = 60;
const RECONCILE_MAX_AGE_DAYS = 30;

export class PaymentReconciler {
  private static instance: PaymentReconciler;
  private cronJob: cron.ScheduledTask | null = null;

  private constructor() {}

  static getInstance(): PaymentReconciler {
    if (!PaymentReconciler.instance) {
      PaymentReconciler.instance = new PaymentReconciler();
    }
    return PaymentReconciler.instance;
  }

  async reconcileOnce(): Promise<void> {
    const stuck = await db
      .select({
        tx: transactions,
        providerKey: paymentProviders.providerKey,
      })
      .from(transactions)
      .innerJoin(
        paymentProviders,
        eq(transactions.paymentProviderId, paymentProviders.id),
      )
      .where(
        sql`${transactions.status} = 'pending' AND ${transactions.createdAt} < NOW() - INTERVAL '${sql.raw(String(RECONCILE_MIN_AGE_MINUTES))} minutes'`,
      )
      .limit(RECONCILE_BATCH_SIZE);

    if (stuck.length === 0) return;

    console.log(
      `[PaymentReconciler] Reconciling ${stuck.length} stuck pending transaction(s)`,
    );

    for (const row of stuck) {
      try {
        await this.reconcileOne(row.tx, row.providerKey);
      } catch (err) {
        console.error(
          `[PaymentReconciler] Error reconciling transaction ${row.tx.id} (${row.providerKey}):`,
          err,
        );
      }
    }
  }

  private async reconcileOne(tx: any, providerKey: string): Promise<void> {
    const createdAt = tx.createdAt instanceof Date ? tx.createdAt : new Date(tx.createdAt);
    const ageDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays > RECONCILE_MAX_AGE_DAYS) {
      await db
        .update(transactions)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(transactions.id, tx.id));
      console.log(
        `[PaymentReconciler] Transaction ${tx.id} aged out (>${RECONCILE_MAX_AGE_DAYS} days) — marked expired`,
      );
      return;
    }

    const lookup = await lookupPaymentStatus(providerKey, tx);

    if (lookup === 'succeeded') {
      await db
        .update(transactions)
        .set({ status: 'completed', paidAt: new Date(), updatedAt: new Date() })
        .where(eq(transactions.id, tx.id));

      const refreshed = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, tx.id))
        .limit(1);

      if (refreshed[0]) {
        await activateSubscriptionFromTransaction(refreshed[0], null, providerKey);
      }
      console.log(`[PaymentReconciler] Transaction ${tx.id} reconciled to completed`);
    } else if (lookup === 'failed') {
      await db
        .update(transactions)
        .set({ status: 'failed', updatedAt: new Date() })
        .where(eq(transactions.id, tx.id));
      console.log(`[PaymentReconciler] Transaction ${tx.id} reconciled to failed`);
    } else if (lookup === 'cancelled') {
      await db
        .update(transactions)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(transactions.id, tx.id));
      console.log(`[PaymentReconciler] Transaction ${tx.id} reconciled to cancelled`);
    }
    // 'pending' / 'not_found' (within max age): leave untouched, retry next tick.
  }

  start(): void {
    this.cronJob = cron.schedule('*/15 * * * *', async () => {
      await this.reconcileOnce();
    });
    console.log('[PaymentReconciler] Started — runs every 15 minutes');
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[PaymentReconciler] Stopped');
    }
  }
}

export const paymentReconciler = PaymentReconciler.getInstance();

export async function lookupPaymentStatus(
  providerKey: string,
  tx: any,
): Promise<ReconcileLookupResult> {
  switch (providerKey) {
    case 'stripe':
      return lookupStripe(tx);
    case 'razorpay':
      return lookupRazorpay(tx);
    case 'paypal':
      return lookupPayPal(tx);
    case 'paystack':
      return lookupPaystack(tx);
    case 'mercadopago':
      return lookupMercadoPago(tx);
    default:
      throw new Error(`[PaymentReconciler] Unknown provider key: ${providerKey}`);
  }
}

async function lookupStripe(tx: any): Promise<ReconcileLookupResult> {
  const stripeId: string | null = tx.providerTransactionId;
  if (!stripeId) {
    console.warn(`[PaymentReconciler] No providerTransactionId for transaction ${tx.id}`);
    return 'not_found';
  }

  const stripe = await getStripe();
  if (!stripe) throw new Error('Stripe is not configured');

  try {
    if (stripeId.startsWith('pi_')) {
      console.log(`[PaymentReconciler] Detected PaymentIntent ID: ${stripeId} for transaction ${tx.id}`);
      const intent = await stripe.paymentIntents.retrieve(stripeId);
      console.log(`[PaymentReconciler] PaymentIntent ${stripeId} status: ${intent.status}`);
      
      switch (intent.status) {
        case 'succeeded':
          return 'succeeded';
        case 'canceled':
          return 'cancelled';
        case 'requires_payment_method':
          return intent.last_payment_error ? 'failed' : 'pending';
        default:
          return 'pending';
      }
    } else if (stripeId.startsWith('sub_')) {
      console.log(`[PaymentReconciler] Detected Subscription ID: ${stripeId} for transaction ${tx.id}`);
      const subscription = await stripe.subscriptions.retrieve(stripeId);
      console.log(`[PaymentReconciler] Subscription ${stripeId} status: ${subscription.status}`);

      switch (subscription.status) {
        case 'active':
        case 'trialing':
          return 'succeeded';
        case 'canceled':
        case 'incomplete_expired':
          return 'cancelled';
        case 'past_due':
        case 'unpaid':
          return 'failed';
        case 'incomplete':
        default:
          return 'pending';
      }
    } else {
      console.error(`[PaymentReconciler] Unknown Stripe object type for ID: ${stripeId} (transaction ${tx.id})`);
      return 'not_found';
    }
  } catch (err: any) {
    console.error(`[PaymentReconciler] Error retrieving Stripe object ${stripeId}:`, err.message);
    if (err.type === 'StripeInvalidRequestError' && err.statusCode === 404) {
      return 'not_found';
    }
    throw err;
  }
}

async function lookupRazorpay(tx: any): Promise<ReconcileLookupResult> {
  const orderId: string | null = tx.providerOrderId;
  if (!orderId) return 'not_found';
  const razorpay = await getRazorpay();
  if (!razorpay) throw new Error('Razorpay is not configured');
  const order: any = await razorpay.orders.fetch(orderId);
  switch (order.status) {
    case 'paid':
      return 'succeeded';
    default:
      return 'pending';
  }
}

async function lookupPayPal(tx: any): Promise<ReconcileLookupResult> {
  const subId: string | null = tx.providerTransactionId;
  if (!subId) return 'not_found';
  const token = await getPayPalAccessToken();
  const baseUrl = await getPayPalBaseUrl();
  const res = await axios.get(`${baseUrl}/v1/billing/subscriptions/${subId}`, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: (s: number) => s === 404 || (s >= 200 && s < 300),
  });
  if (res.status === 404) return 'not_found';
  switch (res.data?.status) {
    case 'ACTIVE':
      return 'succeeded';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

async function lookupPaystack(tx: any): Promise<ReconcileLookupResult> {
  const reference: string | null = tx.providerTransactionId;
  if (!reference) return 'not_found';
  const secret = await getPaystackSecretKey();
  const res = await axios.get(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
      validateStatus: (s: number) => s === 404 || (s >= 200 && s < 300),
    },
  );
  if (res.status === 404) return 'not_found';
  const status: string | undefined = res.data?.data?.status;
  switch (status) {
    case 'success':
      return 'succeeded';
    case 'failed':
      return 'failed';
    case 'abandoned':
      return 'cancelled';
    default:
      return 'pending';
  }
}

async function lookupMercadoPago(tx: any): Promise<ReconcileLookupResult> {
  const id: string | null = tx.providerTransactionId;
  if (!id) return 'not_found';
  const token = await getMercadoPagoAccessToken();
  const res = await axios.get(`https://api.mercadopago.com/preapproval/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    validateStatus: (s: number) => s === 404 || (s >= 200 && s < 300),
  });
  if (res.status === 404) return 'not_found';
  switch (res.data?.status) {
    case 'authorized':
      return 'succeeded';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}
