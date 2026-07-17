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

import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import {
  getAllProviders,
  getActiveProviders,
  getProviderById,
  getProviderByKey,
  createProvider,
  updateProvider,
  toggleProviderStatus,
  deleteProvider,
  getCurrencyGatewayMap,
} from "../controllers/payment.providers.controller";

// Transactions Controllers
import {
  getAllTransactions,
  getTransactionById,
  getTransactionsByUserId,
  createTransaction,
  updateTransactionStatus,
  completeTransaction,
  refundTransaction,
  initiatePayment,
  verifyRazorpayPayment,
  verifyStripePayment,
  verifyPayPalPayment,
  verifyPaystackPayment,
  verifyMercadoPagoPayment,
  getPaymentStatus,
  getTransactionStats,
  exportTransactions,
} from "../controllers/transactions.controller";

// Subscriptions Controllers
import {
  getAllSubscriptions,
  getSubscriptionById,
  getSubscriptionsByUserId,
  getActiveSubscriptionByUserId,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  renewSubscription,
  toggleAutoRenew,
  checkExpiredSubscriptions,
  changePlan,
} from "../controllers/subscriptions.controller";
import { requireAuth, requireRole } from "../middlewares/auth.middleware";
import type { Express } from "express";

export function registerPaymentsRoutes(app: Express) {
  // ==================== PAYMENT PROVIDERS ROUTES ====================

  // Read endpoints used by the customer-facing plan upgrade flow must be
  // reachable by every authenticated role (admin, team, etc) — not just
  // superadmin. The controllers strip `config` (API secrets) from the
  // response for non-superadmin callers.
  app.get("/api/payment-providers", requireAuth, getAllProviders);
  app.get("/api/payment-providers/active", requireAuth, getActiveProviders);
  app.get("/api/payment-providers/currency-map", requireAuth, getCurrencyGatewayMap);
  app.get("/api/payment-providers/:id", requireAuth, requireRole("superadmin"), getProviderById);
  app.get("/api/payment-providers/key/:key", requireAuth, requireRole("superadmin"), getProviderByKey);
  app.post("/api/payment-providers", requireAuth, requireRole("superadmin"), createProvider);
  app.put("/api/payment-providers/:id", requireAuth, requireRole("superadmin"), updateProvider);
  app.patch("/api/payment-providers/:id/toggle-status", requireAuth, requireRole("superadmin"), toggleProviderStatus);
  app.delete("/api/payment-providers/:id", requireAuth, requireRole("superadmin"), deleteProvider);

  // ==================== TRANSACTIONS ROUTES ====================

  app.get("/api/transactions", requireAuth, requireRole("superadmin"), getAllTransactions);
  app.get("/api/transactions/stats", requireAuth, requireRole("superadmin"), getTransactionStats);
  app.get("/api/transactions/export", requireAuth, requireRole("superadmin"), exportTransactions);
  app.get("/api/transactions/:id", requireAuth, getTransactionById);
  app.get("/api/transactions/user/:userId", requireAuth, getTransactionsByUserId);
  app.post("/api/transactions", requireAuth, createTransaction);
  app.patch("/api/transactions/:id/status", requireAuth, requireRole("superadmin"), updateTransactionStatus);
  app.post("/api/transactions/:id/complete", requireAuth, requireRole("superadmin"), completeTransaction);
  app.post("/api/transactions/:id/refund", requireAuth, requireRole("superadmin"), refundTransaction);
  app.post("/api/payment/initiate", requireAuth, initiatePayment);
  app.post("/api/payment/verify/razorpay", requireAuth, verifyRazorpayPayment);
  app.post("/api/payment/verify/stripe", requireAuth, verifyStripePayment);
  app.post("/api/payment/verify/paypal", requireAuth, verifyPayPalPayment);
  app.post("/api/payment/verify/paystack", requireAuth, verifyPaystackPayment);
  app.post("/api/payment/verify/mercadopago", requireAuth, verifyMercadoPagoPayment);
  app.get("/api/payment/status/:transactionId", requireAuth, getPaymentStatus);

  // ==================== SUBSCRIPTIONS ROUTES ====================

  app.get("/api/subscriptions", requireAuth, requireRole("superadmin"), getAllSubscriptions);
  app.get("/api/subscriptions/:id", requireAuth, getSubscriptionById);
  app.get("/api/subscriptions/user/:userId", requireAuth, getSubscriptionsByUserId);
  app.get("/api/subscriptions/user/:userId/active", requireAuth, getActiveSubscriptionByUserId);
  app.post("/api/subscriptions", requireAuth, requireRole("superadmin"), createSubscription);
  app.put("/api/subscriptions/:id", requireAuth, requireRole("superadmin"), updateSubscription);
  app.patch("/api/subscriptions/:id/cancel", requireAuth, cancelSubscription);
  app.post("/api/subscriptions/:id/renew", requireAuth, renewSubscription);
  app.patch("/api/subscriptions/:id/auto-renew", requireAuth, toggleAutoRenew);
  app.post("/api/subscriptions/change-plan", requireAuth, changePlan);
  app.post("/api/subscriptions/check-expired", requireAuth, requireRole("superadmin"), checkExpiredSubscriptions);
}
