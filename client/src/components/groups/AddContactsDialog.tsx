/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * ============================================================
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AddContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupName: string;
  channelId: string;
  existingContactIds: Set<string>;
  onAdded?: () => void;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  groups?: string[] | null;
}

export function AddContactsDialog({
  open,
  onOpenChange,
  groupName,
  channelId,
  existingContactIds,
  onAdded,
}: AddContactsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const PAGE_SIZE = 50;

  // Reset to page 1 when search changes.
  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/contacts/all-for-add", channelId, search, page],
    enabled: open && !!channelId,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const params = new URLSearchParams({
        channelId,
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/contacts?${params.toString()}`, {
        credentials: "include",
        headers: { "x-channel-id": channelId },
      });
      if (!res.ok) throw new Error("Failed to load contacts");
      return res.json();
    },
  });

  const total: number = data?.pagination?.total ?? 0;
  const totalPages: number = Math.max(1, data?.pagination?.totalPages ?? 1);

  const allContacts: Contact[] = useMemo(() => {
    const raw = data?.data || data?.contacts || data || [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  // Filter using the contact's own `groups` field as the source of truth
  // (the existingContactIds set may be incomplete for groups with many
  // members because the drawer's member fetch is page-limited). Fall back
  // to the id set if `groups` is not provided.
  const candidates = useMemo(
    () =>
      allContacts.filter((c) => {
        if (Array.isArray(c.groups) && c.groups.includes(groupName)) return false;
        if (existingContactIds.has(c.id)) return false;
        return true;
      }),
    [allContacts, existingContactIds, groupName],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = candidates.length > 0 && selected.size === candidates.length;
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/groups/add-contacts", {
        contactIds: Array.from(selected),
        groupName,
        channelId,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Contacts added",
        description: `Added ${data?.updatedCount ?? selected.size} contact(s) to ${groupName}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/contact-counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/group-members"] });
      setSelected(new Set());
      setSearch("");
      onAdded?.();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Failed to add contacts",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setSelected(new Set());
          setSearch("");
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-green-600" />
            Add Contacts to "{groupName}"
          </DialogTitle>
          <DialogDescription>
            Pick contacts from this channel to add to the group.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, phone, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              disabled={candidates.length === 0}
            />
            <span className="text-gray-600">
              Select all on page ({candidates.length})
            </span>
          </label>
          <span className="text-gray-500">{selected.size} selected</span>
        </div>

        <ScrollArea className="h-72 border rounded-md">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Loading contacts…
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
              <Users className="h-8 w-8 text-gray-300" />
              {search.trim()
                ? "No matching contacts."
                : "All your contacts are already in this group."}
            </div>
          ) : (
            <div className="divide-y">
              {candidates.map((c) => (
                <label
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(c.id)}
                    onCheckedChange={() => toggle(c.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {c.name || "(no name)"}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {c.phone}
                      {c.email ? ` • ${c.email}` : ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </ScrollArea>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              Page {page} of {totalPages} · {total} matching contact
              {total === 1 ? "" : "s"}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={selected.size === 0 || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            {addMutation.isPending
              ? "Adding…"
              : `Add ${selected.size || ""} Contact${selected.size === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
