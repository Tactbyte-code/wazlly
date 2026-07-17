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
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Webhook, Plus, Copy, RefreshCw, CheckCircle, AlertCircle, HelpCircle, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WebhookConfig } from "@shared/schema";
import { Loading } from "@/components/ui/loading";
import { WebhookDialog } from "./WebhookDialog";
import { WebhookFlowDiagram } from "@/components/webhook-flow-diagram";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "@/lib/i18n";

export function WebhookSettings() {
  const { t } = useTranslation();
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const webhookUrl = window.location.origin + "/webhook/global";

  const {
    data: webhookConfigs = [],
    isLoading: webhooksLoading,
    refetch: refetchWebhookConfigs,
  } = useQuery({
    queryKey: ["webhook-configs"],
    queryFn: async () => {
      const res = await fetch("/api/webhook-configs");
      const json = await res.json();
      return json.data || json;
    },
  });

  const activeConfig = webhookConfigs.find((c: WebhookConfig) => c.isActive);

  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      return await apiRequest("DELETE", `/api/webhook-configs/${webhookId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-configs"] });
      toast({
        title: t("settings.webhook_setting.webhookDeleted"),
        description: t("settings.webhook_setting.webhookDeletedDesc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("settings.webhook_setting.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const res = await apiRequest("POST", `/api/webhook-configs/${webhookId}/test`);
      try {
        return await res.json();
      } catch {
        return null;
      }
    },
    onSuccess: (data: any) => {
      toast({
        title: t("settings.webhook_setting.testSent"),
        description:
          (data && typeof data.message === "string" && data.message) ||
          t("settings.webhook_setting.testSentDesc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("settings.webhook_setting.testFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t("settings.webhook_setting.copied"),
      description: t("settings.webhook_setting.copiedDesc"),
    });
  };

  const handleEditWebhook = (webhook: WebhookConfig) => {
    setEditingWebhook(webhook);
    setShowWebhookDialog(true);
  };

  const handleDeleteWebhook = (webhookId: string) => {
    if (confirm(t("settings.webhook_setting.deleteConfirm"))) {
      deleteWebhookMutation.mutate(webhookId);
    }
  };

  const getWebhookStatus = (webhook: WebhookConfig) => {
    if (!webhook.lastPingAt)
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        text: t("settings.webhook_setting.status.noEvents"),
      };

    const lastPingDate = new Date(webhook.lastPingAt);
    const now = new Date();
    const hoursSinceLastPing = (now.getTime() - lastPingDate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastPing < 24) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        text: t("settings.webhook_setting.status.active"),
      };
    } else {
      return {
        icon: <AlertCircle className="w-4 h-4 text-yellow-500" />,
        text: t("settings.webhook_setting.status.inactive"),
      };
    }
  };

  return (
    <>
      <div className="space-y-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg sm:text-xl">
              <Webhook className="w-5 h-5 mr-2" />
              {t("settings.webhook_setting.globalTitle")}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {t("settings.webhook_setting.globalDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
              <div>
                <Label className="text-sm font-semibold">{t("settings.webhook_setting.yourWebhookUrl")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded border flex-1 break-all">
                    {webhookUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(webhookUrl)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">{t("settings.webhook_setting.yourVerifyToken")}</Label>
                <div className="flex items-center gap-2 mt-1">
                  {activeConfig ? (
                    <>
                      <code className="text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded border flex-1 break-all">
                        {activeConfig.verifyToken}
                      </code>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard(activeConfig.verifyToken)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">{t("settings.webhook_setting.noActiveConfig")}</span>
                  )}
                </div>
              </div>

              {activeConfig && (
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">{t("settings.webhook_setting.statusLabel")}</Label>
                  {(() => {
                    const status = getWebhookStatus(activeConfig);
                    return (
                      <Badge variant="secondary" className="text-xs flex items-center">
                        {status.icon}
                        <span className="ml-1">{status.text}</span>
                      </Badge>
                    );
                  })()}
                  {activeConfig.lastPingAt && (
                    <span className="text-xs text-gray-500">
                      {t("settings.webhook_setting.lastEventLabel")} {new Date(activeConfig.lastPingAt).toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 rounded p-3">
                <strong>{t("settings.webhook_setting.instructionsLabel", "Instructions:")}</strong>{" "}
                {t("settings.webhook_setting.instructionsText")}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center mb-2 sm:mb-0 text-lg sm:text-xl">
                {t("settings.webhook_setting.title")}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchWebhookConfigs()}
                  className="flex items-center text-xs h-7 rounded-sm px-2 sm:h-9 sm:rounded-md sm:px-3"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  {t("settings.webhook_setting.refresh")}
                </Button>
                <Button
                  onClick={() => {
                    setEditingWebhook(null);
                    setShowWebhookDialog(true);
                  }}
                  className="flex items-center text-xs h-7 rounded-sm px-2 sm:h-9 sm:rounded-md sm:px-3"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("settings.webhook_setting.configureWebhook")}
                </Button>
              </div>
            </div>
            <CardDescription className="text-sm sm:text-base">
              {t("settings.webhook_setting.description")}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {webhooksLoading ? (
              <Loading />
            ) : webhookConfigs.length === 0 ? (
              <div className="text-center py-12">
                <Webhook className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4 text-sm sm:text-base">
                  {t("settings.webhook_setting.noWebhooks")}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWebhookDialog(true)}
                  className="flex items-center mx-auto text-xs h-7 rounded-sm px-2 sm:h-9 sm:rounded-md sm:px-3"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t("settings.webhook_setting.configureFirst")}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {webhookConfigs.map((webhook: WebhookConfig) => {
                  const status = getWebhookStatus(webhook);
                  return (
                    <div
                      key={webhook.id}
                      className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mb-2">
                          <h3 className="font-semibold truncate">
                            {t("settings.webhook_setting.globalWebhook")}
                          </h3>
                          <Badge variant="secondary" className="text-xs flex items-center whitespace-nowrap">
                            {status.icon}
                            <span className="ml-1">{status.text}</span>
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                            <Label className="text-sm shrink-0">
                              {t("settings.webhook_setting.webhookUrl")}
                            </Label>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all flex-1">
                              {webhook.webhookUrl}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(webhook.webhookUrl)}
                              className="mt-1 sm:mt-0 flex items-center"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>

                          <div className="flex flex-wrap items-center space-x-2">
                            <Label className="text-sm shrink-0">
                              {t("settings.webhook_setting.events")}
                            </Label>
                            <div className="flex flex-wrap gap-1">
                              {webhook.events.map((event) => (
                                <Badge key={event} variant="outline" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {webhook.lastPingAt && (
                            <div className="text-sm text-gray-500 truncate">
                              {t("settings.webhook_setting.lastEvent")}{" "}
                              {new Date(webhook.lastPingAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 sm:mt-0 flex flex-wrap gap-2 sm:space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testWebhookMutation.mutate(webhook.id)}
                          disabled={testWebhookMutation.isPending}
                        >
                          {t("settings.webhook_setting.test")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditWebhook(webhook)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                          disabled={deleteWebhookMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg sm:text-xl">
              <HelpCircle className="w-5 h-5 mr-2" />
              {t("settings.webhook_setting.howItWorks.title")}
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              {t("settings.webhook_setting.howItWorks.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WebhookFlowDiagram />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">
              {t("settings.webhook_setting.setupInstructions.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm sm:text-base">
            <div>
              <h4 className="font-medium mb-2">
                {t("settings.webhook_setting.setupInstructions.step1.title")}
              </h4>
              <p>
                {t("settings.webhook_setting.setupInstructions.step1.description")}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">
                {t("settings.webhook_setting.setupInstructions.step2.title")}
              </h4>
              <p>
                {t("settings.webhook_setting.setupInstructions.step2.description")}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">
                {t("settings.webhook_setting.setupInstructions.step3.title")}
              </h4>
              <p>
                {t("settings.webhook_setting.setupInstructions.step3.description")}
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">
                {t("settings.webhook_setting.setupInstructions.step4.title")}
              </h4>
              <p>
                {t("settings.webhook_setting.setupInstructions.step4.description")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <WebhookDialog
        open={showWebhookDialog}
        onOpenChange={setShowWebhookDialog}
        editingWebhook={editingWebhook}
        onSuccess={() => {
          setShowWebhookDialog(false);
          setEditingWebhook(null);
        }}
      />
    </>
  );
}
