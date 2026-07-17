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

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
  Connection,
  Edge,
  Node,
  BaseEdge,
  getStraightPath,
  EdgeLabelRenderer,
  ReactFlowInstance,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { apiRequest, apiRequestFormData } from "@/lib/queryClient";
import { toast, useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Clock,
  FileText,
  Maximize2,
  MessageCircle,
  Plus,
  Reply,
  Save,
  Share2,
  Users,
  Zap,
  Upload,
  UserPlus,
  Trash2,
  Image as ImageIcon,
  Video,
  FileAudio,
  FileIcon,
  X,
  Check,
  GitBranch,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

// -----------------------
// Types
// -----------------------
export type NodeKind =
  | "start"
  | "conditions"
  | "custom_reply"
  | "user_reply"
  | "time_gap"
  | "send_template"
  | "assign_user";

export interface BuilderNodeData {
  kind: NodeKind;
  label?: string;
  // Configs by type
  message?: string;
  imageFile?: File | null;
  imagePreview?: string;
  videoFile?: File | null;
  videoPreview?: string;
  audioFile?: File | null;
  audioPreview?: string;
  documentFile?: File | null;
  documentPreview?: string;
  question?: string;
  saveAs?: string;
  delay?: number; // seconds
  templateId?: string;
  assigneeId?: string; // user id
  // Condition specific fields
  conditionType?: "keyword" | "contains" | "equals" | "starts_with";
  keywords?: string[];
  matchType?: "any" | "all";
  buttons?: Array<{
    id: string;
    text: string;
    action: "next" | "custom";
    value?: string;
  }>;
  [key: string]: unknown;
}

interface AutomationFlowBuilderProps {
  automation?: any;
  channelId?: string;
  onClose: () => void;
}

interface Template {
  id: string;
  name: string;
  status: string;
}

interface Member {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  style?: React.CSSProperties;
  markerEnd?: string;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

// -----------------------
// Utility
// -----------------------
const uid = () =>
  `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// Default data for each node type
const defaultsByKind: Record<NodeKind, Partial<BuilderNodeData>> = {
  start: { kind: "start", label: "Start" },
  conditions: {
    kind: "conditions",
    label: "Conditions",
    conditionType: "keyword",
    keywords: [],
    matchType: "any",
  },
  custom_reply: {
    kind: "custom_reply",
    label: "Message",
    message: "",
    buttons: [],
  },
  user_reply: {
    kind: "user_reply",
    label: "Question",
    question: "",
    saveAs: "",
    buttons: [
      { id: "answer1", text: "Answer 1", action: "next" },
      { id: "default", text: "Default", action: "next" },
    ],
  },
  time_gap: { kind: "time_gap", label: "Delay", delay: 60 },
  send_template: { kind: "send_template", label: "Template", templateId: "" },
  assign_user: { kind: "assign_user", label: "Assign User", assigneeId: "" },
};

// -----------------------
// Transform automation data to ReactFlow format
// -----------------------
function transformAutomationToFlow(automation: any): {
  nodes: Node<BuilderNodeData>[];
  edges: Edge[];
} {
  if (!automation || !automation.automation_nodes) {
    return {
      nodes: [
        {
          id: "start",
          type: "start",
          position: { x: 200, y: 40 },
          data: { ...(defaultsByKind.start as BuilderNodeData) },
        },
      ],
      edges: [],
    };
  }

  const nodes: Node<BuilderNodeData>[] = [
    {
      id: "start",
      type: "start",
      position: { x: 200, y: 40 },
      data: { ...(defaultsByKind.start as BuilderNodeData) },
    },
  ];

  // Sort nodes by position
  const sortedNodes = [...automation.automation_nodes].sort(
    (a: any, b: any) => a.position - b.position
  );
  console.log("sortedNodes", sortedNodes);

  // Transform each automation node
  sortedNodes.forEach((autoNode: any, index: number) => {
    const nodeData: BuilderNodeData = {
      kind: autoNode.type as NodeKind,
      label: defaultsByKind[autoNode.type as NodeKind]?.label || autoNode.type,
      ...autoNode.data,
    };

    const reactFlowNode: Node<BuilderNodeData> = {
      id: autoNode.nodeId,
      type: autoNode.type,
      // FIX: Use the correct property names from your API data
      position:
        autoNode.position &&
        autoNode.position.x !== undefined &&
        autoNode.position.y !== undefined
          ? { x: autoNode.position.x, y: autoNode.position.y }
          : { x: 200, y: 140 + index * 140 },
      data: nodeData,
    };

    nodes.push(reactFlowNode);
  });

  // Normalize and deduplicate edges
  const edges: Edge[] = [];
  const edgeSet = new Set<string>(); // Track unique connections

  if (automation.automation_edges && automation.automation_edges.length > 0) {
    automation.automation_edges.forEach((edge: any) => {
      // Normalize edge format - handle both database and ReactFlow formats
      const source = edge.source || edge.sourceNodeId;
      const target = edge.target || edge.targetNodeId;

      if (!source || !target) {
        console.warn("Invalid edge data:", edge);
        return;
      }

      // Create unique key for deduplication
      const edgeKey = `${source}-${target}`;

      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);

        edges.push({
          id: edge.id || `edge-${source}-${target}`,
          source: source,
          target: target,
          type: "custom",
          animated: true,
        });
      }
    });
  } else {
    // Only create default linear edges if no edges exist (new automation)
    let previousNodeId = "start";
    sortedNodes.forEach((autoNode: any) => {
      const edgeKey = `${previousNodeId}-${autoNode.nodeId}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: `edge-${previousNodeId}-${autoNode.nodeId}`,
          source: previousNodeId,
          target: autoNode.nodeId,
          type: "custom",
          animated: true,
        });
      }
      previousNodeId = autoNode.nodeId;
    });
  }

  return { nodes, edges };
}

// -----------------------
// Custom Node Components
// -----------------------
function Shell({
  children,
  tint,
}: {
  children: React.ReactNode;
  tint: string;
}) {
  return (
    <div
      className={`rounded-2xl shadow-sm border text-white ${tint} px-4 py-3 min-w-[220px] relative group`}
    >
      {children}
    </div>
  );
}

function StartNode() {
  return (
    <div className="rounded-full w-14 h-14 bg-green-500 flex items-center justify-center text-white shadow">
      <Zap className="w-6 h-6" />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function ConditionsNode({ data }: { data: BuilderNodeData }) {
  return (
    <Shell tint="bg-purple-500 border-purple-600">
      <div className="font-semibold flex items-center gap-2">
        <GitBranch className="w-4 h-4" /> Conditions
      </div>
      <div className="text-white/90 text-sm mt-1">
        {data.conditionType === "keyword" &&
        data.keywords &&
        data.keywords.length > 0 ? (
          <div>
            Keywords: {data.keywords.slice(0, 3).join(", ")}
            {data.keywords.length > 3 && "..."}
          </div>
        ) : (
          <div>No conditions set</div>
        )}
      </div>
      {data.matchType && (
        <div className="text-[11px] mt-1 bg-white/15 rounded px-2 py-1 inline-block">
          Match: {data.matchType}
        </div>
      )}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Shell>
  );
}

function CustomReplyNode({ data }: { data: BuilderNodeData }) {
  return (
    <Shell tint="bg-orange-500 border-orange-600">
      <div className="font-semibold flex items-center gap-2">
        <MessageCircle className="w-4 h-4" /> Message
      </div>
      {data.message && (
        <div className="text-white/90 text-sm mt-1 whitespace-pre-wrap">
          {data.message.length > 50
            ? `${data.message.slice(0, 50)}...`
            : data.message}
        </div>
      )}

      {/* Media previews */}
      {data.imagePreview && (
        <div className="mt-2 rounded-lg overflow-hidden bg-white/10">
          <img
            src={data.imagePreview}
            alt="message"
            className="max-h-20 object-cover w-full"
          />
        </div>
      )}
      {data.videoPreview && (
        <div className="mt-2 flex items-center gap-2 text-xs bg-white/10 rounded px-2 py-1">
          <Video className="w-3 h-3" />
          Video attached
        </div>
      )}
      {data.audioPreview && (
        <div className="mt-2 flex items-center gap-2 text-xs bg-white/10 rounded px-2 py-1">
          <FileAudio className="w-3 h-3" />
          Audio attached
        </div>
      )}
      {data.documentPreview && (
        <div className="mt-2 flex items-center gap-2 text-xs bg-white/10 rounded px-2 py-1">
          <FileIcon className="w-3 h-3" />
          Document attached
        </div>
      )}

      {/* Buttons preview */}
      {data.buttons && data.buttons.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.buttons.slice(0, 2).map((button) => (
            <div
              key={button.id}
              className="bg-white/20 text-xs px-2 py-1 rounded"
            >
              {button.text}
            </div>
          ))}
          {data.buttons.length > 2 && (
            <div className="text-xs text-white/70">
              +{data.buttons.length - 2} more
            </div>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Shell>
  );
}

function UserReplyNode({ data }: { data: BuilderNodeData }) {
  return (
    <Shell tint="bg-pink-500 border-pink-600">
      <div className="font-semibold flex items-center gap-2">
        <Reply className="w-4 h-4" /> Question
      </div>
      {data.question && (
        <div className="text-white/90 text-sm mt-1 whitespace-pre-wrap">
          {data.question.length > 50
            ? `${data.question.slice(0, 50)}...`
            : data.question}
        </div>
      )}

      {/* Media previews */}
      {data.imagePreview && (
        <div className="mt-2 rounded-lg overflow-hidden bg-white/10">
          <img
            src={data.imagePreview}
            alt="question"
            className="max-h-20 object-cover w-full"
          />
        </div>
      )}

      {data.saveAs && (
        <div className="text-[11px] mt-2 bg-white/15 rounded px-2 py-1 inline-block">
          save as: <span className="font-mono">{data.saveAs}</span>
        </div>
      )}

      {/* Answer buttons preview */}
      {data.buttons && data.buttons.length > 0 && (
        <div className="mt-2 space-y-1">
          {data.buttons.slice(0, 2).map((button) => (
            <div
              key={button.id}
              className="bg-green-500 text-xs px-2 py-1 rounded flex items-center gap-1"
            >
              <div className="w-1 h-1 bg-white rounded-full" />
              {button.text}
            </div>
          ))}
        </div>
      )}

      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Shell>
  );
}

function TimeGapNode({ data }: { data: BuilderNodeData }) {
  return (
    <Shell tint="bg-gray-600 border-gray-700">
      <div className="font-semibold flex items-center gap-2">
        <Clock className="w-4 h-4" /> Delay
      </div>
      <div className="text-white/90 text-sm mt-1">
        {data.delay ?? 0} seconds
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Shell>
  );
}

function SendTemplateNode({ data }: { data: BuilderNodeData }) {
  return (
    <Shell tint="bg-blue-600 border-blue-700">
      <div className="font-semibold flex items-center gap-2">
        <FileText className="w-4 h-4" /> Template
      </div>
      <div className="text-white/90 text-sm mt-1">
        {data.templateId ? `Template: ${data.templateId}` : "Select a template"}
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Shell>
  );
}

function AssignUserNode({ data }: { data: BuilderNodeData }) {
  return (
    <Shell tint="bg-indigo-600 border-indigo-700">
      <div className="font-semibold flex items-center gap-2">
        <Users className="w-4 h-4" /> Assign to
      </div>
      <div className="text-white/90 text-sm mt-1">
        {data.assigneeId ? data.assigneeId : "Select member"}
      </div>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </Shell>
  );
}

const nodeTypes = {
  start: StartNode,
  conditions: ConditionsNode,
  custom_reply: CustomReplyNode,
  user_reply: UserReplyNode,
  time_gap: TimeGapNode,
  send_template: SendTemplateNode,
  assign_user: AssignUserNode,
};

// File upload helper
function FileUploadButton({
  accept,
  onUpload,
  children,
  className = "",
}: {
  accept: string;
  onUpload: (file: File) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-gray-50 ${className}`}
      >
        {children}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}

// -----------------------
// Right Panel (Config)
// -----------------------
function ConfigPanel({
  selected,
  onChange,
  onDelete,
  templates,
  members,
}: {
  selected: Node<BuilderNodeData> | null;
  onChange: (patch: Partial<BuilderNodeData>) => void;
  onDelete: () => void;
  templates: Template[];
  members: Member[];
}) {
  if (!selected || selected.data.kind === "start") {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        Select a node to configure
      </div>
    );
  }

  const d = selected.data;

  // File upload handlers
  const handleFileUpload =
    (type: "image" | "video" | "audio" | "document") => (file: File) => {
      const previewUrl = URL.createObjectURL(file);
      onChange({
        [`${type}File`]: file,
        [`${type}Preview`]: previewUrl,
      } as any);
    };

  const removeFile = (type: "image" | "video" | "audio" | "document") => () => {
    onChange({
      [`${type}File`]: null,
      [`${type}Preview`]: null,
    } as any);
  };

  // Button management
  const addButton = () => {
    const newButton = {
      id: uid(),
      text: "New Button",
      action: "next" as const,
    };
    onChange({
      buttons: [...(d.buttons || []), newButton],
    });
  };

  const updateButton = (
    buttonId: string,
    updates: Partial<NonNullable<typeof d.buttons>[0]>
  ) => {
    onChange({
      buttons: (d.buttons || []).map((btn) =>
        btn.id === buttonId ? { ...btn, ...updates } : btn
      ),
    });
  };

  const removeButton = (buttonId: string) => {
    onChange({
      buttons: (d.buttons || []).filter((btn) => btn.id !== buttonId),
    });
  };

  // Keyword management
  const addKeyword = () => {
    const keywords = d.keywords || [];
    onChange({
      keywords: [...keywords, ""],
    });
  };

  const updateKeyword = (index: number, value: string) => {
    const keywords = d.keywords || [];
    const updated = [...keywords];
    updated[index] = value;
    onChange({
      keywords: updated,
    });
  };

  const removeKeyword = (index: number) => {
    const keywords = d.keywords || [];
    onChange({
      keywords: keywords.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="flex flex-col h-screen">
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Configure
              </div>
              <div className="text-lg font-semibold">{d.label}</div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          {d.kind === "conditions" && (
            <Card className="p-3 space-y-4">
              <div>
                <Label>Condition Type</Label>
                <select
                  className="w-full border rounded-md h-9 px-2"
                  value={d.conditionType || "keyword"}
                  onChange={(e) =>
                    onChange({ conditionType: e.target.value as any })
                  }
                >
                  <option value="keyword">Contains Keywords</option>
                  <option value="equals">Equals</option>
                  <option value="starts_with">Starts With</option>
                  <option value="contains">Contains Text</option>
                </select>
              </div>

              <div>
                <Label>Match Type</Label>
                <select
                  className="w-full border rounded-md h-9 px-2"
                  value={d.matchType || "any"}
                  onChange={(e) =>
                    onChange({ matchType: e.target.value as any })
                  }
                >
                  <option value="any">Match Any</option>
                  <option value="all">Match All</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Keywords</Label>
                  <Button size="sm" variant="outline" onClick={addKeyword}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Keyword
                  </Button>
                </div>

                {(d.keywords || []).map((keyword, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={keyword}
                      onChange={(e) => updateKeyword(index, e.target.value)}
                      placeholder={`Keyword ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeKeyword(index)}
                      className="text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {(!d.keywords || d.keywords.length === 0) && (
                  <div className="text-sm text-gray-500 italic">
                    No keywords added yet. Click "Add Keyword" to start.
                  </div>
                )}
              </div>
            </Card>
          )}

          {d.kind === "custom_reply" && (
            <Card className="p-3 space-y-4">
              <div>
                <Label>Message</Label>
                <Textarea
                  rows={4}
                  value={d.message || ""}
                  onChange={(e) => onChange({ message: e.target.value })}
                  placeholder="Hi {{name}},&#10;&#10;Welcome to Product Academy, please share the following information before we proceed."
                />
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-green-500 text-white border-green-500 hover:bg-green-600"
                  >
                    Variables
                  </Button>
                </div>
              </div>

              {/* Media Upload Section */}
              <div className="space-y-3">
                <Label>Attachments</Label>
                <div className="grid grid-cols-2 gap-2">
                  <FileUploadButton
                    accept="image/*"
                    onUpload={handleFileUpload("image")}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Image
                  </FileUploadButton>
                  <FileUploadButton
                    accept="video/*"
                    onUpload={handleFileUpload("video")}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Video className="w-4 h-4" />
                    Video
                  </FileUploadButton>
                  <FileUploadButton
                    accept="audio/*"
                    onUpload={handleFileUpload("audio")}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <FileAudio className="w-4 h-4" />
                    Audio
                  </FileUploadButton>
                  <FileUploadButton
                    accept=".pdf,.doc,.docx,.txt"
                    onUpload={handleFileUpload("document")}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <FileIcon className="w-4 h-4" />
                    Document
                  </FileUploadButton>
                </div>

                {/* File Previews */}
                {d.imagePreview && (
                  <div className="relative border rounded-lg p-2">
                    <img
                      src={d.imagePreview}
                      alt="preview"
                      className="w-full h-32 object-cover rounded"
                    />
                    <button
                      onClick={removeFile("image")}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {d.videoPreview && (
                  <div className="relative border rounded-lg p-2 flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">Video file attached</span>
                    <button
                      onClick={removeFile("video")}
                      className="ml-auto bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {d.audioPreview && (
                  <div className="relative border rounded-lg p-2 flex items-center gap-2">
                    <FileAudio className="w-5 h-5 text-purple-500" />
                    <span className="text-sm">Audio file attached</span>
                    <button
                      onClick={removeFile("audio")}
                      className="ml-auto bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {d.documentPreview && (
                  <div className="relative border rounded-lg p-2 flex items-center gap-2">
                    <FileIcon className="w-5 h-5 text-gray-500" />
                    <span className="text-sm">Document attached</span>
                    <button
                      onClick={removeFile("document")}
                      className="ml-auto bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Buttons Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Buttons (Optional)</Label>
                  <Button size="sm" variant="outline" onClick={addButton}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Button
                  </Button>
                </div>

                {d.buttons?.map((button) => (
                  <div
                    key={button.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={button.text}
                        onChange={(e) =>
                          updateButton(button.id, { text: e.target.value })
                        }
                        placeholder="Button text"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeButton(button.id)}
                        className="text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {d.kind === "time_gap" && (
            <Card className="p-3 space-y-3">
              <div>
                <Label>Delay (seconds)</Label>
                <Input
                  type="number"
                  min={10}
                  value={d.delay ?? 60}
                  onChange={(e) =>
                    onChange({ delay: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            </Card>
          )}

          {d.kind === "send_template" && (
            <Card className="p-3 space-y-3">
              <div>
                <Label>Choose Template</Label>
                <select
                  className="w-full border rounded-md h-9 px-2"
                  value={d.templateId || ""}
                  onChange={(e) => onChange({ templateId: e.target.value })}
                >
                  <option value="">Select template</option>
                  {templates?.map((t: Template) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          )}

          {d.kind === "assign_user" && (
            <Card className="p-3 space-y-3">
              <div>
                <Label className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Assign to Member
                </Label>
                <select
                  className="w-full border rounded-md h-9 px-2"
                  value={d.assigneeId || ""}
                  onChange={(e) => onChange({ assigneeId: e.target.value })}
                >
                  <option value="">Select member</option>
                  {members.map((m: Member) => (
                    <option key={m.id} value={m.id}>
                      {m.name || `${m.firstName || ""} ${m.lastName || ""}`}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
          )}

          {d.kind === "user_reply" && (
            <Card className="p-3 space-y-4">
              <div>
                <Label>Question Text</Label>
                <Textarea
                  rows={4}
                  value={d.question || ""}
                  onChange={(e) => onChange({ question: e.target.value })}
                  placeholder="What would you like to ask the user?"
                />
              </div>

              <div>
                <Label>Save Answer As (Variable Name)</Label>
                <Input
                  value={d.saveAs || ""}
                  onChange={(e) => onChange({ saveAs: e.target.value })}
                  placeholder="e.g., user_name, phone_number"
                />
              </div>

              {/* Media Upload Section for Questions */}
              <div className="space-y-3">
                <Label>Attachments (Optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <FileUploadButton
                    accept="image/*"
                    onUpload={handleFileUpload("image")}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Image
                  </FileUploadButton>
                  <FileUploadButton
                    accept="video/*"
                    onUpload={handleFileUpload("video")}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <Video className="w-4 h-4" />
                    Video
                  </FileUploadButton>
                </div>

                {/* File Previews for Questions */}
                {d.imagePreview && (
                  <div className="relative border rounded-lg p-2">
                    <img
                      src={d.imagePreview}
                      alt="preview"
                      className="w-full h-32 object-cover rounded"
                    />
                    <button
                      onClick={removeFile("image")}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {d.videoPreview && (
                  <div className="relative border rounded-lg p-2 flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-500" />
                    <span className="text-sm">Video file attached</span>
                    <button
                      onClick={removeFile("video")}
                      className="ml-auto bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Answer Options/Buttons Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Answer Options</Label>
                  <Button size="sm" variant="outline" onClick={addButton}>
                    <Plus className="w-3 h-3 mr-1" />
                    Add Option
                  </Button>
                </div>

                {d.buttons?.map((button) => (
                  <div
                    key={button.id}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={button.text}
                        onChange={(e) =>
                          updateButton(button.id, { text: e.target.value })
                        }
                        placeholder="Answer option text"
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeButton(button.id)}
                        className="text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <select
                        value={button.action || "next"}
                        onChange={(e) =>
                          updateButton(button.id, {
                            action: e.target.value as "next" | "custom",
                          })
                        }
                        className="border rounded px-2 py-1 text-xs"
                      >
                        <option value="next">Continue to next step</option>
                        <option value="custom">Custom action</option>
                      </select>

                      {button.action === "custom" && (
                        <Input
                          value={button.value || ""}
                          onChange={(e) =>
                            updateButton(button.id, { value: e.target.value })
                          }
                          placeholder="Custom value"
                          className="flex-1 text-xs h-7"
                        />
                      )}
                    </div>
                  </div>
                ))}

                {(!d.buttons || d.buttons.length === 0) && (
                  <div className="text-sm text-gray-500 italic border rounded-lg p-4 text-center">
                    No answer options added. Users will be able to type free
                    text responses.
                    <br />
                    <br />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addButton}
                      className="mt-2"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add First Option
                    </Button>
                  </div>
                )}
              </div>

              {/* Preview Section */}
              {(d.question || (d.buttons && d.buttons.length > 0)) && (
                <div className="border-t pt-4">
                  <Label className="text-xs text-gray-500">PREVIEW</Label>
                  <div className="bg-gray-50 rounded-lg p-3 mt-2">
                    {d.question && (
                      <div className="font-medium text-sm mb-3">
                        {d.question}
                      </div>
                    )}
                    {d.buttons && d.buttons.length > 0 && (
                      <div className="space-y-1">
                        {d.buttons.map((button) => (
                          <div
                            key={button.id}
                            className="bg-blue-500 text-white text-xs px-3 py-1 rounded-full inline-block mr-2"
                          >
                            {button.text}
                          </div>
                        ))}
                      </div>
                    )}
                    {(!d.buttons || d.buttons.length === 0) && (
                      <div className="text-xs text-gray-500 italic">
                        [User can type free text response]
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// -----------------------
// Main Component
// -----------------------
export default function AutomationFlowBuilderXYFlow({
  automation,
  channelId,
  onClose,
}: AutomationFlowBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Initialize with automation data or defaults
  const [name, setName] = useState<string>(
    automation?.name || "Send a message"
  );
  const [description, setDescription] = useState<string>(
    automation?.description || ""
  );
  const [trigger, setTrigger] = useState<string>(
    automation?.trigger || "new_conversation"
  );

  // Transform automation data once and store in ref to prevent re-computation
  const initialFlowRef = useRef<{
    nodes: Node<BuilderNodeData>[];
    edges: Edge[];
  } | null>(null);

  if (!initialFlowRef.current) {
    initialFlowRef.current = transformAutomationToFlow(automation);
  }

  // Initialize directly without useMemo or normalizeEdges function
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialFlowRef.current?.nodes || []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialFlowRef.current.edges
  );
  useEffect(() => {
    console.log(nodes);
  }, [nodes]);

  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) || null,
    [nodes, selectedId]
  );

  const onConnect: OnConnect = useCallback(
    (params: Edge | Connection) =>
      setEdges((eds) =>
        addEdge({ ...params, animated: true, type: "custom" }, eds)
      ),
    [setEdges]
  );

  // const onNodeClick: NodeMouseHandler = useCallback(
  //   (_, node: Node<BuilderNodeData>) => setSelectedId(node.id),
  //   []
  // );

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    const builderNode = node as Node<BuilderNodeData>; // type assertion
    setSelectedId(builderNode.id);
  }, []);

  // Data sources
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

  console.log("Loaded members:", members);

  // Add node actions
  // const addNode = (kind: NodeKind) => {
  //   const id = uid();
  //   const base = defaultsByKind[kind];
  //   const newNode: Node<BuilderNodeData> = {
  //     id,
  //     type: kind,
  //     position: { x: 200, y: (nodes.length + 1) * 140 },
  //     data: { ...(base as BuilderNodeData) },
  //   };
  //   setNodes((nds) => [...nds, newNode]);
  //   setSelectedId(id);
  // };

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

  // Delete node
  const deleteNode = () => {
    if (!selectedId || selectedId === "start") return;

    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== selectedId && e.target !== selectedId)
    );
    setSelectedId(null);
  };

  // Patch selected node data
  const patchSelected = (patch: Partial<BuilderNodeData>) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n
      )
    );
  };

  // Fixed FormData construction
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const formData = new FormData();
      formData.append("name", payload.name);
      formData.append("description", payload.description);
      formData.append("trigger", payload.trigger);
      formData.append("triggerConfig", JSON.stringify(payload.triggerConfig));
      formData.append("nodes", JSON.stringify(payload.nodes));
      formData.append("edges", JSON.stringify(payload.edges));

      // Add files with proper field names and validation
      payload.nodes.forEach((node: any) => {
        if (node.data.imageFile && node.data.imageFile instanceof File) {
          console.log(
            `Adding imageFile for node ${node.id}:`,
            node.data.imageFile.name
          );
          formData.append(`${node.id}_imageFile`, node.data.imageFile);
        }

        if (node.data.videoFile && node.data.videoFile instanceof File) {
          console.log(
            `Adding videoFile for node ${node.id}:`,
            node.data.videoFile.name
          );
          formData.append(`${node.id}_videoFile`, node.data.videoFile);
        }
        if (node.data.audioFile && node.data.audioFile instanceof File) {
          console.log(
            `Adding audioFile for node ${node.id}:`,
            node.data.audioFile.name
          );
          formData.append(`${node.id}_audioFile`, node.data.audioFile);
        }
        if (node.data.documentFile && node.data.documentFile instanceof File) {
          console.log(
            `Adding documentFile for node ${node.id}:`,
            node.data.documentFile.name
          );
          formData.append(`${node.id}_documentFile`, node.data.documentFile);
        }
      });

      // Debug FormData contents
      console.log("FormData entries:");
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }

      if (payload.automationId) {
        // Update existing automation
        return await apiRequestFormData("PUT", `/api/automations/${payload.automationId}`, formData);
      } else {
        // Create new automation
        return await apiRequestFormData("POST", "/api/automations", formData);
      }
    },
    onSuccess: () => {
      toast({
        title: automation?.id ? "Automation updated" : "Automation created",
        description: "Your automation flow has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
      onClose();
    },
    onError: (error: any) => {
      console.error("Save mutation error:", error);
      toast({
        title: "Failed to save automation",
        description: error?.message || "An error occurred while saving.",
        variant: "destructive",
      });
    },
  });

  // Fixed handleSave function
  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your automation.",
        variant: "destructive",
      });
      return;
    }

    console.log("nodes before saving:", nodes);

    const backendNodes = nodes
      .filter((n) => n.id !== "start")
      .map((node, index) => ({
        ...node,
        position: {
          x: node.position.x,
          y: node.position.y,
        },
      }));

    console.log("backendNodes after filtering start node:", backendNodes);

    // Normalize edges for backend storage
    const normalizedEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type || "custom",
      animated: edge.animated || true,
    }));

    // Remove duplicate edges
    const uniqueEdges: typeof normalizedEdges = [];
    const seenConnections = new Set<string>();

    normalizedEdges.forEach((edge) => {
      const connectionKey = `${edge.source}-${edge.target}`;
      if (!seenConnections.has(connectionKey)) {
        seenConnections.add(connectionKey);
        uniqueEdges.push(edge);
      }
    });
    console.log("DEBUG uniqueEdges:", uniqueEdges);

    const mainEdges = uniqueEdges.filter((e) => e.source !== "start");

    console.log("Filtered mainEdges:", mainEdges);

    const payload = {
      name,
      description,
      trigger,
      triggerConfig: {},
      nodes: backendNodes,
      edges: mainEdges,
      automationId: automation?.id || null,
    };

    console.log("Saving automation with payload:", payload);
    // console.log("Files to upload:", backendNodes.filter(node =>
    //   node.data.imageFile || node.data.videoFile || node.data.audioFile || node.data.documentFile
    // ));

    saveMutation.mutate(payload);
  };

  // Additional helper function to clean up edge data periodically
  const cleanupEdges = useCallback(() => {
    setEdges((currentEdges) => {
      const cleaned: Edge[] = [];
      const seen = new Set<string>();

      currentEdges.forEach((edge) => {
        const key = `${edge.source}-${edge.target}`;
        if (!seen.has(key)) {
          seen.add(key);
          cleaned.push(edge);
        }
      });

      return cleaned;
    });
  }, [setEdges]);

  // Call cleanup when component mounts or edges change significantly
  useEffect(() => {
    if (edges.length > nodes.length * 2) {
      // If too many edges, cleanup
      cleanupEdges();
    }
  }, [edges.length, nodes.length, cleanupEdges]);

  // const onInit = useCallback((reactFlowInstance: ReactFlowInstance) => {
  //   reactFlowInstance.setViewport({ x: 0, y: 0, zoom: 1 });
  // }, []);

  const onInit = useCallback((reactFlowInstance: any) => {
    // ReactFlowInstance typing conflict workaround
    (
      reactFlowInstance as ReactFlowInstance<Node<BuilderNodeData>, Edge>
    ).setViewport({ x: 0, y: 0, zoom: 1 });
  }, []);

  const edgeTypes = {
    custom: (props: any) => <CustomEdge {...props} setEdges={setEdges} />,
  };

  return (
    <div className="h-screen w-full grid grid-cols-12 bg-gray-50">
      {/* Left Sidebar */}
      <div className="col-span-2 border-r bg-white flex flex-col">
        <div className="p-4 border-b">
          <div className="font-semibold">Operations</div>
        </div>
        <ScrollArea className="p-2">
          <div className="space-y-4">
            <div>
              <div className="text-[11px] uppercase text-gray-500 px-2 mb-1 flex items-center gap-2">
                <GitBranch className="w-3 h-3" /> Conditions
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => addNode("conditions")}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-purple-50 rounded flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />{" "}
                  Conditions
                </button>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase text-gray-500 px-2 mb-1 flex items-center gap-2">
                <MessageCircle className="w-3 h-3" /> Send a message
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => addNode("custom_reply")}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-orange-50 rounded flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-orange-500 rounded-full" /> Message
                </button>
                <button
                  onClick={() => addNode("send_template")}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-blue-50 rounded flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-blue-600 rounded-full" /> Template
                </button>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase text-gray-500 px-2 mb-1 flex items-center gap-2">
                <Reply className="w-3 h-3" /> Ask a question
              </div>
              <button
                onClick={() => addNode("user_reply")}
                className="w-full text-left text-sm px-3 py-2 hover:bg-pink-50 rounded flex items-center gap-2"
              >
                <div className="w-2 h-2 bg-pink-500 rounded-full" /> Question
              </button>
            </div>

            <div>
              <div className="text-[11px] uppercase text-gray-500 px-2 mb-1 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Operations
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => addNode("time_gap")}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-gray-600 rounded-full" /> Time
                  Delay
                </button>
                <button
                  onClick={() => addNode("assign_user")}
                  className="w-full text-left text-sm px-3 py-2 hover:bg-indigo-50 rounded flex items-center gap-2"
                >
                  <div className="w-2 h-2 bg-indigo-600 rounded-full" /> Assign
                  to Member
                </button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Center Canvas */}
      <div className="col-span-8 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      {/* Left Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
        {/* Back Button */}
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900 self-start sm:self-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Name + Description */}
        <div className="flex flex-col gap-2 w-full sm:w-72">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Automation name"
            className="h-9 text-sm placeholder-slate-500"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="h-8 text-xs placeholder-gray-400"
          />
        </div>

        {/* Badges */}
        <div className="flex flex-col flex-wrap items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {automation?.id ? "Edit" : "New"} Automation
          </Badge>
          <Badge className="bg-green-500 text-white text-xs capitalize">
            {trigger === "new_conversation" ? "New Chat" : trigger || "No Trigger"}
          </Badge>
        </div>

        {/* Trigger Selector */}
        <div className="flex flex-col gap-2 min-w-[180px] px-4">
          <Label className="flex items-center gap-2 text-xs font-medium text-gray-700">
            <UserPlus className="w-4 h-4" />
            Trigger Channel
          </Label>
          <Select value={trigger} onValueChange={setTrigger}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new_conversation">New conversation</SelectItem>
              <SelectItem value="message_received">Message received</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Right Section (Save Button) */}
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={user?.username === "demouser" ? true : saveMutation.isPending}
          className="min-w-[100px]"
        >
          <Save className="w-4 h-4 mr-1" />
          {saveMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>

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
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>

        {/* Bottom bar add quick */}
        <div className="bg-white border-t px-4 py-2 flex items-center gap-2">
          <span className="text-sm text-gray-600">Add step:</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addNode("conditions")}
          >
            Conditions
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addNode("custom_reply")}
          >
            Message
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addNode("user_reply")}
          >
            Question
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addNode("send_template")}
          >
            Template
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addNode("assign_user")}
          >
            Assign
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addNode("time_gap")}
          >
            Delay
          </Button>
        </div>
      </div>

      {/* Right Config Panel */}
      <div className="col-span-2 border-l bg-white">
        <ConfigPanel
          selected={selectedNode}
          onChange={patchSelected}
          onDelete={deleteNode}
          templates={templates as Template[]}
          members={members as Member[]}
        />
      </div>
    </div>
  );
}

function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  setEdges,
}: CustomEdgeProps) {
  // get edge path + center position
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const handleDelete = () => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
            background: "white",
            borderRadius: "9999px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            cursor: "pointer",
          }}
          onClick={handleDelete}
        >
          <Trash2 color="red" size={14} />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
