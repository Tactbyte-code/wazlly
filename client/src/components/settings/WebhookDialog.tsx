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

import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { WebhookConfig } from "@shared/schema";
import { Info } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from "@/lib/i18n";

const webhookFormSchema = z.object({
  verifyToken: z.string().min(10, "Verify token must be at least 10 characters"),
  events: z.array(z.string()).min(1, "Select at least one event"),
});

interface WebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingWebhook: WebhookConfig | null;
  onSuccess: () => void;
  channelId?: string;
}

export function WebhookDialog({ open, onOpenChange, editingWebhook, onSuccess , channelId }: WebhookDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const webhookForm = useForm<z.infer<typeof webhookFormSchema>>({
    resolver: zodResolver(webhookFormSchema),
    defaultValues: {
      verifyToken: "",
      events: ["messages", "message_status"],
    },
  });

  useEffect(() => {
    if (editingWebhook) {
      webhookForm.reset({
        verifyToken: editingWebhook.verifyToken,
        events: editingWebhook.events as string[],
      });
    } else {
      webhookForm.reset({
        verifyToken: "",
        events: ["messages", "message_status"],
      });
    }
  }, [editingWebhook, webhookForm]);

  // Create/Update webhook mutation
  const createWebhookMutation = useMutation({
    mutationFn: async (data: z.infer<typeof webhookFormSchema>) => {
      // Use a simple webhook ID for the global webhook
      const webhookId = 'd420e261-9c12-4cee-9d65-253cda8ab4bc'; // Fixed webhook ID for global webhook
      const webhookUrl = `${window.location.origin}/webhook/${webhookId}`;
      
      if (editingWebhook) {
        return await apiRequest("PATCH", `/api/webhook-configs/${editingWebhook.id}`, {
          ...data,
          webhookUrl,
          channelId, // Global webhook - not tied to a specific channel
        });
      } else {
        return await apiRequest("POST", "/api/webhook-configs", { 
          ...data, 
          webhookUrl,
          channelId, // Global webhook - not tied to a specific channel
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhook-configs"] });
      toast({
        title: editingWebhook 
          ? t("settings.webhook_setting.dialog.toast.updated") 
          : t("settings.webhook_setting.dialog.toast.configured"),
        description: editingWebhook 
          ? t("settings.webhook_setting.dialog.toast.updatedDesc") 
          : t("settings.webhook_setting.dialog.toast.configuredDesc"),
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: t("settings.webhook_setting.dialog.toast.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWebhookSubmit = (data: z.infer<typeof webhookFormSchema>) => {
    createWebhookMutation.mutate(data);
  };

  const eventOptions = [
    { value: "messages", label: t("settings.webhook_setting.dialog.eventLabels.messages") },
    { value: "message_status", label: t("settings.webhook_setting.dialog.eventLabels.message_status") },
    { value: "message_template_status_update", label: t("settings.webhook_setting.dialog.eventLabels.message_template_status_update") },
    { value: "phone_number_name_update", label: t("settings.webhook_setting.dialog.eventLabels.phone_number_name_update") },
    { value: "account_update", label: t("settings.webhook_setting.dialog.eventLabels.account_update") },
    { value: "security", label: t("settings.webhook_setting.dialog.eventLabels.security") },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editingWebhook 
              ? t("settings.webhook_setting.dialog.editTitle") 
              : t("settings.webhook_setting.dialog.createTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.webhook_setting.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">{t("settings.webhook_setting.dialog.globalConfigTitle")}</p>
              <p className="text-blue-700 mt-1">
                {t("settings.webhook_setting.dialog.globalConfigDesc")}
              </p>
            </div>
          </div>
        </div>

        <Form {...webhookForm}>
          <form onSubmit={webhookForm.handleSubmit(handleWebhookSubmit)} className="space-y-6">
            <FormField
              control={webhookForm.control}
              name="verifyToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.webhook_setting.dialog.verifyTokenLabel")}</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input placeholder="my-secure-verify-token" {...field} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const token = Math.random().toString(36).substring(2, 15) + 
                                      Math.random().toString(36).substring(2, 15);
                        field.onChange(token);
                      }}
                    >
                      {t("settings.webhook_setting.dialog.generateButton")}
                    </Button>
                  </div>
                  <FormDescription>
                    {t("settings.webhook_setting.dialog.verifyTokenDesc")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={webhookForm.control}
              name="events"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("settings.webhook_setting.dialog.eventsLabel")}</FormLabel>
                  <FormDescription>
                    {t("settings.webhook_setting.dialog.eventsDesc")}
                  </FormDescription>
                  <div className="space-y-3 mt-3">
                    {eventOptions.map((event) => (
                      <div key={event.value} className="flex items-center space-x-3">
                        <Checkbox
                          checked={field.value?.includes(event.value)}
                          onCheckedChange={(checked: any) => {
                            const currentValues = field.value || [];
                            if (checked) {
                              field.onChange([...currentValues, event.value]);
                            } else {
                              field.onChange(currentValues.filter((v) => v !== event.value));
                            }
                          }}
                        />
                        <Label className="text-sm font-normal cursor-pointer">
                          {event.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("settings.webhook_setting.dialog.cancel")}
              </Button>
              <Button type="submit" disabled={user?.username === 'demouser'? true :createWebhookMutation.isPending}>
                {createWebhookMutation.isPending 
                  ? t("settings.webhook_setting.dialog.saving") 
                  : editingWebhook 
                    ? t("settings.webhook_setting.dialog.update") 
                    : t("settings.webhook_setting.dialog.configure")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}