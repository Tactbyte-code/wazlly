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

import { Loader2, Shield, Users, UserPlus, AlertCircle } from "lucide-react";
import { PageNumbers } from "@/components/ui/page-numbers";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { EmptyState } from "../EmptyState";
import { StateDisplay } from "../StateDisplay";
import { isDemoUser, maskValue } from "@/utils/maskUtils";
import { useAuth } from "@/contexts/auth-context";

interface TeamMember {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  permissions: string[];
  avatar: string | null;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface TeamMembersProps {
  userId: string;
}

export default function TeamMembers({ userId }: TeamMembersProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { user } = useAuth();

  const { data, isLoading, isError, error } = useQuery<{
    data: TeamMember[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["/api/team/membersByUserId", userId, page],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/team/membersByUserId", {
        userId,
        page,
        limit,
      });
      return res.json();
    },
    enabled: !!userId,
    keepPreviousData: true,
  });

  const teamMembers = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;

  // Loading State with Skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow-sm">
            <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
              <tr>
                <th className="py-3 px-4 border-b">{t("users.teamMembers.name")}</th>
                <th className="py-3 px-4 border-b">{t("users.teamMembers.email")}</th>
                <th className="py-3 px-4 border-b">{t("users.teamMembers.role")}</th>
                <th className="py-3 px-4 border-b">{t("users.teamMembers.status")}</th>
                <th className="py-3 px-4 border-b">{t("users.teamMembers.createdAt")}</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, index) => (
                <tr key={index} className="animate-pulse">
                  <td className="py-3 px-4 border-b">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="h-4 bg-gray-200 rounded w-40"></div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                  </td>
                  <td className="py-3 px-4 border-b">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center py-4 text-gray-500">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          <span className="text-sm">{t("users.teamMembers.loading")}</span>
        </div>
      </div>
    );
  }

  // Error State
  if (isError) {
    return (
      <StateDisplay
        variant="error"
        icon={AlertCircle}
        title={t("users.teamMembers.failedToLoad")}
        description={t("users.teamMembers.errorLoading")}
        buttonText={t("users.teamMembers.tryAgain")}
        onButtonClick={() => window.location.reload()}
      />
    );
  }

  // Empty State
  if (teamMembers.length === 0) {
    return (
      <StateDisplay
        icon={Users}
        title={t("users.teamMembers.noTeamMembersYet")}
        description={t("users.teamMembers.noTeamMembersDesc")}
        buttonText={t("users.teamMembers.inviteTeamMember")}
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow-sm">
          <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
            <tr>
              <th className="py-3 px-4 border-b">{t("users.teamMembers.name")}</th>
              <th className="py-3 px-4 border-b">{t("users.teamMembers.email")}</th>
              <th className="py-3 px-4 border-b">{t("users.teamMembers.role")}</th>
              <th className="py-3 px-4 border-b">{t("users.teamMembers.status")}</th>
              <th className="py-3 px-4 border-b">{t("users.teamMembers.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member) => (
              <tr
                key={member.id}
                className="hover:bg-gray-50 transition-colors text-sm text-gray-700"
              >
                <td className="py-3 px-4 border-b flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
                    {member.firstName?.[0]}
                    {member.lastName?.[0]}
                  </div>
                  {member.firstName} {member.lastName}
                </td>
                
                <td className="py-3 px-4 border-b">
  {isDemoUser(user?.username) ? maskValue(member.email) : member.email}
</td>

                <td className="py-3 px-4 border-b flex items-center gap-1">
                  <Shield className="w-3 h-3 text-gray-500" />
                  {member.role}
                </td>
                <td className="py-3 px-4 border-b">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      member.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {member.status === "active" ? t("users.teamMembers.active") : t("users.teamMembers.inactive")}
                  </span>
                </td>
                <td className="py-3 px-4 border-b text-gray-500 text-xs">
                  {new Date(member.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data?.pagination && (
        <div className="w-full mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm text-gray-700">
              {t("users.teamMembers.showing")} {(page - 1) * limit + 1} {t("users.teamMembers.to")}{" "}
              {Math.min(page * limit, data.pagination.total)} {t("users.teamMembers.of")}{" "}
              {data.pagination.total} {t("users.teamMembers.membersCount")}
            </span>

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

          <div className="flex items-center justify-center sm:justify-end gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              {t("users.teamMembers.previous")}
            </button>

            <PageNumbers
              currentPage={page}
              totalPages={data.pagination.totalPages}
              onPageChange={(p) => setPage(p)}
            />

            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page >= data.pagination.totalPages}
              onClick={() =>
                setPage((prev) =>
                  Math.min(prev + 1, data.pagination.totalPages)
                )
              }
            >
              {t("users.teamMembers.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
