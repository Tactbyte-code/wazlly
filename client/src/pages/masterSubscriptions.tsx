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

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";

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
  ZAR: "R",
};

function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return "$";
  return currencySymbolMap[currency.toUpperCase()] || currency + " ";
}

// ------------------- TYPES -------------------
interface MasterSubscription {
  id: string;
  userId: string;
  planId: string;
  planData: {
    icon: string;
    name: string;
    features: { name: string; included: boolean }[];
    annualPrice: string;
    monthlyPrice: string;
    description: string;
  };
  status: string;
  billingCycle: "monthly" | "annual";
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  currency?: string | null;
  gatewayProvider?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  username: string;
}

interface Plan {
  id: string;
  name: string;
  description: string;
  icon: string;
  monthlyPrice: string;
  annualPrice: string;
  features: { name: string; included: boolean }[];
  permissions: {
    channel: string;
    contacts: string;
    automation: string;
  };
}

interface SubscriptionResponse {
  success: boolean;
  data: Array<{
    subscription: MasterSubscription;
    user: User;
    plan: Plan;
    transaction?: any;
  }>;
  pagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

// ------------------- COMPONENT -------------------
export default function AllSubscriptionsPage() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { data, isLoading, isError, error } = useQuery<SubscriptionResponse>({
    queryKey: ["subscriptions", currentPage, limit],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/subscriptions?page=${currentPage}&limit=${limit}`
      );
      const json = await res.json();
      return json;
    },
    keepPreviousData: true,
  });

  const subscriptions = data?.data ?? [];
  const page = data?.pagination?.page ?? currentPage;
  const totalPages = data?.pagination?.totalPages ?? 1;
  const total = data?.pagination?.total ?? 0;

  // Handle limit change
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5;

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (page <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = page - 1; i <= page + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // ------------------- LOADING -------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mb-3" />
          <p className="text-gray-600">{t("subscriptions.loading")}</p>
        </div>
      </div>
    );
  }

  // ------------------- ERROR -------------------
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-600 font-medium mb-2">
            {t("subscriptions.error.title")}
          </p>
          <p className="text-red-500 text-sm">
            {(error as Error)?.message || t("subscriptions.error.message")}
          </p>
        </div>
      </div>
    );
  }

  // ------------------- RENDER -------------------
  return (
    <div className="min-h-screen bg-gray-50 dots-bg">
      <Header
        title={t("subscriptions.title")}
        subtitle={t("subscriptions.subtitle")}
      />
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t("subscriptions.allSubscriptions")}
          </h1>
          <p className="text-gray-600 mt-1">
            {t("subscriptions.totalSubscriptions")} {total}{" "}
            {total !== 1
              ? t("subscriptions.subscriptions")
              : t("subscriptions.subscription")}
          </p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                  {t("subscriptions.table.username")}
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                  {t("subscriptions.table.plan")}
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                  {t("subscriptions.table.price")}
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                  {t("subscriptions.table.status")}
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                  {t("subscriptions.table.startDate")}
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                  {t("subscriptions.table.endDate")}
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                  {t("subscriptions.table.autoRenew")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {subscriptions.map(({ subscription, user, plan, transaction }) => (
                <tr
                  key={subscription.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {user?.username ?? "N/A"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900">
                    {plan.name}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                    {getCurrencySymbol(
                      transaction?.currency || subscription.currency
                    )}
                    {transaction?.amount
                      ? Number(transaction.amount).toFixed(2)
                      : subscription.billingCycle === "monthly"
                      ? Number(subscription.planData?.monthlyPrice ?? plan?.monthlyPrice ?? 0).toFixed(2)
                      : Number(subscription.planData?.annualPrice ?? plan?.annualPrice ?? 0).toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        subscription.status === "active"
                          ? "bg-green-100 text-green-700"
                          : subscription.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : subscription.status === "cancelled"
                          ? "bg-gray-100 text-gray-700"
                          : subscription.status === "expired"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {subscription.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(subscription.startDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {new Date(subscription.endDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    <span
                      className={`${
                        subscription.autoRenew
                          ? "text-green-600 font-medium"
                          : "text-gray-500"
                      }`}
                    >
                      {subscription.autoRenew
                        ? t("subscriptions.table.yes")
                        : t("subscriptions.table.no")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden space-y-4">
          {subscriptions.map(({ subscription, user, plan, transaction }) => (
            <div
              key={subscription.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {user?.username ?? "N/A"}
                  </h3>
                  <p className="text-sm text-gray-600">{plan.name}</p>
                </div>
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    subscription.status === "active"
                      ? "bg-green-100 text-green-700"
                      : subscription.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {subscription.status}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t("subscriptions.card.price")}
                  </span>
                  <span className="font-medium text-gray-900">
                    {getCurrencySymbol(
                      transaction?.currency || subscription.currency
                    )}
                    {transaction?.amount
                      ? Number(transaction.amount).toFixed(2)
                      : subscription.billingCycle === "monthly"
                      ? Number(subscription.planData?.monthlyPrice ?? plan?.monthlyPrice ?? 0).toFixed(2)
                      : Number(subscription.planData?.annualPrice ?? plan?.annualPrice ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t("subscriptions.card.startDate")}
                  </span>
                  <span className="text-gray-900">
                    {new Date(subscription.startDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t("subscriptions.card.endDate")}
                  </span>
                  <span className="text-gray-900">
                    {new Date(subscription.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {t("subscriptions.card.autoRenew")}
                  </span>
                  <span
                    className={`${
                      subscription.autoRenew
                        ? "text-green-600 font-medium"
                        : "text-gray-500"
                    }`}
                  >
                    {subscription.autoRenew
                      ? t("subscriptions.table.yes")
                      : t("subscriptions.table.no")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Section */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          {/* Desktop Pagination */}
          <div className="hidden md:flex items-center justify-between">
            {/* Left: Showing info */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {t("subscriptions.pagination.showing")}{" "}
                <span className="font-semibold text-gray-900">
                  {(page - 1) * limit + 1}
                </span>{" "}
                {t("subscriptions.pagination.to")}{" "}
                <span className="font-semibold text-gray-900">
                  {Math.min(page * limit, total)}
                </span>{" "}
                {t("subscriptions.pagination.of")}{" "}
                <span className="font-semibold text-gray-900">{total}</span>
              </div>

              {/* Page size dropdown */}
              <select
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} {t("subscriptions.pagination.perPage")}
                  </option>
                ))}
              </select>
            </div>

            {/* Right: Page buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("subscriptions.pagination.previous")}
              </button>

              {getPageNumbers().map((pageNum, idx) =>
                pageNum === "..." ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-3 py-2 text-gray-500"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum as number)}
                    className={`px-3 py-2 text-sm border rounded-md transition-colors ${
                      pageNum === page
                        ? "bg-green-600 text-white border-green-600"
                        : "bg-white border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              )}

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t("subscriptions.pagination.next")}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Pagination */}
          <div className="md:hidden space-y-4">
            {/* Info and Dropdown */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">
                  {(page - 1) * limit + 1}
                </span>{" "}
                -{" "}
                <span className="font-semibold text-gray-900">
                  {Math.min(page * limit, total)}
                </span>{" "}
                {t("subscriptions.pagination.of")}{" "}
                <span className="font-semibold text-gray-900">{total}</span>
              </div>

              <select
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white shadow-sm w-full sm:w-auto"
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
              >
                {[10, 20, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} {t("subscriptions.pagination.perPage")}
                  </option>
                ))}
              </select>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                {t("subscriptions.pagination.previous")}
              </button>

              <div className="flex items-center gap-1 px-3 py-2 bg-green-100 rounded-md">
                <span className="text-sm font-medium text-green-700">
                  {t("subscriptions.pagination.page")} {page}{" "}
                  {t("subscriptions.pagination.pageOf")} {totalPages}
                </span>
              </div>

              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page === totalPages}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("subscriptions.pagination.next")}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
