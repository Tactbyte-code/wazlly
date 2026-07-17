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

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Upload,
  Plus,
  MessageSquare,
  Phone,
  Download,
  Shield,
  CheckCircle,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  insertContactSchema,
  type Contact,
  type InsertContact,
} from "@shared/schema";
import Papa from "papaparse";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { isDemoUser, maskValue, maskName, maskEmail, maskPhone } from "@/utils/maskUtils";

interface ContactsResponse {
  data: Contact[];
  pagination: {
    page: number;
    limit: number;
    count: number;
    total: number;
    totalPages: number;
  };
  stats?: {
    total: number;
    uniquePhones: number;
    activeCount: number;
    blockedCount: number;
    groupedTotal?: number;
  };
}

// Edit Contact Form Component
function EditContactForm({
  contact,
  onSuccess,
  onCancel,
}: {
  contact: Contact;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: contact.name,
      email: contact.email || "",
      phone: contact.phone,
      groups: contact.groups || [],
      tags: contact.tags || [],

      status: contact.status,
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      const response = await apiRequest("PUT", `/api/contacts/${contact.id}`, data);
      if (!response.ok) throw new Error("Failed to update contact");
      return response.json();
    },
    onSuccess: () => {
      // Editing a contact may change its `groups` array, so refresh
      // group lists, counts, and the members drawer.
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/contact-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });
      onSuccess();
    },
    onError: () => {
      // Handle error
    },
  });

  const onSubmit = (data: InsertContact) => {
    updateContactMutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => {
            const _demo = isDemoUser(user?.username);
            const maskedValue = _demo ? maskName(field.value) : field.value;

            return (
              <FormItem>
                <FormLabel>{t("contacts.addContact.name")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={maskedValue || ""}
                    readOnly={_demo}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => {
            const _demo = isDemoUser(user?.username);
            const maskedValue = _demo ? maskEmail(field.value || "") : field.value;

            return (
              <FormItem>
                <FormLabel>{t("contacts.addContact.email")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    value={maskedValue || ""}
                    readOnly={_demo}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => {
            const _demo = isDemoUser(user?.username);
            const maskedValue = _demo ? maskPhone(field.value || "") : field.value;

            return (
              <FormItem>
                <FormLabel>{t("contacts.addContact.phone")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={maskedValue}
                    readOnly={_demo}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          control={form.control}
          name="groups"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("contacts.groups")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={`${t("contacts.editContact.groupsPlaceholder")}`}
                  value={
                    Array.isArray(field.value) ? field.value.join(", ") : ""
                  }
                  onChange={(e) => {
                    const groups = e.target.value
                      .split(",")
                      .map((g) => g.trim())
                      .filter((g) => g.length > 0);
                    field.onChange(groups);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            disabled={
              isDemoUser(user?.username)
                ? true
                : updateContactMutation.isPending
            }
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {updateContactMutation.isPending
              ? `${t("contacts.editContact.updating")}`
              : t("contacts.editContact.successTitle")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
const ITEMS_PER_PAGE = 10;
export default function ContactsManagements() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState("text");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateVariables, setTemplateVariables] = useState<
    Record<string, string>
  >({});
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null); // Add status filter
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { user } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phone = params.get("phone");
    if (phone) {
      setSearchQuery(phone);
    }
    console.log("Initial search query from URL:", phone);
  }, []);

  // Form for adding contacts
  const form = useForm<InsertContact>({
    resolver: zodResolver(insertContactSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      groups: [],
      tags: [],
    },
  });

  // First, get the active channel
  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  // Updated query to fetch contacts with proper server-side filtering
  const { data: contactsResponse, isLoading } = useQuery<ContactsResponse>({
    queryKey: [
      "/contacts-management",
      currentPage,
      limit,
      selectedGroup,
      selectedStatus,
      searchQuery,
    ],
    queryFn: async () => {
      const response = await api.getAllContacts(
        searchQuery || undefined,
        currentPage,
        limit,
        selectedGroup !== "all" && selectedGroup ? selectedGroup : undefined,
        selectedStatus !== "all" && selectedStatus ? selectedStatus : undefined
      );

      return (await response.json()) as ContactsResponse;
    },
    placeholderData: (prev) => prev,
    // enabled: !!activeChannel,
  });

  // console.log("check contact", contactsResponse);

  const contacts = contactsResponse?.data || [];
  const contactStats = contactsResponse?.stats;

  const pagination = contactsResponse?.pagination || {
    page: 1,
    limit: limit,
    count: 0,
    total: 0,
    totalPages: 1,
  };

  // Destructure values from backend
  const { page, totalPages, total, count } = pagination;
  // console.log("Contacts fetched:", contacts, pagination);

  // Pagination helpers
  const goToPage = (p: number) => setCurrentPage(p);
  const goToPreviousPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const halfRange = Math.floor(maxPagesToShow / 2);

    let startPage = Math.max(1, page - halfRange);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // Adjust start if we're near the end
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // Extract unique groups from all contacts for filter dropdown
  const uniqueGroups = useMemo(() => {
    if (!contacts.length) return [];
    const groups = new Set<string>();
    contacts.forEach((contact: Contact) => {
      if (Array.isArray(contact.groups)) {
        contact.groups.forEach((group: string) => groups.add(group));
      }
    });
    return Array.from(groups).sort();
  }, [contacts]);

  // Extract unique statuses for filter dropdown
  const uniqueStatuses = useMemo(() => {
    if (!contacts.length) return [];
    const statuses = new Set<string>();
    contacts.forEach((contact: Contact) => {
      if (contact.status) {
        statuses.add(contact.status);
      }
    });
    return Array.from(statuses).sort();
  }, [contacts]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGroup, selectedStatus]);

  // Selection handlers - using contacts directly since pagination is server-side
  const allSelected =
    contacts.length > 0 &&
    contacts.every((contact: Contact) =>
      selectedContactIds.includes(contact.id)
    );

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedContactIds((prev) =>
        prev.filter((id) => !contacts.some((contact) => contact.id === id))
      );
    } else {
      setSelectedContactIds((prev) => [
        ...prev,
        ...contacts
          .map((contact) => contact.id)
          .filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Clear filters function
  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedGroup(null);
    setSelectedStatus(null);
    setCurrentPage(1);
  };

  const { data: channels } = useQuery({
    queryKey: ["/api/whatsapp/channels"],
    queryFn: async () => {
      const response = await fetch("/api/whatsapp/channels");
      return await response.json();
    },
  });

  const { data: availableTemplates = [] } = useQuery({
    queryKey: ["/api/templates", activeChannel?.id],
    queryFn: async () => {
      const response = await fetch("/api/templates");
      return await response.json();
    },
    enabled: !!activeChannel,
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/contacts/${id}`);
      if (!response.ok) throw new Error("Failed to delete contact");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/contact-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });
      toast({
        title: "Contact deleted",
        description: "The contact has been successfully deleted.",
      });
      setShowDeleteDialog(false);
      setContactToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteBulkContactsMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiRequest("DELETE", `/api/contacts-bulk`, { ids });

      if (!response.ok) {
        throw new Error("Failed to delete contacts");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/contact-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });
      toast({
        title: "Contacts deleted",
        description: "The selected contacts have been successfully deleted.",
      });
      setSelectedContactIds([]); // Clear selection
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contacts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleContactStatusMutation = useMutation({
    mutationFn: async ({
      id,
      newStatus,
    }: {
      id: string;
      newStatus: "active" | "blocked";
    }) => {
      const response = await apiRequest("PUT", `/api/contacts/${id}`, { status: newStatus });
      if (!response.ok)
        throw new Error(
          `Failed to ${newStatus === "blocked" ? "block" : "unblock"} contact`
        );
    },
    onSuccess: (_, { newStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      toast({
        title: `Contact ${newStatus === "blocked" ? "blocked" : "unblocked"}`,
        description: `The contact has been ${
          newStatus === "blocked" ? "blocked" : "unblocked"
        } successfully.`,
      });
    },
    onError: (_, { newStatus }) => {
      toast({
        title: "Error",
        description: `Failed to ${
          newStatus === "blocked" ? "block" : "unblock"
        } contact. Please try again.`,
        variant: "destructive",
      });
    },
  });

  // Single handler function
  const handleToggleContactStatus = (
    id: string,
    currentStatus: string | null
  ): void => {
    const newStatus = currentStatus === "active" ? "blocked" : "active";
    toggleContactStatusMutation.mutate({ id, newStatus });
  };

  type InsertContact = {
    name: string;
    phone: string;
    email: string;
    groups: string[];
    tags: string[];
  };

  if (isLoading) {
    return (
      <div className="flex-1 dots-bg">
        <Header title={t("navigation.contacts")} subtitle={t("common.loading")} />
        <div className="p-6">
          <Loading size="lg" text={t("common.loading")} />
        </div>
      </div>
    );
  }

  // ✅ Export Selected Contacts
  const handleExportSelectedContacts = () => {
    const selectedContacts = contacts.filter((contact) =>
      selectedContactIds.includes(contact.id)
    );

    if (selectedContacts.length === 0) {
      alert(t("contacts.noContactsSelected") || "No contacts selected.");
      return;
    }

    exportToExcel(selectedContacts, "selected_contacts.xlsx");
  };

  // ✅ Export All Contacts
  const handleExportAllContacts = async () => {
    try {
      const response = await fetch("/api/contacts-all");
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const allContacts: Contact[] = await response.json();

      if (!allContacts || allContacts.length === 0) {
        alert(t("contacts.noContactsAvailable") || "No contacts available.");
        return;
      }

      exportToExcel(allContacts, "all_contacts.xlsx");
    } catch (error) {
      console.error("Error exporting contacts:", error);
      alert(t("contacts.exportFailed") || "Failed to export contacts. Please try again.");
    }
  };

  // ✅ Reusable Excel Export Function (using ExcelJS)
  const exportToExcel = async (data: any[], fileName: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Contacts");

    if (data.length === 0) {
      alert(t("contacts.noDataToExport") || "No data to export.");
      return;
    }

    // Add header row based on keys of first object
    worksheet.columns = Object.keys(data[0]).map((key) => ({
      header: key.charAt(0).toUpperCase() + key.slice(1),
      key,
      width: 20,
    }));

    // Add all rows
    data.forEach((item) => {
      worksheet.addRow(item);
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };

    // Generate file and download
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), fileName);
  };

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header title={t("contacts.title")} subtitle={t("contacts.subtitle")} />

      <main className="p-6 space-y-6">
        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={`${t("contacts.searchContacts")}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="w-4 h-4 mr-2" />
                    {selectedStatus || `${t("contacts.allStatuses")}`}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setSelectedStatus(null)}
                    className={!selectedStatus ? "bg-gray-100" : ""}
                  >
                    {t("contacts.allStatuses")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedStatus("active")}
                    className={selectedStatus === "active" ? "bg-gray-100" : ""}
                  >
                    {t("contacts.active")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setSelectedStatus("blocked")}
                    className={
                      selectedStatus === "blocked" ? "bg-gray-100" : ""
                    }
                  >
                    {t("contacts.blocked")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="outline"
                onClick={handleExportAllContacts}
                disabled={isDemoUser(user?.username)}
              >
                <Upload className="w-4 h-4 mr-2" />
                {t("contacts.exportAllContacts")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {contactStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{contactStats.total.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{t("contacts.stats.totalContacts")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{contactStats.uniquePhones.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{t("contacts.stats.uniquePhones")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{contactStats.activeCount.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{t("contacts.active")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{contactStats.blockedCount.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">{t("contacts.blocked")}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Bulk Actions */}
        {selectedContactIds.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedContactIds.length} {selectedContactIds.length > 1 ? t("contacts.contacts") : t("contacts.contact")}{" "}
                  {t("contacts.selected")}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportSelectedContacts}
                    disabled={isDemoUser(user?.username)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {t("contacts.exportSelected")}
                  </Button>
                  <Button
                    disabled={isDemoUser(user?.username)}
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => setShowBulkDeleteDialog(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {t("contacts.deleteSelected")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {!contacts.length ? (
              <EmptyState
                icon={Users}
                title={`${t("contacts.noContactsFound")}`}
                description=""
                // description={
                //   searchQuery || selectedGroup || selectedStatus
                //     ? `${t("contacts.noFilters")}`
                //     : `${t("contacts.noContactsYet")}`
                // }
                // action={
                //   !(searchQuery || selectedGroup || selectedStatus)
                //     ? {
                //         label: `${t("contacts.addYourFirstContact")}`,
                //         onClick: () => setShowAddDialog(true),
                //       }
                //     : {
                //         label: ` ${t("contacts.clearFilters")}`,
                //         onClick: clearAllFilters,
                //       }
                // }
                className="py-12"
              />
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 xl:px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={allSelected}
                            onChange={toggleSelectAll}
                          />
                        </th>
                        <th className="text-left px-4 xl:px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("contacts.contact")}
                        </th>
                        <th className="text-left px-4 xl:px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("contacts.phone")}
                        </th>
                        <th className="text-left px-4 xl:px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("contacts.stats.createdBy")}
                        </th>
                        <th className="text-left px-4 xl:px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("contacts.status")}
                        </th>
                        <th className="text-left px-4 xl:px-6 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t("contacts.lastContact")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {contacts.map((contact: Contact) => (
                        <tr
                          key={contact.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 xl:px-6 py-4">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300"
                              checked={selectedContactIds.includes(contact.id)}
                              onChange={() => toggleSelectOne(contact.id)}
                            />
                          </td>
                          <td className="px-4 xl:px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-medium text-gray-600">
                                  {isDemoUser(user?.username) ? "*" : contact.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="ml-3 xl:ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {isDemoUser(user?.username) ? maskName(contact.name) : contact.name}
                                </div>
                                {contact.email && (
                                  <div className="text-sm text-gray-500">
                                    {isDemoUser(user?.username) ? maskEmail(contact.email) : contact.email}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 xl:px-6 py-4 text-sm text-gray-900">
                            {isDemoUser(user?.username) ? maskPhone(contact.phone) : contact.phone}
                          </td>
                          <td className="px-4 xl:px-6 py-4 text-sm text-gray-900">
                            {isDemoUser(user?.username) ? maskName(contact?.createdByName?.trim() || "-") : (contact?.createdByName?.trim() || "-")}
                          </td>
                          <td className="px-4 xl:px-6 py-4">
                            <Badge
                              variant={
                                contact.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                contact.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {contact.status === "active" ? t("contacts.active") : contact.status === "blocked" ? t("contacts.blocked") : (contact.status?.toUpperCase() || "N/A")}
                            </Badge>
                          </td>
                          <td className="px-4 xl:px-6 py-4 text-sm text-gray-900">
                            {contact.lastContact
                              ? new Date(
                                  contact.lastContact
                                ).toLocaleDateString()
                              : t("contacts.never")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile/Tablet Card View */}
                <div className="lg:hidden divide-y divide-gray-200">
                  {/* Select All Bar */}
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                      />
                      {t("contacts.selectAll")}
                    </label>
                    {selectedContactIds.length > 0 && (
                      <span className="text-sm text-gray-600">
                        {selectedContactIds.length} {t("contacts.selected")}
                      </span>
                    )}
                  </div>

                  {/* Contact Cards */}
                  {contacts.map((contact: Contact) => (
                    <div key={contact.id} className="bg-white p-4">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 mt-1"
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={() => toggleSelectOne(contact.id)}
                        />

                        {/* Avatar */}
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-base font-medium text-gray-600">
                            {isDemoUser(user?.username) ? "*" : contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>

                        {/* Contact Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base font-semibold text-gray-900 truncate">
                                {isDemoUser(user?.username) ? maskName(contact.name) : contact.name}
                              </h3>
                              {contact.email && (
                                <p className="text-sm text-gray-500 truncate">
                                  {isDemoUser(user?.username) ? maskEmail(contact.email) : contact.email}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={
                                contact.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                              className={`ml-2 flex-shrink-0 ${
                                contact.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {contact.status === "active" ? t("contacts.active") : contact.status === "blocked" ? t("contacts.blocked") : (contact.status?.toUpperCase() || "N/A")}
                            </Badge>
                          </div>

                          {/* Contact Details Grid */}
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">{t("contacts.phoneLabel")}</span>
                              <span className="text-gray-900 font-medium">
                                {isDemoUser(user?.username) ? maskPhone(contact.phone) : contact.phone}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">{t("contacts.stats.createdBy")}:</span>
                              <span className="text-gray-900">
                                {isDemoUser(user?.username) ? maskName(contact?.createdByName?.trim() || "-") : (contact?.createdByName?.trim() || "-")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">
                                {t("contacts.lastContactLabel")}
                              </span>
                              <span className="text-gray-900">
                                {contact.lastContact
                                  ? new Date(
                                      contact.lastContact
                                    ).toLocaleDateString()
                                  : t("contacts.never")}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Enhanced Pagination - Responsive */}
            {contacts.length > 0 && (
              <div className="bg-gray-50 border-t border-gray-200">
                {/* Desktop Pagination */}
                <div className="hidden md:flex items-center justify-between px-4 xl:px-6 py-3">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-700">
                      {t("contacts.showing", {
                        from: (page - 1) * limit + 1,
                        to: Math.min((page - 1) * limit + limit, total),
                        total: total
                      })}
                    </div>

                    <Select
                      value={limit.toString()}
                      onValueChange={(value) => {
                        setLimit(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={page === 1}
                    >
                      {t("contacts.previous")}
                    </Button>

                    {getPageNumbers().map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className={
                          page === pageNum
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : ""
                        }
                      >
                        {pageNum}
                      </Button>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={page === totalPages}
                    >
                      {t("contacts.next")}
                    </Button>
                  </div>
                </div>

                {/* Mobile Pagination */}
                <div className="md:hidden px-4 py-3 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">
                      <span className="font-medium">
                        {(page - 1) * limit + 1}
                      </span>{" "}
                      -{" "}
                      <span className="font-medium">
                        {Math.min((page - 1) * limit + limit, total)}
                      </span>{" "}
                       {t("common.of")} <span className="font-medium">{total}</span>
                    </span>

                    <Select
                      value={limit.toString()}
                      onValueChange={(value) => {
                        setLimit(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-20 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={page === 1}
                      className="flex-1"
                    >
                      {t("contacts.previous")}
                    </Button>

                    <div className="px-3 py-1.5 bg-green-100 rounded-md">
                      <span className="text-sm font-medium text-green-700">
                        {t("contacts.pageOf", { page, totalPages })}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={page === totalPages}
                      className="flex-1"
                    >
                      {t("contacts.next")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contacts.deleteContact.title")}</DialogTitle>
            <DialogDescription>
              {t("contacts.deleteContact.title")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setContactToDelete(null);
              }}
            >
              {t("contacts.addContact.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (contactToDelete) {
                  deleteContactMutation.mutate(contactToDelete);
                }
              }}
              disabled={deleteContactMutation.isPending}
            >
              {deleteContactMutation.isPending ? t("contacts.deleteContact.deleting") : t("common.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog
        open={showBulkDeleteDialog}
        onOpenChange={setShowBulkDeleteDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contacts.deleteContacts.title")}</DialogTitle>
            <DialogDescription>
              {t("contacts.deleteContacts.description")}{" "}
              <strong>{selectedContactIds.length}</strong>{" "}
              {selectedContactIds.length > 1
                ? `${t("contacts.contacts")}`
                : `${t("contacts.contact")}`}
              . {t("contacts.deleteContacts.confirmation")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowBulkDeleteDialog(false);
              }}
            >
              {t("contacts.addContact.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteBulkContactsMutation.mutate(selectedContactIds);
                setShowBulkDeleteDialog(false);
              }}
              disabled={deleteBulkContactsMutation.isPending}
            >
              {deleteBulkContactsMutation.isPending
                ? `${t("contacts.deleteContacts.deleting")}`
                : `${t("contacts.deleteContacts.title")}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("contacts.editContact.title")}</DialogTitle>
            <DialogDescription>
              {t("contacts.editContact.description")}
            </DialogDescription>
          </DialogHeader>
          {selectedContact && (
            <EditContactForm
              contact={selectedContact}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
                setShowEditDialog(false);
                setSelectedContact(null);
                toast({
                  title: `${t("contacts.editContact.successTitle")}`,
                  description: `${t("contacts.editContact.successDesc")}`,
                });
              }}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedContact(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
