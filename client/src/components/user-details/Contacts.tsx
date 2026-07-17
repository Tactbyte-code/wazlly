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
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { EmptyState } from "../EmptyState";
import { StateDisplay } from "../StateDisplay";
import { isDemoUser, maskValue } from "@/utils/maskUtils";
import { useAuth } from "@/contexts/auth-context";

interface Contact {
  id: string;
  channelId: string;
  tenantId: string | null;
  name: string;
  phone: string;
  email: string;
  groups: string[];
  tags: string[];
  status: string;
  source: string | null;
  lastContact: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface ContactsProps {
  userId: string;
}

export default function Contacts({ userId }: ContactsProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { user } = useAuth();

  const { data, isLoading, isError, error } = useQuery<{
    data: Contact[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: ["contacts", userId, page, limit],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/user/contacts/${userId}?page=${page}&limit=${limit}`
      );
      const json = await res.json();
      console.log("🧩 Parsed API JSON:", json);
      return json;
    },
    enabled: !!userId,
    keepPreviousData: true,
  });

  const contacts = data?.data || [];
  const totalPages = data?.pagination?.totalPages || 1;

  if (isLoading)
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t("users.contacts.loading")}
      </div>
    );
  // Error State
  if (isError) {
    return (
      <StateDisplay
        variant="error"
        icon={AlertCircle}
        title={t("users.contacts.failedToLoad")}
        description={t("users.contacts.errorLoading")}
        buttonText={t("users.contacts.tryAgain")}
        onButtonClick={() => window.location.reload()}
      />
    );
  }

  // Empty State
  if (contacts.length === 0) {
    return (
      <StateDisplay
        icon={Users}
        title={t("users.contacts.noContactsYet")}
        description={t("users.contacts.noContactsDesc")}
        buttonText={t("users.contacts.inviteTeamMember")}
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow-sm">
          <thead className="bg-gray-100 text-left text-sm font-semibold text-gray-700">
            <tr>
              <th className="py-3 px-4 border-b">{t("users.contacts.name")}</th>
              <th className="py-3 px-4 border-b">{t("users.contacts.phone")}</th>
              <th className="py-3 px-4 border-b">{t("users.contacts.email")}</th>
              <th className="py-3 px-4 border-b">{t("users.contacts.status")}</th>
              {/* <th className="py-3 px-4 border-b">Groups</th>
              <th className="py-3 px-4 border-b">Tags</th> */}
              <th className="py-3 px-4 border-b">{t("users.contacts.createdAt")}</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className="hover:bg-gray-50 transition-colors text-sm text-gray-700"
              >
                <td className="py-3 px-4 border-b">{contact.name}</td>
                <td className="py-3 px-4 border-b">
                  {isDemoUser(user?.username)
                    ? maskValue(contact.phone)
                    : contact.phone}
                </td>

                <td className="py-3 px-4 border-b">
                  {isDemoUser(user?.username)
                    ? maskValue(contact.email)
                    : contact.email}
                </td>

                <td className="py-3 px-4 border-b">
                  {contact.status === "active" ? (
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                      {t("users.contacts.active")}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                      {contact.status}
                    </span>
                  )}
                </td>
                {/* <td className="py-3 px-4 border-b">
                  {contact.groups.join(", ") || "-"}
                </td>
                <td className="py-3 px-4 border-b">
                  {contact.tags.join(", ") || "-"}
                </td> */}
                <td className="py-3 px-4 border-b">
                  {new Date(contact.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {/* Pagination (Fully Responsive) */}
      {data?.pagination && (
        <div className="w-full mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* LEFT SIDE → Showing + Per Page */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-sm text-gray-700">
              {t("users.contacts.showing")} {(page - 1) * limit + 1} {t("users.contacts.to")}{" "}
              {Math.min(page * limit, data.pagination.total)} {t("users.contacts.of")}{" "}
              {data.pagination.total} {t("users.contacts.contactsCount")}
            </span>

            {/* Per Page Selector (Optional) */}
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
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              {t("users.contacts.previous")}
            </button>

            <span className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium">
              {page}
            </span>

            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page >= data.pagination.totalPages}
              onClick={() =>
                setPage((prev) =>
                  Math.min(prev + 1, data.pagination.totalPages)
                )
              }
            >
              {t("users.contacts.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
