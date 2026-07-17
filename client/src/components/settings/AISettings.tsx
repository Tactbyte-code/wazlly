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

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Brain } from "lucide-react";
import { Loading } from "@/components/ui/loading";
import { apiRequest } from "@/lib/queryClient";
import AITrainingPanel from "@/pages/widget-builder/AITrainingPanel";
import { useChannelContext } from "@/contexts/channel-context";

const defaultConfig = {
  aiTone: "professional",
  aiMaxResponseLength: 500,
  aiFallbackMessage: "I'm sorry, I couldn't find an answer to your question. Let me connect you with a team member who can help.",
  systemPrompt: "",
  trainFromKB: false,
  escalationRules: {
    enabled: false,
    maxAttempts: 3,
    triggerPhrases: [] as string[],
    escalationMessage: "Let me connect you with a human agent who can better assist you.",
  },
};

export default function AISettings(): JSX.Element {
  const { selectedChannel } = useChannelContext();
  const channelId = selectedChannel?.id;

  const { data: activeSite, isLoading: isLoadingSite } = useQuery({
    queryKey: ["/api/active-site", channelId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/active-site?channelId=${channelId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!channelId,
  });

  const [trainingConfig, setTrainingConfig] = useState(defaultConfig);

  useEffect(() => {
    if (activeSite) {
      const stored = activeSite.widgetConfig || activeSite.aiTrainingConfig || {};
      setTrainingConfig({
        aiTone: stored.aiTone || defaultConfig.aiTone,
        aiMaxResponseLength: stored.aiMaxResponseLength || defaultConfig.aiMaxResponseLength,
        aiFallbackMessage: stored.aiFallbackMessage || defaultConfig.aiFallbackMessage,
        systemPrompt: stored.systemPrompt || defaultConfig.systemPrompt,
        trainFromKB: stored.trainFromKB ?? defaultConfig.trainFromKB,
        escalationRules: {
          ...defaultConfig.escalationRules,
          ...(stored.escalationRules || {}),
        },
      });
    }
  }, [activeSite]);

  const handleTrainingConfigUpdate = (key: string, value: any) => {
    setTrainingConfig(prev => ({ ...prev, [key]: value }));
  };

  if (!channelId || isLoadingSite) {
    return (
      <Card>
        <CardContent className="p-6 flex flex-col items-center">
          <Loading />
          <p className="text-gray-500 text-sm mt-2">Loading AI settings...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base sm:text-lg">
            <Brain className="w-5 h-5 mr-2 text-indigo-600" />
            AI Training & Knowledge Base
          </CardTitle>
          <CardDescription>
            Train your AI assistant with custom data, Q&A pairs, and configure behavior. This training data is shared across the chat widget and team inbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AITrainingPanel
            config={trainingConfig as any}
            updateConfig={handleTrainingConfigUpdate}
            siteId={activeSite?.id}
            channelId={channelId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
