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
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Header from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryKeys } from "@/lib/query-keys";
import { useChannelContext } from "@/contexts/channel-context";
import { CampaignStatistics } from "@/components/campaigns/CampaignStatistics";
import { CampaignsTable } from "@/components/campaigns/CampaignsTable";
import { CampaignDetailsDialog } from "@/components/campaigns/CampaignDetailsDialog";
import { CreateCampaignDialog } from "@/components/campaigns/CreateCampaignDialog";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { CardStat } from "@/components/CardStat";

export default function Campaigns() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedChannel } = useChannelContext();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const userId = user?.role === "team" ? user?.createdBy : user?.id;
  const userRole = user?.role;

  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [campaignType, setCampaignType] = useState<string>("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: activeChannel } = useQuery({
    queryKey: queryKeys.channels.active(),
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const channelId = activeChannel?.id;

  // Fetch campaigns
  const { data: campaignResponse, isLoading: campaignsLoading } = useQuery({
    queryKey: queryKeys.campaigns.list({ userId, userRole, page }),
    queryFn: async () => {
      let res;
      if (userRole === "superadmin") {
        res = await apiRequest("GET", `/api/campaigns?page=${page}&limit=${limit}`);
      } else {
        res = await apiRequest("POST", "/api/getCampaignsByUserId", { userId, page, limit });
      }

      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: !!userId,
  });

  const campaigns = campaignResponse?.data || [];
  const total = campaignResponse?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const {
    data: templates = [],
    refetch: refetchTemplates,
    isLoading: templatesLoading,
  } = useQuery({
    queryKey: queryKeys.templates.list(channelId),
    enabled: !!channelId,
    queryFn: async () => {
      try {
        const response = await fetch(`/api/templates?channelId=${channelId}`);
        const res = await response.json();
        // console.log("Templates response:", res.data);
        return Array.isArray(res.data) ? res.data : [];
      } catch (error) {
        console.error("Error fetching templates:", error);
        return [];
      }
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (createDialogOpen && channelId) {
      console.log(
        "📂 Create Campaign dialog opened, fetching latest templates..."
      );
      refetchTemplates();
    }
  }, [createDialogOpen, channelId, refetchTemplates]);

  // Open the create dialog with a preselected group when navigated here
  // from the Groups page via ?createWith=group:<id>. We wait for the
  // groups list to load so we can map id → name (which is what
  // selectedGroup uses internally).
  const [pendingCreateWithId, setPendingCreateWithId] = useState<string | null>(
    null,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const createWith = params.get("createWith");
    if (createWith?.startsWith("group:")) {
      // URLSearchParams.get() already decodes the value.
      const groupId = createWith.slice("group:".length);
      if (groupId) setPendingCreateWithId(groupId);
      params.delete("createWith");
      const qs = params.toString();
      setLocation(`/campaigns${qs ? `?${qs}` : ""}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  // console.log("Fetched templatesssss:", templates);
  const { data: messagingLimitData } = useQuery({
    queryKey: ["/api/channels/messaging-limit", channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const res = await fetch(`/api/channels/${channelId}/messaging-limit`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const channelMessagingLimit: number | null =
    messagingLimitData == null
      ? null
      : messagingLimitData.limit === "unlimited"
        ? Infinity
        : Number(messagingLimitData.limit) || null;

  const contactLimit: number = 5000;
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const { data: contactsResponse } = useQuery({
    queryKey: ["/api/user/contacts", userId, contactLimit, selectedChannel?.id, selectedGroup],
    enabled: createDialogOpen && !!selectedChannel && !!userId,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(contactLimit) });
      if (selectedChannel?.id) params.set("channelId", selectedChannel.id);
      if (selectedGroup && selectedGroup !== "all") params.set("group", selectedGroup);
      const res = await fetch(
        `/api/user/contacts/${userId}?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: { "x-channel-id": selectedChannel?.id || "" },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const contacts = contactsResponse?.data || [];
  const contactsTotal: number =
    Number(contactsResponse?.pagination?.total ?? contacts.length) || 0;

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) =>
      apiRequest("POST", "/api/campaigns", campaignData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all() });
      setCreateDialogOpen(false);
      toast({
        title: "Campaign created",
        description: "Your campaign has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update campaign status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) =>
      apiRequest("PATCH", `/api/campaigns/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all() });
      toast({
        title: "Status updated",
        description: "Campaign status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Status update failed",
        description: error?.message || "Could not update campaign status.",
        variant: "destructive",
      });
    },
  });

  // Delete campaign
  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("DELETE", `/api/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all() });
      toast({
        title: "Campaign deleted",
        description: "Campaign has been deleted successfully",
      });
    },
  });

  const { data: groupsFormateData } = useQuery({
    queryKey: ["/api/groups", activeChannel?.id],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        "/api/groups" + `?channelId=${activeChannel?.id}`
      );
      const data = await response.json();
      console.log("groupsFormateData response", data);
      return data;
    },
    enabled: !!activeChannel?.id,
  });

  // console.log("groupsFormateData", groupsFormateData);

  const groupsData = groupsFormateData?.groups || [];

  // Once groups are loaded, resolve a pending createWith=group:<id> by
  // mapping the id to the group name and opening the create dialog.
  useEffect(() => {
    if (!pendingCreateWithId) return;
    if (!Array.isArray(groupsData) || groupsData.length === 0) return;
    const match = groupsData.find((g: any) => g.id === pendingCreateWithId);
    if (match?.name) {
      setSelectedGroup(match.name);
      setCreateDialogOpen(true);
    } else {
      toast({
        title: "Group not found",
        description: "The group you tried to use is no longer available.",
        variant: "destructive",
      });
    }
    setPendingCreateWithId(null);
  }, [pendingCreateWithId, groupsData, toast]);

  // Handle create campaign
  const handleCreateCampaign = async (campaignData: any) => {
    const {
      selectedTemplate,
      selectedContacts,
      csvData,
      campaignType,
      scheduledTime,
      autoRetry,
    } = campaignData;

    if (!selectedTemplate)
      return toast({
        title: "Error",
        description: "Please select a template",
        variant: "destructive",
      });
    if (!selectedChannel?.id)
      return toast({
        title: "Error",
        description: "Please select a channel",
        variant: "destructive",
      });

    let recipientCount = 0;
    if (campaignType === "contacts") recipientCount = selectedContacts.length;
    if (campaignType === "csv") recipientCount = csvData.length;

    if (recipientCount === 0)
      return toast({
        title: "Error",
        description: "No recipients selected",
        variant: "destructive",
      });

    if (
      channelMessagingLimit != null &&
      channelMessagingLimit !== Infinity &&
      recipientCount > channelMessagingLimit
    ) {
      let lastCheckedHint: string;
      if (messagingLimitData?.lastChecked) {
        const diffMs = Date.now() - new Date(messagingLimitData.lastChecked).getTime();
        const diffHours = Math.round(diffMs / 3_600_000);
        const diffDays = Math.round(diffMs / 86_400_000);
        const ago =
          diffHours < 1
            ? "less than an hour ago"
            : diffHours < 24
            ? `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
            : `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
        lastCheckedHint = ` Last checked ${ago} — go to Channel Settings to run a health check and refresh your tier.`;
      } else {
        lastCheckedHint = " Go to Channel Settings and run a health check to confirm your current tier.";
      }
      return toast({
        title: "Messaging Limit Exceeded",
        description: `Your channel's WhatsApp messaging limit is ${channelMessagingLimit.toLocaleString()} messages per 24 hours. You selected ${recipientCount.toLocaleString()} recipients. Please reduce recipients or upgrade your WhatsApp tier.${lastCheckedHint}`,
        variant: "destructive",
      });
    }

    createCampaignMutation.mutate({
      ...campaignData,
      channelId: selectedChannel.id,
      templateId: selectedTemplate.id,
      templateName: selectedTemplate.name,
      templateLanguage: selectedTemplate.language,
      status: scheduledTime ? "scheduled" : "active",
      scheduledAt: scheduledTime ? new Date(scheduledTime).toISOString() : null,
      contactGroups: campaignType === "contacts" ? selectedContacts : [],
      csvData: campaignType === "csv" ? csvData : [],
      recipientCount,
      type: "marketing",
      apiType: "mm_lite",
      campaignType,
      variableMapping: campaignData.variableMapping || {},
      autoRetry,
    });
  };

  // Update status & delete handlers
  const handleUpdateStatus = (id: string, status: string) =>
    updateStatusMutation.mutate({ id, status });
  const handleDeleteCampaign = (id: string) => {
    if (confirm("Are you sure you want to delete this campaign?"))
      deleteCampaignMutation.mutate(id);
  };

  if (campaignsLoading)
    return (
      <div className="flex items-center justify-center h-96">
        Loading campaigns...
      </div>
    );

  return (
    <div className="container mx-auto dots-bg">
      <Header
        title={t("campaigns.title")}
        subtitle={t("campaigns.subtitle")}
        action={
          userRole !== "superadmin"
            ? {
                label: t("campaigns.createCampaign"),
                onClick: () => setCreateDialogOpen(true),
              }
            : undefined
        }
      />

      <div className="px-4 py-4">
        <CampaignStatistics campaigns={campaigns} stats={campaignResponse?.stats} />
      </div>

      <div className="px-4 py-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("campaigns.allCampaigns")}</CardTitle>
            <CardDescription>{t("campaigns.listDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <CampaignsTable
              campaigns={campaigns}
              onViewCampaign={setSelectedCampaign}
              onUpdateStatus={handleUpdateStatus}
              onDeleteCampaign={handleDeleteCampaign}
            />

            {/* Pagination */}

            <div className="w-full mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* LEFT → Showing + Limit */}
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>
                  Showing {(page - 1) * limit + 1} to{" "}
                  {Math.min(page * limit, total)} of {total} campaigns
                </span>

                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="border rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {[10, 20, 50, 100].map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              {/* RIGHT → Pagination Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(page - 1, 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Previous
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const pageNumber = i + 1;
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setPage(pageNumber)}
                      className={`px-3 py-1 border rounded-md ${
                        pageNumber === page
                          ? "bg-green-600 text-white"
                          : "bg-white hover:bg-gray-50"
                      } transition`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage(Math.min(page + 1, totalPages))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Next
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CreateCampaignDialog
        groups={groupsData}
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) setSelectedGroup("all");
        }}
        templates={templates}
        contacts={contacts}
        contactsTotal={contactsTotal}
        selectedGroup={selectedGroup}
        onSelectedGroupChange={setSelectedGroup}
        onCreateCampaign={handleCreateCampaign}
        isCreating={createCampaignMutation.isPending}
        messagingLimit={channelMessagingLimit}
        messagingTier={messagingLimitData?.tier}
      />

      <CampaignDetailsDialog
        campaign={selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
      />
    </div>
  );
}
