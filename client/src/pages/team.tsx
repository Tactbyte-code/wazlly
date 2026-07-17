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

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  Users,
  Activity,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Database,
} from "lucide-react";
import type { User } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/auth-context";
import { useChannelContext } from "@/contexts/channel-context";
import Header from "@/components/layout/header";
import { TeamUserResponse } from "@/types/types";
import { useTranslation } from "@/lib/i18n";
import { StateDisplay } from "@/components/StateDisplay";
import { isDemoUser, maskName, maskEmail } from "@/utils/maskUtils";

interface TeamMemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password?: string;
  role: "team";
  permissions: string[];
  channelId?: string;
}

type TeamMemberFormState = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password?: string;
  role: "team";
  permissions: Record<string, boolean>;
  channelId?: string;
};

const fetchTeamMembers = async (page: number = 1, limit: number = 10, search: string = "", channelId?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
  if (channelId) params.set("channelId", channelId);
  const response = await fetch(`/api/team/members?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch team members");
  }
  return response.json();
};


export default function TeamPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [search, setSearch] = useState("");

  const { user } = useAuth();
  const { selectedChannel } = useChannelContext();
  const [activeTab, setActiveTab] = useState(
    user?.role == "superadmin" ? "activity" : "members"
  );

  const { t } = useTranslation();

  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: teamUserRes, isLoading } = useQuery<TeamUserResponse>({
    queryKey: ["teamMembers", page, limit, search, selectedChannel?.id],
    queryFn: () => fetchTeamMembers(page, limit, search, selectedChannel?.id),
  });

  // Destructure `data` into `teamMembers` with a default empty array
  const teamMembers = teamUserRes?.data;
  const totalPages = teamUserRes?.totalPages || 1; // Total pages from API response

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // Fetch team activity logs
  const { data: activityLogs = [] } = useQuery({
    queryKey: ["/api/team/activity-logs"],
    enabled: activeTab === "activity",
  });

  // console.log("activity logs" , activityLogs)

  const saveMemberMutation = useMutation({
    mutationFn: async (data: TeamMemberFormData) => {
      if (editingMember) {
        return apiRequest("PUT", `/api/team/members/${editingMember.id}`, data);
      } else {
        return apiRequest("POST", "/api/team/members", data);
      }
    },

    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/activity-logs"] });

      toast({
        title: editingMember ? "Member updated" : "Member added",
        description: `Team member has been ${
          editingMember ? "updated" : "added"
        } successfully.`,
      });

      setShowAddDialog(false);
      setEditingMember(null);
    },

    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      return apiRequest("DELETE", `/api/team/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/activity-logs"] });
      toast({
        title: "Member removed",
        description: "Team member has been removed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      memberId,
      status,
    }: {
      memberId: string;
      status: string;
    }) => {
      return apiRequest("PATCH", `/api/team/members/${memberId}/status`, {
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      toast({
        title: "Status updated",
        description: "Team member status has been updated.",
      });
    },
  });

  const handleOpenDialog = (member?: User) => {
    if (member) {
      setEditingMember(member);
    }
    setShowAddDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingMember(null);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "manager":
        return "default";
      default:
        return "secondary";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "suspended":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getOnlineStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "inactive":
        return "bg-gray-500";
      default:
        return "bg-yellow-400";
    }
  };

  return (
    <div className={embedded ? "" : "container max-w-7xl mx-auto dots-bg"}>
      {!embedded && (
        <>
          {user?.role === "superadmin" ? (
            <Header
              title="Manage Activity Logs"
              subtitle="View and monitor team activity logs"
            />
          ) : (
            <Header
              title={t("team.title")}
              subtitle={t("team.subtitle")}
              action={{
                label: t("team.addMember"),
                onClick: () => handleOpenDialog(),
              }}
            />
          )}
        </>
      )}

      <div className={embedded ? "" : "px-4 py-6"}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {user?.role === "superadmin" ? (
              <TabsTrigger value="activity">
                <Activity className="mr-2 h-4 w-4" />
                {/* {t("team.Activity_Logs")} */} Activity logs
              </TabsTrigger>
            ) : (
              <>
                <TabsTrigger value="members">
                  <Users className="mr-2 h-4 w-4" />
                  {/* {t("team.members")} */} Team Members
                </TabsTrigger>
                <TabsTrigger value="activity">
                  <Activity className="mr-2 h-4 w-4" />
                  {/* {t("team.Activity_Logs")} */} Activity logs
                </TabsTrigger>
              </>
            )}
          </TabsList>
          <TabsContent value="members" className="mt-4 sm:mt-6">
            <Card>
            <CardHeader>
  <div>
    <CardTitle className="text-lg sm:text-xl">
      {t("team.teamMember")}
    </CardTitle>
    <CardDescription className="text-sm">
      {selectedChannel
        ? `Team members for channel: ${selectedChannel.name || selectedChannel.phoneNumber}`
        : t("team.manage_Team")}
    </CardDescription>
  </div>

  <div className="mt-4 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
    <Input
      placeholder="Search members..."
      value={search}
      onChange={(e) => {
        setSearch(e.target.value);
        setPage(1);
      }}
      className="w-full sm:w-72"
    />

    <Button className="whitespace-nowrap" onClick={() => handleOpenDialog()}>
      <UserPlus className="mr-2 h-4 w-4" />
      Add Member
    </Button>
  </div>
</CardHeader>


              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                    <p className="text-gray-600">Loading team members...</p>
                  </div>
                ) : !teamMembers || teamMembers.length === 0 ? (
                  <StateDisplay
                    title="No team members found"
                    description="Add your first team member to get started"
                    icon={Database}
                  />
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Member</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Permissions</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Active</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamMembers.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <Avatar>
                                      <AvatarImage
                                        src={member.avatar || undefined}
                                      />
                                      <AvatarFallback>
                                        {`${member.firstName || ""} ${
                                          member.lastName || ""
                                        }`
                                          .split(" ")
                                          .filter((n) => n)
                                          .map((n) => n[0])
                                          .join("")
                                          .toUpperCase() ||
                                          member.username
                                            .charAt(0)
                                            .toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div
                                      className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getOnlineStatusColor(
                                        member.status
                                      )}`}
                                    />
                                  </div>
                                  <div>
                                    <div className="font-medium">
                                      {isDemoUser(user?.username)
                                        ? maskName(`${member.firstName || ""} ${member.lastName || ""}`.trim() || member.username)
                                        : (`${member.firstName || ""} ${member.lastName || ""}`.trim() || member.username)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {isDemoUser(user?.username)
                                        ? maskEmail(member.email || "")
                                        : member.email}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={getRoleBadgeVariant(member.role)}
                                >
                                  {member.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1 max-w-[200px]">
                                  {member.permissions && member.permissions.length > 0 ? (
                                    <>
                                      {(member.permissions as string[]).slice(0, 3).map((p) => (
                                        <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">
                                          {p.split(":")[0]}
                                        </Badge>
                                      ))}
                                      {(member.permissions as string[]).length > 3 && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                          +{(member.permissions as string[]).length - 3}
                                        </Badge>
                                      )}
                                    </>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No permissions</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    getStatusBadgeVariant(member.status) ||
                                    "default"
                                  }
                                >
                                  {member.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">
                                    {member.lastLogin
                                      ? new Date(
                                          member.lastLogin
                                        ).toLocaleDateString()
                                      : "Never"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => handleOpenDialog(member)}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={isDemoUser(user?.username)}
                                      onClick={() =>
                                        updateStatusMutation.mutate({
                                          memberId: member.id,
                                          status:
                                            member.status === "active"
                                              ? "inactive"
                                              : "active",
                                        })
                                      }
                                    >
                                      <Shield className="mr-2 h-4 w-4" />
                                      {member.status === "active"
                                        ? "Deactivate"
                                        : "Activate"}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled={isDemoUser(user?.username)}
                                      className="text-destructive"
                                      onClick={() => {
                                        if (
                                          confirm(
                                            "Are you sure you want to remove this team member?"
                                          )
                                        ) {
                                          deleteMemberMutation.mutate(
                                            member.id
                                          );
                                        }
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Remove
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile/Tablet Card View */}
                    <div className="lg:hidden space-y-4">
                      {teamMembers.map((member) => (
                        <Card key={member.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="relative flex-shrink-0">
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage
                                      src={member.avatar || undefined}
                                    />
                                    <AvatarFallback>
                                      {`${member.firstName || ""} ${
                                        member.lastName || ""
                                      }`
                                        .split(" ")
                                        .filter((n) => n)
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase() ||
                                        member.username.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div
                                    className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${getOnlineStatusColor(
                                      "offline"
                                    )}`}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 truncate">
                                    {isDemoUser(user?.username)
                                      ? maskName(`${member.firstName || ""} ${member.lastName || ""}`.trim() || member.username)
                                      : (`${member.firstName || ""} ${member.lastName || ""}`.trim() || member.username)}
                                  </h3>
                                  <p className="text-sm text-gray-600 truncate">
                                    {isDemoUser(user?.username)
                                      ? maskEmail(member.email || "")
                                      : member.email}
                                  </p>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="flex-shrink-0 ml-2"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleOpenDialog(member)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={isDemoUser(user?.username)}
                                    onClick={() =>
                                      updateStatusMutation.mutate({
                                        memberId: member.id,
                                        status:
                                          member.status === "active"
                                            ? "inactive"
                                            : "active",
                                      })
                                    }
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    {member.status === "active"
                                      ? "Deactivate"
                                      : "Activate"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={isDemoUser(user?.username)}
                                    className="text-destructive"
                                    onClick={() => {
                                      if (
                                        confirm(
                                          "Are you sure you want to remove this team member?"
                                        )
                                      ) {
                                        deleteMemberMutation.mutate(member.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              <Badge variant={getRoleBadgeVariant(member.role)}>
                                {member.role}
                              </Badge>
                              <Badge
                                variant={
                                  getStatusBadgeVariant(member.status) ||
                                  "default"
                                }
                              >
                                {member.status}
                              </Badge>
                            </div>

                            {/* Last Active */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 pt-3 border-t">
                              <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span>
                                Last active:{" "}
                                {member.lastLogin
                                  ? new Date(
                                      member.lastLogin
                                    ).toLocaleDateString()
                                  : "Never"}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Pagination Controls - Responsive */}
                    {teamUserRes && (
                      <div className="mt-6">
                        {/* Desktop Pagination */}
                        <div className="hidden sm:flex justify-between items-center">
                          <Button
                            variant="outline"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={page === 1}
                          >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Previous
                          </Button>
                          <div className="text-sm text-gray-600">
                            Page{" "}
                            <span className="font-medium">
                              {teamUserRes.page}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium">
                              {teamUserRes.totalPages}
                            </span>
                            {" • "}
                            <span className="font-medium">
                              {teamUserRes.total}
                            </span>{" "}
                            total members
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= teamUserRes.totalPages}
                          >
                            Next
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>

                        {/* Mobile Pagination */}
                        <div className="sm:hidden space-y-3">
                          <div className="text-center text-sm text-gray-600 bg-gray-50 py-2 rounded-lg">
                            Page{" "}
                            <span className="font-medium">
                              {teamUserRes.page}
                            </span>{" "}
                            of{" "}
                            <span className="font-medium">
                              {teamUserRes.totalPages}
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {teamUserRes.total} total members
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              variant="outline"
                              onClick={() => handlePageChange(page - 1)}
                              disabled={page === 1}
                              className="w-full"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handlePageChange(page + 1)}
                              disabled={page >= teamUserRes.totalPages}
                              className="w-full"
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("team.Activity_LogsTitle")} </CardTitle>
                <CardDescription>{t("team.Activity_LogsDes")}</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                {/* Desktop Table View - Hidden on mobile */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(activityLogs as any[])?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            No activity logs found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (activityLogs as any[]).map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              {isDemoUser(user?.username) ? (
                                <span className="px-2 py-1 rounded">
                                  {log.userName
                                    .slice(0, -1)
                                    .replace(/./g, "*") +
                                    log.userName.slice(-1)}
                                </span>
                              ) : (
                                log.userName
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{log.action}</Badge>
                            </TableCell>
                            <TableCell>
                              {isDemoUser(user?.username) ? (
                                <span className="px-2 py-1 rounded">
                                  Details hidden for demo user
                                </span>
                              ) : (
                                <span>
                                  <DetailsView details={log.details} />
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {new Date(log.createdAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View - Hidden on desktop */}
                <div className="md:hidden space-y-4 p-4">
                  {(activityLogs as any[])?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No activity logs found.
                    </div>
                  ) : (
                    (activityLogs as any[]).map((log) => (
                      <div
                        key={log.id}
                        className="bg-white border rounded-lg p-4 shadow-sm space-y-3"
                      >
                        {/* Member */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Member
                          </span>
                          <span className="font-medium">
                            {isDemoUser(user?.username)
                              ? log.userName.slice(0, -1).replace(/./g, "*") +
                                log.userName.slice(-1)
                              : log.userName}
                          </span>
                        </div>

                        {/* Action */}
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Action
                          </span>
                          <Badge variant="outline">{log.action}</Badge>
                        </div>

                        {/* Details */}
                        <div className="space-y-1">
                          <span className="text-sm font-medium text-muted-foreground block">
                            Details
                          </span>
                          <div className="text-sm">
                            {isDemoUser(user?.username) ? (
                              <span className="text-muted-foreground">
                                Details hidden for demo user
                              </span>
                            ) : (
                              <DetailsView details={log.details} />
                            )}
                          </div>
                        </div>

                        {/* Timestamp */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <span className="text-sm font-medium text-muted-foreground">
                            Timestamp
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {/* Add/Edit Team Member Dialog */}
      <TeamMemberDialog
        open={showAddDialog}
        onOpenChange={handleCloseDialog}
        member={editingMember}
        channelId={selectedChannel?.id}
        onSave={(data) => saveMemberMutation.mutate(data)}
      />
    </div>
  );
}

function DetailsView({ details }: { details?: any }) {
  if (!details) return "-";

  if (details.updates) {
    const { role, email, firstName, lastName, permissions } = details.updates;
    return (
      <>
        <div>
          <strong>Role:</strong> {role}
        </div>
        <div>
          <strong>Email:</strong> {email}
        </div>
        <div>
          <strong>Name:</strong> {firstName} {lastName}
        </div>
        <div>
          <strong>Permissions:</strong>{" "}
          {permissions?.length ? permissions.join(", ") : "No permissions"}
        </div>
      </>
    );
  }

  if (details.createdBy) {
    return <div>Created By: {details.createdBy}</div>;
  }

  if (details.ipAddress) {
    return (
      <>
        <div>
          <strong>IP Address:</strong> {details.ipAddress}
        </div>
        <div>
          <strong>User Agent:</strong> {details.userAgent || "-"}
        </div>
      </>
    );
  }

  return "-";
}

interface PermissionItem {
  key: string;
  label: string;
}

interface PermissionGroup {
  title: string;
  label: string;
  permissions: PermissionItem[];
}

// External configuration - easily manageable
const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "contacts",
    label: "Manage Contacts",
    permissions: [
      { key: "contacts:view", label: "View" },
      { key: "contacts:create", label: "Create" },
      { key: "contacts:edit", label: "Edit" },
      { key: "contacts:delete", label: "Delete" },
      { key: "contacts:import", label: "Import" },
      { key: "contacts:export", label: "Export" },
    ],
  },
  {
    title: "campaigns",
    label: "Manage Campaigns",
    permissions: [
      { key: "campaigns:view", label: "View" },
      { key: "campaigns:create", label: "Create" },
      { key: "campaigns:edit", label: "Edit" },
      { key: "campaigns:delete", label: "Delete" },
      { key: "campaigns:send", label: "Send" },
      { key: "campaigns:schedule", label: "Schedule" },
    ],
  },
  {
    title: "templates",
    label: "Manage Templates",
    permissions: [
      { key: "templates:view", label: "View" },
      { key: "templates:create", label: "Create" },
      { key: "templates:edit", label: "Edit" },
      { key: "templates:delete", label: "Delete" },
      { key: "templates:sync", label: "Sync" },
    ],
  },
  {
    title: "analytics",
    label: "View Analytics",
    permissions: [
      { key: "analytics:view", label: "View" },
      { key: "analytics:export", label: "Export" },
    ],
  },
  {
    title: "team",
    label: "Manage Team",
    permissions: [
      { key: "team:view", label: "View" },
      { key: "team:create", label: "Create" },
      { key: "team:edit", label: "Edit" },
      { key: "team:delete", label: "Delete" },
      { key: "team:permissions", label: "Permissions" },
    ],
  },
  {
    title: "inbox",
    label: "Manage Inbox",
    permissions: [
      { key: "inbox:view", label: "View" },
      { key: "inbox:send", label: "Send" },
      { key: "inbox:assign", label: "Assign" },
      { key: "inbox:delete", label: "Delete" },
      { key: "inbox:close", label: "Close" },
    ],
  },
  {
    title: "settings",
    label: "Manage Settings",
    permissions: [
      { key: "settings:view", label: "View" },
      { key: "settings:channels", label: "Channels" },
      { key: "settings:webhook", label: "Webhook" },
      { key: "settings:team", label: "Team" },
      { key: "settings:api", label: "APIs" },
    ],
  },
  {
    title: "automations",
    label: "Manage Automations",
    permissions: [
      { key: "automations:view", label: "View" },
      { key: "automations:create", label: "Create" },
      { key: "automations:edit", label: "Edit" },
      { key: "automations:delete", label: "Delete" },
    ],
  },
  {
    title: "general",
    label: "General Settings",
    permissions: [
      { key: "data:export", label: "Data Export" },
      { key: "logs:view", label: "Logs View" },
    ],
  },

  {
    title: "widgetBuilder",
    label: "Manage Widgets",
    permissions: [
      { key: "widgetbuilder:view", label: "View" },
      { key: "widgetbuilder:create", label: "Create" },
      { key: "widgetbuilder:edit", label: "Edit" },
      { key: "widgetbuilder:delete", label: "Delete" },
    ],
  },

  {
    title: "supporttickets",
    label: "Manage Tickets Support",
    permissions: [
      { key: "supporttickets:view", label: "View" },
      { key: "supporttickets:create", label: "Create" },
      { key: "supporttickets:edit", label: "Edit" },
      { key: "supporttickets:delete", label: "Delete" },
    ],
  },
];

// Convert array from API → object for form
function mapApiPermissionsToForm(
  permissions: string[]
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  permissions.forEach((key) => {
    result[key] = true;
  });

  // also set group main flags if any permission inside is true
  PERMISSION_GROUPS.forEach((group) => {
    const mainKey = getMainPermissionKey(group.title);
    result[mainKey] = group.permissions.some((perm) => result[perm.key]);
  });

  if (
    permissions.includes("analytics:export") ||
    permissions.includes("analytics:view")
  ) {
    result.canViewAnalytics = true;
  }
  if (permissions.includes("contacts:export")) {
    result.canExportData = true;
  }

  return result;
}

// Convert form object → array for API
function mapFormPermissionsToApi(
  permissions: Record<string, boolean>
): string[] {
  const result: string[] = [];

  PERMISSION_GROUPS.forEach((group) => {
    group.permissions.forEach((perm) => {
      if (permissions[perm.key]) {
        result.push(perm.key);
      }
    });
  });

  if (permissions.canExportData) {
    result.push("data:export"); // or contacts:export depending on your API spec
  }

  return result;
}

// Helper functions
const getMainPermissionKey = (groupTitle: string): string => {
  if (groupTitle === "analytics") return "canViewAnalytics";
  return `canManage${groupTitle.charAt(0).toUpperCase() + groupTitle.slice(1)}`;
};

const findGroupByPermission = (
  permissionKey: string
): PermissionGroup | undefined => {
  return PERMISSION_GROUPS.find((group) =>
    group.permissions.some((perm) => perm.key === permissionKey)
  );
};

function TeamMemberDialog({
  open,
  onOpenChange,
  member,
  channelId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: User | null;
  channelId?: string;
  onSave: (data: TeamMemberFormData) => void;
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<TeamMemberFormState>({
    firstName: member?.firstName || "",
    lastName: member?.lastName || "",
    email: member?.email || "",
    username: member?.username || "",
    password: "",
    role: (member?.role as "team") || "team",
    permissions: member?.permissions
      ? mapApiPermissionsToForm(member.permissions as string[])
      : {},
    channelId: (member as any)?.channelId || channelId || "",
  });

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >(
    PERMISSION_GROUPS.reduce((acc, group) => {
      acc[group.title] = false;
      return acc;
    }, {} as Record<string, boolean>)
  );

  useEffect(() => {
    setFormData({
      firstName: member?.firstName || "",
      lastName: member?.lastName || "",
      email: member?.email || "",
      username: member?.username || "",
      password: "",
      role: (member?.role as "team") || "team",
      permissions: member?.permissions
        ? mapApiPermissionsToForm(member.permissions as string[])
        : {},
      channelId: (member as any)?.channelId || channelId || "",
    });
  }, [member, channelId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      ...formData,
      permissions: mapFormPermissionsToApi(formData.permissions),
      channelId: formData.channelId || undefined,
    };

    onSave(payload);
  };

  const updatePermission = (key: string, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: value,
      },
    }));
  };

  const updateGroupPermission = (group: PermissionGroup, checked: boolean) => {
    const updates: Record<string, boolean> = {};

    // Update the main group permission
    const mainKey = getMainPermissionKey(group.title);
    updates[mainKey] = checked;

    // Update all related granular permissions
    group.permissions.forEach((perm) => {
      updates[perm.key] = checked;
    });

    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        ...updates,
      },
    }));
  };

  const updateGranularPermission = (
    permissionKey: string,
    checked: boolean
  ) => {
    const group = findGroupByPermission(permissionKey);
    if (!group) return;

    const updates = { [permissionKey]: checked };

    // Check if all permissions in the group will be true after this update
    const allGroupPermissionsChecked = group.permissions.every((perm) =>
      perm.key === permissionKey ? checked : formData.permissions[perm.key]
    );

    // Update the main group permission accordingly
    const mainKey = getMainPermissionKey(group.title);
    updates[mainKey] = allGroupPermissionsChecked;

    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        ...updates,
      },
    }));
  };

  const toggleSection = (groupTitle: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [groupTitle]: !prev[groupTitle],
    }));
  };

  const getGroupMainPermission = (groupTitle: string) => {
    const mainKey = getMainPermissionKey(groupTitle);
    return formData.permissions[mainKey];
  };

  const renderPermissionGroup = (group: PermissionGroup) => {
    const isExpanded = expandedSections[group.title];

    return (
      <div key={group.title} className="border rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => toggleSection(group.title)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <Label className="text-sm font-medium cursor-pointer">
              {group.label}
            </Label>
          </div>
          <Switch
            checked={getGroupMainPermission(group.title) || false}
            onCheckedChange={(checked) => updateGroupPermission(group, checked)}
          />
        </div>

        {isExpanded && (
          <div className="mt-3 ml-6 pl-4 border-l-2 border-gray-200">
            <div className="grid grid-cols-3 gap-x-4 gap-y-2">
              {group.permissions.map((perm) => (
                <div key={perm.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={perm.key}
                    checked={formData.permissions[perm.key] || false}
                    onCheckedChange={
                      (checked) =>
                        updateGranularPermission(perm.key, checked === true) // ✅ force boolean
                    }
                  />
                  <Label
                    htmlFor={perm.key}
                    className="text-xs text-gray-600 cursor-pointer"
                  >
                    {perm.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const maskEmail = (email: string) => {
    if (!email) return "";
    const [localPart, domain] = email.split("@");
    if (!domain) return email;
    const visibleChars = 3;
    const maskedLocal =
      localPart.length > visibleChars
        ? "*".repeat(localPart.length - visibleChars) +
          localPart.slice(-visibleChars)
        : "*".repeat(localPart.length);
    return `${maskedLocal}@${domain}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {member ? "Edit Team Member" : "Add Team Member"}
          </DialogTitle>
          <DialogDescription>
            {member
              ? "Update team member details and permissions"
              : "Add a new team member to your channel"}
          </DialogDescription>
        </DialogHeader>
        {channelId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            This member will be assigned to the currently selected channel
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={
                    isDemoUser(user?.username)
                      ? maskEmail(formData.email)
                      : formData.email
                  }
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  readOnly={isDemoUser(user?.username)} // Optional
                  required
                />
              </div>
              {!member && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required={!member}
                  />
                </div>
              )}
              {/* <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      role: value as "admin" | "manager" | "agent",
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
            </div>

            {/* Dynamic Permissions Section */}
            <div className="space-y-4">
              <Label>Permissions</Label>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {PERMISSION_GROUPS.map(renderPermissionGroup)}
                </div>
                {/* Export Data - Simple permission */}
                {/* <div className="flex items-center justify-between py-2">
                  <Label htmlFor="perm-export" className="text-sm font-normal">
                    Export Data
                  </Label>
                  <Switch
                    id="perm-export"
                    checked={formData.permissions.canExportData || false}
                    onCheckedChange={(checked) => updatePermission("canExportData", checked)}
                  />
                </div> */}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button type="submit" disabled={isDemoUser(user?.username)}>
              {member ? "Update" : "Add"} Team Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
