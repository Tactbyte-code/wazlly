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

import { AlertCircle, Loader2, Megaphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { EmptyState } from "../EmptyState";
import { StateDisplay } from "../StateDisplay";


interface Campaign {
  id: string;
  channelId: string | null;
  createdBy: string | null;
  name: string;
  description: string | null;
  campaignType: string;
  type: string;
  apiType: string | null;
  templateId: string | null;
  templateName: string | null;
  templateLanguage: string | null;
  variableMapping: Record<string, any>;
  contactGroups: string[];
  csvData: any[];
  apiKey: string | null;
  apiEndpoint: string | null;
  status: string | null;
  scheduledAt: string | null;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  repliedCount: number;
  failedCount: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CampaignsProps {
  userId: string;
}

interface CampaignsResponse {
  data: Campaign[];
  total: number;
  page: number;
  limit: number;
}

export default function Campaigns({ userId }: CampaignsProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading, isError, error } = useQuery<
    CampaignsResponse,
    Error
  >({
    queryKey: ["campaigns", userId, page, limit],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/getCampaignsByUserId", {
        userId,
        page,
        limit,
      });
      const json: CampaignsResponse = await res.json();
      return json;
    },
    enabled: !!userId,
    keepPreviousData: true,
  });

  const campaigns = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t("users.campaigns.loading")}
      </div>
    );

  if (isError) {
    return (
      <StateDisplay
        variant="error"
        icon={AlertCircle}
        title={t("users.campaigns.failedToLoad")}
        description={t("users.campaigns.errorLoading")}
        buttonText={t("users.campaigns.tryAgain")}
        onButtonClick={() => window.location.reload()}
      />
    );
  }

  if (campaigns.length === 0) {
    return (
      <StateDisplay
        icon={Megaphone}
        title={t("users.campaigns.noCampaignsYet")}
        description={t("users.campaigns.noCampaignsDesc")}
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow-sm">
          <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
            <tr>
              <th className="py-3 px-4 border-b">{t("users.campaigns.name")}</th>
              <th className="py-3 px-4 border-b">{t("users.campaigns.type")}</th>
              <th className="py-3 px-4 border-b">{t("users.campaigns.status")}</th>
              <th className="py-3 px-4 border-b">{t("users.campaigns.scheduledAt")}</th>
              <th className="py-3 px-4 border-b">{t("users.campaigns.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr
                key={campaign.id}
                className="hover:bg-gray-50 transition-colors text-sm text-gray-700"
              >
                <td className="py-3 px-4 border-b">{campaign.name}</td>
                <td className="py-3 px-4 border-b">{campaign.type}</td>
                <td className="py-3 px-4 border-b">
                  {campaign.status === "scheduled" ? (
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                      {campaign.status}
                    </span>
                  ) : campaign.status === "completed" ? (
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                      {campaign.status}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">
                      {campaign.status || t("users.campaigns.unknown")}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 border-b">
                  {campaign.scheduledAt
                    ? new Date(campaign.scheduledAt).toLocaleString()
                    : "-"}
                </td>
                <td className="py-3 px-4 border-b">
                  {new Date(campaign.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination (Fully Responsive) */}
      <div className="w-full mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* LEFT SIDE → Showing Results + Per Page */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-sm text-gray-700">
            {t("users.campaigns.showing")} {(page - 1) * limit + 1} {t("users.campaigns.to")} {Math.min(page * limit, total)}{" "}
            {t("users.campaigns.of")} {total} {t("users.campaigns.campaignsCount")}
          </span>

          {/* Per Page Dropdown */}
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="border px-3 py-2 rounded-md text-sm w-24"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* RIGHT SIDE → Pagination Buttons */}
        <div className="flex items-center justify-center sm:justify-end gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
          >
            {t("users.campaigns.previous")}
          </button>

          <span className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium">
            {page}
          </span>

          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
          >
            {t("users.campaigns.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
