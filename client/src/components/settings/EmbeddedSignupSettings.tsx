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

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Settings,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Pencil,
  Smartphone,
  FileText,
  Info,
  CheckCircle2,
  XCircle,
  Loader2,
  FlaskConical,
} from "lucide-react";
import {
  apiRequest,
  queryClient,
} from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";

export function EmbeddedSignupSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [form, setForm] = useState({
    appId: "",
    appSecret: "",
    configId: "",
  });

  const [showSecret, setShowSecret] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [testResults, setTestResults] = useState<{
    appCredentials: { valid: boolean; error?: string; appName?: string };
    configId: { valid: boolean; error?: string; note?: string };
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

 const { user } = useAuth();
 const isDemo = user?.username === "demoadmin" || user?.username === "demouser";

  const { data } = useQuery({
    queryKey: ["/api/embedded/config"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/embedded/config");
      return res.json();
    },
  });

  const { data: platformSettings } = useQuery({
    queryKey: ["/api/platform-settings"],
    queryFn: async () => {
      const res = await fetch("/api/platform-settings", { credentials: "include" });
      if (!res.ok) return { embeddedSignupEnabled: true };
      return res.json();
    },
  });

  const isCreated = !!data;

  useEffect(() => {
    if (data) {
      setForm({
        appId: data.appId || "",
        appSecret: data.appSecret || "",
        configId: data.configId || "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/embedded/config", form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/embedded/config"] });
      setIsEditing(false);
      toast({
        title: isCreated ? t("settings.embedded.toast.updated") : t("settings.embedded.toast.created"),
        description: t("settings.embedded.toast.savedSuccess"),
      });
    },
  });

  const toggleEmbeddedSignup = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest("PUT", "/api/platform-settings", {
        embeddedSignupEnabled: enabled,
      });
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform-settings"] });
      toast({
        title: enabled ? t("settings.embedded.toast.enabled") : t("settings.embedded.toast.disabled"),
        description: enabled
          ? t("settings.embedded.toast.enabledDesc")
          : t("settings.embedded.toast.disabledDesc"),
      });
    },
  });

  const runTestCredentials = async () => {
    setIsTesting(true);
    setTestResults(null);
    try {
      const res = await apiRequest("GET", "/api/whatsapp/test-credentials");
      const data = await res.json();
      setTestResults({
        appCredentials: data.appCredentials,
        configId: data.configId,
      });
    } catch (e: any) {
      toast({
        title: t("settings.embedded.toast.testFailed"),
        description: e.message || "Could not reach the test endpoint",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const embeddedEnabled = platformSettings?.embeddedSignupEnabled ?? true;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Smartphone className="w-5 h-5" />
            {t("settings.embedded.onboardingTitle")}
          </CardTitle>
          <CardDescription>
            {t("settings.embedded.onboardingDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm">
                  {embeddedEnabled ? t("settings.embedded.signupLabel") : t("settings.embedded.manualLabel")}
                </p>
                <Badge variant={embeddedEnabled ? "default" : "secondary"} className="text-xs">
                  {embeddedEnabled ? t("settings.embedded.active") : t("settings.embedded.inactive")}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {embeddedEnabled
                  ? t("settings.embedded.signupHelper")
                  : t("settings.embedded.manualHelper")}
              </p>
            </div>
            <Switch
              checked={embeddedEnabled}
              onCheckedChange={(checked) => toggleEmbeddedSignup.mutate(checked)}
              disabled={toggleEmbeddedSignup.isPending || isDemo}
            />
          </div>

          {!embeddedEnabled && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md flex gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                {t("settings.embedded.manualModeNotice")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {embeddedEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t("settings.embedded.credentialsTitle")}
                <Badge variant={isCreated ? "default" : "secondary"}>
                  {isCreated ? t("settings.embedded.configured") : t("settings.embedded.notConfigured")}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {isCreated && !isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={runTestCredentials}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <FlaskConical className="w-4 h-4 mr-1" />
                    )}
                    {t("settings.embedded.test")}
                  </Button>
                )}
                {isCreated && !isEditing && (
                  <Button size="sm" onClick={() => setIsEditing(true)}>
                    <Pencil className="w-4 h-4 mr-1" />
                    {t("settings.embedded.edit")}
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {testResults && (
              <div className="p-3 border rounded-lg space-y-2 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("settings.embedded.testResults")}
                </p>
                <div className="flex items-center gap-2">
                  {testResults.appCredentials.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="text-sm">
                    {testResults.appCredentials.valid
                      ? `${t("settings.embedded.appValid")}${testResults.appCredentials.appName ? ` — ${testResults.appCredentials.appName}` : ""}`
                      : `${t("settings.embedded.appInvalid")} — ${testResults.appCredentials.error}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {testResults.configId.valid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className="text-sm">
                    {testResults.configId.valid
                      ? `${t("settings.embedded.configValid")}${testResults.configId.note ? ` — ${testResults.configId.note}` : ""}`
                      : `${t("settings.embedded.configInvalid")} — ${testResults.configId.error}`}
                  </span>
                </div>
              </div>
            )}

            {!isCreated && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
                {t("settings.embedded.noConfigWarning")}
              </div>
            )}

            <div className="space-y-2">
              <Label>{t("settings.embedded.appIdLabel")}</Label>
              <Input
                value={form.appId}
                disabled={isCreated && !isEditing}
                onChange={(e) => setForm({ ...form, appId: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("settings.embedded.appSecretLabel")}</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={form.appSecret}
                  disabled={isCreated && !isEditing}
                  onChange={(e) => setForm({ ...form, appSecret: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("settings.embedded.configIdLabel")}</Label>
              <Input
                value={form.configId}
                disabled={isCreated && !isEditing}
                onChange={(e) => setForm({ ...form, configId: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2">
              {(isEditing || !isCreated) && (
                <Button onClick={() => saveMutation.mutate()} disabled={isDemo}>
                  {saveMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {t("settings.embedded.saving")}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isCreated ? t("settings.embedded.update") : t("settings.embedded.create")}
                    </>
                  )}
                </Button>
              )}
              {isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  {t("settings.embedded.cancel")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
