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

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import Header from "@/components/layout/header";
import { Loading } from "@/components/ui/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MessageChart } from "@/components/charts/message-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  MessageSquare,
  Upload,
  Eye,
  Reply,
  XCircle,
  Download,
  Calendar,
  PlusCircle,
  FileText,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Send,
  AlertCircle,
  Users,
  Target,
  Activity,
  User,
  Database,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { StateDisplay } from "@/components/StateDisplay";
import { useTranslation } from "@/lib/i18n";
type RangePreset = 7 | 30 | 90 | "custom";

function toYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

export default function Analytics() {
  const { t } = useTranslation();
  const [rangePreset, setRangePreset] = useState<RangePreset>(30);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const { user } = useAuth();

  // Resolve effective start/end dates for queries and exports.
  const { effectiveStart, effectiveEnd, rangeIsReady } = useMemo(() => {
    if (rangePreset === "custom") {
      if (customRange?.from && customRange?.to) {
        const start = new Date(customRange.from);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customRange.to);
        end.setHours(23, 59, 59, 999);
        return { effectiveStart: start, effectiveEnd: end, rangeIsReady: true };
      }
      return { effectiveStart: null as Date | null, effectiveEnd: null as Date | null, rangeIsReady: false };
    }
    const end = new Date();
    const start = new Date(Date.now() - (rangePreset as number) * 24 * 60 * 60 * 1000);
    return { effectiveStart: start, effectiveEnd: end, rangeIsReady: true };
  }, [rangePreset, customRange]);

  const startYmd = effectiveStart ? toYmd(effectiveStart) : "";
  const endYmd = effectiveEnd ? toYmd(effectiveEnd) : "";
  // Inclusive ISO timestamps for the API: start-of-day to end-of-day
  // (the server parses these with `new Date(...)`, so a date-only string
  // would otherwise drop everything after 00:00 on the end date).
  const startIso = effectiveStart ? effectiveStart.toISOString() : "";
  const endIso = effectiveEnd ? effectiveEnd.toISOString() : "";
  const rangeDays = effectiveStart && effectiveEnd
    ? Math.max(
        1,
        Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / (24 * 60 * 60 * 1000)),
      )
    : 0;
  const rangeLabel = rangePreset === "custom"
    ? (customRange?.from && customRange?.to
        ? `${format(customRange.from, "MMM d, yyyy")} – ${format(customRange.to, "MMM d, yyyy")}`
        : t("analytics.OverviewTab.pickDates"))
    : `${t("analytics.OverviewTab.last")} ${rangePreset} ${t("analytics.OverviewTab.days")}`;
  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  // Fetch message analytics
  const { data: messageAnalytics, isLoading: messageLoading } = useQuery({
    queryKey: [
      "/api/analytics/messages",
      user?.role === "superadmin" ? null : activeChannel?.id,
      startYmd,
      endYmd,
    ],

    queryFn: async () => {
      const baseParams: Record<string, string> = {
        startDate: startIso,
        endDate: endIso,
      };

      const params = new URLSearchParams(
        user?.role === "superadmin"
          ? baseParams
          : {
              ...baseParams,
              ...(activeChannel?.id && { channelId: activeChannel.id }),
            }
      );

      const response = await apiRequest("GET", `/api/analytics/messages?${params}`);
      return await response.json();
    },

    enabled: rangeIsReady && (user?.role === "superadmin" ? true : !!activeChannel),
  });

  // Fetch campaign analytics
  const { data: campaignAnalytics, isLoading: campaignLoading } = useQuery({
    queryKey: ["/api/analytics/campaigns", user?.role === "superadmin" ? null : activeChannel?.id],
    queryFn: async () => {
      const params = new URLSearchParams(
        user?.role === "superadmin"
          ? {}
          : { ...(activeChannel?.id && { channelId: activeChannel.id }) }
      );
      const response = await apiRequest("GET", `/api/analytics/campaigns?${params}`);
      const data = await response.json();

    // console.log("CHECK RESPONSE JSONNN =>", data);

    return data;
    },
    enabled: user?.role === "superadmin" ? true : !!activeChannel,
  });

  // Handle export functionality
  const handleExport = async (
    format: "pdf" | "excel" | "csv",
    type: "messages" | "campaigns" | "all"
  ) => {
    setExportLoading(true);
    try {
      if (!rangeIsReady) {
        toast({
          title: t("analytics.toasts.pickRange"),
          description: t("analytics.toasts.pickRangeDesc"),
          variant: "destructive",
        });
        setExportLoading(false);
        return;
      }

      const params = new URLSearchParams({
        format,
        type,
        startDate: startIso,
        endDate: endIso,
        ...(activeChannel?.id && { channelId: activeChannel.id }),
      });

      const response = await apiRequest("GET", `/api/analytics/export?${params}`);

      const blob = await response.blob();
      const contentType = response.headers.get("content-type") || "";
      let ext = "pdf";
      if (format === "excel") ext = "xlsx";
      else if (format === "csv") ext = contentType.includes("zip") ? "zip" : "csv";

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whatsway-analytics-${startYmd}_to_${endYmd}.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t("analytics.toasts.exportSuccess"),
        description: t("analytics.toasts.exportSuccessDesc", { format: format.toUpperCase() }),
      });
    } catch (error) {
      toast({
        title: t("analytics.toasts.exportFailed"),
        description: t("analytics.toasts.exportFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Calculate metrics from real data
  const messageMetrics = messageAnalytics?.overall || {};
  const campaignMetrics = campaignAnalytics?.summary || {};

  // Calculate rates — use outbound-only counts, all capped at 100%
  const totalOutbound = Number(messageMetrics.totalOutbound) || 0;
  const totalDelivered = Number(messageMetrics.totalDelivered) || 0;
  const totalRead = Number(messageMetrics.totalRead) || 0;
  const totalReplied = Number(messageMetrics.totalReplied) || 0;
  const totalFailed = Number(messageMetrics.totalFailed) || 0;

  const deliveryRate = totalOutbound > 0
    ? Math.min((totalDelivered / totalOutbound) * 100, 100)
    : 0;

  const readRate = totalDelivered > 0
    ? Math.min((totalRead / totalDelivered) * 100, 100)
    : 0;

  // const replyRate = totalDelivered > 0
  //   ? Math.min((totalReplied / totalDelivered) * 100, 100)
  //   : 0;


  const replyRate = totalOutbound > 0
  ? Math.min((totalReplied / totalOutbound) * 100, 100)
  : 0;

  const failureRate = totalOutbound > 0
    ? Math.min((totalFailed / totalOutbound) * 100, 100)
    : 0;

  // Transform daily stats for chart
  const chartData =
    messageAnalytics?.dailyStats?.map((stat: any) => ({
      date: new Date(stat.date).toLocaleDateString(),
      sent: stat.totalSent || 0,
      delivered: stat.delivered || 0,
      read: stat.read || 0,
      failed: stat.failed || 0,
    })) || [];

  if (messageLoading || campaignLoading) {
    return (
      <div className="flex-1 dots-bg">
        <Header title={t("navigation.analytics")} subtitle={t("analytics.subtitle")} />
        <div className="p-6">
          <Loading size="lg" text={t("common.loading")} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header title={t("analytics.title")} subtitle={t("analytics.subtitle")} />

      <main className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Time Range and Export Controls */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Time Range Selection */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700">
                    {t("analytics.time_range")}:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 7 as const, label: t("dashboard.7Days") },
                    { value: 30 as const, label: t("dashboard.30Days") },
                    { value: 90 as const, label: t("dashboard.3Months") },
                  ]).map((range) => (
                    <Button
                      key={range.value}
                      variant={
                        rangePreset === range.value ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        setRangePreset(range.value);
                        setCustomRange(undefined);
                      }}
                      className={`text-xs sm:text-sm ${
                        rangePreset === range.value
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }`}
                    >
                      {range.label}
                    </Button>
                  ))}
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={rangePreset === "custom" ? "default" : "outline"}
                        size="sm"
                        className={`text-xs sm:text-sm ${
                          rangePreset === "custom"
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        {rangePreset === "custom" && customRange?.from && customRange?.to
                          ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d, yyyy")}`
                          : t("analytics.OverviewTab.custom")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="range"
                        selected={customRange}
                        onSelect={(range) => {
                          setCustomRange(range);
                          setRangePreset("custom");
                          if (range?.from && range?.to) {
                            setDatePopoverOpen(false);
                          }
                        }}
                        numberOfMonths={2}
                        disabled={(date) => date > new Date()}
                        defaultMonth={customRange?.from ?? new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Export Dropdown */}
              <div className="relative w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const dropdown = document.getElementById("export-dropdown");
                    if (dropdown) dropdown.classList.toggle("hidden");
                  }}
                  disabled={exportLoading || !rangeIsReady || user?.username === "demoadmin" || user?.username === "demouser"}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
                  {exportLoading ? t("common.loading") : t("common.export")}
                </Button>
                <div
                  id="export-dropdown"
                  className="hidden absolute right-0 mt-1 w-full sm:w-48 bg-white rounded-md shadow-lg z-10 border"
                >
                  <div className="py-1">
                    <button
                      className="flex items-center px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      disabled={!rangeIsReady}
                      onClick={() => {
                        handleExport("pdf", "all");
                        document
                          .getElementById("export-dropdown")
                          ?.classList.add("hidden");
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {t("analytics.export.pdf")}
                    </button>
                    <button
                      className="flex items-center px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      disabled={!rangeIsReady}
                      onClick={() => {
                        handleExport("excel", "all");
                        document
                          .getElementById("export-dropdown")
                          ?.classList.add("hidden");
                      }}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      {t("analytics.export.excel")}
                    </button>
                    <button
                      className="flex items-center px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                      disabled={!rangeIsReady}
                      onClick={() => {
                        handleExport("csv", "all");
                        document
                          .getElementById("export-dropdown")
                          ?.classList.add("hidden");
                      }}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      {t("analytics.export.csv")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">
              {t("analytics.OverviewTab.title")}
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs sm:text-sm py-2">
              {t("analytics.messageTab.title")}
            </TabsTrigger>
            <TabsTrigger
              value="campaigns"
              className="text-xs sm:text-sm py-2"
            >
              {t("analytics.CampaignsTab.title")}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        {t("analytics.OverviewTab.Total_Messages")}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                        {(messageMetrics.totalMessages || 0).toLocaleString()}
                      </p>

                      <p className="text-xs text-gray-500 mt-1">
                        {rangePreset === "custom"
                          ? rangeLabel
                          : `${t("analytics.OverviewTab.last")} ${rangeDays} ${t("analytics.OverviewTab.days")}`}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0 ml-2">
                      <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        {t("analytics.OverviewTab.Delivery")}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {deliveryRate.toFixed(1)}%
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${deliveryRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg flex-shrink-0 ml-2">
                      <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        {t("analytics.OverviewTab.read_rate")}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-orange-600">
                        {readRate.toFixed(1)}%
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${readRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-2 bg-orange-50 rounded-lg flex-shrink-0 ml-2">
                      <Eye className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        {t("analytics.OverviewTab.reply_rate")}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">
                        {replyRate.toFixed(1)}%
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${replyRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0 ml-2">
                      <Reply className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-600 mb-1">
                        {t("analytics.OverviewTab.Failure_rate")}
                      </p>
                      <p className="text-xl sm:text-2xl font-bold text-red-600">
                        {failureRate.toFixed(1)}%
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-red-500 h-2 rounded-full transition-all"
                          style={{ width: `${failureRate}%` }}
                        />
                      </div>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg flex-shrink-0 ml-2">
                      <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chart and Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
                  <CardTitle className="text-base sm:text-lg">
                    {t("analytics.OverviewTab.Message_Performance") || "Message Performance"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-6 pb-4">
                  {chartData.length > 0 ? (
                    <div className="overflow-x-auto">
                      <MessageChart data={chartData} />
                    </div>
                  ) : (
                    // <div className="h-48 sm:h-64 flex items-center justify-center text-gray-500 text-sm">
                    //   No data available for the selected period
                    // </div>
                    <StateDisplay
                      variant="empty"
                      title={t("analytics.OverviewTab.Message_Performance") || "Message Performance"}
                      icon={Database}
                      description={t("common.noData")}
                    />
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
                  <CardTitle className="text-base sm:text-lg">
                    {t("analytics.OverviewTab.Summary")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">
                      {t("analytics.OverviewTab.Active_Campaigns")}
                    </span>
                    <span className="text-xs sm:text-sm font-medium">
                      {campaignMetrics.activeCampaigns || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">
                      {t("analytics.OverviewTab.Total_Campaigns")}
                    </span>
                    <span className="text-xs sm:text-sm font-medium">
                      {campaignMetrics.totalCampaigns || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">
                      {t("analytics.OverviewTab.Unique_Contacts")}
                    </span>
                    <span className="text-xs sm:text-sm font-medium">
                      {messageMetrics.uniqueContacts || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">
                      {t("analytics.OverviewTab.Total_Recipients")}
                    </span>
                    <span className="text-xs sm:text-sm font-medium">
                      {campaignMetrics.totalRecipients || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4 sm:space-y-6">
            {/* Message Type Distribution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    {t("analytics.messageTab.Outbound_Messages")}
                  </CardTitle>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-xl sm:text-2xl font-bold">
                    {messageAnalytics?.messageTypes?.find(
                      (t: any) => t.direction === "outbound"
                    )?.count || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    {t("analytics.messageTab.Inbound_Messages")}
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-xl sm:text-2xl font-bold">
                    {messageAnalytics?.messageTypes?.find(
                      (t: any) => t.direction === "inbound"
                    )?.count || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                  <CardTitle className="text-xs sm:text-sm font-medium">
                    {t("analytics.messageTab.Average_Response")}
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-xl sm:text-2xl font-bold">
                    {messageAnalytics?.avgResponseTime || "N/A"}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hourly Distribution */}
            <Card>
              <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-base sm:text-lg">
                  {t("analytics.messageActivityByHour")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="space-y-2">
                  {messageAnalytics?.hourlyDistribution?.map((hour: any) => {
                    const maxCount = Math.max(
                      ...(messageAnalytics.hourlyDistribution?.map(
                        (h: any) => h.count
                      ) || [1])
                    );
                    const percentage = (hour.count / maxCount) * 100;
                    return (
                      <div
                        key={hour.hour}
                        className="flex items-center space-x-2"
                      >
                        <span className="text-xs sm:text-sm text-gray-600 w-10 sm:w-12">
                          {hour.hour}:00
                        </span>
                        <div className="flex-1 bg-gray-200 rounded-full h-3 sm:h-4">
                          <div
                            className="bg-blue-500 h-3 sm:h-4 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs sm:text-sm text-gray-700 w-10 sm:w-12 text-right">
                          {hour.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-4 sm:space-y-6">
            {campaignAnalytics?.campaigns?.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 sm:py-12 px-4">
                  <Target className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    {t("analytics.noCampaignsFound")}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {t("analytics.startCreatingCampaigns")}
                  </p>
                  <Link href="/campaigns">
                    <Button className="bg-green-600 hover:bg-green-700 text-sm">
                      <PlusCircle className="w-4 h-4 mr-2" />
                      {t("analytics.createCampaign")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Campaign Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                      <CardTitle className="text-xs sm:text-sm font-medium">
                        {t("analytics.CampaignsTab.Total_Sent")}
                      </CardTitle>
                      <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="text-lg sm:text-2xl font-bold">
                        {campaignMetrics.totalSent || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                      <CardTitle className="text-xs sm:text-sm font-medium">
                        {t("analytics.CampaignsTab.Total_Delivered")}
                      </CardTitle>
                      <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="text-lg sm:text-2xl font-bold">
                        {campaignMetrics.totalDelivered || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                      <CardTitle className="text-xs sm:text-sm font-medium">
                        {t("analytics.CampaignsTab.Total_Read")}
                      </CardTitle>
                      <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="text-lg sm:text-2xl font-bold">
                        {campaignMetrics.totalRead || 0}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
                      <CardTitle className="text-xs sm:text-sm font-medium">
                        {t("analytics.CampaignsTab.Total_Failed")}
                      </CardTitle>
                      <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <div className="text-lg sm:text-2xl font-bold">
                        {campaignMetrics.totalFailed || 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Campaign Performance Table */}
                <Card>
                  <CardHeader className="px-4 sm:px-6 py-3 sm:py-4">
                    <CardTitle className="text-base sm:text-lg">
                      {t("analytics.CampaignsTab.Campaign_Performance")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t("analytics.CampaignsTab.table.campaign")}
                            </th>
                            <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t("analytics.CampaignsTab.table.status")}
                            </th>
                            <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t("analytics.CampaignsTab.table.recipients")}
                            </th>
                            <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                              {t("analytics.CampaignsTab.table.sent")}
                            </th>
                            <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t("analytics.CampaignsTab.table.delivered")}
                            </th>
                            <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                              {t("analytics.CampaignsTab.table.read")}
                            </th>
                            <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t("analytics.CampaignsTab.table.rate")}
                            </th>
                            <th className="text-left px-3 lg:px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t("analytics.CampaignsTab.table.actions")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {campaignAnalytics?.campaigns?.map(
                            (campaign: any) => (
                              <tr
                                key={campaign.id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-3 lg:px-6 py-3 lg:py-4">
                                  <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[150px]">
                                    {campaign.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {campaign.type}
                                  </div>
                                </td>
                                <td className="px-3 lg:px-6 py-3 lg:py-4">
                                  <span
                                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                      campaign.status === "active"
                                        ? "bg-green-100 text-green-800"
                                        : campaign.status === "completed"
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {campaign.status}
                                  </span>
                                </td>
                                <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-900">
                                  {campaign.recipientCount || 0}
                                </td>
                                <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
                                  {campaign.sentCount || 0}
                                </td>
                                <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-900">
                                  {campaign.deliveredCount || 0}
                                </td>
                                <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-900 hidden xl:table-cell">
                                  {campaign.readCount || 0}
                                </td>
                                <td className="px-3 lg:px-6 py-3 lg:py-4 text-xs sm:text-sm text-gray-900">
                                  {(() => {
                                    const sent = Number(campaign.sentCount) || 0;
                                    const delivered = Number(campaign.deliveredCount) || 0;
                                    if (sent === 0) return "0%";
                                    const rate = Math.min((delivered / sent) * 100, 100);
                                    return `${Math.round(rate)}%`;
                                  })()}
                                </td>
                                <td className="px-3 lg:px-6 py-3 lg:py-4">
                                  <Link
                                    href={`/analytics/campaign/${campaign.id}`}
                                  >
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-xs"
                                    >
                                      <Activity className="w-3.5 h-3.5 mr-1" />
                                      <span className="hidden lg:inline">
                                        {t("common.viewDetails")}
                                      </span>
                                      <span className="lg:hidden">{t("common.view")}</span>
                                    </Button>
                                  </Link>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3 p-3">
                      {campaignAnalytics?.campaigns?.map((campaign: any) => (
                        <div
                          key={campaign.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {campaign.name}
                              </h3>
                              <p className="text-xs text-gray-500">
                                {campaign.type}
                              </p>
                            </div>
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ml-2 ${
                                campaign.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : campaign.status === "completed"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {campaign.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs mb-3 pb-3 border-b border-gray-100">
                            <div>
                              <span className="text-gray-500">{t("analytics.CampaignsTab.table.recipients")}:</span>
                              <span className="font-medium ml-1">
                                {campaign.recipientCount || 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">{t("analytics.CampaignsTab.table.sent")}:</span>
                              <span className="font-medium ml-1">
                                {campaign.sentCount || 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">{t("analytics.CampaignsTab.table.delivered")}:</span>
                              <span className="font-medium ml-1">
                                {campaign.deliveredCount || 0}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">{t("analytics.CampaignsTab.table.read")}:</span>
                              <span className="font-medium ml-1">
                                {campaign.readCount || 0}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs">
                              <span className="text-gray-500">
                                {t("analytics.CampaignsTab.table.deliveryRate")}:{" "}
                              </span>
                              <span className="font-semibold text-green-600">
                                {(() => {
                                  const sent = Number(campaign.sentCount) || 0;
                                  const delivered = Number(campaign.deliveredCount) || 0;
                                  if (sent === 0) return "0%";
                                  const rate = Math.min((delivered / sent) * 100, 100);
                                  return `${Math.round(rate)}%`;
                                })()}
                              </span>
                            </div>
                            <Link href={`/analytics/campaign/${campaign.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                              >
                                <Activity className="w-3.5 h-3.5 mr-1" />
                                {t("common.view")}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
