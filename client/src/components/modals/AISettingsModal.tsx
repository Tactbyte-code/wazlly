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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const aiSettingsSchema = z.object({
  provider: z.string().min(1, "Provider is required"),
  apiKey: z.string().min(1, "API Key is required"),
  model: z.string().min(1, "Model is required"),
  endpoint: z.string().url("Invalid endpoint URL"),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().min(1).default(2048),
  words: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(",")
            .map((w) => w.trim())
            .filter((w) => w.length > 0)
        : []
    ),
  isActive: z.boolean().default(false),
});

export type AISettingsFormValues = z.infer<typeof aiSettingsSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingData?: Partial<AISettingsFormValues> & { id?: string };
  onSuccess?: () => void;
}

export default function AISettingsModal({
  open,
  onOpenChange,
  existingData,
  onSuccess,
  activeChannel
}: Readonly<Props>) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AISettingsFormValues>({
    resolver: zodResolver(aiSettingsSchema),
    defaultValues: existingData || {
      provider: "openai",
      apiKey: "",
      model: "",
      endpoint: "https://api.openai.com/v1",
      temperature: 0.7,
      maxTokens: 2048,
      isActive: false,
    },
  });


  const onSubmit = async (values: AISettingsFormValues) => {
    try {
      setIsSubmitting(true);
      const method = existingData?.id ? "PUT" : "POST";
      const url = existingData?.id
        ? `/api/ai-settings/${existingData.id}`
        : "/api/ai-settings";

      const res = await apiRequest(method as "POST" | "PUT", url, {
        ...values,
        channelId: activeChannel?.id || null,
      });

      if (!res.ok) throw new Error();
      toast({
        title: "Saved",
        description: "AI settings updated successfully.",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast({
        title: "Error",
        description: "Unable to save AI settings. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const form = watch();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {existingData?.id ? "Edit AI Settings" : "Create AI Settings"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-4">
          {/* 2-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Provider */}
            <div className="space-y-2">
              <Label>Provider</Label>
              <Select
                onValueChange={(v) => setValue("provider", v)}
                defaultValue={watch("provider")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  {/* <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                  <SelectItem value="azure">Azure OpenAI</SelectItem> */}
                </SelectContent>
              </Select>
              {errors.provider && (
                <p className="text-red-500 text-sm">
                  {errors.provider.message}
                </p>
              )}
            </div>

            <Field
              label="API Key"
              type="password"
              register={register("apiKey")}
              error={errors.apiKey?.message}
            />

            <div className="space-y-2">
              <Label>Model</Label>
              <Select
                onValueChange={(v) => setValue("model", v)}
                defaultValue={watch("model")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {form.provider === "openai" && (
                    <>
                      <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                      <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">
                        GPT-3.5 Turbo
                      </SelectItem>
                    </>
                  )}

                  {form.provider === "anthropic" && (
                    <>
                      <SelectItem value="claude-3-haiku">
                        Claude 3 Haiku
                      </SelectItem>
                      <SelectItem value="claude-3-sonnet">
                        Claude 3 Sonnet
                      </SelectItem>
                      <SelectItem value="claude-3-opus">
                        Claude 3 Opus
                      </SelectItem>
                    </>
                  )}

                  {form.provider === "google" && (
                    <>
                      <SelectItem value="gemini-1.5-flash">
                        Gemini 1.5 Flash
                      </SelectItem>
                      <SelectItem value="gemini-1.5-pro">
                        Gemini 1.5 Pro
                      </SelectItem>
                    </>
                  )}

                  {form.provider === "azure" && (
                    <>
                      <SelectItem value="gpt-4o-mini">
                        GPT-4o Mini (Azure)
                      </SelectItem>
                      <SelectItem value="gpt-35-turbo">
                        GPT-3.5 Turbo (Azure)
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {errors.model && (
                <p className="text-red-500 text-sm">{errors.model.message}</p>
              )}
            </div>

            <Field
              label="Endpoint"
              register={register("endpoint")}
              error={errors.endpoint?.message}
            />

            <Field
              label="Temperature"
              type="number"
              step="0.1"
              register={register("temperature", { valueAsNumber: true })}
              error={errors.temperature?.message}
            />

            <Field
              label="Max Tokens"
              type="number"
              register={register("maxTokens", { valueAsNumber: true })}
              error={errors.maxTokens?.message}
            />
          </div>

          {/* Trigger Words - full width */}
          <div className="space-y-2">
            <Label>Trigger Words</Label>
            <p className="text-xs text-gray-500 mb-1">
              Enter comma-separated trigger words or phrases (e.g. "hello,
              start, ai").
            </p>
            <Input placeholder="e.g. hello, start, ai" {...register("words")} />
            {errors.words && (
              <p className="text-red-500 text-sm">{errors.words.message}</p>
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between pt-2">
            <Label>Active</Label>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setValue("isActive", v)}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSubmitting ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  type = "text",
  step,
  register,
  error,
}: Readonly<{
  label: string;
  type?: string;
  step?: string;
  register: any;
  error?: string;
}>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} step={step} {...register} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
