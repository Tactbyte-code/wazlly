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

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Globe, Plus, Edit2, Trash2, Copy, Search, ChevronRight, ChevronDown, Save, Star, Languages, ArrowUpDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";

interface PlatformLanguage {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  icon: string;
  direction: string;
  isEnabled: boolean;
  isDefault: boolean;
  translations: Record<string, any>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function flattenObject(obj: Record<string, any>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], fullKey));
    } else {
      result[fullKey] = typeof obj[key] === "string" ? obj[key] : JSON.stringify(obj[key]);
    }
  }
  return result;
}

function unflattenObject(flat: Record<string, string>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in flat) {
    const parts = key.split(".");
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = flat[key];
  }
  return result;
}

const SECTIONS = [
  "common", "auth", "navigation", "widget", "dashboard", "contacts",
  "campaigns", "templates", "inbox", "automations", "settings",
  "Landing", "aboutUs", "contactUs", "analytics", "team", "plans",
  "notifications", "billing", "integrations", "groups", "messageLogs",
  "profile", "webhooks", "ai", "workflow", "chatbot", "crm", "import",
  "segmentation", "health", "reports", "account", "errors", "success",
];

export default function LanguageManagement({ embedded = false }: { embedded?: boolean } = {}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t, fetchEnabledLanguages } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedLang, setSelectedLang] = useState<PlatformLanguage | null>(null);
  const [editingLangId, setEditingLangId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editedTranslations, setEditedTranslations] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const { user } = useAuth();
   const isDemo =
    user?.username === "demoadmin" || user?.username === "demouser";

  const [newLang, setNewLang] = useState({
    code: "", name: "", nativeName: "", icon: "", direction: "ltr", copyFromCode: "",
  });

  const [editLang, setEditLang] = useState({
    name: "", nativeName: "", icon: "", direction: "ltr",
  });

  const { data: languages = [], isLoading } = useQuery<PlatformLanguage[]>({
    queryKey: ["/api/languages"],
    queryFn: () => apiRequest("GET", "/api/languages").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/languages", data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/languages"] });
      setShowAddDialog(false);
      setNewLang({ code: "", name: "", nativeName: "", icon: "", direction: "ltr", copyFromCode: "" });
      toast({ title: t("settings.language.toast.created") });
    },
    onError: (err: any) => toast({ title: t("settings.language.toast.error"), description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PUT", `/api/languages/${id}`, data).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/languages"] });
      fetchEnabledLanguages();
      setShowEditDialog(false);
      toast({ title: t("settings.language.toast.updated") });
    },
    onError: (err: any) => toast({ title: t("settings.language.toast.error"), description: err.message, variant: "destructive" }),
  });

  const updateTranslationsMutation = useMutation({
    mutationFn: ({ id, translations }: { id: string; translations: any }) => apiRequest("PUT", `/api/languages/${id}/translations`, { translations }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/languages"] });
      setHasChanges(false);
      toast({ title: t("settings.language.toast.translationsSaved") });
    },
    onError: (err: any) => toast({ title: t("settings.language.toast.error"), description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/languages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/languages"] });
      setShowDeleteDialog(false);
      setSelectedLang(null);
      toast({ title: t("settings.language.toast.deleted") });
    },
    onError: (err: any) => toast({ title: t("settings.language.toast.error"), description: err.message, variant: "destructive" }),
  });

  const copyKeysMutation = useMutation({
    mutationFn: ({ id, sourceCode }: { id: string; sourceCode: string }) => apiRequest("POST", `/api/languages/${id}/copy-keys`, { sourceCode }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/languages"] });
      setShowCopyDialog(false);
      toast({ title: t("settings.language.toast.keysCopied") });
    },
    onError: (err: any) => toast({ title: t("settings.language.toast.error"), description: err.message, variant: "destructive" }),
  });

  const editingLang = useMemo(() => languages.find(l => l.id === editingLangId), [languages, editingLangId]);

  const flatTranslations = useMemo(() => {
    if (!editingLang?.translations) return {};
    return flattenObject(editingLang.translations as Record<string, any>);
  }, [editingLang]);

  const defaultLang = useMemo(() => languages.find(l => l.isDefault), [languages]);
  const defaultFlatTranslations = useMemo(() => {
    if (!defaultLang?.translations) return {};
    return flattenObject(defaultLang.translations as Record<string, any>);
  }, [defaultLang]);

  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    languages.forEach(l => {
      if (l.translations) {
        Object.keys(flattenObject(l.translations as Record<string, any>)).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys).sort();
  }, [languages]);

  const filteredKeys = useMemo(() => {
    let keys = allKeys;
    if (sectionFilter !== "all") {
      keys = keys.filter(k => k.startsWith(sectionFilter + "."));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      keys = keys.filter(k => {
        const value = editedTranslations[k] || flatTranslations[k] || "";
        return k.toLowerCase().includes(term) || value.toLowerCase().includes(term);
      });
    }
    return keys;
  }, [allKeys, sectionFilter, searchTerm, flatTranslations, editedTranslations]);

  const sections = useMemo(() => {
    const secs: Record<string, string[]> = {};
    filteredKeys.forEach(key => {
      const section = key.split(".")[0];
      if (!secs[section]) secs[section] = [];
      secs[section].push(key);
    });
    return secs;
  }, [filteredKeys]);

  const translationStats = useMemo(() => {
    const stats: Record<string, { total: number; translated: number }> = {};
    languages.forEach(lang => {
      const flat = flattenObject((lang.translations || {}) as Record<string, any>);
      const total = allKeys.length;
      const translated = allKeys.filter(k => flat[k] && flat[k].trim() !== "").length;
      stats[lang.code] = { total, translated };
    });
    return stats;
  }, [languages, allKeys]);

  useEffect(() => {
    if (editingLang) {
      setEditedTranslations({ ...flatTranslations });
      setHasChanges(false);
    }
  }, [editingLangId, flatTranslations]);

  const handleTranslationChange = useCallback((key: string, value: string) => {
    setEditedTranslations(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleSaveTranslations = () => {
    if (!editingLangId) return;
    const unflattened = unflattenObject(editedTranslations);
    updateTranslationsMutation.mutate({ id: editingLangId, translations: unflattened });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const getTranslationPercentage = (langCode: string) => {
    const stat = translationStats[langCode];
    if (!stat || stat.total === 0) return 0;
    return Math.round((stat.translated / stat.total) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-violet-500 rounded-full border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={embedded ? "space-y-6" : "p-6 max-w-7xl mx-auto space-y-6"}>
      <div className="flex items-center justify-between">
        {!embedded && (
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-violet-500" />
              {t("settings.language.title")}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t("settings.language.subtitle")} ({allKeys.length} {t("settings.language.keys")})
            </p>
          </div>
        )}
        {embedded && (
          <div>
            <p className="text-sm text-muted-foreground">
              {t("settings.language.subtitle")} ({allKeys.length} {t("settings.language.keys")})
            </p>
          </div>
        )}


        <Button onClick={() => setShowAddDialog(true)} className="bg-violet-600 hover:bg-violet-700">
          <Plus className="h-4 w-4 mr-2" /> {t("settings.language.addLanguage")}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t("settings.language.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="translations" disabled={!editingLangId}>
            {t("settings.language.tabs.editor")} {editingLangId && `(${editingLang?.name})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {languages.map(lang => {
              const pct = getTranslationPercentage(lang.code);
              const stat = translationStats[lang.code];
              return (
                <Card key={lang.id} className={`relative transition-all hover:shadow-md ${!lang.isEnabled ? "opacity-60" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{lang.icon}</span>
                        <div>
                          <CardTitle className="text-base flex items-center gap-1.5">
                            {lang.name}
                            {lang.isDefault && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                          </CardTitle>
                          <CardDescription className="text-xs">{lang.nativeName} ({lang.code})</CardDescription>
                        </div>
                      </div>
                      <Badge variant={lang.isEnabled ? "default" : "secondary"} className="text-xs">
                        {lang.isEnabled ? t("settings.language.active") : t("settings.language.disabled")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>{stat?.translated || 0} / {stat?.total || 0} {t("settings.language.keys")}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : pct >= 70 ? "bg-blue-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => {
                          setEditingLangId(lang.id);
                          setActiveTab("translations");
                        }}
                      >
                        <Edit2 className="h-3 w-3 mr-1" /> {t("settings.language.editKeys")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setSelectedLang(lang);
                          setShowCopyDialog(true);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          setSelectedLang(lang);
                          setEditLang({ name: lang.name, nativeName: lang.nativeName, icon: lang.icon, direction: lang.direction });
                          setShowEditDialog(true);
                        }}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={lang.isEnabled}
                          onCheckedChange={(checked) => updateMutation.mutate({ id: lang.id, data: { isEnabled: checked } })}
                          disabled={lang.isDefault}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!lang.isDefault && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            disabled={isDemo}
                            onClick={() => updateMutation.mutate({ id: lang.id, data: { isDefault: true } })}
                          >
                            <Star className="h-3 w-3 mr-1" /> {t("settings.language.setDefault")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="text-xs"
                            onClick={() => { setSelectedLang(lang); setShowDeleteDialog(true); }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="translations" className="space-y-4">
          {editingLang && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={() => { setActiveTab("overview"); setEditingLangId(null); }}>
                    {t("settings.language.dialog.cancel")}
                  </Button>
                  <span className="text-2xl">{editingLang.icon}</span>
                  <div>
                    <h2 className="text-lg font-semibold">{editingLang.name}</h2>
                    <p className="text-xs text-muted-foreground">{filteredKeys.length} {t("settings.language.keys")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("settings.language.searchPlaceholder")}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Select value={sectionFilter} onValueChange={setSectionFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder={t("settings.language.allSections")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("settings.language.allSections")} ({allKeys.length})</SelectItem>
                      {SECTIONS.map(s => {
                        const count = allKeys.filter(k => k.startsWith(s + ".")).length;
                        if (count === 0) return null;
                        return <SelectItem key={s} value={s}>{s} ({count})</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleSaveTranslations}
                    disabled={!hasChanges || updateTranslationsMutation.isPending || isDemo}
                    className="bg-violet-600 hover:bg-violet-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateTranslationsMutation.isPending ? t("settings.language.saving") : t("settings.language.saveChanges")}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {Object.entries(sections).map(([section, keys]) => (
                  <Card key={section}>
                    <button
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 rounded-lg transition-colors"
                      onClick={() => toggleSection(section)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedSections.has(section) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-medium">{section}</span>
                        <Badge variant="secondary" className="text-xs">{keys.length} {t("settings.language.keys")}</Badge>
                      </div>
                    </button>
                    {expandedSections.has(section) && (
                      <CardContent className="pt-0 space-y-2">
                        {keys.map(key => {
                          const defaultValue = defaultFlatTranslations[key] || "";
                          const currentValue = editedTranslations[key] || "";
                          const isMissing = !currentValue.trim();
                          return (
                            <div key={key} className={`grid grid-cols-1 lg:grid-cols-3 gap-2 p-2 rounded border ${isMissing ? "border-amber-300 bg-amber-50/50" : "border-transparent"}`}>
                              <div className="space-y-1">
                                <Label className="text-xs font-mono text-muted-foreground break-all">{key}</Label>
                                {defaultLang && editingLang.code !== defaultLang.code && (
                                  <p className="text-xs text-muted-foreground italic truncate" title={defaultValue}>
                                    {defaultValue || `(${t("settings.language.disabled")})`}
                                  </p>
                                )}
                              </div>
                              <div className="lg:col-span-2">
                                {currentValue.length > 80 ? (
                                  <Textarea
                                    value={currentValue}
                                    onChange={e => handleTranslationChange(key, e.target.value)}
                                    className="text-sm min-h-[60px]"
                                    rows={2}
                                  />
                                ) : (
                                  <Input
                                    value={currentValue}
                                    onChange={e => handleTranslationChange(key, e.target.value)}
                                    className="text-sm"
                                    placeholder={isMissing ? "Translation missing..." : ""}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.language.dialog.addTitle")}</DialogTitle>
            <DialogDescription>{t("settings.language.dialog.addDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("settings.language.dialog.code")}</Label>
                <Input placeholder="e.g. ja" value={newLang.code} onChange={e => setNewLang(p => ({ ...p, code: e.target.value }))} />
              </div>
              <div>
                <Label>{t("settings.language.dialog.icon")}</Label>
                <Input placeholder="e.g. 🇯🇵" value={newLang.icon} onChange={e => setNewLang(p => ({ ...p, icon: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("settings.language.dialog.name")}</Label>
                <Input placeholder="e.g. Japanese" value={newLang.name} onChange={e => setNewLang(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>{t("settings.language.dialog.nativeName")}</Label>
                <Input placeholder="e.g. 日本語" value={newLang.nativeName} onChange={e => setNewLang(p => ({ ...p, nativeName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("settings.language.dialog.direction")}</Label>
                <Select value={newLang.direction} onValueChange={v => setNewLang(p => ({ ...p, direction: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ltr">{t("settings.language.dialog.ltr")}</SelectItem>
                    <SelectItem value="rtl">{t("settings.language.dialog.rtl")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("settings.language.dialog.copyFrom")}</Label>
                <Select value={newLang.copyFromCode} onValueChange={v => setNewLang(p => ({ ...p, copyFromCode: v }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {languages.map(l => (
                      <SelectItem key={l.code} value={l.code}>{l.icon} {l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t("settings.language.dialog.cancel")}</Button>
            <Button
              onClick={() => createMutation.mutate({
                ...newLang,
                copyFromCode: newLang.copyFromCode === "none" ? "" : newLang.copyFromCode,
              })}
              disabled={!newLang.code || !newLang.name || !newLang.nativeName || createMutation.isPending || isDemo}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {createMutation.isPending ? t("settings.language.dialog.creating") : t("settings.language.dialog.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.language.dialog.editTitle")}: {selectedLang?.name}</DialogTitle>
            <DialogDescription>{t("settings.language.dialog.editDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("settings.language.dialog.name")}</Label>
                <Input value={editLang.name} onChange={e => setEditLang(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>{t("settings.language.dialog.nativeName")}</Label>
                <Input value={editLang.nativeName} onChange={e => setEditLang(p => ({ ...p, nativeName: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("settings.language.dialog.icon")}</Label>
                <Input value={editLang.icon} onChange={e => setEditLang(p => ({ ...p, icon: e.target.value }))} />
              </div>
              <div>
                <Label>{t("settings.language.dialog.direction")}</Label>
                <Select value={editLang.direction} onValueChange={v => setEditLang(p => ({ ...p, direction: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ltr">{t("settings.language.dialog.ltr")}</SelectItem>
                    <SelectItem value="rtl">{t("settings.language.dialog.rtl")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>{t("settings.language.dialog.cancel")}</Button>
            <Button
              onClick={() => selectedLang && updateMutation.mutate({ id: selectedLang.id, data: editLang })}
              disabled={updateMutation.isPending || isDemo}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {updateMutation.isPending ? t("settings.language.saving") : t("settings.language.dialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.language.dialog.copyTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.language.dialog.copyDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("settings.language.dialog.sourceLang")}</Label>
              <Select onValueChange={(v) => {
                if (selectedLang) copyKeysMutation.mutate({ id: selectedLang.id, sourceCode: v });
              }}>
                <SelectTrigger><SelectValue placeholder={t("settings.language.dialog.selectSource")} /></SelectTrigger>
                <SelectContent>
                  {languages.filter(l => l.code !== selectedLang?.code).map(l => (
                    <SelectItem key={l.code} value={l.code}>{l.icon} {l.name} ({getTranslationPercentage(l.code)}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>{t("settings.language.dialog.close")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.language.dialog.deleteTitle")}</DialogTitle>
            <DialogDescription>
              {selectedLang?.name}? {t("settings.language.dialog.deleteDesc")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>{t("settings.language.dialog.cancel")}</Button>
            <Button
              variant="destructive"
              onClick={() => selectedLang && deleteMutation.mutate(selectedLang.id)}
              disabled={deleteMutation.isPending || isDemo}
            >
              {deleteMutation.isPending ? t("settings.language.dialog.deleting") : t("settings.language.dialog.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
