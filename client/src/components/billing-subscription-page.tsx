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

import {
  Crown,
  Calendar,
  Check,
  X,
  ArrowRightLeft,
  XCircle,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import type { PlanData, PlanFeature, PlanPermissions } from "@/types/types";
import { useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const currencySymbolMap: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SGD: "S$",
  AUD: "A$",
  CAD: "C$",
  JPY: "¥",
  CNY: "¥",
  BRL: "R$",
  MXN: "MX$",
  NZD: "NZ$",
  ZAR: "R",
};

type BillingCycle = "monthly" | "quarterly" | "annual";

function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return "$";

  return currencySymbolMap[currency.toUpperCase()] || `${currency} `;
}

function getBillingCycleLabel(cycle?: string | null): string {
  switch (cycle?.toLowerCase()) {
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "annual":
    case "yearly":
      return "Annual";
    default:
      return "Subscription";
  }
}

function getBillingPeriodLabel(cycle?: string | null): string {
  switch (cycle?.toLowerCase()) {
    case "monthly":
      return "month";
    case "quarterly":
      return "3 months";
    case "annual":
    case "yearly":
      return "year";
    default:
      return "billing period";
  }
}

function addBillingPeriod(date: Date, cycle?: string | null): Date {
  const result = new Date(date);

  const monthsToAdd =
    cycle === "monthly"
      ? 1
      : cycle === "quarterly"
        ? 3
        : cycle === "annual" || cycle === "yearly"
          ? 12
          : 0;

  if (!monthsToAdd) return result;

  // Preserve the original day where possible and clamp to the
  // final day of the target month when necessary.
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + monthsToAdd);

  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0,
  ).getDate();

  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return result;
}

function formatDate(date?: string | Date | null): string {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getSubscriptionEndDate(subscription: any): Date | null {
  if (!subscription.startDate) {
    return subscription.endDate ? new Date(subscription.endDate) : null;
  }

  const startDate = new Date(subscription.startDate);

  if (Number.isNaN(startDate.getTime())) {
    return subscription.endDate ? new Date(subscription.endDate) : null;
  }

  // Calculate the expected billing period from the actual cycle.
  // This avoids displaying an incorrect annual end date for
  // quarterly subscriptions returned by the current API.
  return addBillingPeriod(startDate, subscription.billingCycle);
}

function getActualBillingAmount(
  transaction: any,
  planData: Partial<PlanData>,
  currencyCode: string,
  billingCycle: BillingCycle,
): number | null {
  // Transaction amount represents the actual amount charged
  // for the complete billing period.
  if (
    transaction?.amount !== undefined &&
    transaction?.amount !== null &&
    Number.isFinite(Number(transaction.amount))
  ) {
    return Number(transaction.amount);
  }

  // Fallback: use the monthly-equivalent price and multiply
  // by the number of months in the selected billing cycle.
  const multiplier =
    billingCycle === "monthly" ? 1 : billingCycle === "quarterly" ? 3 : 12;

  const multiPrices = planData.multiCurrencyPrices?.[currencyCode];

  const cyclePrice = multiPrices
    ? multiPrices[billingCycle]
    : billingCycle === "monthly"
      ? planData.monthlyPrice
      : billingCycle === "quarterly"
        ? (planData as any).quarterlyPrice
        : planData.annualPrice;

  if (
    cyclePrice === undefined ||
    cyclePrice === null ||
    !Number.isFinite(Number(cyclePrice))
  ) {
    return null;
  }

  return Number((Number(cyclePrice) * multiplier).toFixed(2));
}

export default function BillingSubscriptionPage({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState<string | null>(
    null,
  );

  const handleCancelSubscription = async (subscriptionId: string) => {
    setCancellingId(subscriptionId);

    try {
      const response = await apiRequest(
        "PATCH",
        `/api/subscriptions/${subscriptionId}/cancel`,
        {},
      );

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Subscription Cancelled",
          description:
            data.message ||
            "Your subscription has been cancelled successfully.",
        });

        queryClient.invalidateQueries({
          queryKey: [`api/subscriptions/user/${user?.id}`],
        });
      } else {
        throw new Error(data.message || "Failed to cancel");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
      setShowCancelConfirm(null);
    }
  };

  const {
    data: activeplandata,
    isLoading,
    isError,
  } = useQuery<any>({
    queryKey: [`api/subscriptions/user/${user?.id}`],
    queryFn: () =>
      apiRequest("GET", `api/subscriptions/user/${user?.id}`).then((res) =>
        res.json(),
      ),
    enabled: !!user?.id,
  });

  console.log('active plan data: ', activeplandata);

  if (isLoading) {
    return (
      <div
        className={
          embedded
            ? "flex items-center justify-center p-4"
            : "flex-1 min-h-screen flex items-center justify-center p-4 bg-white text-gray-700"
        }
      >
        <p>{t("billing_subscription.loading")}</p>
      </div>
    );
  }

  return (
    <div className={embedded ? "" : "flex-1 bg-white text-gray-900 dots-bg"}>
      <div className="p-6 pb-0 bg-white border">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <Crown className="w-6 h-6 text-green-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            Active Plan Details
          </h2>
        </div>

        <p className="text-gray-500 text-sm ml-14 pb-2">
          View and manage your current subscription plans
        </p>
      </div>

      <main className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-6">
        {isError ||
        !activeplandata?.success ||
        !Array.isArray(activeplandata.data) ||
        activeplandata.data.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="p-4 bg-gray-100 rounded-full">
              <svg
                className="w-10 h-10 text-gray-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 13h6m-3-3v6m9 1V7a2 2 0 00-2-2h-3.5L14 3H10L8.5 5H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2z"
                />
              </svg>
            </div>

            <h3 className="mt-4 text-lg font-semibold text-gray-800">
              {t("billing_subscription.noSubscription.title")}
            </h3>

            <p className="text-gray-500 text-sm mt-1">
              {t("billing_subscription.noSubscription.description")}
            </p>

            <button
              className="mt-6 px-5 py-2.5 text-sm font-medium bg-green-700 text-white rounded-xl hover:bg-green-800"
              onClick={() => setLocation("/plan-upgrade")}
            >
              {t("billing_subscription.noSubscription.upgradePlan")}
            </button>
          </div>
        ) : (
          activeplandata.data.map((item: any) => {
            const subscription = item?.subscription;

            if (!subscription) return null;

            const transaction = item?.transaction;
            const planData: Partial<PlanData> = subscription.planData ?? {};

            const billingCycle = (
              subscription.billingCycle || "monthly"
            ).toLowerCase() as BillingCycle;

            const cycleLabel = getBillingCycleLabel(billingCycle);
            const billingPeriodLabel = getBillingPeriodLabel(billingCycle);

            const currencyCode = (
              transaction?.currency ||
              subscription.currency ||
              "USD"
            ).toUpperCase();

            const currentCurrencySymbol = getCurrencySymbol(currencyCode);

            const actualBillingAmount = getActualBillingAmount(
              transaction,
              planData,
              currencyCode,
              billingCycle,
            );

            const formattedAmount =
              actualBillingAmount !== null
                ? actualBillingAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "-";

            const planFeatures: PlanFeature[] = Array.isArray(planData.features)
              ? planData.features
              : [];

            const planPermissions: PlanPermissions | null =
              planData.permissions && typeof planData.permissions === "object"
                ? planData.permissions
                : null;

            const startDate = formatDate(subscription.startDate);

            const billingEndDate = getSubscriptionEndDate(subscription);
            const renewsDate = billingEndDate
              ? formatDate(billingEndDate)
              : formatDate(subscription.endDate);

            const isCancellationScheduled =
              subscription.gatewayStatus === "cancel_at_period_end" ||
              subscription.autoRenew === false;

            const isActive = subscription.status === "active";

            const canCancel =
              isActive &&
              !isCancellationScheduled &&
              subscription.autoRenew !== false;

            const statusLabel = isCancellationScheduled
              ? "Cancels on " + renewsDate
              : subscription.status;

            return (
              <div
                key={subscription.id}
                className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full max-w-sm"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 relative">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Crown className="w-5 h-5 text-yellow-300 flex-shrink-0" />

                      <h2 className="text-lg font-bold truncate">
                        {planData.name || "Subscription"}
                      </h2>
                    </div>

                    <span
                      className={`backdrop-blur-sm text-xs font-semibold rounded-full px-2.5 py-1 capitalize whitespace-nowrap ${
                        isCancellationScheduled
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-white/20 text-white"
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  <p className="text-green-100 text-xs line-clamp-2">
                    {planData.description || ""}
                  </p>
                </div>

                {/* Body */}
                <div className="p-4 flex-grow flex flex-col space-y-4">
                  {/* Billing Information */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <Calendar className="w-3.5 h-3.5 text-blue-600 mx-auto mb-1" />

                      <p className="text-gray-500 text-[10px] mb-0.5">
                        {t("billing_subscription.card.billing")}
                      </p>

                      <p className="font-semibold text-gray-800 truncate">
                        {cycleLabel}
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <Calendar className="w-3.5 h-3.5 text-green-600 mx-auto mb-1" />

                      <p className="text-gray-500 text-[10px] mb-0.5">
                        {t("billing_subscription.card.starts")}
                      </p>

                      <p className="font-semibold text-gray-800 text-[10px]">
                        {startDate}
                      </p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-2 text-center">
                      <Calendar className="w-3.5 h-3.5 text-purple-600 mx-auto mb-1" />

                      <p className="text-gray-500 text-[10px] mb-0.5">
                        {isCancellationScheduled ? "Ends" : "Next billing"}
                      </p>

                      <p className="font-semibold text-gray-800 text-[10px]">
                        {renewsDate}
                      </p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("billing_subscription.card.pricing")}
                      </span>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 uppercase">
                        {cycleLabel}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 flex-wrap">
                      <span className="text-2xl font-bold text-gray-900">
                        {currentCurrencySymbol}
                        {formattedAmount}
                      </span>

                      <span className="text-gray-500 text-xs font-medium">
                        / {billingPeriodLabel}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 mt-1">
                      {isCancellationScheduled
                        ? "Your subscription will remain active until this billing period ends."
                        : subscription.autoRenew === false
                          ? "Automatic renewal is disabled."
                          : `Billed every ${billingPeriodLabel}.`}
                    </p>
                  </div>

                  {/* Permissions */}
                  {planPermissions && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-700 mb-2">
                        {t("billing_subscription.card.details")}
                      </h3>

                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(planPermissions).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center gap-1 text-[10px] bg-gray-100 rounded-md px-2 py-1"
                          >
                            <Check className="w-3 h-3 text-green-600" />

                            <span className="text-gray-700 capitalize">
                              {value} {key}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <div className="flex-grow">
                    <h3 className="text-xs font-semibold text-gray-700 mb-2">
                      {t("billing_subscription.card.features")}
                    </h3>

                    <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                      {planFeatures.map(
                        (feature: PlanFeature | string, idx: number) => {
                          const featureName =
                            typeof feature === "string"
                              ? feature
                              : (feature?.name ?? "");

                          const featureIncluded =
                            typeof feature === "string"
                              ? true
                              : feature?.included !== false;

                          return (
                            <li
                              key={idx}
                              className={`flex items-start gap-1.5 text-xs ${
                                featureIncluded
                                  ? "text-gray-700"
                                  : "text-gray-400 line-through"
                              }`}
                            >
                              {featureIncluded ? (
                                <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                              )}

                              <span className="leading-tight">
                                {featureName}
                              </span>
                            </li>
                          );
                        },
                      )}
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                {isActive && (
                  <div className="p-4 pt-2 space-y-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setLocation("/plan-upgrade")}
                    >
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Change Plan
                    </Button>

                    {showCancelConfirm === subscription.id ? (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                        <p className="text-xs text-red-700 font-medium">
                          Are you sure you want to cancel? Your plan will remain
                          active until {renewsDate}, after which it will not
                          renew.
                        </p>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            disabled={cancellingId === subscription.id}
                            onClick={() =>
                              handleCancelSubscription(subscription.id)
                            }
                          >
                            {cancellingId === subscription.id
                              ? "Cancelling..."
                              : "Yes, Cancel"}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => setShowCancelConfirm(null)}
                          >
                            Keep Plan
                          </Button>
                        </div>
                      </div>
                    ) : canCancel ? (
                      <Button
                        variant="ghost"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setShowCancelConfirm(subscription.id)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    ) : isCancellationScheduled ? (
                      <p className="text-center text-xs text-yellow-700 bg-yellow-50 rounded-lg p-2">
                        Cancellation scheduled. Your plan remains active until{" "}
                        {renewsDate}.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* Custom Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
