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
  Key,
  Globe,
  Cloud,
  Lock,
  MapPin,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import StorageSettingsModal from "../modals/StorageSettingsModal";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";

// Types
interface StorageConfig {
  id?: string;
  spaceName?: string;
  endpoint?: string;
  region?: string;
  accessKey?: string;
  secretKey?: string;
  isActive?: boolean;
  updatedAt?: string;
}

export default function StorageSettings(): JSX.Element {
  const { t } = useTranslation();
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "online" | "offline" | "testing">("unknown");
  const [connectionError, setConnectionError] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    data: storageConfig,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<StorageConfig>({
    queryKey: ["/api/storage-settings"],
    queryFn: () =>
      fetch("/api/storage-settings").then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      }),
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  const staticData: StorageConfig = {
    spaceName: "Default Space",
    endpoint: "https://example.endpoint.com",
    region: "us-east-1",
    accessKey: "",
    secretKey: "",
    isActive: false,
    updatedAt: new Date().toISOString(),
  };

  const displayData = error ? staticData : storageConfig || {};
  const isUsingStaticData = Boolean(error);
  const isOffline = isUsingStaticData || connectionStatus === "offline";
  const isOnline = !isUsingStaticData && connectionStatus === "online";

  const handleEditClick = (): void => {
    // if (isUsingStaticData) {
    //   toast({
    //     title: t("settings.storage_setting.connectionIssueTitle"),
    //     description: t("settings.storage_setting.connectionIssueDesc"),
    //     variant: "destructive",
    //   });
    //   return;
    // }
    setShowEditDialog(true);
  };

  const handleRefresh = async (): Promise<void> => {
    try {
      setConnectionStatus("testing");
      setConnectionError("");
      await refetch();

      const testRes = await apiRequest("POST", "/api/storage-settings/test");
      const testData = await testRes.json();

      if (testData.success) {
        setConnectionStatus("online");
        toast({
          title: t("settings.storage_setting.refreshedTitle"),
          description: t("settings.storage_setting.connectionOnline") || "Storage connection is online",
        });
      } else {
        setConnectionStatus("offline");
        setConnectionError(testData.error || "");
        toast({
          title: t("settings.storage_setting.refreshFailedTitle"),
          description: testData.error || t("settings.storage_setting.refreshFailedDesc"),
          variant: "destructive",
        });
      }
    } catch (error) {
      setConnectionStatus("offline");
      toast({
        title: t("settings.storage_setting.refreshFailedTitle"),
        description: t("settings.storage_setting.refreshFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const formatLastUpdated = (dateString?: string): string => {
    if (!dateString) return t("settings.storage_setting.unknownTime");
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) return t("settings.storage_setting.justNow");
      if (diffInMinutes < 60)
        return `${diffInMinutes} ${diffInMinutes !== 1
          ? t("settings.storage_setting.minutesAgo")
          : t("settings.storage_setting.minuteAgo")
          }`;
      if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} ${hours !== 1
          ? t("settings.storage_setting.hoursAgo")
          : t("settings.storage_setting.hourAgo")
          }`;
      }
      return date.toLocaleDateString();
    } catch {
      return t("settings.storage_setting.unknownTime");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center py-8">
            <Loading />
            <p className="text-sm text-gray-500 mt-2">
              {t("settings.storage_setting.loadingText")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Storage Configuration */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left: Title */}
            <CardTitle className="flex items-center min-w-0">
              <Server className="w-5 h-5 mr-2 flex-shrink-0" />
              <span className="text-xl sm:text-2xl">
                {t("settings.storage_setting.title")}
              </span>
            </CardTitle>

            {/* Right: Controls */}
            <div
              className="flex items-center flex-wrap gap-2 justify-start w-full sm:w-auto overflow-x-auto sm:overflow-visible"
              aria-label="Storage controls"
            >
              <Badge
                variant={isOffline ? "destructive" : isOnline ? "default" : "secondary"}
                className="text-xs inline-flex items-center"
              >
                {connectionStatus === "testing" ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-1 flex-shrink-0 animate-spin" />
                    {t("settings.storage_setting.testing") || "Testing..."}
                  </>
                ) : isOffline ? (
                  <>
                    <WifiOff className="w-3 h-3 mr-1 flex-shrink-0" />
                    {t("settings.storage_setting.offline")}
                  </>
                ) : isOnline ? (
                  <>
                    <Wifi className="w-3 h-3 mr-1 flex-shrink-0" />
                    {t("settings.storage_setting.online")}
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                    {t("settings.storage_setting.notTested") || "Not Tested"}
                  </>
                )}
              </Badge>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isFetching || connectionStatus === "testing"}
                className="flex items-center text-xs h-7 rounded-sm px-2 sm:h-9 sm:rounded-md sm:px-3"
                aria-live="polite"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-1 ${isFetching || connectionStatus === "testing" ? "animate-spin" : ""}`}
                />
                {isFetching || connectionStatus === "testing"
                  ? t("settings.storage_setting.refreshing")
                  : t("settings.storage_setting.refresh")}
              </Button>

              <Button
                onClick={handleEditClick}
                size="sm"
                className="flex items-center text-xs h-7 rounded-sm px-2 sm:h-9 sm:rounded-md sm:px-3"
              >
                <Edit className="w-4 h-4 mr-2" />
                {t("settings.storage_setting.editStorage")}
              </Button>

            </div>
          </div>

          <CardDescription className="mt-2 text-sm sm:text-base">
            {t("settings.storage_setting.description")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* {isUsingStaticData && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <h4 className="text-sm font-semibold text-red-800">
                    {t("settings.storage_setting.connectionErrorTitle")}
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    {t("settings.storage_setting.connectionErrorDesc")}
                  </p>
                </div>
              </div>
            </div>
          )} */}

          {/* Storage Info Section */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-2">
              {/* Left: title + badge */}
              <div className="flex items-center space-x-3 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg truncate">
                  {t("settings.storage_setting.storageDetails")}
                </h3>

                <Badge
                  variant={displayData.isActive ? "outline" : "secondary"}
                  className={`text-xs inline-flex items-center whitespace-nowrap ${displayData.isActive ? "text-green-600" : "text-gray-500"
                    }`}
                  aria-label={
                    displayData.isActive
                      ? t("settings.storage_setting.active")
                      : t("settings.storage_setting.inactive")
                  }
                >
                  {displayData.isActive && (
                    <CheckCircle className="w-3 h-3 mr-1 flex-shrink-0" />
                  )}
                  <span>
                    {displayData.isActive
                      ? t("settings.storage_setting.active")
                      : t("settings.storage_setting.inactive")}
                  </span>
                </Badge>
              </div>

              {/* Right: timestamp */}
              {displayData.updatedAt && (
                <div className="mt-1 sm:mt-0 flex items-center text-sm text-gray-500">
                  <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="whitespace-nowrap">
                    {formatLastUpdated(displayData.updatedAt)}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Space Name */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Cloud className="w-4 h-4 text-blue-500" />
                  <Label className="font-medium">
                    {t("settings.storage_setting.spaceName")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm font-medium text-gray-900">
                    {displayData.spaceName ||
                      t("settings.storage_setting.spaceNamePlaceholder")}
                  </p>
                </div>
              </div>

              {/* Endpoint */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-green-500" />
                  <Label className="font-medium">
                    {t("settings.storage_setting.endpoint")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-700 break-all">
                    {displayData.endpoint ||
                      t("settings.storage_setting.endpointPlaceholder")}
                  </p>
                </div>
              </div>

              {/* Region */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-purple-500" />
                  <Label className="font-medium">
                    {t("settings.storage_setting.region")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-700">
                    {displayData.region ||
                      t("settings.storage_setting.regionPlaceholder")}
                  </p>
                </div>
              </div>

              {/* Access Key */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-orange-500" />
                  <Label className="font-medium">
                    {t("settings.storage_setting.accessKey")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-700">
                    {displayData.accessKey
                      ? t("settings.storage_setting.accessKeyMasked")
                      : t("settings.storage_setting.accessKeyPlaceholder")}
                  </p>
                </div>
              </div>

              {/* Secret Key */}
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-red-500" />
                  <Label className="font-medium">
                    {t("settings.storage_setting.secretKey")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-700">
                    {displayData.secretKey
                      ? t("settings.storage_setting.secretKeyMasked")
                      : t("settings.storage_setting.secretKeyPlaceholder")}
                  </p>
                </div>
              </div>
            </div>

            {/* Configuration Status */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${displayData.spaceName &&
                      displayData.endpoint &&
                      displayData.region
                      ? "bg-green-500"
                      : displayData.spaceName
                        ? "bg-yellow-500"
                        : "bg-red-500"
                      }`}
                  />
                  <span className="text-gray-600">
                    {t("settings.storage_setting.configurationStatusLabel")}{" "}
                    {displayData.spaceName &&
                      displayData.endpoint &&
                      displayData.region
                      ? t(
                        "settings.storage_setting.configurationStatusComplete"
                      )
                      : displayData.spaceName
                        ? t("settings.storage_setting.configurationStatusPartial")
                        : t(
                          "settings.storage_setting.configurationStatusIncomplete"
                        )}
                  </span>
                </div>
                {displayData.updatedAt && !isUsingStaticData && (
                  <span className="text-gray-500">
                    {t("settings.storage_setting.lastUpdated")}:{" "}
                    {new Date(displayData.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <StorageSettingsModal
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
