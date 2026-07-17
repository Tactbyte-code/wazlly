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

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FileText,
  Eye,
  Edit,
  Copy,
  Trash,
  MoreVertical,
  Search,
  Phone,
  ExternalLink,
  Reply,
  Clipboard,
  Image,
  Video,
  FileDown,
  Megaphone,
  Wrench,
  ShieldCheck,
  Globe,
  MousePointerClick,
} from "lucide-react";
import { format } from "date-fns";
import type { Template } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import { WHATSAPP_LANGUAGES } from "@/lib/template-constants";
import { useTranslation } from "@/lib/i18n";

interface TemplatesTableProps {
  templates: Template[];
  onViewTemplate: (template: Template) => void;
  onEditTemplate: (template: Template) => void;
  onDuplicateTemplate: (template: Template) => void;
  onDeleteTemplate: (template: Template) => void;
}

const languageMap = Object.fromEntries(
  WHATSAPP_LANGUAGES.map((l) => [l.code, l.label])
);

function getLanguageLabel(code: string): string {
  return languageMap[code] || languageMap[code?.replace("-", "_")] || code || "English";
}

const categoryConfig: Record<string, { label: string; className: string; icon: any }> = {
  MARKETING: {
    label: "Marketing",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Megaphone,
  },
  UTILITY: {
    label: "Utility",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Wrench,
  },
  AUTHENTICATION: {
    label: "Authentication",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: ShieldCheck,
  },
};

const buttonTypeIcons: Record<string, any> = {
  PHONE_NUMBER: Phone,
  URL: ExternalLink,
  QUICK_REPLY: Reply,
  COPY_CODE: Clipboard,
};

function getMediaIcon(mediaType: string | null | undefined) {
  switch (mediaType?.toLowerCase()) {
    case "image":
      return Image;
    case "video":
      return Video;
    case "document":
      return FileDown;
    default:
      return null;
  }
}

function getButtonsFromTemplate(template: Template) {
  const buttons: Array<{ type: string; text: string }> = [];
  if (template.buttons && Array.isArray(template.buttons)) {
    for (const btn of template.buttons as any[]) {
      buttons.push({ type: btn.type || "QUICK_REPLY", text: btn.text || "" });
    }
  }
  if (buttons.length === 0 && template.components && Array.isArray(template.components)) {
    for (const comp of template.components as any[]) {
      if (comp.type === "BUTTONS" && Array.isArray(comp.buttons)) {
        for (const btn of comp.buttons) {
          buttons.push({ type: btn.type || "QUICK_REPLY", text: btn.text || "" });
        }
      }
    }
  }
  return buttons;
}

export function TemplatesTable({
  templates,
  onViewTemplate,
  onEditTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
}: TemplatesTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();

  const { user } = useAuth();

  const filteredTemplates = templates.filter((template) => {
    const query = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(query) ||
      template.body.toLowerCase().includes(query) ||
      template.category.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string }> = {
      APPROVED: { className: "bg-green-50 text-green-700 border-green-200" },
      PENDING: { className: "bg-yellow-50 text-yellow-700 border-yellow-200" },
      REJECTED: { className: "bg-red-50 text-red-700 border-red-200" },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Badge variant="outline" className={config.className}>
        {status}
      </Badge>
    );
  };

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={t("templates.emptyState.noTemplates")}
        description={t("templates.emptyState.noTemplatesDesc")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 w-full max-w-lg mx-auto">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t("templates.search.placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {t("templates.search.noMatches", { query: searchQuery })}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const cat = categoryConfig[template.category] || categoryConfig.MARKETING;
            const CatIcon = cat.icon;
            const MediaIcon = getMediaIcon(template.mediaType);
            const buttons = getButtonsFromTemplate(template);
            const langLabel = getLanguageLabel(template.language);

            return (
              <div
                key={template.id}
                className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-white group"
                onClick={() => onViewTemplate(template)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate text-gray-900">
                      {template.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge variant="outline" className={`text-[11px] px-1.5 py-0 ${cat.className}`}>
                        <CatIcon className="w-3 h-3 mr-1" />
                        {t(`templates.categories.${(cat.label || "marketing").toLowerCase()}`)}
                      </Badge>
                      <span className="inline-flex items-center text-[11px] text-gray-500">
                        <Globe className="w-3 h-3 mr-0.5" />
                        {langLabel}
                      </span>
                      {MediaIcon && (
                        <span className="inline-flex items-center text-[11px] text-gray-500">
                          <MediaIcon className="w-3 h-3 mr-0.5" />
                          {template.mediaType}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="flex items-center gap-1 ml-2 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {getStatusBadge(template.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewTemplate(template)}>
                          <Eye className="mr-2 h-4 w-4" />
                          {t("templates.actions.preview")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditTemplate(template)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t("templates.actions.edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDuplicateTemplate(template)}
                          disabled={user?.username === "demouser"}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {t("templates.actions.duplicate")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={user?.username === "demouser"}
                          onClick={() => onDeleteTemplate(template)}
                          className="text-red-600"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          {t("templates.actions.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {template.header && (
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {template.header}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {template.body}
                  </p>
                  {template.footer && (
                    <p className="text-xs text-gray-400 italic">{template.footer}</p>
                  )}
                </div>

                {buttons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {buttons.map((button, idx) => {
                      const BtnIcon = buttonTypeIcons[button.type] || MousePointerClick;
                      return (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[11px] px-1.5 py-0.5 bg-gray-50 text-gray-600 border-gray-200"
                        >
                          <BtnIcon className="w-3 h-3 mr-1" />
                          {button.text || button.type}
                        </Badge>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 pt-2.5 border-t text-xs text-gray-400 flex items-center justify-between">
                  <span>
                    {format(new Date(template.createdAt), "MMM d, yyyy")}
                  </span>
                  {buttons.length > 0 && (
                    <span className="text-gray-400">
                      {buttons.length === 1 
                        ? t("templates.buttonCount", { count: buttons.length }) 
                        : t("templates.buttonsCount", { count: buttons.length })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
