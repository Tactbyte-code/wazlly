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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell,
  Mail,
  Volume2,
  MessageSquare,
  FileCheck,
  BarChart3,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface NotificationTemplate {
  eventType: string;
  label: string;
  description?: string;
  category?: string;
}

interface UserPreferences {
  [eventType: string]: {
    inAppEnabled: boolean;
    emailEnabled: boolean;
    soundEnabled: boolean;
  };
}

interface UpdatePayload {
  eventType: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
}

const getCategoryIcon = (category?: string) => {
  switch (category?.toLowerCase()) {
    case "messages":
      return <MessageSquare className="w-4 h-4" />;
    case "templates":
      return <FileCheck className="w-4 h-4" />;
    case "campaigns":
      return <BarChart3 className="w-4 h-4" />;
    case "system":
      return <AlertTriangle className="w-4 h-4" />;
    default:
      return <Bell className="w-4 h-4" />;
  }
};

export default function NotificationPreferences() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Record<string, UpdatePayload>
  >({});

  // Fetch user preferences
  const {
    data: userPreferences,
    isLoading: preferencesLoading,
    error: preferencesError,
  } = useQuery<UserPreferences>({
    queryKey: ["/api/notification-preferences"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notification-preferences");
      console.log("CHECK RESPONSE", res)
      return res.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch notification templates
  const {
    data: templates,
    isLoading: templatesLoading,
    error: templatesError,
  } = useQuery<NotificationTemplate[]>({
    queryKey: ["/api/notification-templates"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/notification-templates");
      return res.json();
    },
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Mutation for updating preferences
  const updateMutation = useMutation({
    mutationFn: async (payload: UpdatePayload) => {
      const res = await apiRequest(
        "PUT",
        "/api/notification-preferences",
        payload
      );
      return res.json();
    },
    onSuccess: (_data, variables) => {
      setOptimisticUpdates((prev) => {
        const next = { ...prev };
        delete next[variables.eventType];
        return next;
      });
      toast({
        title: "Settings saved",
        description: "Your notification preferences have been updated.",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/notification-preferences"],
      });
    },
    onError: (error: any, variables) => {
      setOptimisticUpdates((prev) => {
        const next = { ...prev };
        delete next[variables.eventType];
        return next;
      });
      toast({
        title: "Error saving settings",
        description:
          error?.message || "Failed to update notification preferences.",
        variant: "destructive",
      });
    },
  });

  // Group templates by category
  const groupedTemplates = useMemo(() => {
    if (!templates) return {};

    const grouped: Record<string, NotificationTemplate[]> = {};
    templates.forEach((template) => {
      const category = template.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(template);
    });

    return grouped;
  }, [templates]);

  const handleToggle = (
    eventType: string,
    key: "inAppEnabled" | "emailEnabled" | "soundEnabled"
  ) => {
    const current = optimisticUpdates[eventType] || userPreferences?.[eventType];
    if (!current) return;

    const updated = {
      eventType,
      inAppEnabled: current.inAppEnabled,
      emailEnabled: current.emailEnabled,
      soundEnabled: current.soundEnabled,
      [key]: !current[key],
    };

    setOptimisticUpdates((prev) => ({
      ...prev,
      [eventType]: updated,
    }));

    updateMutation.mutate(updated);
  };

  const isLoading = preferencesLoading || templatesLoading;
  const hasError = preferencesError || templatesError;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-gray-500 mt-4">
              Loading your notification preferences...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasError || !templates || !userPreferences) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center text-red-900">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Error loading preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-800">
            We couldn't load your notification preferences. Please try refreshing
            the page.
          </p>
        </CardContent>
      </Card>
    );
  }

  const templatesByCategory = Object.entries(groupedTemplates).sort(
    ([catA], [catB]) => catA.localeCompare(catB)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage how you receive notifications for different events
          </CardDescription>
        </CardHeader>
      </Card>

      {templatesByCategory.map(([category, categoryTemplates]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {getCategoryIcon(category)}
              {category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {categoryTemplates.map((template) => {
              const prefs =
                optimisticUpdates[template.eventType] ||
                userPreferences[template.eventType];

              return (
                <div
                  key={template.eventType}
                  className="border-b last:border-b-0 pb-6 last:pb-0"
                >
                  <div className="flex flex-col gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {template.label}
                      </h4>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {template.description}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* In-App Toggle */}
                      <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5">
                        <Switch
                          checked={prefs?.inAppEnabled ?? false}
                          onCheckedChange={() =>
                            handleToggle(template.eventType, "inAppEnabled")
                          }
                          disabled={updateMutation.isPending}
                        />
                        <div className="flex items-start gap-2 min-w-0">
                          <Bell className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <Label className="text-sm font-medium leading-none">In-App</Label>
                            <p className="text-[11px] text-gray-500 mt-0.5">Shows in bell icon</p>
                          </div>
                        </div>
                      </div>

                      {/* Email Toggle */}
                      <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5">
                        <Switch
                          checked={prefs?.emailEnabled ?? false}
                          onCheckedChange={() =>
                            handleToggle(template.eventType, "emailEnabled")
                          }
                          disabled={updateMutation.isPending}
                        />
                        <div className="flex items-start gap-2 min-w-0">
                          <Mail className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <Label className="text-sm font-medium leading-none">Email</Label>
                            <p className="text-[11px] text-gray-500 mt-0.5">Sends to your email</p>
                          </div>
                        </div>
                      </div>

                      {/* Sound Toggle */}
                      <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2.5">
                        <Switch
                          checked={prefs?.soundEnabled ?? false}
                          onCheckedChange={() =>
                            handleToggle(template.eventType, "soundEnabled")
                          }
                          disabled={updateMutation.isPending}
                        />
                        <div className="flex items-start gap-2 min-w-0">
                          <Volume2 className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <Label className="text-sm font-medium leading-none">Sound</Label>
                            <p className="text-[11px] text-gray-500 mt-0.5">Plays alert sound</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
