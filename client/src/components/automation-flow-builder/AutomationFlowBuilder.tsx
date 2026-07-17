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

// AutomationFlowBuilder.tsx - Main Component

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { apiRequest, apiRequestFormData } from "@/lib/queryClient";
import { queryKeys } from "@/lib/query-keys";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "@/lib/i18n";

// Zod schema for the automation's top-level metadata (owned by the builder
// header). Node/edge graph validation is handled server-side.
const automationMetadataSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter a name for your automation.")
    .max(120, "Name is too long"),
  description: z
    .string()
    .trim()
    .max(500, "Description is too long")
    .optional()
    .or(z.literal("")),
  trigger: z.enum(["new_conversation", "message_received"]),
});
type AutomationMetadata = z.infer<typeof automationMetadataSchema>;

import {
  AutomationFlowBuilderProps,
  BuilderNodeData,
  NodeKind,
  Template,
  Member,
} from "./types";
import { uid, defaultsByKind, transformAutomationToFlow } from "./utils";
import { nodeTypes } from "./NodeComponents";
import { CustomEdge } from "./CustomEdge";
import { ConfigPanel } from "./ConfigPanel";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

function getDraftStorageKey(channelId: string) {
  return `automation_drafts_${channelId}`;
}

function saveDraftToStorage(channelId: string, draft: any) {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(channelId));
    const drafts = raw ? JSON.parse(raw) : [];
    const existingIdx = drafts.findIndex((d: any) => d.id === draft.id);
    if (existingIdx >= 0) {
      drafts[existingIdx] = draft;
    } else {
      drafts.unshift(draft);
    }
    const trimmed = drafts.slice(0, 10);
    localStorage.setItem(getDraftStorageKey(channelId), JSON.stringify(trimmed));
  } catch (e) {
    console.error("Failed to save automation draft:", e);
  }
}

function removeDraftFromStorage(channelId: string, draftId: string) {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(channelId));
    const drafts = raw ? JSON.parse(raw) : [];
    localStorage.setItem(
      getDraftStorageKey(channelId),
      JSON.stringify(drafts.filter((d: any) => d.id !== draftId))
    );
  } catch (e) {
    console.error("Failed to remove automation draft:", e);
  }
}

export default function AutomationFlowBuilder({
  automation,
  channelId,
  onClose,
  onDraftSaved,
}: AutomationFlowBuilderProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const draftIdRef = useRef<string>(automation?._draftId || `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const savedSuccessRef = useRef(false);
  const onDraftSavedRef = useRef(onDraftSaved);
  const nodesRef = useRef<Node<BuilderNodeData>[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const nameRef = useRef<string>(automation?.name || "Send a message");
  const descriptionRef = useRef<string>(automation?.description || "");
  const triggerRef = useRef<string>(automation?.trigger || "new_conversation");

  // React Hook Form owns the metadata fields; name/description/trigger stay
  // available as reactive values via watch() so the rest of the builder
  // (draft persistence, node data, etc.) can keep reading them as before.
  const metadataForm = useForm<AutomationMetadata>({
    resolver: zodResolver(automationMetadataSchema),
    mode: "onBlur",
    defaultValues: {
      name: automation?.name || "Send a message",
      description: automation?.description || "",
      trigger:
        (automation?.trigger as AutomationMetadata["trigger"]) ||
        "new_conversation",
    },
  });
  const name = metadataForm.watch("name");
  const description = metadataForm.watch("description") ?? "";
  const trigger = metadataForm.watch("trigger");
  const setName = (v: string) =>
    metadataForm.setValue("name", v, { shouldValidate: true, shouldDirty: true });
  const setDescription = (v: string) =>
    metadataForm.setValue("description", v, { shouldDirty: true });
  const setTrigger = (v: string) =>
    metadataForm.setValue(
      "trigger",
      v as AutomationMetadata["trigger"],
      { shouldDirty: true }
    );

  const initialFlowRef = useRef<{
    nodes: Node<BuilderNodeData>[];
    edges: Edge[];
  } | null>(null);

  if (!initialFlowRef.current) {
    initialFlowRef.current = transformAutomationToFlow(automation);
  }

  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialFlowRef.current?.nodes || []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialFlowRef.current.edges
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  );

  const onConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, type: "custom", sourceHandle: params.sourceHandle || undefined }, eds)
      ),
    [setEdges]
  );

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    const builderNode = node as Node<BuilderNodeData>;
    setSelectedId(builderNode.id);
  }, []);

  const { data: templateDataOld } = useQuery({
    queryKey: ["/api/templates"],
    queryFn: () =>
      apiRequest("GET", "/api/templates").then((res) => res.json()),
  });
  const templateData: Template[] = templateDataOld?.data || [];
  const templates =
    templateData?.filter((t: Template) => t.status === "APPROVED") || [];
    

  const { data: teamMembers } = useQuery({
    queryKey: ["/api/team/members"],
    queryFn: () =>
      apiRequest("GET", "/api/team/members").then((res) => res.json()),
  });

  
  const members = teamMembers?.data || [];

  const addNode = (kind: NodeKind) => {
    const id = uid();
    const base = defaultsByKind[kind];

    const newNode: Node<BuilderNodeData> = {
      id,
      type: kind,
      position: { x: 200, y: (nodes.length + 1) * 140 },
      data: { ...(base as BuilderNodeData) },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedId(id);
  };

  const deleteNode = () => {
    if (!selectedId || selectedId === "start") return;

    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedId && e.target !== selectedId)
    );
    setSelectedId(null);
  };

  const patchSelected = (patch: Partial<BuilderNodeData>) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n
      )
    );
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("description", payload.description);
      formData.append("trigger", payload.trigger);
      formData.append("triggerConfig", JSON.stringify(payload.triggerConfig));
      formData.append("nodes", JSON.stringify(payload.nodes));
      formData.append("edges", JSON.stringify(payload.edges));

    if (channelId) {
      formData.append("channelId", channelId);
    }

      payload.nodes.forEach((node: any) => {
        if (node.data.imageFile && node.data.imageFile instanceof File) {
          formData.append(`${node.id}_imageFile`, node.data.imageFile);
        }
        if (node.data.videoFile && node.data.videoFile instanceof File) {
          formData.append(`${node.id}_videoFile`, node.data.videoFile);
        }
        if (node.data.audioFile && node.data.audioFile instanceof File) {
          formData.append(`${node.id}_audioFile`, node.data.audioFile);
        }
        if (node.data.documentFile && node.data.documentFile instanceof File) {
          formData.append(`${node.id}_documentFile`, node.data.documentFile);
        }
      });

      if (payload.automationId) {
        return await apiRequestFormData("PUT", `/api/automations/${payload.automationId}`, formData);
      } else {
        return await apiRequestFormData("POST", "/api/automations", formData);
      }
    },
    onSuccess: () => {
      savedSuccessRef.current = true;
      if (channelId) {
        removeDraftFromStorage(channelId, draftIdRef.current);
      }
      toast({
        title: automation?.id
          ? t("automations.updatedToast")
          : t("automations.createdToast"),
        description: t("automations.savedDesc"),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.automations.all() });
      onClose();
    },
    onError: (error: any) => {
      console.error("Save mutation error:", error);
      toast({
        title: t("automations.saveFailedTitle"),
        description: error?.message || t("automations.saveFailedDesc"),
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Run the Zod schema before hitting the save mutation; surface the first
    // form error as a toast so the user is never blocked by a silent no-op.
    const parsed = automationMetadataSchema.safeParse(metadataForm.getValues());
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      toast({
        title: t("automations.checkDetails"),
        description: first?.message || t("automations.reviewForm"),
        variant: "destructive",
      });
      return;
    }

    const backendNodes = nodes
      .filter((n) => n.id !== "start")
      .map((node) => ({
        ...node,
        position: {
          x: node.position.x,
          y: node.position.y,
        },
      }));

    const normalizedEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || null,
      type: edge.type || "custom",
      animated: edge.animated || true,
    }));

    const uniqueEdges: typeof normalizedEdges = [];
    const seenConnections = new Set<string>();

    normalizedEdges.forEach((edge) => {
      const connectionKey = `${edge.source}-${edge.target}-${edge.sourceHandle || ''}`;
      if (!seenConnections.has(connectionKey)) {
        seenConnections.add(connectionKey);
        uniqueEdges.push(edge);
      }
    });

    const payload = {
      name,
      description,
      trigger,
      triggerConfig: {},
      nodes: backendNodes,
      edges: uniqueEdges,
      automationId: automation?.id || null,
    };

    saveMutation.mutate(payload);
  };

  useEffect(() => {
    onDraftSavedRef.current = onDraftSaved;
  }, [onDraftSaved]);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);

  useEffect(() => {
    triggerRef.current = trigger;
  }, [trigger]);

  useEffect(() => {
    return () => {
      if (savedSuccessRef.current || !channelId) return;
      if (automation?.id && !automation?._isDraft) return;

      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      const hasContent = currentNodes.length > 1;
      if (!hasContent) return;

      const serializableNodes = currentNodes
        .filter((n) => n.id !== "start")
        .map((n) => ({
          nodeId: n.id,
          type: n.type,
          position: n.position,
          data: Object.fromEntries(
            Object.entries(n.data).filter(([_, v]) => !(v instanceof File))
          ),
        }));

      const serializableEdges = currentEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      }));

      saveDraftToStorage(channelId, {
        id: draftIdRef.current,
        name: nameRef.current || "Untitled Draft",
        description: descriptionRef.current,
        trigger: triggerRef.current,
        nodes: serializableNodes,
        edges: serializableEdges,
        channelId,
        savedAt: new Date().toISOString(),
      });

      onDraftSavedRef.current?.();
    };
  }, []);

  const cleanupEdges = useCallback(() => {
    setEdges((currentEdges) => {
      const cleaned: Edge[] = [];
      const seen = new Set<string>();

      currentEdges.forEach((edge) => {
        const key = `${edge.source}-${edge.target}-${edge.sourceHandle || ''}`;
        if (!seen.has(key)) {
          seen.add(key);
          cleaned.push(edge);
        }
      });

      return cleaned;
    });
  }, [setEdges]);

  useEffect(() => {
    if (edges.length > nodes.length * 2) {
      cleanupEdges();
    }
  }, [edges.length, nodes.length, cleanupEdges]);

  const onInit = useCallback((reactFlowInstance: any) => {
    (
      reactFlowInstance as ReactFlowInstance<Node<BuilderNodeData>, Edge>
    ).setViewport({ x: 0, y: 0, zoom: 1 });
  }, []);

  const edgeTypes = useMemo(() => ({
    custom: (props: any) => <CustomEdge {...props} setEdges={setEdges} />,
  }), [setEdges]);

  return (
    <div className="h-screen w-full grid grid-cols-12 bg-gray-50">
      <Sidebar onAddNode={addNode} />

      <div className="col-span-7 flex flex-col">
        <Header
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          trigger={trigger}
          setTrigger={setTrigger}
          automation={automation}
          onClose={onClose}
          onSave={handleSave}
          isSaving={saveMutation.isPending}
          isDemo={user?.username === "demouser"}
        />

        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onInit={onInit}
            fitView
            edgeTypes={edgeTypes}
          >
            <MiniMap
              nodeStrokeColor="#94a3b8"
              nodeColor="#f1f5f9"
              nodeBorderRadius={8}
              maskColor="rgba(241,245,249,0.7)"
              className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
            />
            <Controls className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm" />
            <Background color="#e2e8f0" gap={20} size={1} />
          </ReactFlow>
        </div>
      </div>

      <div className="col-span-3 border-l border-gray-200 bg-white overflow-hidden min-h-0">
        <ConfigPanel
          selected={selectedNode}
          onChange={patchSelected}
          onDelete={deleteNode}
          templates={templates as Template[]}
          members={members as Member[]}
          channelId={channelId}
        />
      </div>
    </div>
  );
}