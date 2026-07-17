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
  Settings,
  Edit,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Image,
  Type,
  Tag,
  Globe,
  Clock,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import GeneralSettingsModal from "../modals/GeneralSettingsModal";
import { setMeta } from "@/hooks/setMeta";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "@/lib/i18n";


// Types
interface BrandSettings {
  title?: string;
  tagline?: string;
  logo?: string;
  logo2?: string; 
  favicon?: string;
  updatedAt?: string;
  country?: string;
  currency?: string;
  supportEmail?: string;

}

export function GeneralSettings(): JSX.Element {
  const { t } = useTranslation();
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch brand settings
  const {
    data: brandSettings,
    isLoading: settingsLoading,
    error,
    refetch: refetchSettings,
    isFetching,
  } = useQuery<BrandSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () =>
      fetch("/api/brand-settings").then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      }),
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Static fallback data when API fails
  const staticData: BrandSettings = {
    title: "Your App Name",
    tagline: "Building amazing experiences",
    logo: "",
    favicon: "",
    country: "IN",
    currency: "INR",
    supportEmail: "",
    updatedAt: new Date().toISOString(),
  };

  const displayData = error ? staticData : brandSettings || {};

  useEffect(() => {
    if (displayData) {
      setMeta({
        title: displayData.title,
        favicon: displayData.favicon,
        currency: displayData.currency,
        country: displayData.country,
        supportEmail: displayData.supportEmail,
        description: displayData.tagline,
        keywords: `${displayData.title} ${displayData?.tagline}`,
      });
    }
  }, [brandSettings]);

  const isUsingStaticData = Boolean(error);

  const handleEditClick = (): void => {
    // if (isUsingStaticData) {
    //   toast({
    //     title: t("settings.general_setting.connectionIssueTitle"),
    //     description: t("settings.general_setting.connectionIssueDesc"),
    //     variant: "destructive",
    //   });
    //   return;
    // }
    setShowEditDialog(true);
  };

  const handleRefresh = async (): Promise<void> => {
    try {
      await refetchSettings();
      toast({
        title: t("settings.general_setting.refreshedTitle"),
        description: t("settings.general_setting.refreshedDesc"),
      });
    } catch (error) {
      toast({
        title: t("settings.general_setting.refreshFailedTitle"),
        description: t("settings.general_setting.refreshFailedDesc"),
        variant: "destructive",
      });
    }
  };

  // Show loading state
  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Loading />
              <p className="text-sm text-gray-500 mt-2">
                {t("settings.general_setting.loadingText")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatLastUpdated = (dateString?: string): string => {
    if (!dateString) return t("settings.general_setting.unknownTime");

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) {
        return t("settings.general_setting.justNow");
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} ${
          diffInMinutes !== 1
            ? t("settings.general_setting.minutesAgo")
            : t("settings.general_setting.minuteAgo")
        }`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} ${
          hours !== 1
            ? t("settings.general_setting.hoursAgo")
            : t("settings.general_setting.hourAgo")
        }`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return t("settings.general_setting.unknownTime");
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Configuration Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <CardTitle className="flex items-center mb-2 sm:mb-0">
              <Settings className="w-5 h-5 mr-2" />
              <span className="text-base sm:text-lg">
                {t("settings.general_setting.title")}
              </span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={isUsingStaticData ? "destructive" : "default"}
                className="text-xs flex items-center"
              >
                {isUsingStaticData ? (
                  <>
                    <WifiOff className="w-3 h-3 mr-1" />
                    {t("settings.general_setting.offline")}
                  </>
                ) : (
                  <>
                    <Wifi className="w-3 h-3 mr-1" />
                    {t("settings.general_setting.online")}
                  </>
                )}
              </Badge>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isFetching}
                className="flex items-center text-xs h-7 rounded-sm px-2 sm:h-9 sm:rounded-md sm:px-3"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-1 ${isFetching ? "animate-spin" : ""}`}
                />
                {isFetching
                  ? t("settings.general_setting.refreshing")
                  : t("settings.general_setting.refresh")}
              </Button>
              <Button
                onClick={handleEditClick}
                // disabled={user?.username === "demoadmin"}
                className="flex items-center text-xs h-7 rounded-sm px-2 sm:h-9 sm:rounded-md sm:px-3"
              >
                <Edit className="w-4 h-4 mr-2" />
                {t("settings.general_setting.editSettings")}
              </Button>
            </div>
          </div>
          <CardDescription className="mt-2 sm:mt-0 text-xs sm:text-sm">
            {t("settings.general_setting.description")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Show error message if API failed */}
          {/* {isUsingStaticData && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <h4 className="text-sm font-semibold text-red-800">
                    {t("settings.general_setting.connectionErrorTitle")}
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    {t("settings.general_setting.connectionErrorDesc")}
                  </p>
                </div>
              </div>
            </div>
          )} */}

          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
              {/* Left block: title + badge */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-base md:text-lg">
                    {t("settings.general_setting.brandIdentity")}
                  </h3>

                  <Badge
                    variant={isUsingStaticData ? "secondary" : "default"}
                    className="text-xs px-2 py-0.5 inline-flex items-center"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" aria-hidden="true" />
                    <span className="sr-only">
                      {t("settings.general_setting.dataTypeLabel")}
                    </span>
                    {isUsingStaticData
                      ? t("settings.general_setting.dataTypeSample")
                      : t("settings.general_setting.dataTypeLive")}
                  </Badge>
                </div>
              </div>

              {/* Timestamp: below on small screens, right-aligned on sm+ */}
              {displayData.updatedAt && (
                <div
                  className="mt-2 sm:mt-0 flex items-center text-sm text-gray-500"
                  aria-label={`${t(
                    "settings.general_setting.lastUpdated"
                  )} ${formatLastUpdated(displayData.updatedAt)}`}
                >
                  <Clock className="w-4 h-4 mr-1" aria-hidden="true" />
                  <span>{formatLastUpdated(displayData.updatedAt)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Title */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Type className="w-4 h-4 text-blue-500" />
                  <Label className="font-medium">
                    {t("settings.general_setting.applicationTitle")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm font-medium text-gray-900">
                    {displayData.title ||
                      t("settings.general_setting.notConfigured")}
                  </p>
                  {!displayData.title && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t("settings.general_setting.applicationTitleHelper")}
                    </p>
                  )}
                </div>
              </div>

              {/* Tagline */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-green-500" />
                  <Label className="font-medium">
                    {t("settings.general_setting.tagline")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-700">
                    {displayData.tagline ||
                      t("settings.general_setting.notConfigured")}
                  </p>
                  {!displayData.tagline && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t("settings.general_setting.taglineHelper")}
                    </p>
                  )}
                </div>
              </div>

              {/* Logo */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Image className="w-4 h-4 text-purple-500" />
                  <Label className="font-medium">
                    {t("settings.general_setting.logo")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  {displayData.logo ? (
                    <div className="flex items-center space-x-3">
                      <img
                        src={displayData.logo}
                        alt={t("settings.general_setting.logoAlt")}
                        className="w-12 h-12 object-contain rounded border bg-white"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          {t("settings.general_setting.logoUploaded")}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("settings.general_setting.logoHelper")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Image className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">
                        {t("settings.general_setting.logoMissing")}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t("settings.general_setting.logoMissingHelper")}
                      </p>
                    </div>
                  )}
                </div>
              </div>


              {/* Logo 2 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Image className="w-4 h-4 text-purple-500" />
                  <Label className="font-medium">{t("settings.general_setting.logo2")}</Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  {displayData.logo2 ? (
                    <div className="flex items-center space-x-3">
                      <img
                        src={displayData.logo2}
                        alt={t("settings.general_setting.logo2Alt")}
                        className="w-12 h-12 object-contain rounded border bg-white"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          {t("settings.general_setting.logo2Uploaded")}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("settings.general_setting.logo2Helper")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Image className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">{t("settings.general_setting.logo2Missing")}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t("settings.general_setting.logo2MissingHelper")}
                      </p>
                    </div>
                  )}
                </div>
              </div>


              {/* Favicon */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-orange-500" />
                  <Label className="font-medium">
                    {t("settings.general_setting.favicon")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  {displayData.favicon ? (
                    <div className="flex items-center space-x-3">
                      <img
                        src={displayData.favicon}
                        alt={t("settings.general_setting.faviconAlt")}
                        className="w-8 h-8 object-contain rounded border bg-white"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">
                          {t("settings.general_setting.faviconUploaded")}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("settings.general_setting.faviconHelper")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Globe className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">
                        {t("settings.general_setting.faviconMissing")}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {t("settings.general_setting.faviconMissingHelper")}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Country */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-green-500" />
                  <Label className="font-medium">
                    {t("settings.general_setting.country")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-700">
                    {displayData.country ||
                      t("settings.general_setting.notConfigured")}
                  </p>
                  {!displayData.country && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t("settings.general_setting.countryHelper")}
                    </p>
                  )}
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-green-500" />
                  <Label className="font-medium">
                    {t("settings.general_setting.currency")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-700">
                    {displayData.currency ||
                      t("settings.general_setting.notConfigured")}
                  </p>
                  {!displayData.currency && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t("settings.general_setting.currencyHelper")}
                    </p>
                  )}
                </div>
              </div>

              {/* supportEmail */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Tag className="w-4 h-4 text-green-500" />
                  <Label className="font-medium">
                    {t("settings.general_setting.supportEmail")}
                  </Label>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm text-gray-700">
                    {displayData.supportEmail ||
                      t("settings.general_setting.notConfigured")}
                  </p>
                  {!displayData.supportEmail && (
                    <p className="text-xs text-gray-500 mt-1">
                      {t("settings.general_setting.supportEmailHelper")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Configuration Status */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      displayData.title && displayData.logo
                        ? "bg-green-500"
                        : displayData.title
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-gray-600">
                    {t("settings.general_setting.configurationStatusLabel")}{" "}
                    {displayData.title && displayData.logo
                      ? t(
                          "settings.general_setting.configurationStatusComplete"
                        )
                      : displayData.title
                      ? t("settings.general_setting.configurationStatusPartial")
                      : t(
                          "settings.general_setting.configurationStatusIncomplete"
                        )}
                  </span>
                </div>
                {displayData.updatedAt && !isUsingStaticData && (
                  <span className="text-gray-500">
                    {t("settings.general_setting.lastUpdated")}:{" "}
                    {new Date(displayData.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Preview */}
      {displayData.title && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Image className="w-5 h-5 mr-2" />
              {t("settings.general_setting.brandPreviewTitle")}
            </CardTitle>
            <CardDescription>
              {t("settings.general_setting.brandPreviewDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 p-6 border border-gray-200 rounded-lg bg-white shadow-sm">
              {displayData.logo && (
                <img
                  src={displayData.logo}
                  alt={t("settings.general_setting.brandLogoAlt")}
                  className="w-16 h-16 object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}

              {displayData.logo2 && (
  <img
    src={displayData.logo2}
    alt={t("settings.general_setting.logo2Alt")}
    className="w-16 h-16 object-contain"
    onError={(e) => {
      e.currentTarget.style.display = "none";
    }}
  />
)}

              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {displayData.title}
                </h3>
                {displayData.tagline && (
                  <p className="text-gray-600 text-base mt-1">
                    {displayData.tagline}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Settings Modal */}
      <GeneralSettingsModal
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        brandSettings={displayData}
        onSuccess={() => {
          setShowEditDialog(false);
          refetchSettings();
        }}
      />
    </div>
  );
}
