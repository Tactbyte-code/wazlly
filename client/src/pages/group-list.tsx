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

"use client";

import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash,
  Edit,
  Plus,
  Users,
  Search,
  Send,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { GroupMembersDrawer } from "@/components/groups/GroupMembersDrawer";

const GroupSkeleton = () => (
  <Card className="animate-pulse">
    <CardContent className="p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
        <div className="flex gap-2 self-end sm:self-center">
          <div className="h-9 w-20 bg-gray-200 rounded" />
          <div className="h-9 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const EmptyState = ({ onCreateClick }: { onCreateClick: () => void }) => (
  <Card className="border-dashed border-2 border-gray-300">
    <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-gray-100 p-6 mb-4">
        <Users className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">
        No groups yet
      </h3>
      <p className="text-gray-500 mb-6 max-w-sm">
        Get started by creating your first group to organize your contacts and
        campaigns effectively.
      </p>
      <Button
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={onCreateClick}
      >
        <Plus className="mr-2" size={16} /> Create Your First Group
      </Button>
    </CardContent>
  </Card>
);

interface GroupRow {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  contact_count?: number;
}

type SortKey = "name" | "members" | "newest" | "oldest";

export default function GroupsUI() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isDemo =
    user?.username === "demoadmin" || user?.username === "demouser";

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  const [membersGroup, setMembersGroup] = useState<GroupRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GroupRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { t } = useTranslation();
  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const [contactCounts, setContactCounts] = useState<Record<string, number>>({});

  const fetchGroups = async () => {
    if (!activeChannel?.id) return;
    try {
      setLoading(true);
      const res = await apiRequest(
        "GET",
        `/api/groups?channelId=${activeChannel?.id}`,
      );
      const data = await res.json();
      setGroups(data.groups || []);
    } catch (err) {
      console.log(err);
      toast({
        title: "Error",
        description: "Failed to fetch groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContactCounts = async () => {
    if (!activeChannel?.id) return;
    try {
      const res = await apiRequest(
        "GET",
        `/api/groups/contact-counts?channelId=${activeChannel?.id}`,
      );
      const data = await res.json();
      if (data.success) {
        setContactCounts(data.counts || {});
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (activeChannel?.id) {
      fetchGroups();
      fetchContactCounts();
    }
  }, [activeChannel?.id]);

  // Refresh counts when react-query caches change (after add/remove members).
  useEffect(() => {
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey?.[0];
      if (
        key === "/api/groups" ||
        key === "/api/groups/contact-counts" ||
        key === "/api/group-members"
      ) {
        if (event.type === "updated" && event.query.state.status === "success") {
          fetchContactCounts();
        }
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel?.id]);

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = groups;
    if (q) {
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.description || "").toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "members":
          return (
            (contactCounts[b.name] || 0) - (contactCounts[a.name] || 0)
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "newest":
        default:
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
      }
    });
    return sorted;
  }, [groups, search, sortBy, contactCounts]);

  const saveGroup = async () => {
    if (!groupName.trim()) {
      return toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
    }

    const payload = {
      name: groupName,
      description: groupDescription,
      channelId: activeChannel?.id,
    };

    setIsSubmitting(true);

    try {
      const res = await apiRequest(
        editMode ? "PUT" : "POST",
        editMode ? `/api/groups/${editId}` : "/api/groups",
        payload,
      );

      const data = await res.json();
      if (!data.success) {
        return toast({
          title: "Error",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
      }

      toast({
        title: editMode ? "Group updated!" : "Group created!",
        description: data.message || "Operation completed successfully.",
      });

      setOpenDialog(false);
      setGroupName("");
      setGroupDescription("");
      setEditMode(false);
      setEditId(null);

      fetchGroups();
      fetchContactCounts();
      // Invalidate any cached group lists used elsewhere (e.g. the
      // Members drawer's Move/Copy dropdowns) so the new/edited group
      // appears immediately without a page reload.
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups/contact-counts"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteGroup = async () => {
    if (!deleteTarget) return;
    if (isDemo) {
      toast({
        title: "Demo mode",
        description: "Sign in with a real account to delete groups.",
      });
      setDeleteTarget(null);
      return;
    }
    setIsDeleting(true);
    try {
      const res = await apiRequest("DELETE", `/api/groups/${deleteTarget.id}`);
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Group deleted!",
          description: data.message || "Group deleted successfully",
        });
        setDeleteTarget(null);
        fetchGroups();
        fetchContactCounts();
        queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
        queryClient.invalidateQueries({ queryKey: ["/api/groups/contact-counts"] });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete group",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openCreateDialog = () => {
    if (isDemo) {
      toast({
        title: "Demo mode",
        description: "Sign in with a real account to create groups.",
      });
      return;
    }
    setEditMode(false);
    setEditId(null);
    setGroupName("");
    setGroupDescription("");
    setOpenDialog(true);
  };

  const openEdit = (group: GroupRow) => {
    if (isDemo) {
      toast({
        title: "Demo mode",
        description: "Sign in with a real account to edit groups.",
      });
      return;
    }
    setEditMode(true);
    setEditId(group.id);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setOpenDialog(true);
  };

  const goToCampaignWithGroup = (group: GroupRow) => {
    setLocation(`/campaigns?createWith=group:${encodeURIComponent(group.id)}`);
  };

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header
        title={t("groups.title")}
        subtitle={t("groups.subtitle")}
        action={{
          label: t("groups.createButton"),
          onClick: () => openCreateDialog(),
        }}
      />
      <div className="p-6 space-y-6">
        {/* Search + Sort */}
        {(groups.length > 0 || search) && !loading && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search groups by name or description"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortKey)}
            >
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
                <SelectItem value="members">Most members</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <GroupSkeleton key={i} />
              ))}
            </>
          ) : groups.length === 0 ? (
            <EmptyState onCreateClick={openCreateDialog} />
          ) : visibleGroups.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-gray-500 text-sm">
                No groups match "{search}".
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {visibleGroups.map((group) => {
                const count = contactCounts[group.name] || 0;
                return (
                  <Card
                    key={group.id}
                    className="hover:shadow-md transition-shadow duration-200 cursor-pointer group"
                    onClick={() => setMembersGroup(group)}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                              {group.name}
                            </h3>
                            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                          </div>
                          {group.description && (
                            <p className="text-sm sm:text-base text-gray-600 mt-1 line-clamp-2">
                              {group.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              <Users size={12} />
                              {count} contact{count !== 1 ? "s" : ""}
                            </span>
                            <span className="text-xs text-gray-400">
                              Created{" "}
                              {new Date(group.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </div>

                        <div
                          className="flex flex-wrap gap-2 self-end sm:self-start"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1.5"
                            onClick={() => setMembersGroup(group)}
                          >
                            <Users size={14} />
                            <span className="hidden sm:inline">Members</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1.5"
                            onClick={() => goToCampaignWithGroup(group)}
                            disabled={count === 0}
                            title={
                              count === 0
                                ? "Add contacts before sending a campaign"
                                : "Start a campaign with this group"
                            }
                          >
                            <Send size={14} />
                            <span className="hidden sm:inline">
                              Send campaign
                            </span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1.5"
                            onClick={() => openEdit(group)}
                          >
                            <Edit size={14} />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteTarget(group)}
                            className="flex items-center gap-1.5"
                          >
                            <Trash size={14} />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editMode ? "Edit Group" : "Create Group"}
            </DialogTitle>
            <DialogDescription>
              {editMode
                ? "Update your group details below."
                : "Create a new group to organize your contacts."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Group Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., VIP Customers"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Description
              </label>
              <Textarea
                placeholder="Add a description for this group (optional)"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                className="w-full resize-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpenDialog(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                onClick={saveGroup}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : editMode
                  ? "Save Changes"
                  : "Create Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  This will permanently delete the group{" "}
                  <span className="font-medium">"{deleteTarget.name}"</span>
                  {(contactCounts[deleteTarget.name] || 0) > 0 ? (
                    <>
                      {" "}
                      and untag{" "}
                      <span className="font-medium">
                        {contactCounts[deleteTarget.name]} contact
                        {contactCounts[deleteTarget.name] === 1 ? "" : "s"}
                      </span>
                      . The contacts themselves will not be deleted.
                    </>
                  ) : (
                    "."
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                confirmDeleteGroup();
              }}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Members drawer */}
      <GroupMembersDrawer
        open={!!membersGroup}
        onOpenChange={(o) => !o && setMembersGroup(null)}
        group={membersGroup}
        channelId={activeChannel?.id}
      />
    </div>
  );
}
