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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Key, Plus, Copy, Eye, EyeOff, Trash2, RefreshCw, Shield, Activity, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loading } from "@/components/ui/loading";
import { useTranslation } from "@/lib/i18n";
import { useChannelContext } from "@/contexts/channel-context";

interface ApiKeyItem {
  id: string;
  name: string;
  apiKey: string;
  channelId?: string | null;
  permissions?: string[];
  isActive: boolean;
  lastUsedAt?: string | null;
  requestCount: number;
  monthlyRequestCount: number;
  createdAt: string;
  revokedAt?: string | null;
}

interface UsageStats {
  totalRequests: number;
  monthlyRequests: number;
  activeKeys: number;
  revokedKeys: number;
}

interface CreatedKeyData {
  id: string;
  name: string;
  apiKey: string;
  secret: string;
  channelId?: string | null;
  permissions?: string[];
  createdAt: string;
}

const ALL_PERMISSIONS = [
  "messages.send",
  "messages.read",
  "contacts.read",
  "contacts.write",
  "templates.read",
  "campaigns.read",
  "account.read",
  "webhooks.manage",
];

export function ApiKeySettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { selectedChannel } = useChannelContext();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([...ALL_PERMISSIONS]);
  const [createdKey, setCreatedKey] = useState<CreatedKeyData | null>(null);
  const [showCreatedKeyDialog, setShowCreatedKeyDialog] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyItem | null>(null);

  const { data: keysResponse, isLoading: keysLoading } = useQuery<{ success: boolean; data: ApiKeyItem[] }>({
    queryKey: ["/api/api-keys"],
  });

  const { data: usageResponse } = useQuery<{ success: boolean; data: UsageStats }>({
    queryKey: ["/api/api-keys/usage"],
  });

  const { data: channelsResponse } = useQuery<{ success: boolean; data: any[] } | any[]>({
    queryKey: ["/api/channels"],
  });

  const apiKeys = keysResponse?.data ?? [];
  const usage: UsageStats = usageResponse?.data ? {
    totalRequests: usageResponse.data.totalRequests ?? 0,
    monthlyRequests: usageResponse.data.monthlyRequests ?? 0,
    activeKeys: usageResponse.data.activeKeys ?? 0,
    revokedKeys: usageResponse.data.revokedKeys ?? 0,
  } : { totalRequests: 0, monthlyRequests: 0, activeKeys: 0, revokedKeys: 0 };
  const channels = Array.isArray(channelsResponse) ? channelsResponse : (channelsResponse?.data ?? []);

  const createKeyMutation = useMutation({
    mutationFn: async (payload: { name: string; channelId?: string; permissions?: string[] }) => {
      const res = await apiRequest("POST", "/api/api-keys", payload);
      return await res.json();
    },
    onSuccess: (response: { success: boolean; data: CreatedKeyData }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys/usage"] });
      setCreatedKey(response.data);
      setShowCreateDialog(false);
      setShowCreatedKeyDialog(true);
      resetCreateForm();
    },
    onError: (error: Error) => {
      toast({
        title: t("settings.api_key_setting.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const revokeKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await apiRequest("POST", `/api/api-keys/${keyId}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys/usage"] });
      setRevokeTarget(null);
      toast({
        title: t("settings.api_key_setting.apiKeyRevoked"),
        description: t("settings.api_key_setting.apiKeyRevokedDesc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("settings.api_key_setting.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetCreateForm = () => {
    setNewKeyName("");
    setSelectedChannelId("");
    setSelectedPermissions([...ALL_PERMISSIONS]);
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: t("settings.api_key_setting.nameRequired"),
        description: t("settings.api_key_setting.nameRequiredDesc"),
        variant: "destructive",
      });
      return;
    }
    const payload: { name: string; channelId?: string; permissions?: string[] } = {
      name: newKeyName.trim(),
      permissions: selectedPermissions,
    };
    if (selectedChannelId) {
      payload.channelId = selectedChannelId;
    }
    createKeyMutation.mutate(payload);
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const copyToClipboard = (text: string, label?: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t("settings.api_key_setting.copied"),
      description: label || t("settings.api_key_setting.copiedDesc"),
    });
  };

  const maskApiKey = (key: string) => {
    if (!key || key.length <= 8) return key || "";
    return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="space-y-6">
      {usage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">{t("settings.api_key_setting.usage.totalRequests")}</p>
              </div>
              <p className="text-2xl font-bold mt-1">{usage.totalRequests.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-green-500" />
                <p className="text-sm text-muted-foreground">{t("settings.api_key_setting.usage.monthlyRequests")}</p>
              </div>
              <p className="text-2xl font-bold mt-1">{usage.monthlyRequests.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Key className="w-4 h-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">{t("settings.api_key_setting.usage.activeKeys")}</p>
              </div>
              <p className="text-2xl font-bold mt-1">{usage.activeKeys}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <p className="text-sm text-muted-foreground">{t("settings.api_key_setting.usage.revokedKeys")}</p>
              </div>
              <p className="text-2xl font-bold mt-1">{usage.revokedKeys}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Key className="w-5 h-5 mr-2" />
              {t("settings.api_key_setting.title")}
            </CardTitle>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t("settings.api_key_setting.createApiKey")}
            </Button>
          </div>
          <CardDescription>
            {t("settings.api_key_setting.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keysLoading ? (
            <Loading />
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">
                {t("settings.api_key_setting.noApiKeys")}
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t("settings.api_key_setting.createFirst")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{key.name}</h3>
                        <Badge variant={key.isActive ? "default" : "secondary"}>
                          {key.isActive
                            ? t("settings.api_key_setting.active")
                            : t("settings.api_key_setting.revoked")}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                            {maskApiKey(key.apiKey)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(key.apiKey)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>
                            {t("settings.api_key_setting.created")}{" "}
                            {new Date(key.createdAt).toLocaleDateString()}
                          </span>
                          {key.lastUsedAt && (
                            <span>
                              {t("settings.api_key_setting.lastUsed")}{" "}
                              {new Date(key.lastUsedAt).toLocaleDateString()}
                            </span>
                          )}
                          <span>
                            {t("settings.api_key_setting.requests")}: {key.requestCount.toLocaleString()}
                          </span>
                          <span>
                            {t("settings.api_key_setting.monthlyRequestsLabel")}: {key.monthlyRequestCount.toLocaleString()}
                          </span>
                        </div>
                        {key.permissions && key.permissions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {key.permissions.map((perm) => (
                              <Badge key={perm} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {key.isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 ml-2 shrink-0"
                        onClick={() => setRevokeTarget(key)}
                        disabled={revokeKeyMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t("settings.api_key_setting.revoke")}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            {t("settings.api_key_setting.documentation.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.api_key_setting.documentation.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">
              {t("settings.api_key_setting.documentation.baseUrl")}
            </h4>
            <div className="flex items-center space-x-2">
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {window.location.origin}/api/v1
              </code>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${window.location.origin}/api/v1`)}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2">
              {t("settings.api_key_setting.documentation.authentication")}
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              {t("settings.api_key_setting.documentation.authDesc")}
            </p>
            <code className="text-sm bg-muted px-2 py-1 rounded block">
              x-api-key: YOUR_API_KEY
            </code>
            <code className="text-sm bg-muted px-2 py-1 rounded block mt-1">
              x-api-secret: YOUR_API_SECRET
            </code>
          </div>
          <div>
            <h4 className="font-medium mb-2">
              {t("settings.api_key_setting.documentation.exampleRequest")}
            </h4>
            <pre className="text-sm bg-muted p-3 rounded overflow-x-auto">
              {`curl -X POST ${window.location.origin}/api/v1/messages \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "x-api-secret: YOUR_API_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "+1234567890",
    "message": "Hello from the API!"
  }'`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) { setShowCreateDialog(false); resetCreateForm(); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("settings.api_key_setting.createForm.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyName">{t("settings.api_key_setting.createForm.keyName")}</Label>
              <Input
                id="keyName"
                placeholder={t("settings.api_key_setting.createForm.keyNamePlaceholder")}
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                {t("settings.api_key_setting.createForm.keyNameHelper")}
              </p>
            </div>

            <div>
              <Label htmlFor="channelSelect">{t("settings.api_key_setting.createForm.channel")}</Label>
              <select
                id="channelSelect"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
              >
                <option value="">{t("settings.api_key_setting.createForm.allChannels")}</option>
                {channels.map((ch: any) => (
                  <option key={ch.id} value={ch.id}>
                    {ch.name || ch.channelName || `Channel ${ch.id}`}
                  </option>
                ))}
              </select>
              <p className="text-sm text-muted-foreground mt-1">
                {t("settings.api_key_setting.createForm.channelHelper")}
              </p>
            </div>

            <div>
              <Label>{t("settings.api_key_setting.createForm.permissions")}</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {ALL_PERMISSIONS.map((perm) => (
                  <div key={perm} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${perm}`}
                      checked={selectedPermissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                    />
                    <Label htmlFor={`perm-${perm}`} className="text-sm font-normal cursor-pointer">
                      {perm}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                variant="outline"
                onClick={() => { setShowCreateDialog(false); resetCreateForm(); }}
              >
                {t("settings.api_key_setting.createForm.cancel")}
              </Button>
              <Button
                onClick={handleCreateKey}
                disabled={createKeyMutation.isPending}
              >
                {createKeyMutation.isPending
                  ? t("settings.api_key_setting.createForm.creating")
                  : t("settings.api_key_setting.createForm.createKey")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreatedKeyDialog} onOpenChange={(open) => { if (!open) { setShowCreatedKeyDialog(false); setCreatedKey(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Key className="w-5 h-5 mr-2" />
              {t("settings.api_key_setting.keyCreatedDialog.title")}
            </DialogTitle>
          </DialogHeader>
          {createdKey && (
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                    {t("settings.api_key_setting.keyCreatedDialog.warning")}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">{t("settings.api_key_setting.keyCreatedDialog.apiKeyLabel")}</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono break-all">
                    {createdKey.apiKey}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(createdKey.apiKey, t("settings.api_key_setting.keyCreatedDialog.apiKeyCopied"))}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">{t("settings.api_key_setting.keyCreatedDialog.secretLabel")}</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded font-mono break-all">
                    {createdKey.secret}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(createdKey.secret, t("settings.api_key_setting.keyCreatedDialog.secretCopied"))}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={() => { setShowCreatedKeyDialog(false); setCreatedKey(null); }}>
                  {t("settings.api_key_setting.keyCreatedDialog.done")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
              {t("settings.api_key_setting.revokeDialog.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t("settings.api_key_setting.revokeDialog.description")}
            </p>
            {revokeTarget && (
              <div className="bg-muted rounded-lg p-3">
                <p className="font-medium">{revokeTarget.name}</p>
                <code className="text-xs text-muted-foreground">{maskApiKey(revokeTarget.apiKey)}</code>
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setRevokeTarget(null)}>
                {t("settings.api_key_setting.revokeDialog.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => revokeTarget && revokeKeyMutation.mutate(revokeTarget.id)}
                disabled={revokeKeyMutation.isPending}
              >
                {revokeKeyMutation.isPending
                  ? t("settings.api_key_setting.revokeDialog.revoking")
                  : t("settings.api_key_setting.revokeDialog.confirm")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
