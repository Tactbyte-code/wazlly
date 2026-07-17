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

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Bot,
  Trash2,
  Edit,
  GitBranch,
  Clock,
  Workflow,
  Zap,
  Activity,
  BarChart3,
  Layers,
  ArrowRight,
  FileEdit,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/auth-context";
import AutomationFlowBuilder from "@/components/automation-flow-builder/AutomationFlowBuilder";
import { useTranslation } from "@/lib/i18n";

type Automation = {
  id: string;
  name: string;
  description?: string;
  status: "active" | "inactive" | "paused";
  trigger: string;
  executionCount: number | null;
  lastExecutedAt?: string | null;
  automation_nodes?: any[];
  automation_edges?: any[];
};

interface AutomationDraft {
  id: string;
  name: string;
  description: string;
  trigger: string;
  nodes: any[];
  edges: any[];
  channelId: string;
  savedAt: string;
}

function getDraftStorageKey(channelId: string) {
  return `automation_drafts_${channelId}`;
}

function loadDrafts(channelId: string): AutomationDraft[] {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(channelId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDrafts(channelId: string, drafts: AutomationDraft[]) {
  localStorage.setItem(getDraftStorageKey(channelId), JSON.stringify(drafts));
}

function deleteDraft(channelId: string, draftId: string) {
  const drafts = loadDrafts(channelId).filter((d) => d.id !== draftId);
  saveDrafts(channelId, drafts);
}

export default function Automations() {
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<any>(null);
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<AutomationDraft[]>([]);

  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: activeChannel } = useQuery({
    queryKey: queryKeys.channels.active(),
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  useEffect(() => {
    if (activeChannel?.id) {
      setDrafts(loadDrafts(activeChannel.id));
    }
  }, [activeChannel?.id]);

  const { data: automations = [], isLoading } = useQuery<Automation[]>({
    queryKey: queryKeys.automations.list(activeChannel?.id),
    queryFn: async () => {
      if (!activeChannel?.id) return [];
      const res = await fetch(`/api/automations?channelId=${activeChannel.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to fetch automations");
      return data as Promise<Automation[]>;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/automations/${id}/toggle`);
      if (!response.ok) throw new Error("Failed to toggle automation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.all() });
      toast({ title: "Automation status updated" });
    },
    onError: () => {
      toast({
        title: "Failed to update automation",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/automations/${id}`);
      if (!response.ok) throw new Error("Failed to delete automation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.all() });
      toast({ title: "Automation deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete automation",
        variant: "destructive",
      });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      if (!activeChannel?.id) throw new Error("No active channel");
      const response = await apiRequest("POST", "/api/automations/seed-templates", { channelId: activeChannel.id });
      if (!response.ok) throw new Error("Failed to load templates");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.all() });
      toast({
        title: "Sample templates loaded!",
        description: `${data.created?.length || 0} automation templates have been added. They are inactive by default — review and activate them when ready.`,
      });
    },
    onError: () => {
      toast({ title: "Failed to load templates", variant: "destructive" });
    },
  });

  const handleCreateNew = () => {
    setSelectedAutomation(null);
    setShowFlowBuilder(true);
  };

  const handleEdit = (automation: any) => {
    setSelectedAutomation(automation);
    setShowFlowBuilder(true);
  };

  const handleResumeDraft = (draft: AutomationDraft) => {
    setSelectedAutomation({
      _isDraft: true,
      _draftId: draft.id,
      name: draft.name,
      description: draft.description,
      trigger: draft.trigger,
      automation_nodes: draft.nodes,
      automation_edges: draft.edges,
    });
    setShowFlowBuilder(true);
  };

  const handleDeleteDraft = (draftId: string) => {
    if (!activeChannel?.id) return;
    deleteDraft(activeChannel.id, draftId);
    setDrafts(loadDrafts(activeChannel.id));
    toast({ title: "Draft deleted" });
  };

  const refreshDrafts = useCallback(() => {
    if (activeChannel?.id) {
      setDrafts(loadDrafts(activeChannel.id));
    }
  }, [activeChannel?.id]);

  const handleCloseFlowBuilder = () => {
    setShowFlowBuilder(false);
    setSelectedAutomation(null);
    queryClient.invalidateQueries({ queryKey: queryKeys.automations.all() });
  };

  const activeCount = automations.filter((a: any) => a.status === "active").length;
  const totalExecutions = automations.reduce((sum: number, a: any) => sum + (a.executionCount || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-72 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-10 w-36 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-4 w-20 bg-gray-100 rounded mb-2" />
              <div className="h-6 w-10 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 animate-pulse">
              <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
              <div className="h-4 w-full bg-gray-100 rounded mb-2" />
              <div className="h-4 w-2/3 bg-gray-100 rounded mb-4" />
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <div className="h-8 flex-1 bg-gray-100 rounded" />
                <div className="h-8 flex-1 bg-gray-100 rounded" />
                <div className="h-8 flex-1 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Automation Flows</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage conversation flows with drag-and-drop visual builder</p>
        </div>
        <div className="flex items-center gap-2">
          {automations.length === 0 && (
            <Button
              variant="outline"
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="gap-1.5"
            >
              {seedMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Load Sample Templates
            </Button>
          )}
          <Button
            onClick={handleCreateNew}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Create New Flow
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Flows</p>
            <p className="text-lg font-semibold text-gray-900">{automations.length}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-green-50 flex items-center justify-center">
            <Activity className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Active Flows</p>
            <p className="text-lg font-semibold text-gray-900">{activeCount}</p>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Executions</p>
            <p className="text-lg font-semibold text-gray-900">{totalExecutions}</p>
          </div>
        </div>
      </div>

      {drafts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileEdit className="h-4 w-4 text-amber-500" />
            Unsaved Drafts ({drafts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {drafts.map((draft) => (
              <div
                key={draft.id}
                className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileEdit className="h-4 w-4 text-amber-500 shrink-0" />
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {draft.name || "Untitled Draft"}
                    </h3>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px] shrink-0">
                    Draft
                  </Badge>
                </div>
                <p className="text-[11px] text-gray-500 mb-3">
                  Saved {format(new Date(draft.savedAt), "MMM d, h:mm a")}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-8 text-amber-700 border-amber-300 hover:bg-amber-100"
                    onClick={() => handleResumeDraft(draft)}
                  >
                    <Edit className="h-3 w-3 mr-1" /> Resume
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                    onClick={() => handleDeleteDraft(draft.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {automations.length === 0 && drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-200 rounded-lg">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Workflow className="h-7 w-7 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {t("automations.empityAuto.title")}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm text-center mb-5">
            {t("automations.empityAuto.Subtitle")}
          </p>
          <Button
            onClick={handleCreateNew}
            data-testid="button-create-first-automation"
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {t("automations.empityAuto.buttonTitle")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {automations.map((automation: any) => {
            const isActive = automation.status === "active";
            const nodeCount = automation.automation_nodes?.length || 0;
            const edgeCount = automation.automation_edges?.length || 0;

            return (
              <div
                key={automation.id}
                className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                data-testid={`card-automation-${automation.id}`}
              >
                <div className="p-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${isActive ? "bg-green-500" : "bg-gray-300"}`} />
                      <h3
                        className="font-medium text-sm text-gray-900 truncate"
                        data-testid={`text-name-${automation.id}`}
                      >
                        {automation.name}
                      </h3>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => toggleMutation.mutate(automation.id)}
                      disabled={user?.username === "demouser" || toggleMutation.isPending}
                      data-testid={`button-toggle-${automation.id}`}
                      className="data-[state=checked]:bg-green-500 shrink-0"
                    />
                  </div>
                </div>

                <div className="px-4 pb-3">
                  {automation.description ? (
                    <p
                      className="text-xs text-gray-500 line-clamp-2 mb-3"
                      data-testid={`text-description-${automation.id}`}
                    >
                      {automation.description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic mb-3">
                      No description
                    </p>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      <Zap className="h-3 w-3" />
                      {automation.trigger || "New Chat"}
                    </span>
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className={`text-[10px] px-1.5 py-0 rounded font-medium ${isActive ? "bg-green-100 text-green-700 hover:bg-green-100 border-0" : "bg-gray-100 text-gray-500 hover:bg-gray-100 border-0"}`}
                    >
                      {isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {nodeCount} nodes
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Workflow className="h-3 w-3" />
                      {edgeCount} edges
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {automation.executionCount || 0} runs
                    </span>
                  </div>
                </div>

                <div className="flex items-center border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs h-9 text-gray-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-none font-medium"
                    onClick={() => handleEdit(automation)}
                    data-testid={`button-edit-${automation.id}`}
                    disabled={user?.username === "demouser"}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <div className="w-px h-5 bg-gray-100" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs h-9 text-gray-600 hover:text-red-600 hover:bg-red-50/50 rounded-none font-medium"
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to delete this automation?"
                        )
                      ) {
                        deleteMutation.mutate(automation.id);
                      }
                    }}
                    disabled={
                      user?.username === "demouser"
                        ? true
                        : deleteMutation.isPending
                    }
                    data-testid={`button-delete-${automation.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showFlowBuilder} onOpenChange={(open) => { if (!open) handleCloseFlowBuilder(); else setShowFlowBuilder(true); }}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 [&>button.absolute]:hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Automation Flow Builder</DialogTitle>
            <DialogDescription>
              Create and edit automation workflows
            </DialogDescription>
          </DialogHeader>

          <AutomationFlowBuilder
            automation={selectedAutomation}
            channelId={activeChannel?.id}
            onClose={handleCloseFlowBuilder}
            onDraftSaved={refreshDrafts}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
