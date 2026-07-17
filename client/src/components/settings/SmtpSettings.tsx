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
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Server,
  Edit,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Mail,
  Lock,
  Globe,
  Wifi,
  WifiOff,
  Clock,
  Image as ImageIcon,
  User,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import SMTPSettingsModal from "../modals/SMTPSettingsModal";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "@/lib/i18n";

interface SMTPConfig {
  id?: string;
  host?: string;
  port?: string;
  secure?: string;
  user?: string;
  password?: string;
  fromName?: string;
  fromEmail?: string;
  logo?: string;
  updatedAt?: string;
}

export default function SMTPSettings() {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  const {
    data: smtpConfig,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<SMTPConfig>({
    queryKey: ["smtp-config"],
    queryFn: async () => {
      const res = await fetch("/api/admin/getSmtpConfig");
      if (!res.ok) throw new Error("Failed to fetch SMTP config");
      return res.json().then((d) => d.data);
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const staticData: SMTPConfig = {
    host: "smtp.example.com",
    port: "587",
    secure: "false",
    user: "",
    password: "",
    fromName: "Default Sender",
    fromEmail: "noreply@example.com",
    logo: "",
    updatedAt: new Date().toISOString(),
  };

  const displayData = error ? staticData : smtpConfig || {};
  const isUsingStaticData = Boolean(error);


  const formatLastUpdated = (d?: string) => {
    if (!d) return t("settings.smtp.unknown");
    const date = new Date(d);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center justify-center py-10">
          <Loading />
          <p className="text-sm mt-3 text-gray-500">{t("settings.smtp.loading")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {t("settings.smtp.title")}
            </CardTitle>

            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={isUsingStaticData ? "destructive" : "default"}
                className="text-xs"
              >
                {isUsingStaticData ? (
                  <>
                    <WifiOff className="w-3 h-3 mr-1" /> {t("settings.smtp.offline")}
                  </>
                ) : (
                  <>
                    <Wifi className="w-3 h-3 mr-1" /> {t("settings.smtp.online")}
                  </>
                )}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="text-xs"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`}
                />
                {t("settings.smtp.refresh")}
              </Button>

              <Button
  size="sm"
  onClick={() => setShowEditDialog(true)}
  className="text-xs"
>
  <Edit className="w-4 h-4 mr-2" />
  {t("settings.smtp.edit")}
</Button>

            </div>
          </div>

          <CardDescription>{t("settings.smtp.manage")}</CardDescription>
        </CardHeader>

        <CardContent>
          {/* {isUsingStaticData && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-semibold text-red-800">Connection Error</p>
                  <p className="text-sm text-red-700">
                    Showing cached SMTP configuration.
                  </p>
                </div>
              </div>
            </div>
          )} */}

          <div className="border p-6 rounded-lg">
            <div className="flex justify-between mb-6">
              <h3 className="text-lg font-semibold">{t("settings.smtp.details")}</h3>

              {displayData.updatedAt && (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1" />
                  {formatLastUpdated(displayData.updatedAt)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* host */}
              <div>
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-500" /> {t("settings.smtp.host")}
                </Label>
                <p className="mt-2 p-3 bg-gray-100 rounded border">
                  {displayData.host || t("settings.smtp.notConfigured")}
                </p>
              </div>

              {/* port */}
              <div>
                <Label className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-purple-500" /> {t("settings.smtp.port")}
                </Label>
                <p className="mt-2 p-3 bg-gray-100 rounded border">
                  {displayData.port || t("settings.smtp.notProvided")}
                </p>
              </div>

              {/* secure */}
              <div>
                <Label className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-600" /> {t("settings.smtp.secure")}
                </Label>
                <p className="mt-2 p-3 bg-gray-100 rounded border">
                  {displayData.secure === true ? t("settings.smtp.enabled") : t("settings.smtp.disabled")}
                </p>
              </div>

              {/* user */}
              <div>
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4 text-orange-600" /> {t("settings.smtp.user")}
                </Label>
                <p className="mt-2 p-3 bg-gray-100 rounded border">
                  {displayData.user ? "********" : t("settings.smtp.notConfigured")}
                </p>
              </div>

              {/* from name */}
              <div>
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" /> {t("settings.smtp.fromName")}
                </Label>
                <p className="mt-2 p-3 bg-gray-100 rounded border">
                  {displayData.fromName || t("settings.smtp.notConfigured")}
                </p>
              </div>

              {/* from email */}
              <div>
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-red-600" /> {t("settings.smtp.fromEmail")}
                </Label>
                <p className="mt-2 p-3 bg-gray-100 rounded border">
                  {displayData.fromEmail || t("settings.smtp.notConfigured")}
                </p>
              </div>

              {/* logo */}
              <div className="md:col-span-2">
                <Label className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-yellow-600" /> {t("settings.smtp.logo")}
                </Label>
                <div className="mt-2 p-3 bg-gray-100 rounded border">
                  {displayData.logo ? (
                    <div className="space-y-2">
                      <img
                        src={displayData.logo}
                        alt="SMTP Logo"
                        className="h-16 max-w-[200px] object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <p className="text-xs text-gray-500 break-all">{displayData.logo}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500">{t("settings.smtp.noLogo")}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MODAL */}
      <SMTPSettingsModal
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        existingData={displayData}
        onSuccess={() => {
          setShowEditDialog(false);
          refetch();
        }}
      />
    </div>
  );
}
