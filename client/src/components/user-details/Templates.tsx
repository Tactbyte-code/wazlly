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

import { AlertCircle, Loader2, Users } from "lucide-react";
import { PageNumbers } from "@/components/ui/page-numbers";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { StateDisplay } from "../StateDisplay";

interface Template {
  id: string;
  channelId: string;
  createdBy: string;
  name: string;
  category: string;
  language: string;
  header: string | null;
  body: string;
  footer: string | null;
  buttons: any[];
  variables: any[];
  status: string;
  rejectionReason: string | null;
  mediaType: string;
  mediaUrl: string | null;
  mediaHandle: string | null;
  carouselCards: any[];
  whatsappTemplateId: string | null;
  usage_count: number;
  createdAt: string;
  updatedAt: string;
}

interface TemplatesProps {
  userId: string;
}

interface TemplatesResponse {
  data: Template[];
  pagination: {
    page: number;
    limit: number;
    total: number | string;
    totalPages: number;
  };
}

export default function Templates({ userId }: TemplatesProps) {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10); // items per page

  const { data, isLoading, isError, error } = useQuery<TemplatesResponse>({
    queryKey: ["templates", userId, currentPage],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/getTemplateByUserId", {
        userId,
        page: currentPage,
        limit,
      });
      const json = await res.json();
      console.log("🧩 Templates API response:", json);
      return json;
    },
    enabled: !!userId,
    keepPreviousData: true, // React Query feature to prevent flicker
  });

  const templates = data?.data ?? [];
  const page = data?.pagination?.page ?? 1;
  const totalPages = Number(data?.pagination?.totalPages ?? 1);

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t("users.templates.loading")}
      </div>
    );

  // Error State
  if (isError) {
    return (
      <StateDisplay
        variant="error"
        icon={AlertCircle}
        title={t("users.templates.failedToLoad")}
        description={t("users.templates.errorLoading")}
        buttonText={t("users.templates.tryAgain")}
        onButtonClick={() => window.location.reload()}
      />
    );
  }

  // Empty State
  if (templates.length === 0) {
    return (
      <StateDisplay
        icon={Users}
        title={t("users.templates.noTemplatesYet")}
        description={t("users.templates.noTemplatesDesc")}
        buttonText={t("users.templates.inviteTeamMember")}
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow-sm">
          <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
            <tr>
              <th className="py-3 px-4 border-b">{t("users.templates.name")}</th>
              <th className="py-3 px-4 border-b">{t("users.templates.category")}</th>
              <th className="py-3 px-4 border-b">{t("users.templates.status")}</th>
              <th className="py-3 px-4 border-b">{t("users.templates.body")}</th>
              <th className="py-3 px-4 border-b">{t("users.templates.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => (
              <tr
                key={template.id}
                className="hover:bg-gray-50 transition-colors text-sm text-gray-700"
              >
                <td className="py-3 px-4 border-b">{template.name}</td>
                <td className="py-3 px-4 border-b">{template.category}</td>
                <td className="py-3 px-4 border-b">
  {(() => {
    const status = (template.status || "").toLowerCase();
    if (status === "approved") {
      return (
        <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
          {template.status}
        </span>
      );
    } else if (status === "pending") {
      return (
        <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-700">
          {template.status}
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">
          {template.status}
        </span>
      );
    }
  })()}
</td>

                <td className="py-3 px-4 border-b">{template.body}</td>
                <td className="py-3 px-4 border-b">
                  {new Date(template.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data?.pagination && (
        <div className="w-full mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* LEFT SIDE → Showing X to Y of Total */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm text-gray-700">
              {t("users.templates.showing")} {(page - 1) * limit + 1} {t("users.templates.to")}{" "}
              {Math.min(page * limit, Number(data.pagination.total))} {t("users.templates.of")}{" "}
              {data.pagination.total} {t("users.templates.templatesCount")}
            </span>

            {/* Optional: Per Page Selector */}
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setCurrentPage(1); // reset page
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
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              {t("users.templates.previous")}
            </button>

            <PageNumbers
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(p) => setCurrentPage(p)}
            />

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              {t("users.templates.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
