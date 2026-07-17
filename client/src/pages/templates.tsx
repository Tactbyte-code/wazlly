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

import { useState, useCallback, useEffect } from "react";
import { PageNumbers } from "@/components/ui/page-numbers";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import {
  FileText, Plus, RefreshCw, Clock, Trash2, Edit3,
  Phone, ExternalLink, Reply, Clipboard, Image, Video,
  FileDown, Megaphone, Wrench, ShieldCheck, Globe, MousePointerClick,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WHATSAPP_LANGUAGES } from "@/lib/template-constants";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, apiRequestFormData } from "@/lib/queryClient";
import { queryKeys } from "@/lib/query-keys";
import type { Template } from "@shared/schema";
import { TemplatesTable } from "@/components/templates/TemplatesTable";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import {
  TemplateDialog,
  getTemplateDrafts,
  deleteTemplateDraft,
  type TemplateDraft,
} from "@/components/templates/TemplateDialog";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

type SyncFail = {
  status: string;
  message: string;
};

const languageMap = Object.fromEntries(
  WHATSAPP_LANGUAGES.map((l) => [l.code, l.label])
);

function getLanguageLabel(code: string): string {
  return languageMap[code] || languageMap[code?.replace("-", "_")] || code || "English";
}

const categoryStyles: Record<string, { label: string; className: string; icon: any }> = {
  MARKETING: { label: "Marketing", className: "bg-purple-50 text-purple-700 border-purple-200", icon: Megaphone },
  UTILITY: { label: "Utility", className: "bg-blue-50 text-blue-700 border-blue-200", icon: Wrench },
  AUTHENTICATION: { label: "Authentication", className: "bg-amber-50 text-amber-700 border-amber-200", icon: ShieldCheck },
};

const btnTypeIcons: Record<string, any> = {
  PHONE_NUMBER: Phone,
  URL: ExternalLink,
  QUICK_REPLY: Reply,
  COPY_CODE: Clipboard,
};

function extractButtons(template: any) {
  const buttons: Array<{ type: string; text: string }> = [];
  if (template.buttons && Array.isArray(template.buttons)) {
    for (const btn of template.buttons) {
      buttons.push({ type: btn.type || "QUICK_REPLY", text: btn.text || "" });
    }
  }
  if (buttons.length === 0 && template.components && Array.isArray(template.components)) {
    for (const comp of template.components) {
      if (comp.type === "BUTTONS" && Array.isArray(comp.buttons)) {
        for (const btn of comp.buttons) {
          buttons.push({ type: btn.type || "QUICK_REPLY", text: btn.text || "" });
        }
      }
    }
  }
  return buttons;
}

function getMediaIcon(mediaType: string | null | undefined) {
  switch (mediaType?.toLowerCase()) {
    case "image": return Image;
    case "video": return Video;
    case "document": return FileDown;
    default: return null;
  }
}

export default function Templates() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [activeDraft, setActiveDraft] = useState<TemplateDraft | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { toast } = useToast();
  const { user } = useAuth();
  const userRole = user?.role;
  const { t } = useTranslation();

  // Fetch active channel
  const { data: activeChannel } = useQuery({
    queryKey: queryKeys.channels.active(),
  });
  const channelId = activeChannel?.id;

  const [drafts, setDrafts] = useState<TemplateDraft[]>(() => getTemplateDrafts(channelId));

  const refreshDrafts = useCallback(() => {
    setDrafts(getTemplateDrafts(channelId));
  }, [channelId]);

  useEffect(() => {
    setDrafts(getTemplateDrafts(channelId));
  }, [channelId]);

  const handleResumeDraft = (draft: TemplateDraft) => {
    setEditingTemplate(null);
    setActiveDraft(draft);
    setShowDialog(true);
  };

  const handleDeleteDraft = (draftId: string) => {
    deleteTemplateDraft(draftId, channelId);
    refreshDrafts();
  };


  // Fetch templates (paginated)
  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: queryKeys.templates.list({ userRole, channelId, page, limit }),
    queryFn: async () => {
      if (userRole === "superadmin") {
        const res = await fetch(`/api/templates?page=${page}&limit=${limit}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json(); // expects { data: Template[], pagination: { total, totalPages } }
      } else {
        const res = await api.getTemplates(channelId, page, limit);
        const data = await res.json();
        return data;
      }
    },
    enabled: userRole === "superadmin" || !!activeChannel,
  });


  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();

      formData.append("name", data.name);
      formData.append("category", data.category);
      formData.append("language", data.language);
      formData.append("body", data.body || "");
      formData.append("channelId", activeChannel?.id);

      if (data.footer) {
        formData.append("footer", data.footer);
      }

      if (data.variables?.length) {
        formData.append("samples", JSON.stringify(data.variables));
      }

      if (data.buttons?.length) {
        formData.append("buttons", JSON.stringify(data.buttons));
      }

      if (data.mediaFile) {
        formData.append("mediaFile", data.mediaFile);
        formData.append("mediaType", data.mediaType);
      } else if (data.header) {
        formData.append("header", data.header);
      }

      if (data.marketingSubType && data.marketingSubType !== "CUSTOM") {
        formData.append("marketingSubType", data.marketingSubType);
      }

      if (data.couponCode) {
        formData.append("couponCode", data.couponCode);
      }

      if (data.offerText) {
        formData.append("offerText", data.offerText);
      }

      if (data.hasExpiration) {
        formData.append("hasExpiration", "true");
        formData.append("expirationDays", String(data.expirationDays || 14));
      }

      if (data.carouselCards?.length) {
        const cardsForJson = data.carouselCards.map((card: any) => {
          const { mediaFile, mediaPreview, ...rest } = card;
          return rest;
        });
        formData.append("carouselCards", JSON.stringify(cardsForJson));
        data.carouselCards.forEach((card: any, idx: number) => {
          if (card.mediaFile instanceof File) {
            formData.append(`carouselCardMedia_${idx}`, card.mediaFile);
          }
        });
      }

      if (data.catalogId) {
        formData.append("catalogId", data.catalogId);
      }

      if (data.category === "AUTHENTICATION") {
        formData.append("authType", data.authType || "COPY_CODE");
        formData.append("authCodeExpiry", String(data.authCodeExpiry || 10));
        formData.append("authSecurityDisclaimer", String(data.authSecurityDisclaimer));
        if (data.authPackageName) {
          formData.append("authPackageName", data.authPackageName);
        }
        if (data.authSignatureHash) {
          formData.append("authSignatureHash", data.authSignatureHash);
        }
      }

      if (data.headerVariable) {
        formData.append("headerVariable", data.headerVariable);
      }

      if (editingTemplate) {
        return await apiRequestFormData(
          "PUT",
          `/api/templates/${editingTemplate.id}`,
          formData
        );
      }

      return await apiRequestFormData("POST", "/api/templates", formData);
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all() });
      toast({
        title: editingTemplate ? t("templates.toast.templateUpdated") : t("templates.toast.templateCreated"),
        description: editingTemplate
          ? t("templates.toast.templateUpdatedDesc")
          : t("templates.toast.templateCreatedDesc"),
      });
      setShowDialog(false);
      setEditingTemplate(null);
    },

    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||   // axios style
        error?.data?.message ||             // custom wrapper
        error?.message ||                   // fallback
        t("templates.toast.createFailed");

      toast({
        title: t("templates.toast.error"),
        description: message,
        variant: "destructive",
      });
    },
  });



  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) =>
      apiRequest("DELETE", `/api/templates/${templateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all() });
      toast({
        title: t("templates.toast.templateDeleted"),
        description: t("templates.toast.templateDeletedDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("templates.toast.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });



  // Sync templates mutation
  const syncTemplatesMutation = useMutation({
    mutationFn: async () => {
      if (!activeChannel) throw new Error("No active channel");
      const response = await apiRequest("POST", `/api/templates/sync`, {
        channelId: activeChannel?.id,
      });
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all() });
      const created = data.createdCount || 0;
      const updated = data.updatedCount || 0;
      const total = data.totalFromWhatsApp || 0;
      const skipped = data.skippedCount || 0;

      if (data.autoCreated) {
        const results = data.autoCreateResults || [];
        const succeeded = results.filter((r: any) => r.status !== "FAILED").length;
        const failed = results.filter((r: any) => r.status === "FAILED").length;
        
        let failedStr = "";
        if (failed > 0) {
          failedStr = `${failed} failed to create.`;
        }
        
        toast({
          title: t("templates.toast.starterCreated"),
          description: t("templates.toast.starterCreatedDesc", { succeeded, failedStr }),
        });
        return;
      }

      let description = "";
      if (created > 0 && updated > 0) {
        description = t("templates.toast.syncImportedUpdated", { created, updated, total });
      } else if (created > 0) {
        description = t("templates.toast.syncImported", { created, total });
      } else if (updated > 0) {
        description = t("templates.toast.syncUpdated", { updated, total });
      } else if (total === 0) {
        description = t("templates.toast.syncEmpty");
      } else {
        description = t("templates.toast.syncAlreadySynced", { total });
      }

      toast({
        title: t("templates.toast.templatesSynced"),
        description,
      });
    },
    onError: (error: any) => {
      const message =
        error?.message || t("templates.toast.syncFailedDesc");
      toast({
        title: t("templates.toast.syncFailed"),
        description: message,
        variant: "destructive",
      });
    },
  });

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setActiveDraft(null);
    setShowDialog(true);
  };
  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setShowDialog(true);
  };
  const handleDuplicateTemplate = (template: Template) => {
    setEditingTemplate({ ...template, name: `${template.name}_copy` });
    setShowDialog(true);
  };
  const handleDeleteTemplate = (template: Template) => {
    if (confirm(t("templates.deleteConfirm", { name: template.name })))
      deleteTemplateMutation.mutate(template.id);
  };
  const handleSyncTemplates = () => syncTemplatesMutation.mutate();

  if (!activeChannel && userRole !== "superadmin") {
    return (
      <div className="flex-1 dots-bg min-h-screen">
        <Header
          title={t("templates.title")}
          subtitle={t("templates.superAdminSubTitle")}
        />
        <main className="p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">
                {t("templates.emptyState.noChannel")}
              </p>
              <Button
                className="mt-4"
                onClick={() => (window.location.href = "/settings")}
              >
                {t("templates.emptyState.goSettings")}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header
        title={t("templates.title")}
        subtitle={t("templates.userSubTitle")}
      />
      <main className="p-4 sm:p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center text-lg sm:text-xl">
                <FileText className="w-5 h-5 mr-2" />
                {t("templates.mess_Temp")}
              </CardTitle>
              {userRole !== "superadmin" && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncTemplates}
                    disabled={syncTemplatesMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${syncTemplatesMutation.isPending ? "animate-spin" : ""
                        }`}
                    />
                    {t("templates.sync")}
                  </Button>
                  <Button
                    onClick={handleCreateTemplate}
                    className="w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t("templates.createTemplate")}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          {drafts.length > 0 && (
            <div className="px-6 pb-2">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-semibold text-amber-800">{t("templates.drafts.unsavedDrafts")}</h3>
                  <span className="text-xs bg-amber-200 text-amber-800 rounded-full px-2 py-0.5">{drafts.length}</span>
                </div>
                <div className="space-y-2">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="flex items-center justify-between bg-white rounded-md border border-amber-100 px-3 py-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900 truncate">
                            {draft.data.name || t("templates.drafts.untitled")}
                          </span>
                          <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">
                            {draft.data.category || "MARKETING"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {draft.data.body
                            ? draft.data.body.substring(0, 80) + (draft.data.body.length > 80 ? "..." : "")
                            : t("templates.drafts.noBodyText")}
                          {" · "}
                          {t("templates.drafts.saved")} {new Date(draft.savedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-3 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-green-700 hover:text-green-800 hover:bg-green-50"
                          onClick={() => handleResumeDraft(draft)}
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1" />
                          {t("templates.drafts.resume")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteDraft(draft.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <CardContent>
            {templatesLoading ? (
              <Loading />
            ) : (
              <>
                {/* Superadmin Table */}
                {userRole === "superadmin" ? (
                  <>
                    <div className="hidden lg:block overflow-x-auto">
                      <table className="min-w-full border border-gray-200 bg-white rounded-lg shadow-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                              {t("templates.table.name")}
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                              {t("templates.table.createdBy")}
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                              {t("templates.table.category")}
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                              {t("templates.table.status")}
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                              {t("templates.table.language")}
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                              {t("templates.table.body")}
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                              {t("templates.table.buttons")}
                            </th>
                            <th className="py-3 px-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b">
                              {t("templates.table.createdAt")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {templatesData?.data.map((template) => {
                            const cat = categoryStyles[template.category] || categoryStyles.MARKETING;
                            const CatIcon = cat.icon;
                            const MediaIcon = getMediaIcon(template.mediaType);
                            const buttons = extractButtons(template);
                            return (
                              <tr
                                key={template.id}
                                className="hover:bg-gray-50 transition-colors"
                              >
                                <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    {MediaIcon && <MediaIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                                    <span className="truncate max-w-[200px]">{template.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-700">
                                  {template?.createdByName?.trim() || "-"}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  <Badge variant="outline" className={`text-[11px] ${cat.className}`}>
                                    <CatIcon className="w-3 h-3 mr-1" />
                                    {t(`templates.categories.${(cat.label || "marketing").toLowerCase()}`)}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge className={`text-xs border-0 ${template.status.toLowerCase() === "approved"
                                    ? "bg-green-500 text-white hover:bg-green-600"
                                    : template.status.toLowerCase() === "rejected"
                                      ? "bg-red-500 text-white hover:bg-red-600"
                                      : template.status.toLowerCase() === "pending"
                                        ? "bg-yellow-500 text-white hover:bg-yellow-600"
                                        : "bg-gray-500 text-white hover:bg-gray-600"
                                    }`}>
                                    {template.status.toUpperCase()}
                                  </Badge>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  <span className="inline-flex items-center text-xs">
                                    <Globe className="w-3 h-3 mr-1 text-gray-400" />
                                    {getLanguageLabel(template.language)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-700 max-w-xs truncate">
                                  {template.body}
                                </td>
                                <td className="py-3 px-4">
                                  {buttons.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {buttons.map((btn, idx) => {
                                        const BtnIcon = btnTypeIcons[btn.type] || MousePointerClick;
                                        return (
                                          <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-600 border-gray-200">
                                            <BtnIcon className="w-2.5 h-2.5 mr-0.5" />
                                            {btn.text || btn.type}
                                          </Badge>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm text-gray-600">
                                  {new Date(template.createdAt).toLocaleDateString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden space-y-4">
                      {templatesData?.data.map((template) => {
                        const cat = categoryStyles[template.category] || categoryStyles.MARKETING;
                        const CatIcon = cat.icon;
                        const MediaIcon = getMediaIcon(template.mediaType);
                        const buttons = extractButtons(template);
                        return (
                          <Card key={template.id} className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-gray-900 mb-1 truncate">
                                    {template.name}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {template?.createdByName?.trim() || t("templates.table.unknown")}
                                  </p>
                                </div>
                                <Badge className={`text-xs ml-2 flex-shrink-0 border-0 ${template.status.toLowerCase() === "approved"
                                  ? "bg-green-500 text-white hover:bg-green-600"
                                  : template.status.toLowerCase() === "rejected"
                                    ? "bg-red-500 text-white hover:bg-red-600"
                                    : template.status.toLowerCase() === "pending"
                                      ? "bg-yellow-500 text-white hover:bg-yellow-600"
                                      : "bg-gray-500 text-white hover:bg-gray-600"
                                  }`}>
                                  {template.status.toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b">
                                <Badge variant="outline" className={`text-[11px] ${cat.className}`}>
                                  <CatIcon className="w-3 h-3 mr-1" />
                                  {t(`templates.categories.${(cat.label || "marketing").toLowerCase()}`)}
                                </Badge>
                                <span className="inline-flex items-center text-[11px] text-gray-500">
                                  <Globe className="w-3 h-3 mr-0.5" />
                                  {getLanguageLabel(template.language)}
                                </span>
                                {MediaIcon && (
                                  <span className="inline-flex items-center text-[11px] text-gray-500">
                                    <MediaIcon className="w-3 h-3 mr-0.5" />
                                    {template.mediaType}
                                  </span>
                                )}
                              </div>
                              <div className="mb-3">
                                <p className="text-sm text-gray-700 line-clamp-3">
                                  {template.body}
                                </p>
                              </div>
                              {buttons.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {buttons.map((btn, idx) => {
                                    const BtnIcon = btnTypeIcons[btn.type] || MousePointerClick;
                                    return (
                                      <Badge key={idx} variant="outline" className="text-[11px] px-1.5 py-0.5 bg-gray-50 text-gray-600 border-gray-200">
                                        <BtnIcon className="w-3 h-3 mr-1" />
                                        {btn.text || btn.type}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                              <div className="text-xs text-gray-400">
                                {new Date(template.createdAt).toLocaleDateString()}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {templatesData?.pagination && (
                      <div className="w-full mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-sm text-gray-700">
                            {t("templates.pagination.showing", {
                              start: (page - 1) * limit + 1,
                              end: Math.min(page * limit, templatesData.pagination.total),
                              total: templatesData.pagination.total
                            })}
                          </span>
                          <select
                            value={limit}
                            onChange={(e) => {
                              setLimit(Number(e.target.value));
                              setPage(1);
                            }}
                            className="border px-3 py-2 rounded-md text-sm w-24"
                          >
                            {[5, 10, 20, 50].map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-center sm:justify-end gap-2">
                          <button
                            className="px-3 py-1 border rounded disabled:opacity-50"
                            disabled={page <= 1}
                            onClick={() =>
                              setPage((prev) => Math.max(prev - 1, 1))
                            }
                          >
                            {t("templates.pagination.previous")}
                          </button>
                          <PageNumbers
                            currentPage={page}
                            totalPages={templatesData.pagination.totalPages}
                            onPageChange={(p) => setPage(p)}
                          />
                          <button
                            className="px-3 py-1 border rounded disabled:opacity-50"
                            disabled={
                              page >= templatesData.pagination.totalPages
                            }
                            onClick={() =>
                              setPage((prev) =>
                                Math.min(
                                  prev + 1,
                                  templatesData.pagination.totalPages
                                )
                              )
                            }
                          >
                            {t("templates.pagination.next")}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <TemplatesTable
                    templates={templatesData?.data || []}
                    onViewTemplate={setSelectedTemplate}
                    onEditTemplate={handleEditTemplate}
                    onDuplicateTemplate={handleDuplicateTemplate}
                    onDeleteTemplate={handleDeleteTemplate}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Template Preview */}
      {selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}

      {/* Template Dialog */}
      <TemplateDialog
        open={showDialog}
        onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setActiveDraft(null);
            refreshDrafts();
          }
        }}
        template={editingTemplate}
        onSubmit={(data) => createTemplateMutation.mutate(data)}
        isSubmitting={createTemplateMutation.isPending}
        initialDraft={activeDraft}
        onDraftSaved={refreshDrafts}
        channelId={channelId}
      />
    </div>
  );
}
