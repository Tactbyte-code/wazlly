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
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import type { DashboardStats } from "@/types/types";
import { CardStat } from "./CardStat";
import { useTranslation } from "@/lib/i18n";
import {
  Users,
  MessageSquare,
  Send,
  CheckCircle2,
  Eye,
  XCircle,
  CalendarDays,
  Megaphone,
  FileText,
  Radio,
  UserPlus,
  CreditCard,
  UsersRound,
} from "lucide-react";

export default function AdminStats() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const isTeamOrAdmin = user?.role === "team" || user?.role === "admin";

  const url = isTeamOrAdmin && activeChannel?.id
    ? `/api/dashboard/user/stats?channelId=${activeChannel.id}`
    : isTeamOrAdmin
    ? null
    : "/api/dashboard/admin/stats";

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: [url],
    queryFn: () => apiRequest("GET", url!).then((res) => res.json()),
    enabled: !!url,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto">
        <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  if (isTeamOrAdmin) {
    return (
      <div className="container mx-auto">
        <div className="px-4 py-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          <CardStat
            label={t("dashboard.dashboardStates.Total_Contacts")}
            value={stats.totalContacts ?? 0}
            icon={<Users className="w-6 h-6" />}
            iconClassName="bg-blue-50 text-blue-600"
            borderColor="border-l-blue-500"
          />
          <CardStat
            label={t("dashboard.dashboardStates.Total_Messages")}
            value={stats.totalMessages ?? 0}
            icon={<MessageSquare className="w-6 h-6" />}
            iconClassName="bg-orange-50 text-orange-600"
            borderColor="border-l-orange-500"
          />
          <CardStat
            label={t("dashboard.sent")}
            value={stats.messagesSent ?? 0}
            icon={<Send className="w-6 h-6" />}
            iconClassName="bg-cyan-50 text-cyan-600"
            borderColor="border-l-cyan-500"
          />
          <CardStat
            label={t("dashboard.delivered")}
            value={stats.messagesDelivered ?? 0}
            icon={<CheckCircle2 className="w-6 h-6" />}
            iconClassName="bg-green-50 text-green-600"
            borderColor="border-l-green-500"
          />
        </div>
        <div className="px-4 py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
          <CardStat
            label={t("dashboard.read")}
            value={stats.messagesRead ?? 0}
            icon={<Eye className="w-6 h-6" />}
            iconClassName="bg-violet-50 text-violet-600"
            borderColor="border-l-violet-500"
          />
          <CardStat
            label={t("dashboard.failed")}
            value={stats.messagesFailed ?? 0}
            icon={<XCircle className="w-6 h-6" />}
            iconClassName="bg-red-50 text-red-600"
            borderColor="border-l-red-500"
          />
          <CardStat
            label={t("dashboard.today")}
            value={stats.todayMessages ?? 0}
            icon={<CalendarDays className="w-6 h-6" />}
            iconClassName="bg-amber-50 text-amber-600"
            borderColor="border-l-amber-500"
          />
          <CardStat
            label={t("dashboard.totalCampaigns")}
            value={stats.totalCampaigns ?? 0}
            icon={<Megaphone className="w-6 h-6" />}
            iconClassName="bg-pink-50 text-pink-600"
            borderColor="border-l-pink-500"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="px-4 py-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
        {stats.totalContacts !== undefined && stats.totalContacts !== null && (
          <CardStat
            label={t("dashboard.dashboardStates.Total_Contacts")}
            value={stats.totalContacts}
            icon={<Users className="w-6 h-6" />}
            iconClassName="bg-blue-50 text-blue-600"
            borderColor="border-l-blue-500"
          />
        )}
        {stats.totalTemplates !== undefined && stats.totalTemplates !== null && (
          <CardStat
            label={t("dashboard.dashboardStates.Total_Templates")}
            value={stats.totalTemplates}
            icon={<FileText className="w-6 h-6" />}
            iconClassName="bg-purple-50 text-purple-600"
            borderColor="border-l-purple-500"
          />
        )}
        {stats.totalChannels !== undefined && stats.totalChannels !== null && (
          <CardStat
            label={t("dashboard.dashboardStates.Total_Channels")}
            value={stats.totalChannels}
            icon={<Radio className="w-6 h-6" />}
            iconClassName="bg-green-50 text-green-600"
            borderColor="border-l-green-500"
          />
        )}
        {stats.totalMessages !== undefined && stats.totalMessages !== null && (
          <CardStat
            label={t("dashboard.dashboardStates.Total_Messages")}
            value={stats.totalMessages}
            icon={<MessageSquare className="w-6 h-6" />}
            iconClassName="bg-orange-50 text-orange-600"
            borderColor="border-l-orange-500"
          />
        )}
        {stats.totalUsers !== undefined && stats.totalUsers !== null && (
          <CardStat
            label={t("dashboard.dashboardStates.Total_Users")}
            value={stats.totalUsers}
            icon={<UsersRound className="w-6 h-6" />}
            iconClassName="bg-indigo-50 text-indigo-600"
            borderColor="border-l-indigo-500"
          />
        )}
        {stats.totalCampaigns !== undefined && stats.totalCampaigns !== null && (
          <CardStat
            label={t("dashboard.dashboardStates.Total_Campaigns")}
            value={stats.totalCampaigns}
            icon={<Megaphone className="w-6 h-6" />}
            iconClassName="bg-pink-50 text-pink-600"
            borderColor="border-l-pink-500"
          />
        )}
        {stats.todaySignups !== undefined && stats.todaySignups !== null && (
          <CardStat
            label={t("dashboard.dashboardStates.Total_Signups")}
            value={stats.todaySignups}
            icon={<UserPlus className="w-6 h-6" />}
            iconClassName="bg-teal-50 text-teal-600"
            borderColor="border-l-teal-500"
          />
        )}
        {stats.totalPaidUsers !== undefined && stats.totalPaidUsers !== null && (
          <CardStat
            label={t("dashboard.dashboardStates.Total_Paid_Users")}
            value={stats.totalPaidUsers}
            icon={<CreditCard className="w-6 h-6" />}
            iconClassName="bg-emerald-50 text-emerald-600"
            borderColor="border-l-emerald-500"
          />
        )}
      </div>
    </div>
  );
}
