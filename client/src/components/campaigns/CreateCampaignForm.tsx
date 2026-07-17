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

import { ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { Info, FileText, Clock, Eye, Check } from "lucide-react";
import { TemplatePickerDialog, getTemplateButtons } from "@/components/shared/TemplatePickerDialog";

interface CreateCampaignFormProps {
  onSubmit: (formData: any) => void;
  templates: any[];
  selectedTemplate: any;
  setSelectedTemplate: (template: any) => void;
  variableMapping: Record<string, string>;
  setVariableMapping: (mapping: Record<string, string>) => void;
  extractTemplateVariables: (template: any) => string[];
  scheduledTime: string;
  setScheduledTime: (time: string) => void;
  autoRetry: boolean;
  setAutoRetry: (retry: boolean) => void;
  isCreating: boolean;
  onCancel?: () => void;
  children: ReactNode;
  requiresHeaderImage: boolean;
  setRequiresHeaderImage: (v: boolean) => void;
  uploadedMediaId: string | null;
  setUploadedMediaId: (id: string | null) => void;
  channelId?: string;
  messagingLimit?: number | null;
  messagingTier?: string;
}

// Schema for the fields this form owns. Scheduling and auto-retry are
// parent-controlled props so they stay out of the schema; the parent runs its
// own validation for those.
const campaignFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Campaign name is required")
    .max(200, "Campaign name is too long"),
  description: z
    .string()
    .trim()
    .max(2000, "Description is too long")
    .optional()
    .or(z.literal("")),
});

type CampaignFormValues = z.infer<typeof campaignFormSchema>;

export function CreateCampaignForm({
  onSubmit,
  selectedTemplate,
  setSelectedTemplate,
  variableMapping,
  scheduledTime,
  setScheduledTime,
  autoRetry,
  setAutoRetry,
  isCreating,
  onCancel,
  children,
  setRequiresHeaderImage,
  setUploadedMediaId,
  channelId,
  messagingLimit,
  messagingTier,
}: CreateCampaignFormProps) {
  const [templateConfig, setTemplateConfig] = useState<{
    variables: { type?: string; value?: string }[];
    mediaId?: string;
    headerType?: string | null;
    buttonParameters?: string[];
    expirationTimeMs?: number;
    carouselCardMediaIds?: Record<number, string>;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: { name: "", description: "" },
    mode: "onBlur",
  });

  const buildVariableMapping = () => {
    if (!templateConfig) return variableMapping;

    const mapping: Record<string, any> = {};

    if (templateConfig.variables) {
      templateConfig.variables.forEach((v, i) => {
        mapping[String(i + 1)] = v;
      });
    }

    if (templateConfig.buttonParameters && templateConfig.buttonParameters.length > 0) {
      const buttonsMap: Record<number, { type: string; value: string }> = {};
      const allButtons = selectedTemplate ? getTemplateButtons(selectedTemplate) : [];
      let paramIdx = 0;
      allButtons.forEach((btn, idx) => {
        if (btn.type === "COPY_CODE" || (btn.type === "URL" && btn.url?.includes("{{"))) {
          buttonsMap[idx] = { type: "custom", value: templateConfig.buttonParameters![paramIdx] || "" };
          paramIdx++;
        }
      });
      mapping.buttons = buttonsMap;
    }

    if (templateConfig.mediaId) {
      mapping.uploadedMediaId = templateConfig.mediaId;
    }
    if (templateConfig.headerType) {
      mapping.headerType = templateConfig.headerType;
    }
    if (templateConfig.expirationTimeMs) {
      mapping.expirationTimeMs = templateConfig.expirationTimeMs;
    }
    if (templateConfig.carouselCardMediaIds && Object.keys(templateConfig.carouselCardMediaIds).length > 0) {
      mapping.carouselCardMediaIds = Object.fromEntries(
        Object.entries(templateConfig.carouselCardMediaIds).map(([k, v]) => [String(k), v])
      );
    }

    return mapping;
  };

  const onValid = (values: CampaignFormValues) => {
    onSubmit({
      name: values.name,
      description: values.description ?? "",
      variableMapping: buildVariableMapping(),
    });
  };

  const handleSelectTemplate = (
    template: any,
    variables: { type?: string; value?: string }[],
    mediaId?: string,
    headerType?: string | null,
    buttonParameters?: string[],
    expirationTimeMs?: number,
    carouselCardMediaIds?: Record<number, string>,
  ) => {
    setSelectedTemplate(template);
    setTemplateConfig({
      variables,
      mediaId,
      headerType,
      buttonParameters,
      expirationTimeMs,
      carouselCardMediaIds,
    });
    if (mediaId) {
      setUploadedMediaId(mediaId);
    }
    setRequiresHeaderImage(
      !!headerType && ["image", "video", "document"].includes(headerType)
    );
  };

  const { user } = useAuth();

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5 mt-4" noValidate>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Campaign Info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              placeholder="e.g. Summer Sale Announcement"
              aria-invalid={!!errors.name}
              {...register("name")}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Campaign objectives and notes..."
              rows={2}
              aria-invalid={!!errors.description}
              {...register("description")}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-destructive" role="alert">
                {errors.description.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Template
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <TemplatePickerDialog
              channelId={channelId}
              onSelectTemplate={handleSelectTemplate}
              submitLabel="Use Template"
              categoryFilter="MARKETING"
              trigger={
                <Button type="button" variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  {selectedTemplate ? "Change Template" : "Select Template"}
                </Button>
              }
            />
            {selectedTemplate && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check className="h-4 w-4" />
                <span className="font-medium">{selectedTemplate.name}</span>
              </div>
            )}
          </div>

          {selectedTemplate && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</p>
              {selectedTemplate.headerType === "text" && selectedTemplate.headerText && (
                <div className="font-semibold text-sm">{selectedTemplate.headerText}</div>
              )}
              <div className="whitespace-pre-wrap text-sm">{selectedTemplate.body}</div>
              {selectedTemplate.footerText && (
                <div className="text-xs text-muted-foreground">{selectedTemplate.footerText}</div>
              )}
              {templateConfig && (
                <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                  {templateConfig.variables.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {templateConfig.variables.length} variable(s) configured
                    </p>
                  )}
                  {templateConfig.mediaId && (
                    <p className="text-xs text-green-600">Header media uploaded</p>
                  )}
                  {templateConfig.buttonParameters && templateConfig.buttonParameters.length > 0 && (
                    <p className="text-xs text-gray-500">
                      {templateConfig.buttonParameters.length} button parameter(s) set
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* {messagingLimit != null && (
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Your channel's WhatsApp messaging limit is{" "}
            <strong>
              {messagingLimit === Infinity
                ? "Unlimited"
                : messagingLimit.toLocaleString()}
            </strong>
            {messagingLimit !== Infinity ? " messages per 24 hours" : ""}
            {messagingTier ? ` (${messagingTier})` : ""}.
          </span>
        </div>
      )} */}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Scheduling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="scheduledTime">Schedule Campaign (Optional)</Label>
            <Input
              id="scheduledTime"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoRetry"
              checked={autoRetry}
              onCheckedChange={(checked) => setAutoRetry(!!checked)}
            />
            <Label htmlFor="autoRetry" className="font-normal">
              Enable auto-retry for failed messages
            </Label>
          </div>
        </CardContent>
      </Card>

      {children}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={user?.username === 'demouser' ? true : isCreating || !selectedTemplate}>
          {scheduledTime ? "Schedule Campaign" : "Start Campaign"}
        </Button>
      </div>
    </form>
  );
}
