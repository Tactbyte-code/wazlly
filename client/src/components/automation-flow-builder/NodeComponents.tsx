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

import { Handle, Position } from "@xyflow/react";
import { useTranslation } from "@/lib/i18n";
import {
  Zap,
  GitBranch,
  MessageCircle,
  HelpCircle,
  Clock,
  FileText,
  Users,
  Video,
  FileAudio,
  FileIcon,
  Globe,
  CircleStop,
  Image,
  UserPlus,
  UserCog,
  Variable,
  MapPin,
  List,
  Paperclip,
  CheckCheck,
} from "lucide-react";
import { BuilderNodeData } from "./types";

function NodeShell({
  children,
  icon,
  title,
  color,
  bgColor,
  borderColor,
  selected,
}: {
  children?: React.ReactNode;
  icon: React.ReactNode;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  selected?: boolean;
}) {
  return (
    <div
      className={`rounded-xl bg-white shadow-md min-w-[240px] max-w-[280px] overflow-hidden transition-all duration-200 border ${
        selected
          ? "border-blue-400 ring-2 ring-blue-100"
          : "border-gray-200 hover:shadow-lg"
      }`}
    >
      <div className={`flex items-center gap-2.5 px-3.5 py-2.5 ${bgColor} border-b ${borderColor}`}>
        <div className={`w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center ${color} shrink-0`}>
          {icon}
        </div>
        <span className={`font-semibold text-xs ${color}`}>{title}</span>
      </div>
      {children && (
        <div className="px-3.5 py-2.5 text-xs text-gray-600 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function StartNode() {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-col items-center">
      <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white shadow-md border-2 border-white">
        <Zap className="w-6 h-6" />
      </div>
      <div className="mt-1.5 px-2.5 py-0.5 bg-white rounded-full shadow-sm border border-gray-200">
        <span className="text-[10px] font-semibold text-green-700 uppercase">{t("automations.nodes.start")}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function ConditionsNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<GitBranch className="w-4 h-4" />}
        title={t("automations.nodes.condition")}
        color="text-purple-700"
        bgColor="bg-purple-50"
        borderColor="border-purple-100"
      >
        {data.conditionType === "keyword" && data.keywords && data.keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {data.keywords.slice(0, 3).map((kw, i) => (
              <span key={i} className="bg-purple-50 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
                {kw}
              </span>
            ))}
            {data.keywords.length > 3 && (
              <span className="text-purple-400 text-[10px]">+{data.keywords.length - 3}</span>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noConditions")}</div>
        )}
        {data.matchType && (
          <div className="text-[10px] text-purple-600 font-medium">
            {t("automations.nodes.match", { type: data.matchType })}
          </div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} id="condition-true" className="!bg-green-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" style={{ left: '35%' }} />
      <Handle type="source" position={Position.Bottom} id="condition-false" className="!bg-red-400 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" style={{ left: '65%' }} />
      <div className="flex justify-between px-4 -mt-0.5">
        <span className="text-[8px] font-semibold text-green-600 uppercase">{t("automations.nodes.yes")}</span>
        <span className="text-[8px] font-semibold text-red-400 uppercase">{t("automations.nodes.no")}</span>
      </div>
    </div>
  );
}

export function CustomReplyNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<MessageCircle className="w-4 h-4" />}
        title={t("automations.nodes.sendMessage")}
        color="text-blue-700"
        bgColor="bg-blue-50"
        borderColor="border-blue-100"
      >
        {data.message ? (
          <p className="line-clamp-2 text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100">
            {data.message.length > 80 ? `${data.message.slice(0, 80)}...` : data.message}
          </p>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noMessage")}</div>
        )}

        <div className="flex flex-wrap gap-1">
          {data.imagePreview && (
            <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
              <Image className="w-2.5 h-2.5" /> Image
            </span>
          )}
          {data.videoPreview && (
            <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
              <Video className="w-2.5 h-2.5" /> Video
            </span>
          )}
          {data.audioPreview && (
            <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
              <FileAudio className="w-2.5 h-2.5" /> Audio
            </span>
          )}
          {data.documentPreview && (
            <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
              <FileIcon className="w-2.5 h-2.5" /> Doc
            </span>
          )}
        </div>

        {data.buttons && data.buttons.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1.5 border-t border-gray-100">
            {data.buttons.slice(0, 3).map((btn) => (
              <span key={btn.id} className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-medium border border-blue-100">
                {btn.text}
              </span>
            ))}
            {data.buttons.length > 3 && (
              <span className="text-blue-400 text-[10px]">+{data.buttons.length - 3}</span>
            )}
          </div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function UserReplyNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<HelpCircle className="w-4 h-4" />}
        title="Ask Question"
        color="text-amber-700"
        bgColor="bg-amber-50"
        borderColor="border-amber-100"
      >
        {data.question ? (
          <p className="line-clamp-2 text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100">
            {data.question.length > 80 ? `${data.question.slice(0, 80)}...` : data.question}
          </p>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noQuestion")}</div>
        )}
        {data.saveAs && (
          <div className="text-[10px] text-amber-600 font-medium font-mono">
            ${data.saveAs}
          </div>
        )}
        {data.buttons && data.buttons.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1.5 border-t border-gray-100">
            {data.buttons.slice(0, 3).map((btn) => (
              <span key={btn.id} className="bg-green-50 text-green-600 text-[10px] px-2 py-0.5 rounded font-medium border border-green-100">
                {btn.text}
              </span>
            ))}
          </div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function TimeGapNode({ data }: { data: BuilderNodeData }) {
  const seconds = data.delay ?? 0;
  const display = seconds >= 3600
    ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
    : seconds >= 60
    ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    : `${seconds}s`;
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Clock className="w-4 h-4" />}
        title="Wait / Delay"
        color="text-slate-700"
        bgColor="bg-slate-50"
        borderColor="border-slate-200"
      >
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
          <span className="text-lg font-bold text-slate-700">{display}</span>
          <span className="text-[10px] text-gray-400 font-medium uppercase">pause</span>
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendTemplateNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<FileText className="w-4 h-4" />}
        title="Send Template"
        color="text-teal-700"
        bgColor="bg-teal-50"
        borderColor="border-teal-100"
      >
        {data.templateId ? (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[11px] text-gray-600 font-medium">{t("automations.nodes.templateSelected")}</span>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noTemplate")}</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function AssignUserNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Users className="w-4 h-4" />}
        title="Assign Agent"
        color="text-indigo-700"
        bgColor="bg-indigo-50"
        borderColor="border-indigo-100"
      >
        {data.assigneeId ? (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] text-gray-600 font-medium">{t("automations.nodes.agentAssigned")}</span>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noAgent")}</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function WebhookNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Globe className="w-4 h-4" />}
        title="Webhook"
        color="text-orange-700"
        bgColor="bg-orange-50"
        borderColor="border-orange-100"
      >
        {data.webhookUrl ? (
          <div className="space-y-1.5">
            <span className="inline-block bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
              {data.webhookMethod || "POST"}
            </span>
            <div className="text-[11px] text-gray-500 truncate bg-gray-50 rounded px-2 py-1 font-mono border border-gray-100">{data.webhookUrl}</div>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noWebhook")}</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function EndNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  return (
    <div className="relative flex flex-col items-center">
      <Handle type="target" position={Position.Top} className="!bg-red-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-md border-2 border-white">
        <CircleStop className="w-6 h-6" />
      </div>
      <div className="mt-1.5 px-2.5 py-0.5 bg-white rounded-full shadow-sm border border-gray-200">
        <span className="text-[10px] font-semibold text-red-700 uppercase">{data.endMessage || "End"}</span>
      </div>
    </div>
  );
}

export function AddToGroupNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<UserPlus className="w-4 h-4" />}
        title="Add to Group"
        color="text-emerald-700"
        bgColor="bg-emerald-50"
        borderColor="border-emerald-100"
      >
        {data.groupName ? (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] text-gray-600 font-medium truncate">{data.groupName}</span>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noGroup")}</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function UpdateContactNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<UserCog className="w-4 h-4" />}
        title="Update Contact"
        color="text-cyan-700"
        bgColor="bg-cyan-50"
        borderColor="border-cyan-100"
      >
        {data.contactField ? (
          <div className="space-y-1">
            <span className="inline-block bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded text-[10px] font-bold capitalize">
              {data.contactField}
            </span>
            {data.contactFieldValue && (
              <div className="text-[11px] text-gray-500 truncate bg-gray-50 rounded px-2 py-1 border border-gray-100">
                {data.contactFieldValue}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noField")}</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SetVariableNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Variable className="w-4 h-4" />}
        title="Set Variable"
        color="text-violet-700"
        bgColor="bg-violet-50"
        borderColor="border-violet-100"
      >
        {data.variableName ? (
          <div className="space-y-1">
            <div className="text-[10px] text-violet-600 font-medium font-mono">
              ${data.variableName}
            </div>
            {data.variableValue && (
              <div className="text-[11px] text-gray-500 truncate bg-gray-50 rounded px-2 py-1 border border-gray-100">
                = {data.variableValue}
              </div>
            )}
            {data.variableSource && data.variableSource !== "static" && (
              <span className="inline-block bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                {data.variableSource === "from_message" ? "From Message" : "From Webhook"}
              </span>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noVariable")}</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendLocationNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<MapPin className="w-4 h-4" />}
        title="Send Location"
        color="text-rose-700"
        bgColor="bg-rose-50"
        borderColor="border-rose-100"
      >
        {data.locationName || (data.latitude && data.longitude) ? (
          <div className="space-y-1">
            {data.locationName && (
              <div className="text-[11px] text-gray-700 font-medium">{data.locationName}</div>
            )}
            {data.latitude && data.longitude && (
              <div className="text-[10px] text-gray-400 font-mono bg-gray-50 rounded px-2 py-1 border border-gray-100">
                {data.latitude}, {data.longitude}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noLocation")}</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendListMessageNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  const totalRows = (data.listSections || []).reduce((sum, s) => sum + (s.rows?.length || 0), 0);
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<List className="w-4 h-4" />}
        title="List Message"
        color="text-sky-700"
        bgColor="bg-sky-50"
        borderColor="border-sky-100"
      >
        {data.message ? (
          <p className="line-clamp-2 text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100">
            {data.message.length > 60 ? `${data.message.slice(0, 60)}...` : data.message}
          </p>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noBody")}</div>
        )}
        <div className="flex items-center gap-2">
          <span className="inline-block bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
            {data.listSections?.length || 0} sections
          </span>
          <span className="text-[10px] text-gray-400">{totalRows} items</span>
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendMediaNode({ data }: { data: BuilderNodeData }) {
  const { t } = useTranslation();
  const mediaLabel = data.mediaType ? data.mediaType.charAt(0).toUpperCase() + data.mediaType.slice(1) : "Media";
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Paperclip className="w-4 h-4" />}
        title="Send Media"
        color="text-pink-700"
        bgColor="bg-pink-50"
        borderColor="border-pink-100"
      >
        <span className="inline-block bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
          {mediaLabel}
        </span>
        {data.mediaUrl ? (
          <div className="text-[11px] text-gray-500 truncate bg-gray-50 rounded px-2 py-1 font-mono border border-gray-100">
            {data.mediaUrl}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">{t("automations.nodes.noMedia")}</div>
        )}
        {data.mediaCaption && (
          <p className="text-[10px] text-gray-400 truncate">{data.mediaCaption}</p>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function MarkAsReadNode() {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-lime-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<CheckCheck className="w-4 h-4" />}
        title="Mark as Read"
        color="text-lime-700"
        bgColor="bg-lime-50"
        borderColor="border-lime-100"
      >
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
          <CheckCheck className="w-3.5 h-3.5 text-lime-600" />
          <span className="text-[11px] text-gray-600 font-medium">{t("automations.nodes.sendReadReceipts")}</span>
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-lime-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export const nodeTypes = {
  start: StartNode,
  conditions: ConditionsNode,
  custom_reply: CustomReplyNode,
  user_reply: UserReplyNode,
  time_gap: TimeGapNode,
  send_template: SendTemplateNode,
  assign_user: AssignUserNode,
  webhook: WebhookNode,
  end: EndNode,
  add_to_group: AddToGroupNode,
  update_contact: UpdateContactNode,
  set_variable: SetVariableNode,
  send_location: SendLocationNode,
  send_list_message: SendListMessageNode,
  send_media: SendMediaNode,
  mark_as_read: MarkAsReadNode,
};
