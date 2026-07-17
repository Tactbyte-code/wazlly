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

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { WidgetConfig, ChatMessage, PreviewScreen } from "./types";
import { createDefaultConfig } from "./utils";
import WidgetConfigPanel from "./WidgetConfigPanel";
import WidgetCodeSnippet from "./WidgetCodeSnippet";
import WidgetPreview from "./WidgetPreview";

export default function WidgetBuilder() {
  // const { selectedSiteId, sites } = useSite();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();

  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const { data: brandSettings } = useQuery({
    queryKey: ["/api/brand-settings"],
    queryFn: () =>
      fetch("/api/brand-settings").then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      }),
  });

  const {
    data: site,
    isLoading,
    isSuccess,
    error,
  } = useQuery({
    queryKey: ["/api/active-site", activeChannel?.id],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        `/api/active-site?channelId=${activeChannel?.id}`
      );
      if (!res.ok) throw new Error("Failed to fetch site");
      return res.json();
    },
    enabled: !!activeChannel?.id, // <-- IMPORTANT
  });

  const selectedSiteId = site?.id;

  const [config, setConfig] = useState<WidgetConfig>(
    createDefaultConfig(brandSettings?.title)
  );

  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "bot", text: config.greeting, time: "Just now" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const LIMIT = 5000
  const {
    data: usersResponse,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ["/api/team/members", LIMIT],
    queryFn: async () => {
      const response = await fetch(`/api/team/members?limit=${LIMIT}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // normalize users list
  const userList: Array<any> = useMemo(() => {
    if (!usersResponse) return [];
    // possible shapes: [] or { data: [] } or { users: [] }
    return usersResponse.data ?? usersResponse.users ?? usersResponse ?? [];
  }, [usersResponse]);

  // Fetch real KB articles for the site
  const { data: kbData } = useQuery({
    queryKey: ["/api/widget/kb", selectedSiteId],
    enabled: !!selectedSiteId,
  });

  const { data: qaPairsData } = useQuery({
    queryKey: ["/api/training", selectedSiteId, "qa"],
    queryFn: async () => {
      if (!selectedSiteId) return [];
      const res = await apiRequest("GET", `/api/training/${selectedSiteId}/qa`);
      return res.json();
    },
    enabled: !!selectedSiteId,
  });

  // Get articles from KB data
  const sampleArticles =
    (kbData as any)?.categories?.flatMap((cat: any) =>
      cat.articles.map((article: any) => ({
        ...article,
        category: cat.name,
      }))
    ) || [];

  // Load widget config from current site
  // useEffect(() => {
  //   const currentSite = sites.find((s) => s.id === selectedSiteId);
  //   if (currentSite && currentSite.widgetConfig) {
  //     const savedConfig = currentSite.widgetConfig as any;
  //     if (Object.keys(savedConfig).length > 0) {
  //       setConfig((prevConfig) => ({ ...prevConfig, ...savedConfig }));
  //     }
  //   }
  // }, [selectedSiteId, sites]);

  // Save config mutation
  // const { data, isSuccess, isError } = useQuery({
  //   queryKey: ["siteConfig"],
  //   queryFn: async () => {
  //     const res = await apiRequest(
  //       "GET",
  //       `/api/active-site?channelId=${activeChannel?.id}`
  //     );
  //     return res.json();
  //   },
  // });
  // console.log("site", site);

  useEffect(() => {
    if (isSuccess && site?.widgetConfig) {
      setConfig((prev) => ({
        ...prev,
        ...site.widgetConfig, // merge everything from backend
        appName: brandSettings?.title || site.widgetConfig.appName,
        tenantId: site.id,
        name: site.name,
        domain: site.domain,
      }));
    }
  }, [isSuccess, site]);

  useEffect(() => {
    if (brandSettings?.title) {
      updateConfig("appName", brandSettings.title);
    }
  }, [brandSettings]);

  // console.log("setConfig" , config)

  const saveConfigMutation = useMutation({
    mutationFn: async (widgetConfig: typeof config) => {
      const res = await apiRequest("POST", `/api/sites/create_or_update`, {
        widgetConfig,
        channelId: activeChannel?.id,
        name: config.name,
        domain: config.domain || '',
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/active-site", activeChannel?.id],
      });
      toast({
        title: "Configuration saved",
        description: "Your widget design has been saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save widget configuration",
        variant: "destructive",
      });
    },
  });

  const updateConfig = (key: string, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const sendChatMessage = () => {
    if (!chatInput.trim()) return;
    setChatMessages([
      ...chatMessages,
      { role: "user", text: chatInput, time: "Just now" },
      {
        role: "bot",
        text: "Thanks for your message! A team member will respond shortly.",
        time: "Just now",
      },
    ]);
    setChatInput("");
  };

  const domain = site?.domain || window.location.origin;
  const widgetDomain = domain.startsWith("http") ? domain : `https://${domain}`;

  const widgetCode = `<!-- AI Chat Widget -->
    <script>
      window.aiChatConfig = {
       siteId: "${site?.id || "your-site-id"}",
        channelId:"${site?.channelId || "your-channel-id"}",
        url: "${widgetDomain}",
      };
    </script>
<script src="${widgetDomain}/widget/widget.js" async></script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(widgetCode);
    toast({
      title: "Code copied",
      description: "Widget code copied to clipboard",
    });
  };

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header title={t("widget.title")} subtitle={t("widget.subtitle")} />

      <main className="p-6 space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Customization Panel */}
          <div className="space-y-6">
            <WidgetConfigPanel
              config={config}
              updateConfig={updateConfig}
              userList={userList}
              usersLoading={usersLoading}
              siteId={selectedSiteId}
              channelId={activeChannel?.id}
            />

            <WidgetCodeSnippet
              config={config}
              site={site}
              widgetCode={widgetCode}
              copyCode={copyCode}
              onSave={() => saveConfigMutation.mutate(config)}
              isSaving={saveConfigMutation.isPending}
              isDemoUser={user?.username === "demouser"}
            />
          </div>

          {/* Live Preview Panel */}
          <div className="space-y-6">
            <Card className="sticky top-2">
              <CardHeader>
                <CardTitle> {t("widget.Content.Live_Preview.title")}</CardTitle>
                <CardDescription>
                  {" "}
                  {t("widget.Content.Live_Preview.subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WidgetPreview
                  config={config}
                  isPreviewOpen={isPreviewOpen}
                  setIsPreviewOpen={setIsPreviewOpen}
                  previewScreen={previewScreen}
                  setPreviewScreen={setPreviewScreen}
                  chatMessages={chatMessages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  sendChatMessage={sendChatMessage}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  sampleArticles={sampleArticles}
                  qaPairs={qaPairsData || []}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
