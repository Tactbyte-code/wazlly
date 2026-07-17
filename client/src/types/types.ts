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

export interface PlanPermissions {
  channel: string;
  contacts: string;
  automation: string;
  campaign?: string;
  apiRequestsPerMonth?: string;
  apiRateLimitPerMinute?: string;
}
export interface Feature {
  name: string;
  included: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  icon: string;
  popular: boolean;
  badge: string;
  color: string;
  buttonColor: string;
  monthlyPrice: string;
  annualPrice: string;
  multiCurrencyPrices?: Record<string, { monthly: string; annual: string }>;
  permissions: PlanPermissions;
  features: Feature[];
  createdAt: string;
  updatedAt: string;
}

export interface PlansDataTypes {
  success: boolean;
  data: Plan[];
}

// Payment

export interface PaymentConfig {
  apiKey: string;
  apiSecret: string;
  apiKeyTest: string;
  apiSecretTest: string;
  isLive: boolean;
  webhookSecret?: string;
  webhookSecretTest?: string;
  webhookId?: string;
  webhookIdTest?: string;
}

export interface PaymentProvider {
  id: string;
  name: string;
  providerKey: string;
  description: string;
  logo: string;
  isActive: boolean;
  // Mode flag exposed to all roles by the sanitized response so the
  // checkout UI can render the correct Live/Test badge. The full
  // `config` object (with API keys) is only present for superadmin.
  isLive?: boolean;
  config?: PaymentConfig;
  supportedCurrencies: string[];
  supportedMethods: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProvidersResponse {
  success: boolean;
  data: PaymentProvider[];
}

// payment  PaymentInitiationData

export interface PaymentInitiationData {
  transactionId: string;
  provider: string; // e.g. "stripe" or "razorpay"
  amount: number;
  currency: string;
  orderId: string | null;
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string;
}

export interface PaymentInitiationResponse {
  success: boolean;
  message: string;
  data: PaymentInitiationData;
}

// *******************************
export interface SubscriptionResponse {
  success: boolean;
  data: SubscriptionData[];
}

export interface SubscriptionData {
  subscription: Subscription;
  user: SubscriptionUser;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  planData: PlanData;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  startDate: string; // ISO string
  endDate: string | null; // if free trials or cancelled
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus =
  | "active"
  | "inactive"
  | "expired"
  | "cancelled";
export type BillingCycle = "monthly" | "yearly" | "annual";

export interface PlanData {
  name: string;
  features: PlanFeature[];
  annualPrice: string;
  description: string;
  permissions: PlanPermissions;
  monthlyPrice: string;
  multiCurrencyPrices?: Record<string, { monthly: string; annual: string }>;
}

export interface PlanFeature {
  name: string;
  included: boolean;
}

export interface SubscriptionUser {
  id: string;
  username: string;
}

// **********************

export interface DashboardStats {
  // Contact Stats
  totalContacts: number | string;
  todayContacts: number | string;
  weekContacts: number | string;
  lastWeekContacts: number | string;

  // Templates & Channels
  totalTemplates: number;
  totalChannels: number;

  // Message Stats
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  messagesRead: number;
  totalMessages: number;
  todayMessages: number;
  thisMonthMessages: number;
  lastMonthMessages: number;

  // Extra from API #1
  totalTeamMembers?: number;

  // Extra from API #2
  totalCampaigns?: number;
  totalUsers?: number;
  totalActiveUsers?: number;
  totalBlockedUsers?: number;
  todaySignups?: number;
  totalPaidUsers?: number;
}

export interface AppSettings {
  title: string;
  tagline: string;
  currency: string;
  country: string;
  logo: string | null;
  logo2: string | null;
  favicon: string | null;
  updatedAt: string;
  supportEmail: string;
}

export interface CountryCurrency {
  country: string;
  country_code: string;
  currency: string;
  currency_code: string;
  symbol: string;
}

export interface TeamUserResponse {
  data: TeamUser[];
  total: string; // If you want number, change to: number
  page: number;
  limit: number;
  totalPages: number;
}

export interface TeamUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string; // you can make it a union type if needed
  status: string; // (e.g. "active" | "inactive")
  permissions: string[]; // array of permission strings
  avatar: string | null;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
