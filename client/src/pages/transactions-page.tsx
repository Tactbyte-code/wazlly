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

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  Search,
  Filter,
  Download,
  DollarSign,
  ArrowUpFromLine,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Ban,
  ChevronLeft,
  ChevronRight,
  X,
  Wallet,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/formatDate";
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import {isDemoUser, maskValue} from "@/utils/maskUtils"

function TransactionsPage() {
  const { t } = useTranslation();
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    paymentMethod: "",
    billingCycle: "",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
    page: 1,
    limit: 20,
  });

  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();

  // ==================== API CALLS ====================

  // 🔹 Fetch Transactions
  const {
    data: transactionData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== "" && v !== undefined)
      );
      const { data } = await axios.get("/api/transactions", { params });
      return data;
    },
    keepPreviousData: true,
  });

  // 🔹 Fetch Transaction Stats
  const { data: statsData } = useQuery({
    queryKey: ["transactionStats"],
    queryFn: async () => {
      const { data } = await axios.get("/api/transactions/stats");
      return data;
    },
  });

  const transactions = transactionData?.data || [];
  const stats = statsData?.data || {
    totalRevenue: 0,
    statusCounts: [],
  };

  const totalPages = transactionData?.pagination?.totalPages || 1;
  const totalCount = transactionData?.pagination?.totalCount || 0;

  // ==================== HANDLERS ====================

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "",
      paymentMethod: "",
      billingCycle: "",
      startDate: "",
      endDate: "",
      minAmount: "",
      maxAmount: "",
      page: 1,
      limit: 20,
    });
  };

  const handleExport = async () => {
    try {
      const response = await axios.get("/api/transactions/export", {
        params: filters,
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${new Date().toISOString()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "refunded":
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case "cancelled":
        return <Ban className="w-4 h-4 text-gray-500" />;
      case "expired":
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
      refunded: "bg-blue-100 text-blue-800",
      cancelled: "bg-gray-100 text-gray-800",
      expired: "bg-orange-100 text-orange-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          colors[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {t(`transactions.status.${status}`)}
      </span>
    );
  };

  // ==================== UI ====================

  return (
    <div className="min-h-screen bg-gray-50 dots-bg">
      {/* Header */}
      <Header
        title={t("transactions.title")}
        subtitle={t("transactions.subtitle")}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">
                  {t("transactions.stats.totalRevenue")}
                </p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          {["completed", "pending", "failed"].map((status) => {
            const stat = stats.statusCounts.find(
              (s: any) => s.status === status
            );
            const color =
              status === "completed"
                ? "blue"
                : status === "pending"
                ? "yellow"
                : "red";
            const Icon =
              status === "completed"
                ? CheckCircle
                : status === "pending"
                ? Clock
                : XCircle;

            return (
              <div
                key={status}
                className="bg-white rounded-lg shadow p-4 sm:p-6 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 capitalize">
                    {t(`transactions.stats.${status}`)}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {stat?.count || 0}
                  </p>
                </div>
                <div
                  className={`p-2 sm:p-3 rounded-full ${
                    color === "blue"
                      ? "bg-blue-100"
                      : color === "yellow"
                      ? "bg-yellow-100"
                      : "bg-red-100"
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      color === "blue"
                        ? "text-blue-600"
                        : color === "yellow"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                <input
                  type="text"
                  placeholder={t("transactions.search.placeholder")}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                />
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">
                  {t("transactions.search.filters")}
                </span>
                {Object.values(filters).filter((v) => v && v !== 1 && v !== 20)
                  .length > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {
                      Object.values(filters).filter(
                        (v) => v && v !== 1 && v !== 20
                      ).length
                    }
                  </span>
                )}
              </button>

              {/* Export */}
              <button
  onClick={handleExport}
  disabled={isDemoUser(user?.username)}
  className={`px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base 
    bg-blue-500 text-white rounded-lg flex items-center justify-center gap-2
    ${isDemoUser(user?.username) ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"}`}
>
  
  <ArrowUpFromLine className="w-4 h-4 sm:w-5 sm:h-5" />

  <span className="hidden sm:inline">
    {t("transactions.search.export")}
  </span>
</button>

            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Status */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {t("transactions.filters.status")}
                  </label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) =>
                      handleFilterChange("status", value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue
                        placeholder={t("transactions.filters.allStatuses")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("transactions.filters.allStatuses")}
                      </SelectItem>
                      <SelectItem value="pending">
                        {t("transactions.filters.statusOptions.pending")}
                      </SelectItem>
                      <SelectItem value="completed">
                        {t("transactions.filters.statusOptions.completed")}
                      </SelectItem>
                      <SelectItem value="failed">
                        {t("transactions.filters.statusOptions.failed")}
                      </SelectItem>
                      <SelectItem value="refunded">
                        {t("transactions.filters.statusOptions.refunded")}
                      </SelectItem>
                      <SelectItem value="cancelled">
                        {t("transactions.filters.statusOptions.cancelled")}
                      </SelectItem>
                      <SelectItem value="expired">
                        {t("transactions.filters.statusOptions.expired")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {t("transactions.filters.paymentMethod")}
                  </label>
                  <Select
                    value={filters.paymentMethod || "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "paymentMethod",
                        value === "all" ? "" : value
                      )
                    }
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue
                        placeholder={t("transactions.filters.allMethods")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("transactions.filters.allMethods")}
                      </SelectItem>
                      <SelectItem value="card">
                        {t("transactions.filters.paymentOptions.card")}
                      </SelectItem>
                      <SelectItem value="upi">
                        {t("transactions.filters.paymentOptions.upi")}
                      </SelectItem>
                      <SelectItem value="wallet">
                        {t("transactions.filters.paymentOptions.wallet")}
                      </SelectItem>
                      <SelectItem value="netbanking">
                        {t("transactions.filters.paymentOptions.netbanking")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Billing Cycle */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {t("transactions.filters.billingCycle")}
                  </label>
                  <Select
                    value={filters.billingCycle || "all"}
                    onValueChange={(value) =>
                      handleFilterChange(
                        "billingCycle",
                        value === "all" ? "" : value
                      )
                    }
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue
                        placeholder={t("transactions.filters.allCycles")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("transactions.filters.allCycles")}
                      </SelectItem>
                      <SelectItem value="monthly">
                        {t("transactions.filters.cycleOptions.monthly")}
                      </SelectItem>
                      <SelectItem value="annual">
                        {t("transactions.filters.cycleOptions.annual")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {t("transactions.filters.startDate")}
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={filters.startDate}
                    onChange={(e) =>
                      handleFilterChange("startDate", e.target.value)
                    }
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {t("transactions.filters.endDate")}
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={filters.endDate}
                    onChange={(e) =>
                      handleFilterChange("endDate", e.target.value)
                    }
                  />
                </div>

                {/* Min Amount */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {t("transactions.filters.minAmount")}
                  </label>
                  <input
                    type="number"
                    placeholder={t("transactions.filters.minAmountPlaceholder")}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={filters.minAmount}
                    onChange={(e) =>
                      handleFilterChange("minAmount", e.target.value)
                    }
                  />
                </div>

                {/* Max Amount */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    {t("transactions.filters.maxAmount")}
                  </label>
                  <input
                    type="number"
                    placeholder={t("transactions.filters.maxAmountPlaceholder")}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={filters.maxAmount}
                    onChange={(e) =>
                      handleFilterChange("maxAmount", e.target.value)
                    }
                  />
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    {t("transactions.filters.clearFilters")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-500 mt-4">
                {t("transactions.loading")}
              </p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                {t("transactions.empty.title")}
              </h3>
              <p className="text-sm text-gray-600">
                {t("transactions.empty.description")}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop & Tablet Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("transactions.table.transactionId")}
                      </th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("transactions.table.user")}
                      </th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("transactions.table.plan")}
                      </th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("transactions.table.amount")}
                      </th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("transactions.table.status")}
                      </th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        {t("transactions.table.paymentBy")}
                      </th>
                      <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("transactions.table.date")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((item: any) => (
                      <tr
                        key={item.transaction.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {item.transaction.providerTransactionId}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.transaction.providerOrderId}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900 max-w-[150px] truncate">
                            {isDemoUser(user?.username) ? maskValue(item.user?.email || "") : item.user?.email}

                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm text-gray-900">
                            {item.plan?.name}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {item.transaction.billingCycle}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <div className="text-xs sm:text-sm font-medium text-gray-900">
                            {item.transaction.currency}{" "}
                            {Number(item.transaction.amount).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.transaction.status)}
                            {getStatusBadge(item.transaction.status)}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap hidden lg:table-cell">
                          <div className="text-sm text-gray-900 capitalize">
                            {item.provider.name}
                          </div>
                        </td>
                        <td className="px-3 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                          {formatDateTime(item.transaction.createdAt)}

                           {/* {item.transaction.createdAt} */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-3">
                {transactions.map((item: any) => (
                  <div
                    key={item.transaction.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono text-gray-900 font-medium truncate">
                          {item.transaction.providerTransactionId}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {item.transaction.providerOrderId}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {getStatusIcon(item.transaction.status)}
                        {getStatusBadge(item.transaction.status)}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm border-t border-gray-100 pt-3">
                      <div className="flex justify-between items-start">
                        <span className="text-gray-500 text-xs">
                          {t("transactions.card.user")}
                        </span>
                        <span className="text-gray-900 text-xs font-medium text-right truncate ml-2 max-w-[60%]">
                          {item.user?.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">
                          {t("transactions.card.plan")}
                        </span>
                        <span className="text-gray-900 text-xs font-medium">
                          {item.plan?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">
                          {t("transactions.card.cycle")}
                        </span>
                        <span className="text-gray-900 text-xs capitalize">
                          {item.transaction.billingCycle}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">
                          {t("transactions.card.amount")}
                        </span>
                        <span className="text-gray-900 text-xs font-bold">
                          {item.transaction.currency}{" "}
                          {Number(item.transaction.amount).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">
                          {t("transactions.card.payment")}
                        </span>
                        <span className="text-gray-900 text-xs capitalize">
                          {item.provider.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 text-xs">
                          {t("transactions.card.date")}
                        </span>
                        <span className="text-gray-900 text-xs">
                          {formatDateTime(item.transaction.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full sm:w-auto">
                    <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                      {t("transactions.pagination.showing")}{" "}
                      <span className="font-medium">
                        {(filters.page - 1) * filters.limit + 1}
                      </span>{" "}
                      {t("transactions.pagination.to")}{" "}
                      <span className="font-medium">
                        {Math.min(filters.page * filters.limit, totalCount)}
                      </span>{" "}
                      {t("transactions.pagination.of")}{" "}
                      <span className="font-medium">{totalCount}</span>
                    </div>

                    <select
                      value={filters.limit}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          limit: Number(e.target.value),
                          page: 1,
                        }))
                      }
                      className="border border-gray-300 rounded-md px-2 py-1 text-xs sm:text-sm"
                    >
                      {[10, 20, 50, 100, 500].map((val) => (
                        <option key={val} value={val}>
                          {val}
                          {t("transactions.pagination.perPage")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          page: Math.max(1, prev.page - 1),
                        }))
                      }
                      disabled={filters.page === 1}
                      className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 flex items-center gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">
                        {t("transactions.pagination.previous")}
                      </span>
                    </button>

                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        placeholder={String(filters.page)}
                        className="w-14 sm:w-16 text-center border rounded-md px-2 py-1 text-xs sm:text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const value = Number(
                              (e.target as HTMLInputElement).value
                            );
                            if (value >= 1 && value <= totalPages) {
                              setFilters((prev) => ({ ...prev, page: value }));
                            }
                          }
                        }}
                      />
                      <span className="text-xs sm:text-sm text-gray-600">
                        / {totalPages}
                      </span>
                    </div>

                    <button
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          page: Math.min(totalPages, prev.page + 1),
                        }))
                      }
                      disabled={filters.page >= totalPages}
                      className="px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">
                        {t("transactions.pagination.next")}
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TransactionsPage;
