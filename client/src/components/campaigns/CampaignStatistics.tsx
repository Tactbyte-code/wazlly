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

import { Card, CardContent } from "@/components/ui/card";
import {
  MessageSquare,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
interface Campaign {
  id: string;
  status: string;
  recipientCount?: number;
  sentCount?: number;
  deliveredCount?: number;
  readCount?: number;
  failedCount?: number;
}


interface StatsOverride {
  totalCampaigns: number;
  activeCampaigns?: number;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
}

export interface CampaignStatisticsProps {
  campaigns: Campaign[];
  stats?: StatsOverride; 
}





export function CampaignStatistics({ campaigns, stats: statsProp }: CampaignStatisticsProps) {
  // Calculate aggregate statistics

  const { t } = useTranslation();


  const computed = campaigns.reduce(
    (acc, campaign) => ({
      totalCampaigns: acc.totalCampaigns + 1,
      activeCampaigns: acc.activeCampaigns + (campaign.status === "active" ? 1 : 0),
      totalRecipients: acc.totalRecipients + (campaign.recipientCount || 0),
      totalSent: acc.totalSent + (campaign.sentCount || 0),
      totalDelivered: acc.totalDelivered + (campaign.deliveredCount || 0),
      totalRead: acc.totalRead + (campaign.readCount || 0),
      totalFailed: acc.totalFailed + (campaign.failedCount || 0),
    }),
    { totalCampaigns: 0, activeCampaigns: 0, totalRecipients: 0, totalSent: 0, totalDelivered: 0, totalRead: 0, totalFailed: 0 },
  );

  // ✅ statsProp aaya toh use karo, warna computed fallback
  const stats = statsProp ? { ...computed, ...statsProp } : computed;
  // const stats = campaigns.reduce(
  //   (acc, campaign) => ({
  //     totalCampaigns: acc.totalCampaigns + 1,
  //     activeCampaigns:
  //       acc.activeCampaigns + (campaign.status === "active" ? 1 : 0),
  //     totalRecipients: acc.totalRecipients + (campaign.recipientCount || 0),
  //     totalSent: acc.totalSent + (campaign.sentCount || 0),
  //     totalDelivered: acc.totalDelivered + (campaign.deliveredCount || 0),
  //     totalRead: acc.totalRead + (campaign.readCount || 0),
  //     totalFailed: acc.totalFailed + (campaign.failedCount || 0),
  //   }),
  //   {
  //     totalCampaigns: 0,
  //     activeCampaigns: 0,
  //     totalRecipients: 0,
  //     totalSent: 0,
  //     totalDelivered: 0,
  //     totalRead: 0,
  //     totalFailed: 0,
  //   },
  // );

  const deliveryRate =
    Number(stats.totalRecipients) > 0
      ? Math.min(
          Math.round(
            (Number(stats.totalDelivered) / Number(stats.totalRecipients)) *
              100,
          ),
          100,
        )
      : 0;

  const readRate =
    Number(stats.totalRecipients) > 0
      ? Math.min(
          Math.round(
            (Number(stats.totalRead) / Number(stats.totalRecipients)) * 100,
          ),
          100,
        )
      : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("campaigns.totalCampaigns")}
              </p>
              <p className="text-2xl font-bold">{stats.totalCampaigns}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeCampaigns} {t("campaigns.active")}
              </p>
            </div>
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("campaigns.totalRecipients")}
              </p>
              <p className="text-2xl font-bold">
                {stats.totalRecipients.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalSent} {t("campaigns.sent")}
              </p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("campaigns.deliveryRate")}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {!isFinite(deliveryRate) || deliveryRate < 0 ? 0 : deliveryRate}
                %
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalDelivered} {t("campaigns.delivered")}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("campaigns.readRate")}
              </p>
              <p className="text-2xl font-bold text-blue-600">{readRate}%</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalRead} {t("campaigns.read")}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {t("campaigns.failedMessages")}
              </p>
              <p className="text-2xl font-bold text-destructive">
                {stats.totalFailed}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
  {stats.totalRecipients > 0
    ? Math.min(Math.round((stats.totalFailed / stats.totalRecipients) * 100), 100)
    : 0}
  % {t("campaigns.failedRate")}
</p>
            </div>
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
