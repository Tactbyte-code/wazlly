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

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Loading } from "@/components/ui/loading";
import { useTranslation } from "@/lib/i18n";
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
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { type ContactsResponse } from "./types";
import { exportToExcel } from "./utils";
import { ContactsToolbar } from "./ContactsToolbar";
import { ContactsTable } from "./ContactsTable";
import { ContactDialogs } from "./ContactDialogs";
import { TemplateMessageDialog } from "./TemplateMessageDialog";

const ITEMS_PER_PAGE = 10;

type LocalInsertContact = {
  name: string;
  phone: string;
  email: string;
  groups: string[];
  tags: string[];
};

const CHUNK_SIZE = 1000;

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-().+]/g, "");
  return /^\d{7,15}$/.test(digits);
}

async function detectAndDecodeText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let text: string;
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    text = new TextDecoder("utf-16le").decode(buffer);
  } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    text = new TextDecoder("utf-16be").decode(buffer);
  } else {
    text = new TextDecoder("utf-8").decode(buffer);
  }
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export default function Contacts() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showAssignGroupDialog, setShowAssignGroupDialog] = useState(false);
  const [assignGroupContactIds, setAssignGroupContactIds] = useState<string[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [headerType, setHeaderType] = useState<string | null>(null);
  const [importState, setImportState] = useState<{
    active: boolean;
    current: number;
    total: number;
    label: string;
  }>({ active: false, current: 0, total: 0, label: "" });
  const importAbortRef = useRef(false);
  const [pendingImport, setPendingImport] = useState<{
    contacts: LocalInsertContact[];
    noPhoneCount: number;
    invalidFormatCount: number;
    validCount: number;
  } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phone = params.get("phone");
    if (phone) {
      setSearchQuery(phone);
    }
    console.log("Initial search query from URL:", phone);
  }, []);

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

  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const { data: groupsFormateData } = useQuery({
    queryKey: ["/api/groups", activeChannel?.id],
    queryFn: async () => {
      const response = await fetch(`/api/groups?channelId=${activeChannel?.id}`);
      return await response.json();
    },
    enabled: !!activeChannel?.id,
  });

  const groupsData = groupsFormateData?.groups || [];

  const userIdNew = user?.role === "team" ? user?.createdBy : user?.id;

  const { data: contactsResponse, isLoading } = useQuery<ContactsResponse>({
    queryKey: [
      "/api/contacts",
      activeChannel?.id,
      currentPage,
      limit,
      selectedGroup,
      selectedStatus,
      searchQuery,
      userIdNew,
    ],

    queryFn: async () => {
      if (!user?.id) return { data: [], pagination: {} } as any;

      const response = await api.getContacts(
        searchQuery || undefined,
        activeChannel?.id,
        currentPage,
        limit,
        selectedGroup !== "all" && selectedGroup ? selectedGroup : undefined,
        selectedStatus !== "all" && selectedStatus ? selectedStatus : undefined,
        userIdNew
      );

      return (await response.json()) as ContactsResponse;
    },

    placeholderData: (prev) => prev,
  });

  const contacts = contactsResponse?.data || [];
  const pagination = contactsResponse?.pagination || {
    page: 1,
    limit: limit,
    count: 0,
    total: 0,
    totalPages: 1,
  };

  const { page, totalPages, total, count } = pagination;

  const goToPage = (p: number) => setCurrentPage(p);
  const goToPreviousPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const halfRange = Math.floor(maxPagesToShow / 2);

    let startPage = Math.max(1, page - halfRange);
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedGroup, selectedStatus]);

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

  const createContactMutation = useMutation({
    mutationFn: async (data: InsertContact) => {
      if (!activeChannel?.id) {
        throw new Error("Please create a channel first.");
      }

      const response = await apiRequest("POST", `/api/contacts`, {
        ...data,
        channelId: activeChannel.id,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const message =
          errorData?.error || errorData?.message || "Failed to create contact";
        throw new Error(message);
      }

      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/contact-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });
      toast({
        title: "Contact created",
        description: "The contact has been successfully added.",
      });
      setShowAddDialog(false);
      form.reset();
    },

    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to create contact.",
        variant: "destructive",
      });
    },
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
      setSelectedContactIds([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete contacts. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: any) => {
      const {
        phone,
        type,
        message,
        templateName,
        templateLanguage,
        templateVariables,
        headerMediaId,
        headerType: dataHeaderType,
        buttonParameters,
        expirationTimeMs,
        carouselCardMediaIds,
      } = data;

      if (!activeChannel?.id) {
        throw new Error("No active channel selected");
      }

      const payload =
        type === "template"
          ? {
              to: phone,
              type: "template",
              templateName,
              templateLanguage,
              templateVariables,
              headerType: dataHeaderType,
              ...(headerMediaId && { headerMediaId }),
              ...(Array.isArray(buttonParameters) && buttonParameters.length > 0 && { buttonParameters }),
              ...(expirationTimeMs && { expirationTimeMs }),
              ...(carouselCardMediaIds && Object.keys(carouselCardMediaIds).length > 0 && { carouselCardMediaIds }),
            }
          : {
              to: phone,
              type: "text",
              message,
            };

      const response = await apiRequest(
        "POST",
        `/api/whatsapp/channels/${activeChannel.id}/send`,
        payload,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to send message");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your WhatsApp message has been sent successfully.",
      });
      setShowMessageDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to send message. Please check your WhatsApp configuration and template settings.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteContact = (id: string) => {
    setContactToDelete(id);
    setShowDeleteDialog(true);
  };

  const uploadContactsInChunks = async (parsedContacts: LocalInsertContact[]) => {
    importAbortRef.current = false;
    const total = parsedContacts.length;
    const chunks: LocalInsertContact[][] = [];
    for (let i = 0; i < total; i += CHUNK_SIZE) {
      chunks.push(parsedContacts.slice(i, i + CHUNK_SIZE));
    }

    let totalCreated = 0;
    let totalDuplicates = 0;
    let totalFailed = 0;

    setImportState({ active: true, current: 0, total, label: "Preparing upload..." });

    try {
      for (let i = 0; i < chunks.length; i++) {
        if (importAbortRef.current) break;
        const chunkStart = i * CHUNK_SIZE + 1;
        const chunkEnd = Math.min((i + 1) * CHUNK_SIZE, total);
        setImportState({
          active: true,
          current: chunkEnd,
          total,
          label: `Uploading ${chunkStart.toLocaleString()}–${chunkEnd.toLocaleString()} of ${total.toLocaleString()}…`,
        });

        const response = await apiRequest(
          "POST",
          `/api/contacts/import${activeChannel?.id ? `?channelId=${activeChannel.id}` : ""}`,
          { contacts: chunks[i] },
        );

        if (!response.ok) {
          if (response.status === 413) throw new Error("__413__");
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.error || errorData?.message || "Import failed");
        }

        const data = await response.json();
        totalCreated += data.imported ?? 0;
        totalDuplicates += data.duplicates ?? 0;
        totalFailed += data.invalid ?? 0;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/contact-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });

      const wasCanceled = importAbortRef.current;
      const description = [
        `${totalCreated.toLocaleString()} contact${totalCreated !== 1 ? "s" : ""} imported`,
        `${totalDuplicates.toLocaleString()} duplicate${totalDuplicates !== 1 ? "s" : ""} skipped`,
        `${totalFailed.toLocaleString()} row${totalFailed !== 1 ? "s" : ""} invalid`,
      ].join(", ");

      toast({
        title: wasCanceled ? "Import Canceled" : "Import Completed",
        description: wasCanceled
          ? `Canceled early. ${description}.`
          : description,
      });
    } catch (error: any) {
      const is413 = error.message === "__413__";
      toast({
        title: is413 ? "File Too Large" : "Import Failed",
        description: is413
          ? "A chunk was too large — please contact support."
          : error.message || "Failed to import contacts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setImportState({ active: false, current: 0, total: 0, label: "" });
    }
  };

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

  const handleToggleContactStatus = (
    id: string,
    currentStatus: string | null
  ): void => {
    const newStatus = currentStatus === "active" ? "blocked" : "active";
    toggleContactStatusMutation.mutate({ id, newStatus });
  };

  const addToGroupMutation = useMutation({
    mutationFn: async ({ contactIds, groupName }: { contactIds: string[]; groupName: string }) => {
      const response = await apiRequest("POST", "/api/groups/add-contacts", {
        contactIds,
        groupName,
        channelId: activeChannel?.id,
      });
      if (!response.ok) throw new Error("Failed to add contacts to group");
      return response.json();
    },
    onSuccess: (data, { groupName }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/contact-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });
      toast({
        title: "Contacts added to group",
        description: `${data.updatedCount} contact${data.updatedCount !== 1 ? "s" : ""} added to "${groupName}"`,
      });
      setShowAssignGroupDialog(false);
      setAssignGroupContactIds([]);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add contacts to group",
        variant: "destructive",
      });
    },
  });

  const removeFromGroupMutation = useMutation({
    mutationFn: async ({ contactIds, groupName }: { contactIds: string[]; groupName: string }) => {
      const response = await apiRequest("POST", "/api/groups/remove-contacts", {
        contactIds,
        groupName,
        channelId: activeChannel?.id,
      });
      if (!response.ok) throw new Error("Failed to remove contacts from group");
      return response.json();
    },
    onSuccess: (data, { groupName }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/contact-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });
      toast({
        title: "Contacts removed from group",
        description: `${data.updatedCount} contact${data.updatedCount !== 1 ? "s" : ""} removed from "${groupName}"`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove contacts from group",
        variant: "destructive",
      });
    },
  });

  const handleOpenAssignGroup = (contactIds: string[]) => {
    setAssignGroupContactIds(contactIds);
    setShowAssignGroupDialog(true);
  };


  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";

    try {
      const text = await detectAndDecodeText(file);

      const results = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      });

      if (results.errors.length > 0) {
        const sample = results.errors.slice(0, 3).map((e) => e.message).join("; ");
        toast({
          title: "CSV Parse Warnings",
          description: `${results.errors.length} row(s) had parse issues and may be skipped. First issue: ${sample}`,
          variant: "default",
        });
      }

      const parsedContacts: LocalInsertContact[] = (results.data as any[])
        .filter((row) => row && Object.keys(row).length > 0)
        .map((row: any) => ({
          name: row?.name?.toString().trim() || "",
          phone: row?.phone ? String(row.phone).trim() : "",
          email: row?.email?.toString().trim() || "",
          groups: row?.groups
            ? row.groups.split(",").map((g: string) => g.trim())
            : [],
          tags: row?.tags
            ? row.tags.split(",").map((t: string) => t.trim())
            : [],
        }))
        .filter((c) => c.name || c.phone);

      if (parsedContacts.length === 0) {
        toast({
          title: "CSV Error",
          description: "No valid contacts found in the file.",
          variant: "destructive",
        });
        return;
      }

      const noPhone = parsedContacts.filter((c) => !c.phone).length;
      const invalidFormat = parsedContacts.filter((c) => c.phone && !isValidPhone(c.phone)).length;
      if (noPhone > 0 || invalidFormat > 0) {
        setPendingImport({ contacts: parsedContacts, noPhoneCount: noPhone, invalidFormatCount: invalidFormat, validCount: parsedContacts.length });
      } else {
        uploadContactsInChunks(parsedContacts);
      }
    } catch (err: any) {
      toast({
        title: "CSV Parse Error",
        description: err.message || "Failed to parse CSV file.",
        variant: "destructive",
      });
    }
  };

  const handleExcelUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        alert("No worksheet found in Excel file.");
        return;
      }

      const rows: Record<string, string>[] = [];

      const headerRow = worksheet.getRow(1);
      if (!headerRow || !headerRow.values) {
        alert("No header row found in Excel file.");
        return;
      }

      const headerValues = Array.isArray(headerRow.values)
        ? headerRow.values
            .slice(1)
            .map((h: ExcelJS.CellValue | undefined) =>
              typeof h === "string"
                ? h.trim().toLowerCase()
                : typeof h === "number"
                ? String(h)
                : ""
            )
        : [];

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const rowData: Record<string, string> = {};
        if (row.values && Array.isArray(row.values)) {
          row.values
            .slice(1)
            .forEach((cell: ExcelJS.CellValue | undefined, idx: number) => {
              const key = headerValues[idx];
              if (key) {
                if (typeof cell === "string") rowData[key] = cell.trim();
                else if (typeof cell === "number") rowData[key] = String(cell);
                else rowData[key] = "";
              }
            });
        }

        rows.push(rowData);
      });

      const parsedContacts: LocalInsertContact[] = rows.map((row) => ({
        name: row["name"] || "",
        phone: row["phone"] || "",
        email: row["email"] || "",
        groups: row["groups"]
          ? row["groups"].split(",").map((g) => g.trim())
          : [],
        tags: row["tags"] ? row["tags"].split(",").map((t) => t.trim()) : [],
      }));

      const noPhone = parsedContacts.filter((c) => !c.phone).length;
      const invalidFormat = parsedContacts.filter((c) => c.phone && !isValidPhone(c.phone)).length;
      if (noPhone > 0 || invalidFormat > 0) {
        setPendingImport({ contacts: parsedContacts, noPhoneCount: noPhone, invalidFormatCount: invalidFormat, validCount: parsedContacts.length });
      } else {
        await uploadContactsInChunks(parsedContacts);
      }
    } catch (error) {
      console.error("Error reading Excel file:", error);
      toast({
        title: "Excel Error",
        description: "Failed to read Excel file. Please check the format.",
        variant: "destructive",
      });
    }

    event.target.value = "";
  };

  if (isLoading) {
    return (
      <div className="flex-1 dots-bg">
        <Header title="Contacts" subtitle="Loading contacts..." />
        <div className="p-6">
          <Loading size="lg" text="Loading contacts..." />
        </div>
      </div>
    );
  }

  const handleExportSelectedContacts = () => {
    const selectedContacts = contacts.filter((contact) =>
      selectedContactIds.includes(contact.id)
    );

    if (selectedContacts.length === 0) {
      alert("No contacts selected.");
      return;
    }

    exportToExcel(selectedContacts, "selected_contacts.xlsx");
  };

  const handleExportAllContacts = async () => {
    try {
      const response = await fetch(
        `/api/contacts-all?channelId=${activeChannel?.id}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const allContacts: Contact[] = await response.json();

      if (!allContacts || allContacts.length === 0) {
        alert("No contacts available.");
        return;
      }

      exportToExcel(allContacts, "all_contacts.xlsx");
    } catch (error) {
      console.error("Error exporting contacts:", error);
      alert("Failed to export contacts. Please try again.");
    }
  };

  const handleExcelDownload = () => {
    const sampleContacts = [
      {
        name: "Alice Smith",
        phone: "1234567890",
        email: "alice@example.com",
        groups: "Friends, Work",
        tags: "VIP, Newsletter",
      },
      {
        name: "Bob Johnson",
        phone: "9876543210",
        email: "bob@example.com",
        groups: "Family",
        tags: "New",
      },
      {
        name: "Charlie Brown",
        phone: "5555555555",
        email: "charlie@example.com",
        groups: "Customers, Support",
        tags: "Premium, Active",
      },
    ];

    exportToExcel(sampleContacts, "sample_contacts.xlsx");
  };

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header
        title={t("contacts.title")}
        subtitle={t("contacts.subtitle")}
        action={{
          label: `${t("contacts.addContact.title")}`,
          onClick: () => {
            setShowAddDialog(true);
          },
        }}
      />

      {importState.active && (
        <div className="mx-3 sm:mx-4 md:mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-blue-700">{importState.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600">
                {importState.total > 0
                  ? `${Math.round((importState.current / importState.total) * 100)}%`
                  : ""}
              </span>
              <button
                type="button"
                className="text-xs text-red-500 hover:text-red-700 underline"
                onClick={() => { importAbortRef.current = true; }}
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: importState.total > 0
                  ? `${Math.round((importState.current / importState.total) * 100)}%`
                  : "0%",
              }}
            />
          </div>
        </div>
      )}

      <main className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        <ContactsToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedGroup={selectedGroup}
          setSelectedGroup={setSelectedGroup}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          groupsData={groupsData}
          handleExportAllContacts={handleExportAllContacts}
          handleCSVUpload={handleCSVUpload}
          handleExcelUpload={handleExcelUpload}
          handleExcelDownload={handleExcelDownload}
          handleExportSelectedContacts={handleExportSelectedContacts}
          handleOpenAssignGroup={handleOpenAssignGroup}
          setShowBulkDeleteDialog={setShowBulkDeleteDialog}
          selectedContactIds={selectedContactIds}
          user={user}
          setLocation={setLocation}
          isImporting={importState.active}
        />

        <ContactsTable
          contacts={contacts}
          selectedContactIds={selectedContactIds}
          allSelected={allSelected}
          toggleSelectAll={toggleSelectAll}
          toggleSelectOne={toggleSelectOne}
          searchQuery={searchQuery}
          selectedGroup={selectedGroup}
          selectedStatus={selectedStatus}
          clearAllFilters={clearAllFilters}
          setShowAddDialog={setShowAddDialog}
          setSelectedContact={setSelectedContact}
          setShowMessageDialog={setShowMessageDialog}
          setShowEditDialog={setShowEditDialog}
          handleDeleteContact={handleDeleteContact}
          handleToggleContactStatus={handleToggleContactStatus}
          handleOpenAssignGroup={handleOpenAssignGroup}
          fetchTemplates={() => {}}
          activeChannel={activeChannel}
          channels={channels}
          user={user}
          deleteContactMutation={deleteContactMutation}
          toast={toast}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          setLimit={setLimit}
          setCurrentPage={setCurrentPage}
          goToPreviousPage={goToPreviousPage}
          goToNextPage={goToNextPage}
          getPageNumbers={getPageNumbers}
          goToPage={goToPage}
        />
      </main>

      <ContactDialogs
        showAddDialog={showAddDialog}
        setShowAddDialog={setShowAddDialog}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        showBulkDeleteDialog={showBulkDeleteDialog}
        setShowBulkDeleteDialog={setShowBulkDeleteDialog}
        showEditDialog={showEditDialog}
        setShowEditDialog={setShowEditDialog}
        showGroupDialog={showGroupDialog}
        setShowGroupDialog={setShowGroupDialog}
        showAssignGroupDialog={showAssignGroupDialog}
        setShowAssignGroupDialog={setShowAssignGroupDialog}
        selectedContact={selectedContact}
        setSelectedContact={setSelectedContact}
        contactToDelete={contactToDelete}
        setContactToDelete={setContactToDelete}
        selectedContactIds={selectedContactIds}
        setSelectedContactIds={setSelectedContactIds}
        assignGroupContactIds={assignGroupContactIds}
        setAssignGroupContactIds={setAssignGroupContactIds}
        contacts={contacts}
        groupsData={groupsData}
        activeChannel={activeChannel}
        user={user}
        form={form}
        createContactMutation={createContactMutation}
        deleteContactMutation={deleteContactMutation}
        deleteBulkContactsMutation={deleteBulkContactsMutation}
        addToGroupMutation={addToGroupMutation}
        removeFromGroupMutation={removeFromGroupMutation}
        queryClient={queryClient}
        toast={toast}
        groupName={groupName}
        setGroupName={setGroupName}
        groupDescription={groupDescription}
        setGroupDescription={setGroupDescription}
      />

      <TemplateMessageDialog
        showMessageDialog={showMessageDialog}
        setShowMessageDialog={setShowMessageDialog}
        selectedContact={selectedContact}
        activeChannel={activeChannel}
        sendMessageMutation={sendMessageMutation}
        user={user}
        headerType={headerType}
        setHeaderType={setHeaderType}
      />

      <AlertDialog
        open={!!pendingImport}
        onOpenChange={(open) => { if (!open) setPendingImport(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Phone Number Issues Detected</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingImport && (
                <>
                  {pendingImport.noPhoneCount > 0 && (
                    <span className="block mb-1">
                      <strong>{pendingImport.noPhoneCount.toLocaleString()}</strong> row{pendingImport.noPhoneCount !== 1 ? "s" : ""} have no phone number and will be skipped.
                    </span>
                  )}
                  {pendingImport.invalidFormatCount > 0 && (
                    <span className="block mb-1">
                      <strong>{pendingImport.invalidFormatCount.toLocaleString()}</strong> row{pendingImport.invalidFormatCount !== 1 ? "s" : ""} have an unrecognised phone format and will be skipped.
                    </span>
                  )}
                  <span className="block mt-2 text-sm text-gray-600">
                    {(pendingImport.validCount - pendingImport.noPhoneCount - pendingImport.invalidFormatCount).toLocaleString()} of {pendingImport.validCount.toLocaleString()} contacts will be imported. Continue?
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingImport(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingImport) {
                  const contacts = pendingImport.contacts;
                  setPendingImport(null);
                  uploadContactsInChunks(contacts);
                }
              }}
            >
              Import Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
