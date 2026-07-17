/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * ============================================================
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Search,
  UserPlus,
  Trash2,
  Download,
  Upload,
  Users,
  Phone,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Copy,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { AddContactsDialog } from "./AddContactsDialog";

interface Group {
  id: string;
  name: string;
  description?: string | null;
}

interface GroupMembersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
  channelId: string | undefined;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  groups?: string[] | null;
  tags?: string[] | null;
  createdAt?: string;
}

const PAGE_SIZE = 25;
const IMPORT_CHUNK_SIZE = 1000;

type ParsedRow = {
  name: string;
  phone: string;
  email: string;
  groups: string[];
  tags: string[];
  csvRow: number;
};

const splitMulti = (value: unknown): string[] =>
  String(value ?? "")
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[\s\-().+]/g, "");
  return /^\d{7,15}$/.test(digits);
}

async function decodeFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let text: string;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    text = new TextDecoder("utf-16le").decode(buffer);
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    text = new TextDecoder("utf-16be").decode(buffer);
  } else {
    text = new TextDecoder("utf-8").decode(buffer);
  }
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function GroupMembersDrawer({
  open,
  onOpenChange,
  group,
  channelId,
}: GroupMembersDrawerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{
    ids: string[];
  } | null>(null);
  const [confirmMove, setConfirmMove] = useState<{
    ids: string[];
    toGroup: string;
  } | null>(null);
  const [confirmCopy, setConfirmCopy] = useState<{
    ids: string[];
    toGroup: string;
  } | null>(null);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importState, setImportState] = useState<{
    active: boolean;
    current: number;
    total: number;
    label: string;
  }>({ active: false, current: 0, total: 0, label: "" });
  const [importResult, setImportResult] = useState<{
    imported: number;
    duplicates: number;
    invalid: number;
    total: number;
    rowErrors: { row: number; phone: string; error: string }[];
    skippedNoPhone: number;
    skippedInvalidFormat: number;
  } | null>(null);

  const isDemo =
    user?.username === "demoadmin" || user?.username === "demouser";

  const queryKey = [
    "/api/group-members",
    channelId,
    group?.name,
    page,
    search,
  ];

  const { data, isLoading } = useQuery({
    queryKey,
    enabled: open && !!group?.name && !!channelId,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const params = new URLSearchParams({
        channelId: channelId!,
        group: group!.name,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/contacts?${params.toString()}`, {
        credentials: "include",
        headers: { "x-channel-id": channelId! },
      });
      if (!res.ok) throw new Error("Failed to load members");
      return res.json();
    },
  });

  const members: Contact[] = useMemo(() => {
    const raw = data?.data || data?.contacts || [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const total: number = data?.pagination?.total ?? members.length;
  const totalPages: number = Math.max(
    1,
    data?.pagination?.totalPages ?? Math.ceil((total || 0) / PAGE_SIZE) ?? 1,
  );

  // If a remove/move shrinks the result set so that the current page is
  // now beyond the last page, clamp page back into range. Without this
  // the user would see "No members match \"\"" with an empty page even
  // though `total > 0`.
  useEffect(() => {
    if (!data) return;
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [data, page, totalPages]);

  // Fetch all groups in this channel for the move-to dropdown.
  // Always refetch when the drawer opens so freshly created groups
  // (added on the parent page while the drawer was closed) appear in
  // the Move/Copy dropdowns without a page reload.
  const { data: groupsData } = useQuery({
    queryKey: ["/api/groups", channelId],
    enabled: open && !!channelId,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const res = await fetch(`/api/groups?channelId=${channelId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load groups");
      return res.json();
    },
  });

  const otherGroups: Group[] = useMemo(() => {
    const all: Group[] = groupsData?.groups || [];
    return all.filter((g) => g.name !== group?.name);
  }, [groupsData, group?.name]);

  // Reset on open/close + group change
  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSearch("");
      setPage(1);
      setAddOpen(false);
      setConfirmRemove(null);
      setConfirmMove(null);
      setConfirmCopy(null);
      setImportResult(null);
    }
  }, [open]);

  useEffect(() => {
    setSelected(new Set());
    setPage(1);
    setSearch("");
  }, [group?.id]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const allSelected =
    members.length > 0 && members.every((m) => selected.has(m.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        members.forEach((m) => next.delete(m.id));
      } else {
        members.forEach((m) => next.add(m.id));
      }
      return next;
    });
  };
  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await apiRequest("POST", "/api/groups/remove-contacts", {
        contactIds: ids,
        groupName: group!.name,
        channelId,
      });
      return res.json();
    },
    onSuccess: (data, ids) => {
      toast({
        title: "Removed",
        description: `Removed ${data?.updatedCount ?? ids.length} contact(s) from ${group!.name}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/groups/contact-counts"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setSelected(new Set());
      setConfirmRemove(null);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to remove",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
      setConfirmRemove(null);
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({
      ids,
      toGroup,
    }: {
      ids: string[];
      toGroup: string;
    }) => {
      const res = await apiRequest("POST", "/api/groups/move-contacts", {
        contactIds: ids,
        fromGroup: group!.name,
        toGroup,
        channelId,
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Moved",
        description: `Moved ${data?.movedCount ?? variables.ids.length} contact(s) to ${variables.toGroup}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/groups/contact-counts"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setSelected(new Set());
      setConfirmMove(null);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to move",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
      setConfirmMove(null);
    },
  });

  const copyMutation = useMutation({
    mutationFn: async ({
      ids,
      toGroup,
    }: {
      ids: string[];
      toGroup: string;
    }) => {
      const res = await apiRequest("POST", "/api/groups/add-contacts", {
        contactIds: ids,
        groupName: toGroup,
        channelId,
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Copied",
        description: `Added ${data?.updatedCount ?? variables.ids.length} contact(s) to ${variables.toGroup}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/groups/contact-counts"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setSelected(new Set());
      setConfirmCopy(null);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to copy",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
      setConfirmCopy(null);
    },
  });

  const askRemove = (ids: string[]) => {
    if (ids.length === 0) return;
    setConfirmRemove({ ids });
  };

  // Fetch all members across pages for CSV export
  const exportCSV = async () => {
    if (!group?.name || !channelId) return;
    setExporting(true);
    try {
      const all: Contact[] = [];
      let p = 1;
      const pageLimit = 200;
      // Iterate until we've consumed every page reported by the server.
      while (true) {
        const params = new URLSearchParams({
          channelId,
          group: group.name,
          page: String(p),
          limit: String(pageLimit),
        });
        const res = await fetch(`/api/contacts?${params.toString()}`, {
          credentials: "include",
          headers: { "x-channel-id": channelId },
        });
        if (!res.ok) throw new Error("Export failed");
        const json = await res.json();
        const rows: Contact[] = json?.data || json?.contacts || [];
        all.push(...rows);
        const tp = json?.pagination?.totalPages ?? 1;
        if (p >= tp || rows.length === 0) break;
        p++;
      }
      if (all.length === 0) {
        toast({
          title: "Nothing to export",
          description: "This group has no members.",
        });
        return;
      }
      const header = ["name", "phone", "email", "tags", "joined"];
      const escape = (v: string) =>
        /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      const csv = [
        header,
        ...all.map((m) => [
          m.name || "",
          m.phone || "",
          m.email || "",
          (m.tags || []).join("|"),
          m.createdAt || "",
        ]),
      ]
        .map((r) => r.map((c) => escape(String(c))).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = (group.name || "group").replace(/[^a-z0-9-_]+/gi, "-");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `group-${safe}-members-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err?.message || "Could not export members.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const uploadInChunks = async (rows: ParsedRow[], skipped: { noPhone: number; invalidFormat: number }) => {
    if (!group?.name || !channelId) return;
    const total = rows.length;
    let totalImported = 0;
    let totalDuplicates = 0;
    let totalInvalid = 0;
    const rowErrors: { row: number; phone: string; error: string }[] = [];

    setImportState({ active: true, current: 0, total, label: "Preparing upload…" });

    try {
      for (let i = 0; i < rows.length; i += IMPORT_CHUNK_SIZE) {
        const chunk = rows.slice(i, i + IMPORT_CHUNK_SIZE);
        const chunkEnd = Math.min(i + IMPORT_CHUNK_SIZE, total);
        setImportState({
          active: true,
          current: chunkEnd,
          total,
          label: `Uploading ${(i + 1).toLocaleString()}–${chunkEnd.toLocaleString()} of ${total.toLocaleString()}…`,
        });

        const payloadContacts = chunk.map(({ csvRow: _csvRow, ...rest }) => rest);
        const res = await apiRequest(
          "POST",
          `/api/contacts/import?channelId=${channelId}`,
          { contacts: payloadContacts, channelId, groupName: group.name },
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || errData?.message || `Import failed (${res.status})`);
        }
        const data = await res.json();
        totalImported += data.imported ?? 0;
        totalDuplicates += data.duplicates ?? 0;
        totalInvalid += data.invalid ?? 0;
        // Map each server-reported row error back to its original CSV row by
        // matching the returned phone with rows in this chunk.
        const errList = (data?.details?.errors || []) as { contact: any; error: string }[];
        errList.forEach((e) => {
          const phone = e?.contact?.phone || "";
          const match = chunk.find((r) => r.phone === phone);
          rowErrors.push({
            row: match?.csvRow ?? 0,
            phone,
            error: e?.error || "Invalid",
          });
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/contact-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });

      setImportResult({
        imported: totalImported,
        duplicates: totalDuplicates,
        invalid: totalInvalid,
        total,
        rowErrors,
        skippedNoPhone: skipped.noPhone,
        skippedInvalidFormat: skipped.invalidFormat,
      });

      toast({
        title: "Import complete",
        description: `${totalImported.toLocaleString()} added to "${group.name}", ${totalDuplicates.toLocaleString()} duplicate(s), ${totalInvalid.toLocaleString()} invalid.`,
      });
    } catch (err: any) {
      toast({
        title: "Import failed",
        description: err?.message || "Could not import contacts.",
        variant: "destructive",
      });
    } finally {
      setImportState({ active: false, current: 0, total: 0, label: "" });
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !group?.name) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast({
        title: "Unsupported file",
        description: "Please upload a .csv file.",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await decodeFile(file);
      const results = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (results.errors.length > 0) {
        const sample = results.errors
          .slice(0, 3)
          .map((e) => e.message)
          .join("; ");
        toast({
          title: "CSV parse warnings",
          description: `${results.errors.length} row(s) had parse issues and may be skipped. First: ${sample}`,
        });
      }

      const all: ParsedRow[] = (results.data as any[])
        .map((row, idx) => ({ row, csvRow: idx + 2 })) // +1 for header, +1 for 1-based
        .filter(({ row }) => row && Object.keys(row).length > 0)
        .map(({ row, csvRow }) => {
          const groupsSet = new Set<string>(splitMulti(row?.groups));
          groupsSet.add(group.name);
          return {
            name: row?.name?.toString().trim() || "",
            phone: row?.phone ? String(row.phone).trim() : "",
            email: row?.email?.toString().trim() || "",
            groups: Array.from(groupsSet),
            tags: splitMulti(row?.tags),
            csvRow,
          };
        });

      const noPhone = all.filter((c) => !c.phone).length;
      const invalidFormat = all.filter((c) => c.phone && !isValidPhone(c.phone)).length;
      const valid = all.filter((c) => c.phone && isValidPhone(c.phone));

      if (valid.length === 0) {
        toast({
          title: "Nothing to import",
          description: "No rows with a valid phone number were found.",
          variant: "destructive",
        });
        return;
      }

      await uploadInChunks(valid, { noPhone, invalidFormat });
    } catch (err: any) {
      toast({
        title: "CSV parse error",
        description: err?.message || "Failed to read CSV file.",
        variant: "destructive",
      });
    }
  };

  const existingIds = useMemo(
    () => new Set(members.map((m) => m.id)),
    [members],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col p-0">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Members of "{group?.name}"
            </SheetTitle>
            <SheetDescription>
              {isLoading
                ? "Loading members…"
                : `${total} contact${total === 1 ? "" : "s"} in this group${
                    isDemo ? " · read-only (demo)" : ""
                  }`}
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 pt-4 flex flex-wrap gap-2">
            {!isDemo && (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setAddOpen(true)}
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                Add Contacts
              </Button>
            )}
            {!isDemo && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportFile}
                  data-testid="input-group-import-csv"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importState.active}
                  data-testid="button-group-import-csv"
                >
                  <Upload className="h-4 w-4 mr-1.5" />
                  {importState.active ? "Importing…" : "Import CSV"}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={exportCSV}
              disabled={total === 0 || exporting}
            >
              <Download className="h-4 w-4 mr-1.5" />
              {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            {!isDemo && selected.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      moveMutation.isPending || otherGroups.length === 0
                    }
                    title={
                      otherGroups.length === 0
                        ? "No other groups to move to"
                        : undefined
                    }
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-1.5" />
                    Move {selected.size} to…
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                  <DropdownMenuLabel>Move to group</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {otherGroups.length === 0 ? (
                    <DropdownMenuItem disabled>
                      No other groups available
                    </DropdownMenuItem>
                  ) : (
                    otherGroups.map((g) => (
                      <DropdownMenuItem
                        key={g.id}
                        onSelect={() =>
                          setConfirmMove({
                            ids: Array.from(selected),
                            toGroup: g.name,
                          })
                        }
                      >
                        {g.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!isDemo && selected.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      copyMutation.isPending || otherGroups.length === 0
                    }
                    title={
                      otherGroups.length === 0
                        ? "No other groups to copy to"
                        : undefined
                    }
                    data-testid="button-copy-selected"
                  >
                    <Copy className="h-4 w-4 mr-1.5" />
                    Copy {selected.size} to…
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
                  <DropdownMenuLabel>Copy to group</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {otherGroups.length === 0 ? (
                    <DropdownMenuItem disabled>
                      No other groups available
                    </DropdownMenuItem>
                  ) : (
                    otherGroups.map((g) => (
                      <DropdownMenuItem
                        key={g.id}
                        onSelect={() =>
                          setConfirmCopy({
                            ids: Array.from(selected),
                            toGroup: g.name,
                          })
                        }
                      >
                        {g.name}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {!isDemo && selected.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => askRemove(Array.from(selected))}
                disabled={removeMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Remove {selected.size} from group
              </Button>
            )}
          </div>

          {importState.active && (
            <div className="px-6 pt-3">
              <div className="rounded-md border bg-blue-50 px-3 py-2">
                <div className="flex items-center justify-between text-xs text-blue-800 mb-1">
                  <span className="font-medium">{importState.label}</span>
                  <span>
                    {importState.total > 0
                      ? `${Math.round((importState.current / importState.total) * 100)}%`
                      : ""}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-blue-100 rounded">
                  <div
                    className="h-1.5 bg-blue-500 rounded transition-all"
                    style={{
                      width:
                        importState.total > 0
                          ? `${Math.round((importState.current / importState.total) * 100)}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="px-6 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search members"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {!isDemo && members.length > 0 && (
            <div className="px-6 pb-2 flex items-center gap-2 text-xs text-gray-600">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all"
              />
              <span>Select all on this page ({members.length})</span>
            </div>
          )}

          <ScrollArea className="flex-1 px-6">
            {isLoading ? (
              <div className="py-10 text-center text-sm text-gray-500">
                Loading…
              </div>
            ) : total === 0 && !search ? (
              <div className="py-12 text-center flex flex-col items-center gap-3">
                <div className="rounded-full bg-gray-100 p-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  No contacts in this group yet
                </p>
                <p className="text-xs text-gray-500 max-w-xs">
                  Add contacts to start sending campaigns to this audience.
                </p>
                {!isDemo && (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white mt-2"
                    onClick={() => setAddOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Add Contacts
                  </Button>
                )}
              </div>
            ) : members.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">
                No members match "{search}".
              </div>
            ) : (
              <div className="divide-y border rounded-md">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50"
                  >
                    {!isDemo && (
                      <Checkbox
                        checked={selected.has(m.id)}
                        onCheckedChange={() => toggle(m.id)}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {m.name || "(no name)"}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 truncate">
                        <Phone className="h-3 w-3" />
                        {m.phone}
                        {m.email ? (
                          <span className="ml-2 truncate">• {m.email}</span>
                        ) : null}
                      </div>
                      {(m.tags || []).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(m.tags || []).slice(0, 5).map((t) => (
                            <span
                              key={t}
                              className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {!isDemo && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => askRemove([m.id])}
                        disabled={removeMutation.isPending}
                        title="Remove from group"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t flex items-center justify-between text-xs text-gray-600">
              <span>
                Page {page} of {totalPages} · {total} total
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || isLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {group && channelId && !isDemo && (
        <AddContactsDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          groupName={group.name}
          channelId={channelId}
          existingContactIds={existingIds}
        />
      )}

      <AlertDialog
        open={!!confirmMove}
        onOpenChange={(o) => !o && setConfirmMove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move contacts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add {confirmMove?.ids.length || 0} contact(s) to "
              {confirmMove?.toGroup}" and remove them from "{group?.name}" in
              one step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={moveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              disabled={moveMutation.isPending}
              onClick={() =>
                confirmMove &&
                moveMutation.mutate({
                  ids: confirmMove.ids,
                  toGroup: confirmMove.toGroup,
                })
              }
            >
              {moveMutation.isPending ? "Moving…" : "Move"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmCopy}
        onOpenChange={(o) => !o && setConfirmCopy(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy contacts?</AlertDialogTitle>
            <AlertDialogDescription>
              This will add {confirmCopy?.ids.length || 0} contact(s) to "
              {confirmCopy?.toGroup}". They will remain in "{group?.name}" as
              well.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={copyMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 hover:bg-green-700"
              disabled={copyMutation.isPending}
              onClick={() =>
                confirmCopy &&
                copyMutation.mutate({
                  ids: confirmCopy.ids,
                  toGroup: confirmCopy.toGroup,
                })
              }
            >
              {copyMutation.isPending ? "Copying…" : "Copy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!importResult}
        onOpenChange={(o) => !o && setImportResult(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import results</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                {importResult && (
                  <>
                    <div>
                      <strong>{importResult.imported.toLocaleString()}</strong>{" "}
                      new contact{importResult.imported === 1 ? "" : "s"} added
                      to "{group?.name}".
                    </div>
                    {importResult.duplicates > 0 && (
                      <div>
                        <strong>{importResult.duplicates.toLocaleString()}</strong>{" "}
                        already existed — they were tagged with this group where
                        missing.
                      </div>
                    )}
                    {importResult.skippedNoPhone > 0 && (
                      <div className="text-amber-700">
                        {importResult.skippedNoPhone.toLocaleString()} row(s)
                        skipped: missing phone number.
                      </div>
                    )}
                    {importResult.skippedInvalidFormat > 0 && (
                      <div className="text-amber-700">
                        {importResult.skippedInvalidFormat.toLocaleString()}{" "}
                        row(s) skipped: phone number format not recognised.
                      </div>
                    )}
                    {importResult.invalid > 0 && (
                      <div className="text-red-700">
                        {importResult.invalid.toLocaleString()} row(s) failed
                        validation on the server.
                      </div>
                    )}
                    {importResult.rowErrors.length > 0 && (
                      <div className="mt-2">
                        <div className="font-medium text-gray-900 mb-1">
                          Row errors (first {importResult.rowErrors.length}):
                        </div>
                        <div className="max-h-40 overflow-y-auto rounded border bg-gray-50 p-2 text-xs space-y-1">
                          {importResult.rowErrors.map((e, i) => (
                            <div key={i} className="text-gray-700">
                              <span className="font-mono">Row {e.row}</span>
                              {e.phone ? ` (${e.phone})` : ""}: {e.error}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setImportResult(null)}>
              Done
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmRemove}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from group?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {confirmRemove?.ids.length || 0} contact(s) from
              "{group?.name}". The contacts themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={removeMutation.isPending}
              onClick={() =>
                confirmRemove && removeMutation.mutate(confirmRemove.ids)
              }
            >
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
