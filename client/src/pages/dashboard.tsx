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

import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Loading } from "@/components/ui/loading";
import { MessageChart } from "@/components/charts/message-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Megaphone,
  CheckCircle,
  Users,
  TrendingUp,
  Clock,
  Activity,
  Zap,
  Upload,
  FileText,
  BarChart3,
  ExternalLink,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Eye,
  Target,
  LayoutGrid,
} from "lucide-react";
import { useDashboardStats, useAnalytics } from "@/hooks/use-dashboard";
import { useTranslation } from "@/lib/i18n";
import { useState } from "react";
import { User, LogOut, LogIn, Edit, PlusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { DashboardStarApiDataType } from "./types/type";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import AdminStats from "@/components/AdminStats";

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const isAdmin = user?.role === "superadmin";

  const { data: activityLogs = [], isLoading } = useQuery({
    queryKey: ["/api/team/activity-logs"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/team/activity-logs");
      return await response.json();
    },
  });




  // console.log("activity logs response ", activityLogs);

  const [timeRange, setTimeRange] = useState<number>(30);

  // Fetch campaign analytics
  const { data: campaignAnalytics, isLoading: campaignLoading } = useQuery({
    queryKey: ["/api/analytics/campaigns", activeChannel?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(activeChannel?.id && { channelId: activeChannel.id }),
      });
      const response = await apiRequest("GET", `/api/analytics/campaigns?${params}`);
      return await response.json();
    },
    enabled: !!activeChannel,
  });

  const { data: stats, isLoading: statsLoading } = useDashboardStats(
    activeChannel?.id
  );
  // const { data: analytics, isLoading: analyticsLoading } = useAnalytics(7, activeChannel?.id);

  // Fetch message analytics
  const { data: messageAnalytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ["/api/analytics/messages", activeChannel?.id, timeRange],

    queryFn: async () => {
      const params = new URLSearchParams({
        days: timeRange.toString(),
        ...(user?.role !== "superadmin" && activeChannel?.id && {
          channelId: activeChannel.id,
        }),
      });

      const response = await apiRequest("GET", `/api/analytics/messages?${params}`);
      return await response.json();
    },

    enabled:
      user?.role === "superadmin"
        ? true
        : !!activeChannel?.id,
  });


  // console.log("this is stats ", stats);

  if (statsLoading) {
    return (
      <div className="flex-1 dots-bg">
        <Header title={t("dashboard.title")} subtitle={t("dashboard.loadingData")} />
        <div className="p-6">
          <Loading size="lg" text={t("dashboard.loadingDashboard")} />
        </div>
      </div>
    );
  }

  // const chartData = analytics || [];
  const chartData =
    messageAnalytics?.dailyStats?.map((stat: any) => ({
      date: new Date(stat.date).toLocaleDateString(),
      sent: stat.totalSent || 0,
      delivered: stat.delivered || 0,
      read: stat.read || 0,
      failed: stat.failed || 0,
    })) || [];

  const messageMetrics = messageAnalytics?.overall || {};

  // Calculate rates — use outbound-only counts, capped at 100%
  const totalOutbound = Number(messageMetrics.totalOutbound) || 0;
  const deliveryRate =
    totalOutbound > 0
      ? Math.min(((messageMetrics.totalDelivered || 0) / totalOutbound) * 100, 100)
      : 0;

  const getActivityMeta = (action: string) => {
    switch (action) {
      case "login":
        return {
          icon: <LogIn className="w-4 h-4 text-green-600" />,
          color: "bg-green-100",
          label: t("dashboard.activity.login"),
        };
      case "logout":
        return {
          icon: <LogOut className="w-4 h-4 text-gray-600" />,
          color: "bg-gray-100",
          label: t("dashboard.activity.logout"),
        };
      case "user_created":
        return {
          icon: <PlusCircle className="w-4 h-4 text-blue-600" />,
          color: "bg-blue-100",
          label: t("dashboard.activity.user_created"),
        };
      case "user_updated":
        return {
          icon: <Edit className="w-4 h-4 text-yellow-600" />,
          color: "bg-yellow-100",
          label: t("dashboard.activity.user_updated"),
        };
      default:
        return {
          icon: <Activity className="w-4 h-4 text-purple-600" />,
          color: "bg-purple-100",
          label: t("dashboard.activity.default"),
        };
    }
  };

  const getWeekComparison = (stats: DashboardStarApiDataType) => {
    const thisWeek = stats?.weekContacts || 0;
    const lastWeek = stats?.lastWeekContacts || 0;

    if (lastWeek === 0) {
      return {
        percentage: thisWeek > 0 ? "+100.0" : "0.0",
        isUp: thisWeek > 0,
      };
    }

    const change = ((thisWeek - lastWeek) / lastWeek) * 100;
    const sign = change >= 0 ? "+" : "";

    return {
      percentage: `${sign}${change.toFixed(1)}`,
      isUp: change >= 0,
    };
  };

  type ActivityLog = {
    action: string;
    createdAt: string; // or Date
    [key: string]: any; // other optional fields
  };

  const getMonthlyGrowth = (stats: DashboardStarApiDataType) => {
    const thisMonth = stats?.thisMonthMessages || 0;
    const lastMonth = stats?.lastMonthMessages || 0;

    if (lastMonth === 0) {
      return {
        growth: thisMonth > 0 ? 100 : 0,
        isPositive: thisMonth > 0,
        isFlat: thisMonth === 0,
      };
    }

    const growthRate = ((thisMonth - lastMonth) / lastMonth) * 100;

    return {
      growth: Math.abs(growthRate).toFixed(1),
      isPositive: growthRate >= 0,
      isFlat: growthRate === 0,
    };
  };

  return (
    <div className="flex-1 dots-bg min-h-screen">
      {user?.role === "superadmin" ? (
        <Header
          title={t("dashboard.title")}
          subtitle={t("dashboard.subtitle")}
        />
      ) : (
        <Header
          title={t("dashboard.title")}
          subtitle={t("dashboard.subtitle")}
          action={{
            label: t("dashboard.newCampaign"),
            onClick: () => setLocation("/campaigns"),
          }}
        />
      )}

      <main className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"></div>
        <AdminStats />

        {user?.role !== "superadmin" && stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="hover-lift fade-in">
                <CardContent className="pt-6 pb-4 px-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-lg p-2.5 bg-green-50 text-green-600">
                      <Send className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">{t("dashboard.deliveryRate")}</h3>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stats.totalMessages > 0
                      ? Math.min(((stats.messagesDelivered || 0) / stats.totalMessages) * 100, 100).toFixed(1)
                      : "0.0"}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${stats.totalMessages > 0
                          ? Math.min(((stats.messagesDelivered || 0) / stats.totalMessages) * 100, 100)
                          : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {stats.messagesDelivered ?? 0} {t("dashboard.of")} {stats.totalMessages ?? 0} {t("dashboard.messages")}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-lift fade-in">
                <CardContent className="pt-6 pb-4 px-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-lg p-2.5 bg-violet-50 text-violet-600">
                      <Eye className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">{t("dashboard.readRate")}</h3>
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stats.totalMessages > 0
                      ? Math.min(((stats.messagesRead || 0) / stats.totalMessages) * 100, 100).toFixed(1)
                      : "0.0"}%
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-violet-500 h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${stats.totalMessages > 0
                          ? Math.min(((stats.messagesRead || 0) / stats.totalMessages) * 100, 100)
                          : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {stats.messagesRead ?? 0} {t("dashboard.of")} {stats.totalMessages ?? 0} {t("dashboard.messages")}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover-lift fade-in">
                <CardContent className="pt-6 pb-4 px-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="rounded-lg p-2.5 bg-amber-50 text-amber-600">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-600">{t("dashboard.monthlyGrowth")}</h3>
                  </div>
                  {(() => {
                    const growth = getMonthlyGrowth(stats);
                    return (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-3xl font-bold text-gray-900">
                            {growth.growth}%
                          </span>
                          {!growth.isFlat && (
                            growth.isPositive ? (
                              <ArrowUpRight className="w-6 h-6 text-green-500" />
                            ) : (
                              <ArrowDownRight className="w-6 h-6 text-red-500" />
                            )
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {stats.thisMonthMessages ?? 0} {t("dashboard.thisMonthVs")} {stats.lastMonthMessages ?? 0} {t("dashboard.lastMonth")}
                        </p>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="hover-lift fade-in">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="w-5 h-5 text-blue-600" />
                    {t("dashboard.contactGrowth")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const comparison = getWeekComparison(stats);
                    return (
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">{t("dashboard.thisWeek")}</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.weekContacts ?? 0}</p>
                        </div>
                        <div className="text-center">
                          <div className={`flex items-center gap-1 text-lg font-semibold ${comparison.isUp ? "text-green-600" : "text-red-600"}`}>
                            {comparison.isUp ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : (
                              <ArrowDownRight className="w-5 h-5" />
                            )}
                            {comparison.percentage}%
                          </div>
                          <p className="text-xs text-gray-500">{t("dashboard.vsLastWeek")}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">{t("dashboard.lastWeek")}</p>
                          <p className="text-2xl font-bold text-gray-400">{stats.lastWeekContacts ?? 0}</p>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              <Card className="hover-lift fade-in">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <LayoutGrid className="w-5 h-5 text-pink-600" />
                    {t("dashboard.campaignOverview")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-around">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center mx-auto mb-2">
                        <Megaphone className="w-6 h-6 text-pink-600" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalCampaigns ?? 0}</p>
                      <p className="text-sm text-gray-500">{t("dashboard.campaigns")}</p>
                    </div>
                    <div className="h-12 w-px bg-gray-200" />
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-2">
                        <FileText className="w-6 h-6 text-purple-600" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalTemplates ?? 0}</p>
                      <p className="text-sm text-gray-500">{t("dashboard.templates")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Charts and Recent Activity */}
        <div
          className={`grid grid-cols-1 gap-6 ${user?.role === "superadmin" ? "lg:grid-cols-3" : "lg:grid-cols-1"
            }`}
        >
          {/* Message Analytics Chart */}
          <Card className="lg:col-span-2 min-w-0 overflow-hidden hover-lift fade-in">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>{t("dashboard.messageAnalytics")}</CardTitle>
                <div className="flex flex-wrap sm:flex-nowrap space-x-0 sm:space-x-2 gap-2 mt-2 sm:mt-0">
                  {[
                    { value: 1, label: t("dashboard.today") },
                    { value: 7, label: t("dashboard.7Days") },
                    { value: 30, label: t("dashboard.30Days") },
                    { value: 90, label: t("dashboard.3Months") },
                  ].map((range) => (
                    <Button
                      key={range.value}
                      variant={
                        timeRange === range.value ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setTimeRange(range.value)}
                      className={
                        timeRange === range.value ? "bg-green-600" : ""
                      }
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="overflow-hidden">
              {analyticsLoading ? (
                <Loading text={t("common.loading")} />
              ) : (
                <MessageChart data={chartData} />
              )}

              {/* Chart Legend */}
              <div className="flex items-center justify-center space-x-6 mt-4 flex-wrap">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded mr-2" />
                  <span className="text-sm text-gray-600">
                    {t("dashboard.sent")}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-600 rounded mr-2" />
                  <span className="text-sm text-gray-600">
                    {t("dashboard.delivered")}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-600 rounded mr-2" />
                  <span className="text-sm text-gray-600">
                    {t("dashboard.read")}
                  </span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-purple-600 rounded mr-2" />
                  <span className="text-sm text-gray-600">
                    {t("dashboard.replied")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activities */}
          {user?.role === "superadmin" && (
            <Card className="hover-lift fade-in">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="w-5 h-5 mr-2" />
                  {t("dashboard.recentActivities")}
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {isLoading ? (
                    <p className="text-sm text-gray-500">
                      {t("dashboard.loadingActivities")}
                    </p>
                  ) : activityLogs.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      {t("dashboard.noRecentActivities")}
                    </p>
                  ) : (
                    (activityLogs as ActivityLog[])
                      .sort(
                        (a: ActivityLog, b: ActivityLog) =>
                          new Date(b.createdAt).getTime() -
                          new Date(a.createdAt).getTime()
                      )
                      .slice(0, 5)
                      .map((log: ActivityLog) => {
                        const meta = getActivityMeta(log.action);
                        return (
                          <div
                            key={log.id}
                            className="flex items-start space-x-3"
                          >
                            <div
                              className={`w-8 h-8 ${meta.color} rounded-full flex items-center justify-center flex-shrink-0`}
                            >
                              {meta.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900">
                                {meta.label} {t("dashboard.by")} {log.userName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDistanceToNow(new Date(log.createdAt), {
                                  addSuffix: true,
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>

                <Button
                  variant="ghost"
                  className="w-full mt-4 text-green-600 hover:text-green-700"
                  onClick={() => setLocation("/team")}
                >
                  {t("dashboard.viewAllActivities")}{" "}
                  <ExternalLink className="w-4 h-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions and API Status */}
        {user?.role !== "superadmin" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card className="hover-lift fade-in">
              <CardHeader>
                <CardTitle>{t("dashboard.quickActions")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 ">
                  <Button
                    variant="outline"
                    className="p-4 h-auto text-left flex flex-col items-center md:items-start space-y-2 hover:bg-blue-50"
                    onClick={() => setLocation("/contacts")}
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Upload className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className=" text-gray-900 text-xs md:text-sm">
                        {t("dashboard.importContacts")}
                      </h4>
                      <p className="text-sm text-gray-600 hidden sm:block ">
                        {t("dashboard.uploadCSV")}
                      </p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="p-4 h-auto text-left flex flex-col items-start space-y-2 hover:bg-green-50"
                    onClick={() => setLocation("/templates")}
                  >
                    <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className=" text-gray-900 text-xs md:text-sm">
                        {t("dashboard.newTemplate")}
                      </h4>
                      <p className="text-sm text-gray-600 text-nowrap hidden sm:block ">
                        {t("dashboard.createMessageTemplate")}
                      </p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="p-4 h-auto text-left flex flex-col items-start space-y-2 hover:bg-purple-50"
                    onClick={() => setLocation("/automation")}
                  >
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className=" text-gray-900 text-xs md:text-sm">
                        {t("dashboard.buildFlow")}
                      </h4>
                      <p className="text-sm text-gray-600 text-nowrap hidden sm:block">
                        {t("dashboard.createAutomation")}
                      </p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="p-4 h-auto text-left flex flex-col items-start space-y-2 hover:bg-orange-50"
                    onClick={() => setLocation("/analytics")}
                  >
                    <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className=" text-gray-900 text-xs md:text-sm">
                        {t("dashboard.viewReports")}
                      </h4>
                      <p className="text-sm text-gray-600 text-nowrap hidden sm:block">
                        {t("dashboard.detailedAnalytics")}
                      </p>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* API Status */}
            <Card className="hover-lift fade-in">
              <CardHeader>
                <CardTitle>{t("dashboard.apiStatusConnection")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* WhatsApp Cloud API */}
                  <div
                    className={`flex items-center justify-between p-3 rounded-lg ${activeChannel?.isActive === true
                      ? "bg-green-50"
                      : "bg-red-50"
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activeChannel?.isActive ? "bg-green-600" : "bg-red-600"
                          }`}
                      >
                        <MessageSquare className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">
                          {t("dashboard.whatsAppCloudAPI")}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          {user?.username
                            ? activeChannel
                              ? `${activeChannel.name
                                .slice(0, -1)
                                .replace(/./g, "*") +
                              activeChannel.name.slice(-1)
                              } (${activeChannel.phoneNumber
                                .slice(0, -4)
                                .replace(/\d/g, "*") +
                              activeChannel.phoneNumber.slice(-4)
                              })`
                              : t("dashboard.noChannelSelected")
                            : activeChannel
                              ? `${activeChannel.name} (${activeChannel.phoneNumber})`
                              : t("dashboard.noChannelSelected")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-2 h-2 rounded-full ${activeChannel?.isActive === true
                          ? "bg-green-500 pulse-gentle"
                          : "bg-red-500"
                          }`}
                      />
                      <span
                        className={`text-sm font-medium ${activeChannel?.isActive === true
                          ? "text-green-600"
                          : "text-red-600"
                          }`}
                      >
                        {activeChannel?.isActive === true
                          ? t("dashboard.connected")
                          : activeChannel?.isActive === false
                            ? t("dashboard.warning")
                            : activeChannel
                              ? t("dashboard.error")
                              : t("dashboard.noChannel")}
                      </span>
                    </div>
                  </div>

                    {/* Channel Quality */}
                    {activeChannel && (
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Activity className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {t("dashboard.healthDetails")}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {t("dashboard.rating")}:{" "}
                              {activeChannel?.healthDetails.quality_rating || "N/A"}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {t("dashboard.lastChecked")}{" "}
                          {formatDistanceToNow(new Date(activeChannel.lastHealthCheck), { addSuffix: true })}
                        </span>
                      </div>
                    )}

                    {/* Performance Stats */}
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-900">
                          {activeChannel?.lastHealthCheck ? "100%" : "N/A"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {t("dashboard.apiUptime")}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-lg font-bold text-gray-900">
                          {activeChannel?.healthDetails.name_status || "N/A"}
                        </p>
                        <p className="text-xs text-gray-600">
                          {t("dashboard.apiStatus")}
                        </p>
                      </div>
                    </div>

                    {/* Daily Limit */}
                    {(() => {
                      const tierKey = activeChannel?.healthDetails.messaging_limit as string | undefined;
                      const tierLimitMap: Record<string, number> = {
                        TIER_250: 250,
                        TIER_1K: 1000,
                        TIER_10K: 10000,
                        TIER_100K: 100000,
                      };
                      const isUnlimitedOrUnknown =
                        !tierKey ||
                        tierKey === "UNKNOWN" ||
                        tierKey === "UNLIMITED" ||
                        tierKey === "TIER_UNLIMITED";
                      const dailyLimit = isUnlimitedOrUnknown ? null : (tierLimitMap[tierKey] ?? null);
                      const todaySent = stats?.todayMessages || 0;
                      const limitLabel =
                        tierKey === "UNLIMITED" || tierKey === "TIER_UNLIMITED"
                          ? t("dashboard.unlimited")
                          : isUnlimitedOrUnknown
                            ? t("dashboard.unconfirmed")
                            : (dailyLimit ?? 0).toLocaleString();
                      const progressPct =
                        dailyLimit != null && dailyLimit > 0
                          ? Math.min((todaySent / dailyLimit) * 100, 100)
                          : 0;
                      return (
                        <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              {t("dashboard.dailyMessageLimit")}
                            </span>
                            <span className="text-sm text-gray-600">
                              {todaySent} / {limitLabel}
                            </span>
                          </div>
                          {dailyLimit != null && (
                            <div className="w-full bg-yellow-200 rounded-full h-2">
                              <div
                                className="bg-yellow-500 h-2 rounded-full"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          )}
                          {isUnlimitedOrUnknown && tierKey !== "UNLIMITED" && tierKey !== "TIER_UNLIMITED" && (
                            <p className="text-xs text-yellow-700 mt-1">
                              {t("dashboard.runChannelHealthCheck")}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
      </main>
    </div>
  );
}
