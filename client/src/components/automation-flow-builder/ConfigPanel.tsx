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

import { Node } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Trash2,
  Plus,
  X,
  Users,
  ImageIcon,
  Video,
  FileAudio,
  FileIcon,
  Settings2,
  MessageCircle,
  HelpCircle,
  GitBranch,
  Clock,
  FileText,
  Globe,
  CircleStop,
  UserPlus,
  UserCog,
  Variable,
  MapPin,
  List,
  Paperclip,
  CheckCheck,
} from "lucide-react";
import { BuilderNodeData, NodeKind, Template, Member, ListSection } from "./types";
import { FileUploadButton } from "./FileUploadButton";
import { uid } from "./utils";
import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, apiRequestFormData } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload, Link as LinkIcon, Loader2 } from "lucide-react";

interface ConfigPanelProps {
  selected: Node<BuilderNodeData> | null;
  onChange: (patch: Partial<BuilderNodeData>) => void;
  onDelete: () => void;
  templates: Template[];
  members: Member[];
  channelId?: string;
}

const kindMeta: Record<NodeKind, { icon: any; label: string; color: string; bgTint: string }> = {
  start: { icon: Settings2, label: "Start", color: "text-green-600", bgTint: "bg-green-50" },
  conditions: { icon: GitBranch, label: "Condition", color: "text-purple-600", bgTint: "bg-purple-50" },
  custom_reply: { icon: MessageCircle, label: "Send Message", color: "text-blue-600", bgTint: "bg-blue-50" },
  user_reply: { icon: HelpCircle, label: "Ask Question", color: "text-amber-600", bgTint: "bg-amber-50" },
  time_gap: { icon: Clock, label: "Wait / Delay", color: "text-slate-600", bgTint: "bg-slate-50" },
  send_template: { icon: FileText, label: "Send Template", color: "text-teal-600", bgTint: "bg-teal-50" },
  assign_user: { icon: Users, label: "Assign Agent", color: "text-indigo-600", bgTint: "bg-indigo-50" },
  webhook: { icon: Globe, label: "Webhook", color: "text-orange-600", bgTint: "bg-orange-50" },
  end: { icon: CircleStop, label: "End", color: "text-red-600", bgTint: "bg-red-50" },
  add_to_group: { icon: UserPlus, label: "Add to Group", color: "text-emerald-600", bgTint: "bg-emerald-50" },
  update_contact: { icon: UserCog, label: "Update Contact", color: "text-cyan-600", bgTint: "bg-cyan-50" },
  set_variable: { icon: Variable, label: "Set Variable", color: "text-violet-600", bgTint: "bg-violet-50" },
  send_location: { icon: MapPin, label: "Send Location", color: "text-rose-600", bgTint: "bg-rose-50" },
  send_list_message: { icon: List, label: "List Message", color: "text-sky-600", bgTint: "bg-sky-50" },
  send_media: { icon: Paperclip, label: "Send Media", color: "text-pink-600", bgTint: "bg-pink-50" },
  mark_as_read: { icon: CheckCheck, label: "Mark as Read", color: "text-lime-600", bgTint: "bg-lime-50" },
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mt-1">{children}</div>
  );
}

export function ConfigPanel({
  selected,
  onChange,
  onDelete,
  templates,
  members,
  channelId,
}: ConfigPanelProps) {
  const [templateMeta, setTemplateMeta] = useState<any>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const { toast } = useToast();

  const { data: contactGroups = [] } = useQuery({
    queryKey: ["/api/groups", channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const res = await apiRequest("GET", `/api/groups?channelId=${channelId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data?.groups || data?.data || [];
    },
    enabled: !!channelId,
  });

  const bodyVarsArray: string[] = (() => {
    if (!templateMeta) return [];
    if (Array.isArray(templateMeta.bodyVariables)) return templateMeta.bodyVariables;
    if (typeof templateMeta.bodyVariables === "number" && templateMeta.bodyVariables > 0) {
      return Array.from({ length: templateMeta.bodyVariables }, (_, i) => `{{${i + 1}}}`);
    }
    return [];
  })();

  if (!selected || selected.data.kind === "start") {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-3">
          <Settings2 className="w-5 h-5 text-gray-400" />
        </div>
        <div className="font-medium text-sm text-gray-700">Node Properties</div>
        <div className="text-xs text-gray-400 mt-1">Click any node on the canvas to edit its settings</div>
      </div>
    );
  }

  const d = selected.data;
  const meta = kindMeta[d.kind] || kindMeta.start;
  const Icon = meta.icon;

  const handleFileUpload = (type: "image" | "video" | "audio" | "document") => (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    onChange({ [`${type}File`]: file, [`${type}Preview`]: previewUrl } as any);
  };

  const removeFile = (type: "image" | "video" | "audio" | "document") => () => {
    onChange({ [`${type}File`]: null, [`${type}Preview`]: null } as any);
  };

  const addButton = () => {
    onChange({ buttons: [...(d.buttons || []), { id: uid(), text: "New Button", action: "next" as const }] });
  };

  const updateButton = (buttonId: string, updates: Partial<NonNullable<typeof d.buttons>[0]>) => {
    onChange({ buttons: (d.buttons || []).map((btn) => (btn.id === buttonId ? { ...btn, ...updates } : btn)) });
  };

  const removeButton = (buttonId: string) => {
    onChange({ buttons: (d.buttons || []).filter((btn) => btn.id !== buttonId) });
  };

  const addKeyword = () => {
    onChange({ keywords: [...(d.keywords || []), ""] });
  };

  const updateKeyword = (index: number, value: string) => {
    const updated = [...(d.keywords || [])];
    updated[index] = value;
    onChange({ keywords: updated });
  };

  const removeKeyword = (index: number) => {
    onChange({ keywords: (d.keywords || []).filter((_, i) => i !== index) });
  };

  const addListSection = () => {
    const sections = [...(d.listSections || [])];
    sections.push({ title: `Section ${sections.length + 1}`, rows: [{ id: uid(), title: "Item 1", description: "" }] });
    onChange({ listSections: sections });
  };

  const updateListSection = (sectionIdx: number, title: string) => {
    const sections = [...(d.listSections || [])];
    sections[sectionIdx] = { ...sections[sectionIdx], title };
    onChange({ listSections: sections });
  };

  const removeListSection = (sectionIdx: number) => {
    onChange({ listSections: (d.listSections || []).filter((_, i) => i !== sectionIdx) });
  };

  const addListRow = (sectionIdx: number) => {
    const sections = [...(d.listSections || [])];
    sections[sectionIdx] = {
      ...sections[sectionIdx],
      rows: [...sections[sectionIdx].rows, { id: uid(), title: "", description: "" }],
    };
    onChange({ listSections: sections });
  };

  const updateListRow = (sectionIdx: number, rowIdx: number, updates: Partial<ListSection["rows"][0]>) => {
    const sections = [...(d.listSections || [])];
    const rows = [...sections[sectionIdx].rows];
    rows[rowIdx] = { ...rows[rowIdx], ...updates };
    sections[sectionIdx] = { ...sections[sectionIdx], rows };
    onChange({ listSections: sections });
  };

  const removeListRow = (sectionIdx: number, rowIdx: number) => {
    const sections = [...(d.listSections || [])];
    sections[sectionIdx] = {
      ...sections[sectionIdx],
      rows: sections[sectionIdx].rows.filter((_, i) => i !== rowIdx),
    };
    onChange({ listSections: sections });
  };

  const selectedTemplate = templates.find((t) => t.id === selected?.data?.templateId);
  const sampleVars: string[] = Array.isArray(selectedTemplate?.variables) ? selectedTemplate.variables : [];

  return (
    <div className="flex flex-col h-full bg-white">
      <div className={`px-4 py-3 ${meta.bgTint} border-b border-gray-200`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg ${meta.bgTint} flex items-center justify-center border border-gray-200`}>
              <Icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            <div>
              <div className="font-semibold text-sm text-gray-900">{meta.label}</div>
              <div className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">{selected.id}</div>
            </div>
          </div>
          {d.kind !== "start" && (
            <Button size="sm" variant="ghost" onClick={onDelete} className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">

          {d.kind === "conditions" && (
            <>
              <SectionHeader>Condition Settings</SectionHeader>
              <div className="space-y-3 bg-purple-50/50 rounded-xl p-4 border border-purple-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Condition Type</Label>
                  <Select value={d.conditionType || "keyword"} onValueChange={(v) => onChange({ conditionType: v as any })}>
                    <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">Contains Keywords</SelectItem>
                      <SelectItem value="equals">Equals</SelectItem>
                      <SelectItem value="starts_with">Starts With</SelectItem>
                      <SelectItem value="contains">Contains Text</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Match Type</Label>
                  <Select value={d.matchType || "any"} onValueChange={(v) => onChange({ matchType: v as any })}>
                    <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Match Any</SelectItem>
                      <SelectItem value="all">Match All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-gray-700">Keywords</Label>
                  <Button size="sm" variant="outline" onClick={addKeyword} className="h-7 text-[10px] font-semibold rounded-lg">
                    <Plus className="w-3 h-3 mr-1" /> Add
                  </Button>
                </div>
                {(d.keywords || []).map((kw, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={kw} onChange={(e) => updateKeyword(i, e.target.value)} placeholder={`Keyword ${i + 1}`} className="h-8 text-sm rounded-lg" />
                    <Button size="sm" variant="ghost" onClick={() => removeKeyword(i)} className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {(!d.keywords || d.keywords.length === 0) && (
                  <div className="text-xs text-gray-400 italic py-3 text-center bg-gray-50 rounded-lg">No keywords added yet</div>
                )}
              </div>
            </>
          )}

          {d.kind === "custom_reply" && (
            <>
              <SectionHeader>Message Content</SectionHeader>
              <div className="space-y-3 bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Message Text</Label>
                  <Textarea rows={4} value={d.message || ""} onChange={(e) => onChange({ message: e.target.value })} placeholder="Type your message..." className="text-sm resize-none rounded-lg bg-white" />
                </div>
              </div>

              <SectionHeader>Attachments</SectionHeader>
              <div className="grid grid-cols-2 gap-2">
                <FileUploadButton accept="image/*" onUpload={handleFileUpload("image")}>
                  <ImageIcon className="w-3.5 h-3.5" /> Image
                </FileUploadButton>
                <FileUploadButton accept="video/*" onUpload={handleFileUpload("video")}>
                  <Video className="w-3.5 h-3.5" /> Video
                </FileUploadButton>
                <FileUploadButton accept="audio/*" onUpload={handleFileUpload("audio")}>
                  <FileAudio className="w-3.5 h-3.5" /> Audio
                </FileUploadButton>
                <FileUploadButton accept=".pdf,.doc,.docx,.txt" onUpload={handleFileUpload("document")}>
                  <FileIcon className="w-3.5 h-3.5" /> Document
                </FileUploadButton>
              </div>
              {d.imagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={d.imagePreview} alt="preview" className="w-full h-28 object-cover" />
                  <button onClick={removeFile("image")} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {d.videoPreview && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <Video className="w-4 h-4 text-blue-500" />
                  <span className="text-xs flex-1 font-medium text-blue-700">Video attached</span>
                  <button onClick={removeFile("video")} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              )}
              {d.audioPreview && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <FileAudio className="w-4 h-4 text-purple-500" />
                  <span className="text-xs flex-1 font-medium text-purple-700">Audio attached</span>
                  <button onClick={removeFile("audio")} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              )}
              {d.documentPreview && (
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <FileIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-xs flex-1 font-medium text-gray-700">Document attached</span>
                  <button onClick={removeFile("document")} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                </div>
              )}

              <SectionHeader>Quick Reply Buttons</SectionHeader>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={addButton} className="h-7 text-[10px] font-semibold rounded-lg">
                    <Plus className="w-3 h-3 mr-1" /> Add Button
                  </Button>
                </div>
                {d.buttons?.map((btn) => (
                  <div key={btn.id} className="flex items-center gap-2">
                    <Input value={btn.text} onChange={(e) => updateButton(btn.id, { text: e.target.value })} className="h-8 text-sm rounded-lg" />
                    <Button size="sm" variant="ghost" onClick={() => removeButton(btn.id)} className="h-8 w-8 p-0 text-red-400 rounded-lg">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {d.kind === "user_reply" && (
            <>
              <SectionHeader>Question Settings</SectionHeader>
              <div className="space-y-3 bg-amber-50/50 rounded-xl p-4 border border-amber-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Question Text</Label>
                  <Textarea rows={3} value={d.question || ""} onChange={(e) => onChange({ question: e.target.value })} placeholder="Enter question to ask..." className="text-sm resize-none rounded-lg bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Save As Variable</Label>
                  <Input value={d.saveAs || ""} onChange={(e) => onChange({ saveAs: e.target.value })} placeholder="e.g., transfer_consent" className="h-8 text-sm font-mono rounded-lg bg-white" />
                  <div className="text-[10px] text-gray-400">Use lowercase with underscores</div>
                </div>
              </div>

              <SectionHeader>Answer Options</SectionHeader>
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button size="sm" variant="outline" onClick={addButton} className="h-7 text-[10px] font-semibold rounded-lg">
                    <Plus className="w-3 h-3 mr-1" /> Add Option
                  </Button>
                </div>
                {d.buttons?.map((btn) => (
                  <div key={btn.id} className="flex items-center gap-2">
                    <Input value={btn.text} onChange={(e) => updateButton(btn.id, { text: e.target.value })} className="h-8 text-sm rounded-lg" />
                    <Button size="sm" variant="ghost" onClick={() => removeButton(btn.id)} className="h-8 w-8 p-0 text-red-400 rounded-lg">
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {d.kind === "time_gap" && (
            <>
              <SectionHeader>Delay Settings</SectionHeader>
              <div className="space-y-3 bg-slate-50/80 rounded-xl p-4 border border-slate-200">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Delay Duration (seconds)</Label>
                  <Input type="number" min={10} value={d.delay ?? 60} onChange={(e) => onChange({ delay: parseInt(e.target.value, 10) })} className="h-9 text-sm rounded-lg bg-white" />
                  <div className="text-[10px] text-gray-400">Min 10 seconds. Flow pauses before the next step.</div>
                </div>
              </div>
            </>
          )}

          {d.kind === "send_template" && (
            <>
              <SectionHeader>Template Settings</SectionHeader>
              <div className="space-y-3 bg-teal-50/50 rounded-xl p-4 border border-teal-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Choose Template</Label>
                  <Select
                    value={d.templateId || ""}
                    onValueChange={async (templateId) => {
                      const template = templates.find((t) => t.id === templateId);
                      onChange({ templateId });
                      if (template?.whatsappTemplateId && channelId) {
                        try {
                          const res = await fetch(`/api/whatsapp/templates/${template.whatsappTemplateId}/meta?channelId=${channelId}`);
                          const meta = await res.json();
                          setTemplateMeta(meta);
                          onChange({ headerImageId: null, variableMapping: {} });
                        } catch (err) {
                          console.error("Failed to fetch template meta:", err);
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue placeholder="Select template" /></SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {templateMeta?.headerType === "IMAGE" && (
                <div className="space-y-2 bg-red-50/50 rounded-xl p-4 border border-red-100">
                  <Label className="text-xs font-semibold text-red-600">Header Image (Required)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    className="h-9 text-sm rounded-lg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append("mediaFile", file);
                      formData.append("templateId", d.templateId || "");
                      const res = await apiRequestFormData("POST", `/api/whatsapp/channels/${channelId}/upload-image`, formData);
                      const data = await res.json();
                      onChange({ headerImageId: data.mediaId });
                    }}
                  />
                  {!d.headerImageId && <div className="text-[10px] text-red-500 font-medium">Required for this template</div>}
                </div>
              )}

              {bodyVarsArray.length > 0 && (
                <div className="space-y-3">
                  <SectionHeader>Variable Mapping</SectionHeader>
                  {bodyVarsArray.map((varText: string) => {
                    const index = varText.replace(/\D/g, "");
                    const sampleValue = sampleVars[Number(index) - 1];
                    return (
                      <div key={index} className="space-y-1.5 bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <Label className="text-[11px] text-gray-500 font-semibold">{varText}</Label>
                        <Select
                          value={(d.variableMapping as any)?.[index]?.type || ""}
                          onValueChange={(type) => onChange({ variableMapping: { ...(d.variableMapping as any || {}), [index]: { type, value: "" } } })}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white rounded-lg"><SelectValue placeholder="Select source" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fullName">Full Name</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="custom">Custom Value</SelectItem>
                          </SelectContent>
                        </Select>
                        {(d.variableMapping as any)?.[index]?.type === "custom" && (
                          <Input
                            className="h-8 text-xs rounded-lg"
                            value={(d.variableMapping as any)?.[index]?.value || ""}
                            onChange={(e) => onChange({ variableMapping: { ...(d.variableMapping as any || {}), [index]: { ...(d.variableMapping as any)?.[index], value: e.target.value } } })}
                            placeholder={`Custom value for ${varText}`}
                          />
                        )}
                        {sampleValue && <p className="text-[10px] text-gray-400">Sample: <span className="font-semibold">{sampleValue}</span></p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {d.kind === "assign_user" && (
            <>
              <SectionHeader>Assignment Settings</SectionHeader>
              <div className="space-y-3 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-500" /> Select Agent
                  </Label>
                  <Select value={d.assigneeId || ""} onValueChange={(v) => onChange({ assigneeId: v })}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name || `${m.firstName || ""} ${m.lastName || ""}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {d.kind === "webhook" && (
            <>
              <SectionHeader>Webhook Settings</SectionHeader>
              <div className="space-y-3 bg-orange-50/50 rounded-xl p-4 border border-orange-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">HTTP Method</Label>
                  <Select value={d.webhookMethod || "POST"} onValueChange={(v) => onChange({ webhookMethod: v as any })}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Webhook URL</Label>
                  <Input value={d.webhookUrl || ""} onChange={(e) => onChange({ webhookUrl: e.target.value })} placeholder="https://api.example.com/webhook" className="h-9 text-sm rounded-lg bg-white" />
                </div>
              </div>

              {(d.webhookMethod === "POST" || d.webhookMethod === "PUT" || !d.webhookMethod) && (
                <>
                  <SectionHeader>Request Body</SectionHeader>
                  <div className="space-y-2">
                    <Textarea rows={4} value={d.webhookBody || ""} onChange={(e) => onChange({ webhookBody: e.target.value })} placeholder={'{\n  "name": "{{contact_name}}",\n  "phone": "{{contact_phone}}",\n  "message": "{{last_message}}"\n}'} className="text-sm font-mono resize-none rounded-lg" />
                    <div className="text-[10px] text-gray-400">Leave empty to send full contact & conversation data automatically. Or use variables below to build a custom body.</div>
                  </div>
                </>
              )}

              {d.webhookMethod === "GET" && (
                <div className="text-[10px] text-gray-400 bg-orange-50/50 rounded-lg p-3 border border-orange-100">
                  GET requests automatically append contact name, phone, email, message, conversation ID, and channel info as query parameters.
                  You can also add variables to the URL using the buttons below.
                </div>
              )}

              <SectionHeader>Available Variables</SectionHeader>
              <div className="space-y-2">
                <div className="text-[10px] text-gray-500 mb-1">
                  {d.webhookMethod === "GET"
                    ? "Click to insert into the webhook URL"
                    : "Click to insert into the request body"}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: "contact_name", label: "Contact Name" },
                    { key: "contact_phone", label: "Contact Phone" },
                    { key: "contact_email", label: "Contact Email" },
                    { key: "contact_groups", label: "Contact Groups" },
                    { key: "last_message", label: "Last Message" },
                    { key: "conversation_id", label: "Conversation ID" },
                    { key: "channel_name", label: "Channel Name" },
                    { key: "channel_phone", label: "Channel Phone" },
                  ].map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        if (d.webhookMethod === "GET") {
                          const currentUrl = d.webhookUrl || "";
                          const separator = currentUrl.includes("?") ? "&" : "?";
                          onChange({ webhookUrl: currentUrl + `${separator}${v.key}={{${v.key}}}` });
                        } else {
                          const current = d.webhookBody || "";
                          onChange({ webhookBody: current + `{{${v.key}}}` });
                        }
                      }}
                      className="px-2 py-1 text-[10px] font-mono bg-orange-50 border border-orange-200 rounded-md text-orange-700 hover:bg-orange-100 hover:border-orange-300 transition-colors cursor-pointer"
                      title={d.webhookMethod === "GET" ? `Add ${v.key} to URL` : `Insert {{${v.key}}}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  Flow variables set by "Set Variable" nodes are also available using {"{{your_variable_name}}"} syntax.
                </div>
              </div>
            </>
          )}

          {d.kind === "end" && (
            <>
              <SectionHeader>End Settings</SectionHeader>
              <div className="space-y-3 bg-red-50/50 rounded-xl p-4 border border-red-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">End Label (Optional)</Label>
                  <Input value={d.endMessage || ""} onChange={(e) => onChange({ endMessage: e.target.value })} placeholder="e.g., Conversation ended" className="h-9 text-sm rounded-lg bg-white" />
                  <div className="text-[10px] text-gray-400">Displayed on the End node in the canvas</div>
                </div>
              </div>
            </>
          )}

          {d.kind === "add_to_group" && (
            <>
              <SectionHeader>Group Settings</SectionHeader>
              <div className="space-y-3 bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-emerald-500" /> Select Group
                  </Label>
                  <Select
                    value={d.groupId || ""}
                    onValueChange={(v) => {
                      const group = (contactGroups as any[]).find((g: any) => g.id === v);
                      onChange({ groupId: v, groupName: group?.name || "" });
                    }}
                  >
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue placeholder="Select a group" /></SelectTrigger>
                    <SelectContent>
                      {(contactGroups as any[]).map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(contactGroups as any[]).length === 0 && (
                    <div className="text-[10px] text-gray-400 italic">No groups found. Create groups in Contact Management first.</div>
                  )}
                </div>
              </div>
            </>
          )}

          {d.kind === "update_contact" && (
            <>
              <SectionHeader>Contact Update</SectionHeader>
              <div className="space-y-3 bg-cyan-50/50 rounded-xl p-4 border border-cyan-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Field to Update</Label>
                  <Select value={d.contactField || "name"} onValueChange={(v) => onChange({ contactField: v })}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="notes">Notes</SelectItem>
                      <SelectItem value="tags">Tags</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">New Value</Label>
                  <Input
                    value={d.contactFieldValue || ""}
                    onChange={(e) => onChange({ contactFieldValue: e.target.value })}
                    placeholder="Enter value or use {{variable}}"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                  <div className="text-[10px] text-gray-400">Use {"{{variable_name}}"} to insert flow variable values</div>
                </div>
              </div>
            </>
          )}

          {d.kind === "set_variable" && (
            <>
              <SectionHeader>Variable Settings</SectionHeader>
              <div className="space-y-3 bg-violet-50/50 rounded-xl p-4 border border-violet-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Variable Name</Label>
                  <Input
                    value={d.variableName || ""}
                    onChange={(e) => onChange({ variableName: e.target.value })}
                    placeholder="e.g., user_category"
                    className="h-9 text-sm font-mono rounded-lg bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Value Source</Label>
                  <Select value={d.variableSource || "static"} onValueChange={(v) => onChange({ variableSource: v as any })}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="static">Static Value</SelectItem>
                      <SelectItem value="from_message">From Last Message</SelectItem>
                      <SelectItem value="from_webhook">From Webhook Response</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {d.variableSource === "static" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Value</Label>
                    <Input
                      value={d.variableValue || ""}
                      onChange={(e) => onChange({ variableValue: e.target.value })}
                      placeholder="Enter static value"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                )}
                {d.variableSource === "from_webhook" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">JSON Path</Label>
                    <Input
                      value={d.variableValue || ""}
                      onChange={(e) => onChange({ variableValue: e.target.value })}
                      placeholder="e.g., data.result.value"
                      className="h-9 text-sm font-mono rounded-lg bg-white"
                    />
                    <div className="text-[10px] text-gray-400">Dot-notation path from webhook response JSON</div>
                  </div>
                )}
              </div>
            </>
          )}

          {d.kind === "send_location" && (
            <>
              <SectionHeader>Location Details</SectionHeader>
              <div className="space-y-3 bg-rose-50/50 rounded-xl p-4 border border-rose-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Location Name</Label>
                  <Input
                    value={d.locationName || ""}
                    onChange={(e) => onChange({ locationName: e.target.value })}
                    placeholder="e.g., Our Office"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Address</Label>
                  <Input
                    value={d.locationAddress || ""}
                    onChange={(e) => onChange({ locationAddress: e.target.value })}
                    placeholder="e.g., 123 Main St, City"
                    className="h-9 text-sm rounded-lg bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Latitude</Label>
                    <Input
                      value={d.latitude || ""}
                      onChange={(e) => onChange({ latitude: e.target.value })}
                      placeholder="e.g., 28.6139"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Longitude</Label>
                    <Input
                      value={d.longitude || ""}
                      onChange={(e) => onChange({ longitude: e.target.value })}
                      placeholder="e.g., 77.2090"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {d.kind === "send_list_message" && (
            <>
              <SectionHeader>List Message</SectionHeader>
              <div className="space-y-3 bg-sky-50/50 rounded-xl p-4 border border-sky-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Body Text</Label>
                  <Textarea
                    rows={3}
                    value={d.message || ""}
                    onChange={(e) => onChange({ message: e.target.value })}
                    placeholder="Message shown above the list button"
                    className="text-sm resize-none rounded-lg bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Button Text</Label>
                  <Input
                    value={d.listButtonText || "View Options"}
                    onChange={(e) => onChange({ listButtonText: e.target.value })}
                    placeholder="View Options"
                    className="h-9 text-sm rounded-lg bg-white"
                    maxLength={20}
                  />
                  <div className="text-[10px] text-gray-400">Max 20 characters</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionHeader>Sections</SectionHeader>
                  <Button size="sm" variant="outline" onClick={addListSection} className="h-7 text-[10px] font-semibold rounded-lg">
                    <Plus className="w-3 h-3 mr-1" /> Add Section
                  </Button>
                </div>

                {(d.listSections || []).map((section, sIdx) => (
                  <div key={sIdx} className="bg-gray-50 rounded-xl p-3 border border-gray-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={section.title}
                        onChange={(e) => updateListSection(sIdx, e.target.value)}
                        placeholder="Section title"
                        className="h-7 text-xs rounded-lg flex-1"
                      />
                      <Button size="sm" variant="ghost" onClick={() => removeListSection(sIdx)} className="h-7 w-7 p-0 text-red-400 rounded-lg">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>

                    {section.rows.map((row, rIdx) => (
                      <div key={row.id} className="pl-3 border-l-2 border-sky-200 space-y-1">
                        <div className="flex items-center gap-2">
                          <Input
                            value={row.title}
                            onChange={(e) => updateListRow(sIdx, rIdx, { title: e.target.value })}
                            placeholder="Item title"
                            className="h-7 text-xs rounded-lg flex-1"
                            maxLength={24}
                          />
                          <Button size="sm" variant="ghost" onClick={() => removeListRow(sIdx, rIdx)} className="h-7 w-7 p-0 text-red-400 rounded-lg">
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        <Input
                          value={row.description || ""}
                          onChange={(e) => updateListRow(sIdx, rIdx, { description: e.target.value })}
                          placeholder="Description (optional)"
                          className="h-6 text-[10px] rounded-lg"
                          maxLength={72}
                        />
                      </div>
                    ))}

                    <Button size="sm" variant="ghost" onClick={() => addListRow(sIdx)} className="h-6 text-[10px] text-sky-600 hover:text-sky-700 hover:bg-sky-50 w-full rounded-lg">
                      <Plus className="w-3 h-3 mr-1" /> Add Item
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {d.kind === "send_media" && (
            <>
              <SectionHeader>Media Settings</SectionHeader>
              <div className="space-y-3 bg-pink-50/50 rounded-xl p-4 border border-pink-100">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Media Type</Label>
                  <Select value={d.mediaType || "image"} onValueChange={(v) => onChange({ mediaType: v as any, mediaUrl: "", mediaId: "", mediaFileName: "", mediaSourceType: d.mediaSourceType || "url" })}>
                    <SelectTrigger className="h-9 text-sm bg-white rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-700">Source</Label>
                  <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg">
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${(d.mediaSourceType || "url") === "url" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                      onClick={() => onChange({ mediaSourceType: "url", mediaId: "", mediaFileName: "" })}
                    >
                      <LinkIcon className="w-3 h-3" /> URL
                    </button>
                    <button
                      type="button"
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${d.mediaSourceType === "upload" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                      onClick={() => onChange({ mediaSourceType: "upload", mediaUrl: "" })}
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                  </div>
                </div>

                {(d.mediaSourceType || "url") === "url" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Media URL</Label>
                    <Input
                      value={d.mediaUrl || ""}
                      onChange={(e) => onChange({ mediaUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                      className="h-9 text-sm rounded-lg bg-white"
                    />
                    <div className="text-[10px] text-gray-400">Direct link to the media file</div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Upload File</Label>
                    {d.mediaId ? (
                      <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-pink-200">
                        <Paperclip className="w-3.5 h-3.5 text-pink-500 shrink-0" />
                        <span className="text-xs text-gray-700 truncate flex-1">{d.mediaFileName || "Uploaded file"}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => onChange({ mediaId: "", mediaFileName: "" })}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept={
                            d.mediaType === "image" ? "image/jpeg,image/png,image/webp" :
                            d.mediaType === "video" ? "video/mp4,video/3gpp" :
                            d.mediaType === "audio" ? "audio/aac,audio/mp4,audio/mpeg,audio/ogg,audio/opus" :
                            ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                          }
                          className="hidden"
                          id="media-upload-input"
                          disabled={mediaUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file || !channelId) return;
                            setMediaUploading(true);
                            try {
                              const formData = new FormData();
                              formData.append("mediaFile", file);
                              formData.append("mediaType", d.mediaType || "image");
                              const res = await apiRequestFormData("POST", `/api/whatsapp/channels/${channelId}/upload-media`, formData);
                              const data = await res.json();
                              if (data.success && data.mediaId) {
                                onChange({ mediaId: data.mediaId, mediaFileName: file.name });
                                toast({ title: "File uploaded successfully" });
                              } else {
                                toast({ title: "Upload failed", description: data.message || "Please try again", variant: "destructive" });
                              }
                            } catch {
                              toast({ title: "Upload failed", description: "Network error", variant: "destructive" });
                            } finally {
                              setMediaUploading(false);
                              e.target.value = "";
                            }
                          }}
                        />
                        <label
                          htmlFor="media-upload-input"
                          className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed border-pink-200 rounded-lg cursor-pointer hover:border-pink-400 hover:bg-pink-50/50 transition-all ${mediaUploading ? "opacity-50 pointer-events-none" : ""}`}
                        >
                          {mediaUploading ? (
                            <>
                              <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
                              <span className="text-xs text-gray-500">Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 text-pink-500" />
                              <span className="text-xs text-gray-500">Click to upload {d.mediaType || "image"}</span>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400">
                      {d.mediaType === "image" ? "JPG, PNG, WebP (max 5MB)" :
                       d.mediaType === "video" ? "MP4, 3GPP (max 16MB)" :
                       d.mediaType === "audio" ? "AAC, MP4, MPEG, OGG, Opus (max 16MB)" :
                       "PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT (max 100MB)"}
                    </div>
                  </div>
                )}

                {(d.mediaType === "image" || d.mediaType === "video" || d.mediaType === "document") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-700">Caption (Optional)</Label>
                    <Textarea
                      rows={2}
                      value={d.mediaCaption || ""}
                      onChange={(e) => onChange({ mediaCaption: e.target.value })}
                      placeholder="Add a caption..."
                      className="text-sm resize-none rounded-lg bg-white"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {d.kind === "mark_as_read" && (
            <>
              <SectionHeader>Read Receipt</SectionHeader>
              <div className="space-y-2 bg-lime-50/50 rounded-xl p-4 border border-lime-100">
                <div className="flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-lime-600" />
                  <span className="text-xs text-gray-600">Sends read receipts (blue ticks) for the last incoming message from the customer.</span>
                </div>
                <div className="text-[10px] text-gray-400">No configuration needed. This node automatically marks the conversation as read.</div>
              </div>
            </>
          )}

          <div className="h-10" />
        </div>
      </ScrollArea>
    </div>
  );
}
