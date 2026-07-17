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

import React, { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FaEllipsisH, FaEye, FaBan, FaSearch, FaCheck, FaCrown, FaEdit, FaFileExport } from "react-icons/fa";
import EditUserModal from "@/components/modals/EditUserModal";
import { PageNumbers } from "@/components/ui/page-numbers";
import Header from "@/components/layout/header";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { isDemoUser, maskValue, maskPhone, maskName, maskEmail } from "@/utils/maskUtils";
import AddUserModal from "@/components/modals/AddUserModal";
import AssignPlanModal from "@/components/modals/AssignPlanModal";


interface UserType {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  avatar?: string;
  phone?: string;
  groups?: string[];
  lastLogin?: string;
  createdAt?: string;
  channelCount?: number;
  role?: string;
  isEmailVerified?: boolean;
}

const formatDateTime = (dateStr?: string | null): string => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
};

interface PaginationType {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  inactive: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800",
  banned: "bg-red-100 text-red-800",
};

const User: React.FC = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [openAddModal, setOpenAddModal] = useState(false);
  const { toast } = useToast();
  const { user, userPlans } = useAuth();
  const [plans, setPlans] = useState([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUserForPlan, setSelectedUserForPlan] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserType | null>(null);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [hasChannelsFilter, setHasChannelsFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("");
  const [bulkActing, setBulkActing] = useState(false);


  const handleToggleStatus = async (user: UserType) => {
    try {
      const newStatus = user.status === "active" ? "inactive" : "active";

      const res = await apiRequest("PUT", `/api/user/status/${user.id}`, {
        status: newStatus,
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: t("users.toast.success"),
          description: `${t("users.toast.statusUpdated")} ${newStatus}`,
        });

        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
        );
      } else {
        toast({
          title: t("users.toast.error"),
          description: t("users.toast.statusUpdateFailed"),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t("users.toast.error"),
        description: t("users.toast.somethingWrong"),
        variant: "destructive",
      });
    }
  };






  const fetchUsers = async (
    page = 1,
    searchTerm = "",
    limit = pagination.limit
  ) => {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: searchTerm,
      });
      if (statusFilter) params.set("status", statusFilter);
      if (hasChannelsFilter) params.set("hasChannels", hasChannelsFilter);
      if (dateRangeFilter) params.set("dateRange", dateRangeFilter);

      const response = await apiRequest(
        "GET",
        `/api/admin/users?${params.toString()}`
      );

      const data = await response.json();

      if (data.success) {
        setUsers(data.data);
        setPagination(data.pagination);
      } else {
        toast({
          title: t("users.toast.error"),
          description: t("users.toast.fetchFailed"),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t("users.toast.error"),
        description: t("users.toast.fetchFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(pagination.page, search, pagination.limit);
  }, [pagination.page, pagination.limit, statusFilter, hasChannelsFilter, dateRangeFilter]);

  const handlePageChange = (p: number) => {
    if (p >= 1 && p <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: p }));
    }
  };

  const handleSearch = (e: any) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers(1, search, pagination.limit);
  };

  const toggleUserSelection = (id: string) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedUsers.size === 0) return;
    try {
      setBulkActing(true);
      const res = await apiRequest("PUT", "/api/admin/users/bulk-status", {
        userIds: Array.from(selectedUsers),
        status,
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: t("users.toast.success"), description: data.message });
        setSelectedUsers(new Set());
        fetchUsers(pagination.page, search, pagination.limit);
      } else {
        toast({ title: t("users.toast.error"), description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: t("users.toast.error"), description: t("users.toast.somethingWrong"), variant: "destructive" });
    } finally {
      setBulkActing(false);
    }
  };




  const fetchPlans = async () => {
    try {
      const response = await apiRequest("GET", "/api/admin/plans");
      const data = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (err) {
      console.error("Plan fetch error:", err);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openAssignPlanModal = (user: any) => {
    setSelectedUserForPlan(user);
    setAssignModalOpen(true);
  };

  const [exporting, setExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const exportParams = new URLSearchParams();
      if (search) exportParams.set("search", search);
      if (statusFilter) exportParams.set("status", statusFilter);
      if (hasChannelsFilter) exportParams.set("hasChannels", hasChannelsFilter);
      if (dateRangeFilter) exportParams.set("dateRange", dateRangeFilter);
      const response = await apiRequest("GET", `/api/admin/users/export?${exportParams.toString()}`);
      const data = await response.json();
      if (!data.success || !data.data) {
        toast({ title: t("users.toast.error"), description: "Export failed", variant: "destructive" });
        return;
      }
      const exportUsers = data.data;
      const headers = ["Username", "Email", "First Name", "Last Name", "Role", "Status", "Channels Count", "Channel Names", "Last Login", "Created At"];
      const escapeCSV = (val: string) => {
        if (!val) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const _demo = isDemoUser(user?.username);
      const rows = exportUsers.map((u: any) => [
        escapeCSV(_demo ? maskName(u.username) : u.username),
        escapeCSV(_demo ? maskEmail(u.email) : u.email),
        escapeCSV(_demo ? maskName(u.firstName || "") : (u.firstName || "")),
        escapeCSV(_demo ? maskName(u.lastName || "") : (u.lastName || "")),
        escapeCSV(u.role || ""),
        escapeCSV(u.status || ""),
        String(u.channelCount ?? 0),
        escapeCSV(_demo ? "***" : (u.channelNames || "")),
        u.lastLogin ? formatDateTime(u.lastLogin) : "Never",
        u.createdAt ? formatDateTime(u.createdAt) : "",
      ].join(","));
      const csv = [headers.join(","), ...rows].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `users_export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: t("users.toast.success"), description: `Exported ${exportUsers.length} users` });
    } catch (error) {
      toast({ title: t("users.toast.error"), description: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dots-bg">
      <Header title={t("users.title")} subtitle={t("users.subtitle")} action={{
        label: t("users.AddUser"),
        onClick: () => setOpenAddModal(true),
      }} />

      <div className="p-4 md:p-6">
        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="flex flex-col sm:flex-row gap-3 mb-6 w-full"
        >
          <div className="relative flex-1">
            <Input
              placeholder={t("users.search.placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full"
            />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>

          <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
            {t("users.search.button")}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
              setHasChannelsFilter("");
              setDateRangeFilter("");
              setPagination((prev) => ({ ...prev, page: 1 }));
              setTimeout(() => fetchUsers(1, "", pagination.limit), 0);
            }}
            className="w-full sm:w-auto"
          >
            {t("users.search.clear")}
          </Button>

          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={exporting}
            className="w-full sm:w-auto gap-2"
          >
            <FaFileExport />
            {exporting ? "Exporting..." : t("users.Export")}
          </Button>
        </form>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="border rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">{t("users.status.allStatus")}</option>
            <option value="active">{t("users.status.active")}</option>
            <option value="inactive">{t("users.status.inactive")}</option>
            <option value="banned">{t("users.status.banned")}</option>
          </select>

          <select
            value={hasChannelsFilter}
            onChange={(e) => {
              setHasChannelsFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="border rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">{t("users.user.allUser")}</option>
            <option value="yes">{t("users.user.hasCannells")}</option>
            <option value="no">{t("users.user.noCannells")}</option>
          </select>

          <select
            value={dateRangeFilter}
            onChange={(e) => {
              setDateRangeFilter(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="border rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">{t("users.Date.alltime")}</option>
            <option value="week">{t("users.Date.thisweek")}</option>
            <option value="month">{t("users.Date.thismonth")}</option>
          </select>
        </div>

        {/* Bulk Action Bar */}
        {selectedUsers.size > 0 && (
          <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <span className="text-sm font-medium text-blue-800">
              {selectedUsers.size} user{selectedUsers.size > 1 ? "s" : ""} {t("users.select.selected")}
            </span>
            <Button
              size="sm"
              variant="destructive"
              disabled={bulkActing}
              onClick={() => handleBulkStatus("inactive")}
            >
              <FaBan className="mr-1" /> {t("users.select.blockselected")}
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700"
              disabled={bulkActing}
              onClick={() => handleBulkStatus("active")}
            >
              <FaCheck className="mr-1" /> {t("users.select.unblockselected")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedUsers(new Set())}
            >
              {t("users.select.clearSelection")}
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-4 text-sm text-gray-700">
          {t("users.stats.showing")} {users.length} {t("users.stats.of")}{" "}
          {pagination.total} {t("users.stats.users")}
        </div>

        {/* TABLE FOR DESKTOP */}
        <div className="hidden md:block bg-white border rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold w-12">#</th>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && selectedUsers.size === users.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  {t("users.table.contact")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  {t("users.table.phone")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  {t("users.table.Channels")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  {t("users.table.status")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  {t("users.table.Registered")}
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  {t("users.table.lastLogin")}
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold">
                  {t("users.table.actions")}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                    {t("users.loading")}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                    {t("users.noUsers")}
                  </td>
                </tr>
              ) : (
                users.map((u, index) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500 font-medium">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(u.id)}
                        onChange={() => toggleUserSelection(u.id)}
                      />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center overflow-hidden">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            isDemoUser(user?.username) ? "*" : u.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/users/${u.id}`}
                            className="text-sm font-medium hover:text-green-600"
                          >
                            {isDemoUser(user?.username) ? maskName(u.username) : u.username}
                          </Link>
                          <p className="text-xs text-gray-500">{isDemoUser(user?.username) ? maskEmail(u.email) : u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {isDemoUser(user?.username) ? maskPhone(u.phone || "") : (u.phone || t("users.phonePlaceholder"))}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {u.channelCount ?? 0}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold 
                        ${statusColors[u.status?.toLowerCase()]}`}
                      >
                        {u.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-500">
                      {u.createdAt
                        ? formatDateTime(u.createdAt)
                        : "—"}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {u.lastLogin ? (
                        formatDateTime(u.lastLogin)
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-400">{t("users.lastLoginNever")}</span>
                          {u.isEmailVerified === false && (
                            <span className="text-[10px] text-orange-500">Email not verified</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-3 text-gray-500">
                        <FaEdit
                          onClick={() => {
                            setSelectedUserForEdit(u);
                            setEditModalOpen(true);
                          }}
                          className="cursor-pointer hover:text-blue-600"
                          title="Edit User"
                        />
                        <Link href={`/users/${u.id}`}>
                          <FaEye className="cursor-pointer hover:text-green-600" />
                        </Link>

                        {/* PLAN ASSIGN DROPDOWN */}
                        <FaCrown
                          onClick={() => openAssignPlanModal(u)}
                          className="cursor-pointer text-yellow-500 hover:text-yellow-600"
                          title="Assign Plan"
                        />

                        {u.status === "active" ? (
                          <FaBan
                            onClick={() => handleToggleStatus(u)}
                            className="cursor-pointer hover:text-red-600"
                            title={t("users.actions.blockUser")}
                          />
                        ) : (
                          <FaCheck
                            onClick={() => handleToggleStatus(u)}
                            className="cursor-pointer hover:text-green-600"
                            title={t("users.actions.activateUser")}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LIST */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <p className="text-center text-gray-500 py-10">
              {t("users.loading")}
            </p>
          ) : users.length === 0 ? (
            <p className="text-center text-gray-500 py-10">
              {t("users.noUsers")}
            </p>
          ) : (
            users.map((u, index) => (
              <div
                key={u.id}
                className="bg-white shadow-sm rounded-lg p-4 border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 font-medium w-6 text-center flex-shrink-0">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </span>
                    <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center overflow-hidden">
                      {u.avatar ? (
                        <img
                          src={u.avatar}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        isDemoUser(user?.username) ? "*" : u.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/users/${u.id}`}
                        className="font-semibold text-gray-800"
                      >
                        {isDemoUser(user?.username) ? maskName(u.username) : u.username}
                      </Link>
                      <p className="text-xs text-gray-500">{isDemoUser(user?.username) ? maskEmail(u.email) : u.email}</p>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={selectedUsers.has(u.id)}
                    onChange={() => toggleUserSelection(u.id)}
                  />
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>{t("users.card.phone")}</strong>{" "}
                    {isDemoUser(user?.username) ? maskPhone(u.phone || "") : (u.phone || t("users.phonePlaceholder"))}
                  </p>
                  <p>
                    <strong>Channels:</strong>{" "}
                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {u.channelCount ?? 0}
                    </span>
                  </p>
                  <p>
                    <strong>{t("users.card.status")}</strong>{" "}
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[u.status.toLowerCase()]
                        }`}
                    >
                      {u.status.toUpperCase()}
                    </span>
                  </p>
                  <p>
                    <strong>{t("users.card.lastLogin")}</strong>{" "}
                    {u.lastLogin ? (
                      formatDateTime(u.lastLogin)
                    ) : (
                      <span>
                        {t("users.lastLoginNever")}
                        {u.isEmailVerified === false && (
                          <span className="ml-1 text-[10px] text-orange-500">(Email not verified)</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-2 text-gray-500">
                  <FaEdit
                    onClick={() => {
                      setSelectedUserForEdit(u);
                      setEditModalOpen(true);
                    }}
                    className="cursor-pointer hover:text-blue-600"
                    title="Edit User"
                  />
                  <Link href={`/users/${u.id}`}>
                    <FaEye className="cursor-pointer hover:text-green-600" />
                  </Link>
                  {u.status === "active" ? (
                    <FaBan
                      onClick={() => handleToggleStatus(u)}
                      className="cursor-pointer hover:text-red-600"
                      title={t("users.actions.blockUser")}
                    />
                  ) : (
                    <FaCheck
                      onClick={() => handleToggleStatus(u)}
                      className="cursor-pointer hover:text-green-600"
                      title={t("users.actions.activateUser")}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <div className="flex items-center gap-4 order-2 sm:order-1">
            <span className="text-sm text-gray-700">
              {t("users.pagination.showing")}{" "}
              {(pagination.page - 1) * pagination.limit + 1}{" "}
              {t("users.pagination.to")}{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              {t("users.pagination.of")} {pagination.total}{" "}
              {t("users.pagination.users")}
            </span>

            <select
              value={pagination.limit}
              onChange={(e) =>
                setPagination((p) => ({
                  ...p,
                  limit: Number(e.target.value),
                  page: 1,
                }))
              }
              className="border px-2 py-1 rounded text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-2 order-1 sm:order-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              {t("users.pagination.previous")}
            </Button>

            <PageNumbers
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />

            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              {t("users.pagination.next")}
            </Button>
          </div>
        </div>
      </div>

      <AddUserModal
        open={openAddModal}
        onOpenChange={setOpenAddModal}
        onSuccess={() => fetchUsers()}
      />


      <AssignPlanModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        user={selectedUserForPlan}
        plans={plans}
        subscriptions={userPlans}
        onSuccess={fetchUsers}
      />

      <EditUserModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        user={selectedUserForEdit}
        onSuccess={() => fetchUsers(pagination.page, search, pagination.limit)}
      />

    </div>
  );
};

export default User;
