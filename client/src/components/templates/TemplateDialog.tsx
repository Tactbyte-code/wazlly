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

import { useEffect, useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Type,
  Image,
  Video,
  FileText,
  Plus,
  Trash2,
  MessageSquare,
  Hash,
  Link,
  Phone,
  Smartphone,
  Copy,
  Clock,
  ShoppingBag,
  Tag,
  LayoutGrid,
  PhoneCall,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Clipboard,
  Timer,
} from "lucide-react";
import type { Template } from "@shared/schema";
import { useAuth } from "@/contexts/auth-context";
import {
  WHATSAPP_LANGUAGES,
  MARKETING_SUBTYPES,
  AUTH_TYPES,
} from "@/lib/template-constants";

const DRAFT_STORAGE_PREFIX = "whatsapp_template_drafts";

function getDraftStorageKey(channelId?: string): string {
  return channelId ? `${DRAFT_STORAGE_PREFIX}_${channelId}` : DRAFT_STORAGE_PREFIX;
}

export interface TemplateDraft {
  id: string;
  data: Record<string, any>;
  savedAt: number;
}

export function getTemplateDrafts(channelId?: string): TemplateDraft[] {
  try {
    const raw = localStorage.getItem(getDraftStorageKey(channelId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplateDraft(data: Record<string, any>, existingDraftId?: string, channelId?: string): string {
  try {
    const drafts = getTemplateDrafts(channelId);
    const draftId = existingDraftId || `draft_${Date.now()}`;
    const existingIdx = drafts.findIndex((d) => d.id === draftId);
    const draft: TemplateDraft = {
      id: draftId,
      data: { ...data, mediaFile: undefined },
      savedAt: Date.now(),
    };
    if (existingIdx >= 0) {
      drafts[existingIdx] = draft;
    } else {
      drafts.unshift(draft);
    }
    localStorage.setItem(getDraftStorageKey(channelId), JSON.stringify(drafts.slice(0, 10)));
    return draftId;
  } catch {
    return existingDraftId || `draft_${Date.now()}`;
  }
}

export function deleteTemplateDraft(draftId: string, channelId?: string): void {
  try {
    const drafts = getTemplateDrafts(channelId).filter((d) => d.id !== draftId);
    localStorage.setItem(getDraftStorageKey(channelId), JSON.stringify(drafts));
  } catch (e) {
    console.error("Failed to delete template draft:", e);
  }
}


const carouselCardSchema = z.object({
  mediaType: z.enum(["image", "video"]),
  mediaFile: z.any().optional(),
  mediaUrl: z.string().optional(),
  body: z.string().min(1, "Card body is required").max(160, "Max 160 characters"),
  buttons: z.array(
    z.object({
      type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER"]),
      text: z.string().max(25).optional().default(""),
      url: z.string().optional(),
      phoneNumber: z.string().optional(),
    }).superRefine((btn, ctx) => {
      if (!btn.text || btn.text.trim().length === 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Button text is required", path: ["text"] });
      }
      if (btn.type === "URL" && (!btn.url || btn.url.trim().length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL is required", path: ["url"] });
      }
      if (btn.type === "URL" && btn.url && !/^https?:\/\/.+/.test(btn.url)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a valid URL starting with https://", path: ["url"] });
      }
      if (btn.type === "PHONE_NUMBER" && (!btn.phoneNumber || btn.phoneNumber.trim().length === 0)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Phone number is required", path: ["phoneNumber"] });
      }
      if (btn.type === "PHONE_NUMBER" && btn.phoneNumber && !/^\+?[0-9\s-]+$/.test(btn.phoneNumber)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a valid phone number", path: ["phoneNumber"] });
      }
    })
  ).max(2, "Max 2 buttons per card").default([]),
});

const templateFormSchema = z.object({
  name: z
    .string()
    .min(1, "Template name is required")
    .max(512, "Template name must be less than 512 characters")
    .regex(
      /^[a-z0-9_]+$/,
      "Only lowercase letters, numbers, and underscores allowed"
    ),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  marketingSubType: z.string().default("CUSTOM"),
  authType: z.string().default("COPY_CODE"),
  language: z.string().default("en_US"),
  mediaType: z.enum(["text", "image", "video", "document"]).default("text"),
  mediaUrl: z.string().optional(),
  header: z
    .string()
    .max(60, "Header must be less than 60 characters")
    .optional()
    .default(""),
  headerVariable: z.string().optional().default(""),
  body: z.string().max(550, "Body must be less than 550 characters").optional().default(""),
  footer: z
    .string()
    .max(60, "Footer must be less than 60 characters")
    .optional()
    .default(""),
  buttons: z
    .array(
      z.object({
        type: z.enum(["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE"]),
        text: z
          .string()
          .max(25, "Button text must be less than 25 characters")
          .optional()
          .default(""),
        url: z.string().optional(),
        phoneNumber: z.string().optional(),
        couponCode: z.string().optional(),
      }).superRefine((btn, ctx) => {
        if (btn.type !== "COPY_CODE" && (!btn.text || btn.text.trim().length === 0)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Button text is required", path: ["text"] });
        }
        if (btn.type === "URL" && (!btn.url || btn.url.trim().length === 0)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "URL is required", path: ["url"] });
        }
        if (btn.type === "URL" && btn.url && !/^https?:\/\/.+/.test(btn.url)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a valid URL starting with https://", path: ["url"] });
        }
        if (btn.type === "PHONE_NUMBER" && (!btn.phoneNumber || btn.phoneNumber.trim().length === 0)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Phone number is required", path: ["phoneNumber"] });
        }
        if (btn.type === "PHONE_NUMBER" && btn.phoneNumber && !/^\+?[0-9\s-]+$/.test(btn.phoneNumber)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a valid phone number (digits, +, spaces, dashes)", path: ["phoneNumber"] });
        }
        if (btn.type === "COPY_CODE" && (!btn.couponCode || btn.couponCode.trim().length === 0)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Coupon code is required", path: ["couponCode"] });
        }
        if (btn.type === "COPY_CODE" && btn.couponCode && !/^[A-Z0-9]+$/.test(btn.couponCode)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Only uppercase letters and numbers allowed", path: ["couponCode"] });
        }
        if (btn.type === "COPY_CODE" && btn.couponCode && btn.couponCode.length > 15) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Max 15 characters", path: ["couponCode"] });
        }
      })
    )
    .max(3, "Maximum 3 buttons allowed")
    .default([]),
  variables: z.array(z.string()).default([]),
  samples: z.array(z.string()).default([]),
  mediaFile: z.any().optional(),
  couponCode: z.string().max(15, "Coupon code max 15 characters").optional().default(""),
  offerText: z.string().max(16, "Offer text max 16 characters").optional().default(""),
  hasExpiration: z.boolean().optional().default(false),
  expirationDays: z.number().min(1).max(90).optional().default(14),
  carouselCards: z.array(carouselCardSchema).max(10).optional().default([]),
  catalogId: z.string().optional().default(""),
  productIds: z.array(z.string()).optional().default([]),
  authCodeExpiry: z.number().min(1).max(90).optional().default(10),
  authSecurityDisclaimer: z.boolean().optional().default(true),
  authPackageName: z.string().optional().default(""),
  authSignatureHash: z.string().optional().default(""),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: Template | null;
  onSubmit: (data: TemplateFormData) => void;
  isSubmitting?: boolean;
  initialDraft?: TemplateDraft | null;
  onDraftSaved?: () => void;
  channelId?: string;
}

function LanguageSearch({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return WHATSAPP_LANGUAGES;
    const lower = search.toLowerCase();
    return WHATSAPP_LANGUAGES.filter(
      (l) =>
        l.label.toLowerCase().includes(lower) ||
        l.code.toLowerCase().includes(lower)
    );
  }, [search]);

  const selectedLabel =
    WHATSAPP_LANGUAGES.find((l) => l.code === value)?.label || value;

  return (
    <div className="relative">
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span>{selectedLabel}</span>
        <Search className="h-4 w-4 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-2">
            <Input
              placeholder="Search languages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map((lang) => (
              <button
                key={lang.code}
                type="button"
                className={`w-full px-3 py-1.5 text-left text-sm hover:bg-accent ${
                  lang.code === value ? "bg-accent font-medium" : ""
                }`}
                onClick={() => {
                  onChange(lang.code);
                  setIsOpen(false);
                  setSearch("");
                }}
              >
                {lang.label}{" "}
                <span className="text-xs text-muted-foreground">
                  ({lang.code})
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No languages found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TemplateDialog({
  open,
  onOpenChange,
  template,
  onSubmit,
  isSubmitting = false,
  initialDraft,
  onDraftSaved,
  channelId,
}: TemplateDialogProps) {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      category: "MARKETING",
      marketingSubType: "CUSTOM",
      authType: "COPY_CODE",
      language: "en_US",
      mediaType: "text",
      mediaUrl: "",
      mediaFile: undefined,
      header: "",
      headerVariable: "",
      body: "",
      footer: "",
      buttons: [],
      variables: [],
      couponCode: "",
      offerText: "",
      hasExpiration: false,
      expirationDays: 14,
      carouselCards: [],
      catalogId: "",
      productIds: [],
      authCodeExpiry: 10,
      authSecurityDisclaimer: true,
      authPackageName: "",
      authSignatureHash: "",
    },
  });

  const {
    fields: buttonFields,
    append: appendButton,
    remove: removeButton,
  } = useFieldArray({
    control: form.control,
    name: "buttons",
  });

  const {
    fields: carouselFields,
    append: appendCard,
    remove: removeCard,
  } = useFieldArray({
    control: form.control,
    name: "carouselCards",
  });

  useEffect(() => {
    if (template) {
      const headerComponent = template.components?.find(
        (c: any) => c.type === "HEADER"
      );
      const bodyComponent = template.components?.find(
        (c: any) => c.type === "BODY"
      );
      const footerComponent = template.components?.find(
        (c: any) => c.type === "FOOTER"
      );
      const buttonComponent = template.components?.find(
        (c: any) => c.type === "BUTTONS"
      );
      const ltoComponent = template.components?.find(
        (c: any) => c.type === "limited_time_offer"
      );
      const carouselComponent = template.components?.find(
        (c: any) => c.type === "CAROUSEL"
      );

      const extractVariablesFromText = (text = "") => {
        const matches = text.match(/\{\{(\d+)\}\}/g) || [];
        return Array.from(
          new Set(matches.map((m: string) => Number(m.replace(/[{}]/g, ""))))
        ).sort((a: number, b: number) => a - b);
      };

      const variablesFromBody = extractVariablesFromText(bodyComponent?.text || "");
      const samplesFromTemplate = (template as any).samples || [];
      const variables = variablesFromBody.map((_: number, i: number) =>
        typeof samplesFromTemplate[i] === "string"
          ? samplesFromTemplate[i]
          : ""
      );

      const buttons = buttonComponent?.buttons || [];
      const hasCopyCodeBtn = buttons.some((b: any) => b.type === "COPY_CODE");
      const copyCodeBtn = buttons.find((b: any) => b.type === "COPY_CODE");

      let detectedSubType = "CUSTOM";
      if (template.category === "MARKETING") {
        if (ltoComponent) detectedSubType = "LIMITED_TIME_OFFER";
        else if (carouselComponent) detectedSubType = "CAROUSEL";
        else if (hasCopyCodeBtn && !ltoComponent) detectedSubType = "COUPON_CODE";
      }

      const detectedAuthType = template.category === "AUTHENTICATION"
        ? (buttons.some((b: any) => b.type === "OTP" && b.otp_type === "ONE_TAP")
          ? "ONE_TAP"
          : buttons.some((b: any) => b.type === "OTP" && b.otp_type === "ZERO_TAP")
          ? "ZERO_TAP"
          : "COPY_CODE")
        : "COPY_CODE";

      form.reset({
        name: template.name,
        category: template.category as any,
        marketingSubType: (template as any).marketingSubType || detectedSubType,
        authType: (template as any).authType || detectedAuthType,
        language: template.language || "en_US",
        mediaType:
          headerComponent?.format === "IMAGE"
            ? "image"
            : headerComponent?.format === "VIDEO"
            ? "video"
            : headerComponent?.format === "DOCUMENT"
            ? "document"
            : "text",
        mediaUrl: "",
        header:
          headerComponent?.format === "TEXT"
            ? headerComponent.text || template.header || ""
            : "",
        headerVariable: "",
        body: bodyComponent?.text || template.body,
        footer: footerComponent?.text || template.footer || "",
        buttons: buttons
          .filter((btn: any) => btn.type !== "COPY_CODE" || detectedSubType === "CUSTOM")
          .map((btn: any) => ({
            type: btn.type,
            text: btn.text || (btn.type === "COPY_CODE" ? "Copy offer code" : ""),
            url: btn.url || "",
            phoneNumber: btn.phone_number || "",
            couponCode: btn.type === "COPY_CODE" ? (btn.example || "") : "",
          })),
        variables,
        couponCode: copyCodeBtn?.example || (template as any).couponCode || "",
        offerText: ltoComponent?.limited_time_offer?.text || (template as any).offerText || "",
        hasExpiration: ltoComponent?.limited_time_offer?.has_expiration || (template as any).hasExpiration || false,
        expirationDays: (template as any).expirationDays || 14,
        carouselCards: carouselComponent?.cards?.map((card: any) => ({
          mediaType: card.components?.find((c: any) => c.type === "HEADER")?.format?.toLowerCase() || "image",
          body: card.components?.find((c: any) => c.type === "BODY")?.text || "",
          buttons: card.components?.find((c: any) => c.type === "BUTTONS")?.buttons?.map((b: any) => ({
            type: b.type, text: b.text || "", url: b.url || "", phoneNumber: b.phone_number || "",
          })) || [],
        })) || [],
        catalogId: (template as any).catalogId || "",
        productIds: (template as any).productIds || [],
        authCodeExpiry: (template as any).authCodeExpiry || 10,
        authSecurityDisclaimer: (template as any).authSecurityDisclaimer !== false,
        authPackageName: (template as any).authPackageName || "",
        authSignatureHash: (template as any).authSignatureHash || "",
      });
    } else {
      form.reset({
        name: "",
        category: "MARKETING",
        marketingSubType: "CUSTOM",
        authType: "COPY_CODE",
        language: "en_US",
        mediaType: "text",
        mediaUrl: "",
        header: "",
        headerVariable: "",
        body: "",
        footer: "",
        buttons: [],
        variables: [],
        couponCode: "",
        offerText: "",
        hasExpiration: false,
        expirationDays: 14,
        carouselCards: [],
        catalogId: "",
        productIds: [],
        authCodeExpiry: 10,
        authSecurityDisclaimer: true,
        authPackageName: "",
        authSignatureHash: "",
      });
    }
  }, [template, form]);

  useEffect(() => {
    if (initialDraft && !template && open) {
      const d = initialDraft.data;
      form.reset({
        name: d.name || "",
        category: d.category || "MARKETING",
        marketingSubType: d.marketingSubType || "CUSTOM",
        authType: d.authType || "COPY_CODE",
        language: d.language || "en_US",
        mediaType: d.mediaType || "text",
        mediaUrl: d.mediaUrl || "",
        header: d.header || "",
        headerVariable: d.headerVariable || "",
        body: d.body || "",
        footer: d.footer || "",
        buttons: d.buttons || [],
        variables: d.variables || [],
        couponCode: d.couponCode || "",
        offerText: d.offerText || "",
        hasExpiration: d.hasExpiration || false,
        expirationDays: d.expirationDays || 14,
        carouselCards: d.carouselCards || [],
        catalogId: d.catalogId || "",
        productIds: d.productIds || [],
        authCodeExpiry: d.authCodeExpiry || 10,
        authSecurityDisclaimer: d.authSecurityDisclaimer !== false,
        authPackageName: d.authPackageName || "",
        authSignatureHash: d.authSignatureHash || "",
      });
    }
  }, [initialDraft, template, open, form]);

  useEffect(() => {
    if (open) {
      setSubmitted(false);
      setCurrentDraftId(initialDraft?.id || null);
    }
  }, [open, initialDraft]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !submitted && !template) {
      const currentValues = form.getValues();
      const hasContent =
        currentValues.name?.trim() ||
        currentValues.body?.trim() ||
        currentValues.header?.trim() ||
        currentValues.footer?.trim() ||
        (currentValues.buttons && currentValues.buttons.length > 0);
      if (hasContent) {
        const savedId = saveTemplateDraft(currentValues, currentDraftId || undefined, channelId);
        setCurrentDraftId(savedId);
        onDraftSaved?.();
      }
    }
    onOpenChange(nextOpen);
  };

  const extractVariables = (text: string) => {
    const regex = /\{\{(\d+)\}\}/g;
    const matches = [...new Set([...text.matchAll(regex)].map((m) => m[1]))];
    return matches;
  };

  const watchedValues = form.watch();
  const category = watchedValues.category;
  const marketingSubType = watchedValues.marketingSubType;
  const authType = watchedValues.authType;
  const isAuthentication = category === "AUTHENTICATION";
  const isCarousel = category === "MARKETING" && marketingSubType === "CAROUSEL";
  const isCouponCode = category === "MARKETING" && marketingSubType === "COUPON_CODE";
  const isLTO = category === "MARKETING" && marketingSubType === "LIMITED_TIME_OFFER";
  const isCatalog =
    category === "MARKETING" &&
    (marketingSubType === "CATALOG" ||
      marketingSubType === "MPM" ||
      marketingSubType === "SPM" ||
      marketingSubType === "PRODUCT_CAROUSEL");
  const isCallPermission =
    category === "MARKETING" && marketingSubType === "CALL_PERMISSION";

  const bodyCharLimit =
    category === "AUTHENTICATION" ? 1024 : 550;

  useEffect(() => {
    if (!isAuthentication) return;
    const vars = extractVariables(watchedValues.body || "");
    form.setValue(
      "variables",
      vars.map(() => "")
    );
  }, [watchedValues.body, isAuthentication]);

  useEffect(() => {
    if (isAuthentication) return;
    const vars = extractVariables(watchedValues.body || "");
    form.setValue(
      "variables",
      vars.map(() => "")
    );
  }, [watchedValues.body]);

  useEffect(() => {
    if (watchedValues.mediaType !== "text") {
      form.setValue("header", "");
      form.setValue("headerVariable", "");
    }
  }, [watchedValues.mediaType]);

  useEffect(() => {
    if (isAuthentication) {
      const expiryText =
        watchedValues.authCodeExpiry > 0
          ? ` This code expires in ${watchedValues.authCodeExpiry} minutes.`
          : "";
      const disclaimerText = watchedValues.authSecurityDisclaimer
        ? " For your security, do not share this code."
        : "";
      form.setValue(
        "body",
        `{{1}} is your verification code.${expiryText}${disclaimerText}`
      );
      form.setValue("mediaType", "text");
      form.setValue("header", "");
      form.setValue("footer", "");
    }
  }, [
    isAuthentication,
    watchedValues.authCodeExpiry,
    watchedValues.authSecurityDisclaimer,
  ]);

  const hasQuickReply = watchedValues.buttons?.some(
    (b) => b.type === "QUICK_REPLY"
  );
  const hasCTA = watchedValues.buttons?.some(
    (b) => b.type === "URL" || b.type === "PHONE_NUMBER"
  );
  const hasCopyCode = watchedValues.buttons?.some(
    (b) => b.type === "COPY_CODE"
  );
  const quickReplyCount =
    watchedValues.buttons?.filter((b) => b.type === "QUICK_REPLY").length || 0;
  const ctaCount =
    watchedValues.buttons?.filter(
      (b) => b.type === "URL" || b.type === "PHONE_NUMBER"
    ).length || 0;
  const copyCodeCount =
    watchedValues.buttons?.filter((b) => b.type === "COPY_CODE").length || 0;

  const canAddButton = () => {
    if (isAuthentication) return false;
    if (isCouponCode && copyCodeCount >= 1) return quickReplyCount < 1;
    if (hasQuickReply) return quickReplyCount < 3 && !hasCTA && !hasCopyCode;
    if (hasCTA || hasCopyCode) return ctaCount + copyCodeCount < 2 && !hasQuickReply;
    return buttonFields.length < 3;
  };

  const getAvailableButtonTypes = (excludeIndex?: number) => {
    const otherButtons = excludeIndex !== undefined
      ? watchedValues.buttons?.filter((_, i) => i !== excludeIndex) || []
      : watchedValues.buttons || [];

    const localHasQuickReply = otherButtons.some((b) => b.type === "QUICK_REPLY");
    const localHasCTA = otherButtons.some((b) => b.type === "URL" || b.type === "PHONE_NUMBER");
    const localHasCopyCode = otherButtons.some((b) => b.type === "COPY_CODE");
    const localQuickReplyCount = otherButtons.filter((b) => b.type === "QUICK_REPLY").length;
    const localCtaCount = otherButtons.filter((b) => b.type === "URL" || b.type === "PHONE_NUMBER").length;
    const localCopyCodeCount = otherButtons.filter((b) => b.type === "COPY_CODE").length;

    const types: { value: string; label: string; icon: any }[] = [];
    if (!localHasCTA && !localHasCopyCode && localQuickReplyCount < 3) {
      types.push({
        value: "QUICK_REPLY",
        label: "Quick Reply",
        icon: MessageSquare,
      });
    }
    if (!localHasQuickReply && localCtaCount + localCopyCodeCount < 2) {
      types.push({ value: "URL", label: "URL", icon: Link });
      types.push({
        value: "PHONE_NUMBER",
        label: "Phone Number",
        icon: Phone,
      });
      if (localCopyCodeCount < 1) {
        types.push({
          value: "COPY_CODE",
          label: "Copy Code",
          icon: Copy,
        });
      }
    }
    if (types.length === 0) {
      if (localHasQuickReply) {
        types.push({
          value: "QUICK_REPLY",
          label: "Quick Reply",
          icon: MessageSquare,
        });
      } else {
        types.push({ value: "URL", label: "URL", icon: Link });
      }
    }
    return types;
  };

  const handleAddButton = () => {
    if (!canAddButton()) return;
    const types = getAvailableButtonTypes();
    const defaultType = types[0]?.value || "QUICK_REPLY";
    appendButton({
      type: defaultType as any,
      text: "",
      url: "",
      phoneNumber: "",
      couponCode: "",
    });
  };

  const handleAddCarouselCard = () => {
    if (carouselFields.length < 10) {
      appendCard({
        mediaType: "image",
        body: "",
        buttons: [],
      });
    }
  };

  const handleSubmit = (data: TemplateFormData) => {
    if (data.category !== "AUTHENTICATION" && !data.body?.trim()) {
      form.setError("body", { message: "Message body is required" });
      return;
    }
    if (data.category !== "AUTHENTICATION" && data.body) {
      const trimmed = data.body.trim();
      if (/^\{\{\d+\}\}/.test(trimmed)) {
        form.setError("body", { message: "Body text cannot start with a variable like {{1}}. Add some text before the variable." });
        return;
      }
      if (/\{\{\d+\}\}$/.test(trimmed)) {
        form.setError("body", { message: "Body text cannot end with a variable like {{1}}. Add some text after the variable." });
        return;
      }
    }
    if (data.category === "MARKETING" && data.marketingSubType === "CAROUSEL") {
      const cards = data.carouselCards || [];
      if (cards.length < 2) {
        form.setError("carouselCards" as any, { message: "Carousel requires at least 2 cards" });
        return;
      }
      for (let i = 0; i < cards.length; i++) {
        if (!(cards[i] as any).mediaFile) {
          form.setError(`carouselCards.${i}.body` as any, { message: `Card ${i + 1} requires a sample image/video for Meta review` });
          return;
        }
      }
    }
    setSubmitted(true);
    const draftIdToDelete = currentDraftId || initialDraft?.id;
    if (draftIdToDelete) deleteTemplateDraft(draftIdToDelete, channelId);
    onDraftSaved?.();
    onSubmit(data);
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="w-4 h-4" />;
      case "video":
        return <Video className="w-4 h-4" />;
      case "document":
        return <FileText className="w-4 h-4" />;
      default:
        return <Type className="w-4 h-4" />;
    }
  };

  const getSubTypeIcon = (subType: string) => {
    switch (subType) {
      case "COUPON_CODE":
        return <Tag className="w-4 h-4" />;
      case "LIMITED_TIME_OFFER":
        return <Clock className="w-4 h-4" />;
      case "CAROUSEL":
      case "PRODUCT_CAROUSEL":
        return <LayoutGrid className="w-4 h-4" />;
      case "CATALOG":
      case "MPM":
      case "SPM":
        return <ShoppingBag className="w-4 h-4" />;
      case "CALL_PERMISSION":
        return <PhoneCall className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const [previewCardIndex, setPreviewCardIndex] = useState(0);

  const renderPreview = () => {
    if (isAuthentication) {
      return (
        <div className="bg-white rounded-xl shadow-sm max-w-sm mx-auto overflow-hidden border border-gray-100">
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-700 uppercase tracking-wide">
                Authentication
              </span>
            </div>
            <p className="text-sm whitespace-pre-wrap">
              {watchedValues.body || "{{1}} is your verification code."}
            </p>
          </div>
          <div className="border-t">
            {authType === "COPY_CODE" && (
              <button className="w-full py-2.5 px-4 text-[#00a884] text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50">
                <Clipboard className="w-4 h-4" />
                Copy Code
              </button>
            )}
            {authType === "ONE_TAP" && (
              <button className="w-full py-2.5 px-4 text-[#00a884] text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50">
                <ExternalLink className="w-4 h-4" />
                Autofill
              </button>
            )}
            {authType === "ZERO_TAP" && (
              <div className="py-2 px-4 text-center">
                <span className="text-xs text-gray-500">
                  Code delivered silently to app
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (isLTO) {
      return (
        <div className="bg-white rounded-xl shadow-sm max-w-sm mx-auto overflow-hidden border border-gray-100">
          {watchedValues.mediaType !== "text" && (
            <div className="bg-gray-200 h-40 flex items-center justify-center">
              {watchedValues.mediaType === "image" && watchedValues.mediaUrl ? (
                <img
                  src={watchedValues.mediaUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  {getMediaIcon(watchedValues.mediaType)}
                  <span className="text-xs mt-1">Media Preview</span>
                </div>
              )}
            </div>
          )}
          {watchedValues.hasExpiration && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-white" />
                <span className="text-white text-xs font-medium">
                  {watchedValues.offerText || "Limited offer!"}
                </span>
              </div>
              <div className="flex gap-1">
                {["D", "H", "M"].map((unit) => (
                  <div
                    key={unit}
                    className="bg-white/20 rounded px-1.5 py-0.5"
                  >
                    <span className="text-white text-xs font-mono">
                      00{unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="p-4 space-y-2">
            {watchedValues.header && (
              <h3 className="font-semibold text-sm">
                {watchedValues.header}
              </h3>
            )}
            <p className="text-sm whitespace-pre-wrap">
              {watchedValues.body || "Template body..."}
            </p>
            {watchedValues.footer && (
              <p className="text-xs text-gray-500 pt-1">
                {watchedValues.footer}
              </p>
            )}
          </div>
          <div className="border-t divide-y">
            {watchedValues.couponCode && (
              <button className="w-full py-2.5 px-4 text-[#00a884] text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50">
                <Copy className="w-4 h-4" />
                Copy offer code
              </button>
            )}
            {watchedValues.buttons?.map((button, idx) => (
              <button
                key={idx}
                className="w-full py-2.5 px-4 text-[#00a884] text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
              >
                {button.type === "URL" && (
                  <ExternalLink className="w-4 h-4" />
                )}
                {button.type === "PHONE_NUMBER" && (
                  <Phone className="w-4 h-4" />
                )}
                {button.text || "Button"}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (isCarousel && carouselFields.length > 0) {
      const cards = watchedValues.carouselCards || [];
      const currentCard = cards[previewCardIndex];
      return (
        <div className="max-w-sm mx-auto">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 mb-2">
            {watchedValues.body && (
              <div className="p-4">
                <p className="text-sm whitespace-pre-wrap">
                  {watchedValues.body}
                </p>
              </div>
            )}
          </div>
          {currentCard && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="bg-gray-200 h-32 flex items-center justify-center">
                {currentCard.mediaUrl ? (
                  <img
                    src={currentCard.mediaUrl}
                    alt="Card"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-500">
                    {getMediaIcon(currentCard.mediaType || "image")}
                    <span className="text-xs mt-1">Card {previewCardIndex + 1}</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm">
                  {currentCard.body || "Card body text..."}
                </p>
              </div>
              {currentCard.buttons && currentCard.buttons.length > 0 && (
                <div className="border-t divide-y">
                  {currentCard.buttons.map((btn: any, idx: number) => (
                    <button
                      key={idx}
                      className="w-full py-2 px-4 text-[#00a884] text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
                    >
                      {btn.type === "URL" && (
                        <ExternalLink className="w-3 h-3" />
                      )}
                      {btn.type === "PHONE_NUMBER" && (
                        <Phone className="w-3 h-3" />
                      )}
                      {btn.text || "Button"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {cards.length > 1 && (
            <div className="flex items-center justify-center gap-4 mt-3">
              <button
                type="button"
                onClick={() =>
                  setPreviewCardIndex(Math.max(0, previewCardIndex - 1))
                }
                disabled={previewCardIndex === 0}
                className="p-1 rounded-full hover:bg-gray-200 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-500">
                {previewCardIndex + 1} / {cards.length}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPreviewCardIndex(
                    Math.min(cards.length - 1, previewCardIndex + 1)
                  )
                }
                disabled={previewCardIndex >= cards.length - 1}
                className="p-1 rounded-full hover:bg-gray-200 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      );
    }

    const quickReplies = watchedValues.buttons?.filter(
      (b) => b.type === "QUICK_REPLY"
    );
    const ctaButtons = watchedValues.buttons?.filter(
      (b) => b.type !== "QUICK_REPLY"
    );

    return (
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          {watchedValues.mediaType !== "text" && (
            <div className="bg-gray-200 h-44 overflow-hidden flex items-center justify-center">
              {watchedValues.mediaType === "image" && watchedValues.mediaUrl ? (
                <img
                  src={watchedValues.mediaUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-gray-500">
                  {getMediaIcon(watchedValues.mediaType)}
                  <span className="text-xs mt-1">Media Preview</span>
                </div>
              )}
            </div>
          )}

          <div className="p-4 space-y-2">
            {watchedValues.header && (
              <h3 className="font-semibold text-sm">
                {watchedValues.header.replace(
                  /\{\{1\}\}/g,
                  watchedValues.headerVariable || "{{1}}"
                )}
              </h3>
            )}
            <p className="text-sm whitespace-pre-wrap">
              {watchedValues.body?.replace(/\{\{(\d+)\}\}/g, (_, n) => {
                const value = watchedValues.variables?.[Number(n) - 1];
                return typeof value === "string" && value
                  ? value
                  : `{{${n}}}`;
              }) || "Template body will appear here..."}
            </p>
            {watchedValues.footer && (
              <p className="text-xs text-gray-500 pt-1">
                {watchedValues.footer}
              </p>
            )}
          </div>

          {ctaButtons && ctaButtons.length > 0 && (
            <div className="border-t divide-y">
              {ctaButtons.map((button, idx) => (
                <button
                  key={idx}
                  className="w-full py-2.5 px-4 text-[#00a884] text-sm font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
                >
                  {button.type === "URL" && (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  {button.type === "PHONE_NUMBER" && (
                    <Phone className="w-4 h-4" />
                  )}
                  {button.type === "COPY_CODE" && (
                    <Copy className="w-4 h-4" />
                  )}
                  {button.type === "COPY_CODE"
                    ? "Copy offer code"
                    : button.text || "Button text"}
                </button>
              ))}
            </div>
          )}
        </div>

        {quickReplies && quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {quickReplies.map((button, idx) => (
              <button
                key={idx}
                className="px-4 py-2 text-[#00a884] text-sm font-medium bg-white rounded-full border border-gray-200 shadow-sm hover:bg-gray-50"
              >
                {button.text || "Quick Reply"}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCatalogFields = () => (
    <div className="space-y-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="w-4 h-4 text-amber-700" />
        <h4 className="text-sm font-medium text-amber-900">
          {marketingSubType === "MPM"
            ? "Multi-Product Message"
            : marketingSubType === "SPM"
            ? "Single-Product Message"
            : marketingSubType === "PRODUCT_CAROUSEL"
            ? "Product Card Carousel"
            : "Catalog"}{" "}
          Settings
        </h4>
      </div>
      <p className="text-xs text-amber-800">
        {marketingSubType === "CATALOG"
          ? "This template links to your WhatsApp product catalog. Make sure your catalog is set up in Meta Commerce Manager."
          : marketingSubType === "MPM"
          ? "Showcase multiple products from your catalog. Products are selected when sending the template."
          : marketingSubType === "SPM"
          ? "Feature a single product from your catalog. The product is selected when sending the template."
          : "Create scrollable product cards from your catalog. Products are selected when sending."}
      </p>
      <FormField
        control={form.control}
        name="catalogId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Catalog ID (Optional)</FormLabel>
            <FormControl>
              <Input
                placeholder="Enter your Meta catalog ID"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Found in Meta Commerce Manager. Leave blank to select when
              sending.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {template ? "Edit Template" : "Create New Template"}
          </DialogTitle>
          <DialogDescription>
            Create WhatsApp message templates for marketing, utility, or
            authentication purposes.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-6">
              {/* Left side - Form */}
              <div className="overflow-y-auto max-h-[calc(90vh-200px)] pr-4 space-y-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-gray-700">
                    Basic Information
                  </h3>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Template Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="welcome_message"
                            {...field}
                            disabled={!!template}
                          />
                        </FormControl>
                        <FormDescription>
                          Use lowercase letters, numbers, and underscores
                          only
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={(val) => {
                              field.onChange(val);
                              if (val !== "MARKETING") {
                                form.setValue("marketingSubType", "CUSTOM");
                              }
                              if (val !== "AUTHENTICATION") {
                                form.setValue("authType", "COPY_CODE");
                              }
                            }}
                            defaultValue={field.value}
                            disabled={!!template}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="MARKETING">
                                Marketing
                              </SelectItem>
                              <SelectItem value="UTILITY">Utility</SelectItem>
                              <SelectItem value="AUTHENTICATION">
                                Authentication
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="language"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Language</FormLabel>
                          <FormControl>
                            <LanguageSearch
                              value={field.value}
                              onChange={field.onChange}
                              disabled={!!template}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Marketing Sub-type */}
                  {category === "MARKETING" && (
                    <FormField
                      control={form.control}
                      name="marketingSubType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marketing Template Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {MARKETING_SUBTYPES.map((sub) => (
                                <SelectItem key={sub.value} value={sub.value}>
                                  <div className="flex items-center gap-2">
                                    {getSubTypeIcon(sub.value)}
                                    <div>
                                      <span>{sub.label}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {
                              MARKETING_SUBTYPES.find(
                                (s) => s.value === field.value
                              )?.description
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Authentication Type */}
                  {isAuthentication && (
                    <FormField
                      control={form.control}
                      name="authType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Authentication Method</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AUTH_TYPES.map((at) => (
                                <SelectItem key={at.value} value={at.value}>
                                  {at.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {
                              AUTH_TYPES.find((a) => a.value === field.value)
                                ?.description
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Authentication-specific fields */}
                {isAuthentication && (
                  <div className="space-y-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-700" />
                      <h4 className="text-sm font-medium text-green-900">
                        Authentication Settings
                      </h4>
                    </div>

                    <FormField
                      control={form.control}
                      name="authCodeExpiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code Expiry (minutes)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              max={90}
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                          </FormControl>
                          <FormDescription>
                            How long the OTP code remains valid (1-90 minutes)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="authSecurityDisclaimer"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-3 bg-white">
                          <div className="space-y-0.5">
                            <FormLabel>Security Disclaimer</FormLabel>
                            <FormDescription>
                              Add "Do not share this code" warning
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {(authType === "ONE_TAP" || authType === "ZERO_TAP") && (
                      <>
                        <FormField
                          control={form.control}
                          name="authPackageName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Android Package Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="com.example.myapp"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Your Android app's package name for autofill
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="authSignatureHash"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>App Signature Hash</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter app signature hash"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Your app's signing certificate hash for SMS
                                Retriever API
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    <div className="bg-white rounded-lg border p-3">
                      <Label className="text-sm font-medium">
                        Auto-generated Message
                      </Label>
                      <p className="text-sm mt-1 text-gray-600 whitespace-pre-wrap">
                        {watchedValues.body}
                      </p>
                    </div>
                  </div>
                )}

                {/* Content Section (hidden for authentication) */}
                {!isAuthentication && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-gray-700">
                      Template Content
                    </h3>

                    {/* Coupon Code Fields */}
                    {isCouponCode && (
                      <div className="space-y-4 bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-purple-700" />
                          <h4 className="text-sm font-medium text-purple-900">
                            Coupon Code
                          </h4>
                        </div>
                        <FormField
                          control={form.control}
                          name="couponCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Coupon Code</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="SAVE25"
                                    maxLength={15}
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value
                                          .toUpperCase()
                                          .replace(/[^A-Z0-9]/g, "")
                                      )
                                    }
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                    {field.value?.length || 0}/15
                                  </span>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Alphanumeric only, max 15 characters. A "Copy
                                Code" button will be added automatically.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Limited-Time Offer Fields */}
                    {isLTO && (
                      <div className="space-y-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-orange-700" />
                          <h4 className="text-sm font-medium text-orange-900">
                            Limited-Time Offer Settings
                          </h4>
                        </div>
                        <FormField
                          control={form.control}
                          name="offerText"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Offer Text</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="Expiring offer!"
                                    maxLength={16}
                                    {...field}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                    {field.value?.length || 0}/16
                                  </span>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Short text for the offer banner (max 16 chars)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="hasExpiration"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border bg-white p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Show Countdown Timer</FormLabel>
                                <FormDescription>
                                  Display a countdown timer in the message
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        {watchedValues.hasExpiration && (
                          <FormField
                            control={form.control}
                            name="expirationDays"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>
                                  Offer Duration (days)
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={90}
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(Number(e.target.value))
                                    }
                                  />
                                </FormControl>
                                <FormDescription>
                                  Number of days until the offer expires
                                  (1-90)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <FormField
                          control={form.control}
                          name="couponCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Coupon Code (Optional)
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    placeholder="SAVE25"
                                    maxLength={15}
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(
                                        e.target.value
                                          .toUpperCase()
                                          .replace(/[^A-Z0-9]/g, "")
                                      )
                                    }
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                    {field.value?.length || 0}/15
                                  </span>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Add a copy-code button with this coupon
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {/* Call Permission Info */}
                    {isCallPermission && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <PhoneCall className="w-4 h-4 text-blue-700" />
                          <h4 className="text-sm font-medium text-blue-900">
                            Call Permission Request
                          </h4>
                        </div>
                        <p className="text-xs text-blue-800">
                          This template requests the customer's permission
                          for a phone call. Include a PHONE_NUMBER button to
                          enable click-to-call.
                        </p>
                      </div>
                    )}

                    {/* Catalog fields */}
                    {isCatalog && renderCatalogFields()}

                    {/* Media Type - not for carousel */}
                    {!isCarousel && (
                      <FormField
                        control={form.control}
                        name="mediaType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Header Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="text">
                                  <div className="flex items-center">
                                    <Type className="w-4 h-4 mr-2" />
                                    Text Header
                                  </div>
                                </SelectItem>
                                <SelectItem value="image">
                                  <div className="flex items-center">
                                    <Image className="w-4 h-4 mr-2" />
                                    Image
                                  </div>
                                </SelectItem>
                                <SelectItem value="video">
                                  <div className="flex items-center">
                                    <Video className="w-4 h-4 mr-2" />
                                    Video
                                  </div>
                                </SelectItem>
                                <SelectItem value="document">
                                  <div className="flex items-center">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Document
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Media Upload */}
                    {!isCarousel && watchedValues.mediaType !== "text" && (
                      <FormField
                        control={form.control}
                        name="mediaFile"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Upload Media</FormLabel>
                            <FormControl>
                              <input
                                type="file"
                                accept={
                                  watchedValues.mediaType === "image"
                                    ? "image/*"
                                    : watchedValues.mediaType === "video"
                                    ? "video/*"
                                    : watchedValues.mediaType === "document"
                                    ? ".pdf,.doc,.docx,.txt"
                                    : "*/*"
                                }
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  field.onChange(file);
                                  if (
                                    file &&
                                    watchedValues.mediaType === "image"
                                  ) {
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      form.setValue(
                                        "mediaUrl",
                                        reader.result as string
                                      );
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Upload sample media for template review
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Header (text) with variable support */}
                    {!isCarousel && watchedValues.mediaType === "text" && (
                      <FormField
                        control={form.control}
                        name="header"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Header (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="Optional header text, use {{1}} for variables"
                                  maxLength={60}
                                  {...field}
                                />
                                <span
                                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                                    (field.value?.length || 0) >= 60
                                      ? "text-red-500"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {field.value?.length || 0}/60
                                </span>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Max 60 characters. Use {"{{1}}"} for a variable.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Header variable sample */}
                    {!isCarousel &&
                      watchedValues.mediaType === "text" &&
                      watchedValues.header?.includes("{{1}}") && (
                        <FormField
                          control={form.control}
                          name="headerVariable"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Header Variable Sample Value
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Sample value for {{1}}"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Provide a sample value for the header variable
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                    {/* Body */}
                    {!isCarousel && (
                      <FormField
                        control={form.control}
                        name="body"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Body</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Textarea
                                  placeholder="Hi {{1}}, welcome to our service! Your account has been created successfully."
                                  rows={5}
                                  maxLength={bodyCharLimit}
                                  {...field}
                                />
                                <span
                                  className={`absolute right-3 bottom-3 text-xs ${
                                    (field.value?.length || 0) >= bodyCharLimit
                                      ? "text-red-500"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {field.value?.length || 0}/{bodyCharLimit}
                                </span>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Use {"{{1}}"}, {"{{2}}"}, etc. for variables. Max{" "}
                              {bodyCharLimit} characters.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Footer - not allowed with Limited-Time Offer */}
                    {!isCarousel && !isLTO && (
                      <FormField
                        control={form.control}
                        name="footer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Footer (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  placeholder="Reply STOP to unsubscribe"
                                  maxLength={60}
                                  {...field}
                                />
                                <span
                                  className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                                    (field.value?.length || 0) > 60
                                      ? "text-red-500"
                                      : "text-gray-400"
                                  }`}
                                >
                                  {field.value?.length || 0}/60
                                </span>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Max 60 characters
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Variables */}
                    {!isCarousel &&
                      extractVariables(watchedValues.body || "").length >
                        0 && (
                        <div className="space-y-2 mt-4">
                          <Label className="text-sm font-medium">
                            Sample Values for Variables
                          </Label>
                          {extractVariables(watchedValues.body || "").map(
                            (variable, idx) => (
                              <FormField
                                key={variable}
                                control={form.control}
                                name={`variables.${idx}`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>
                                      Value for {`{{${variable}}}`}
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder={`Sample value for {{${variable}}}`}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )
                          )}
                        </div>
                      )}

                    {/* Detected Variables */}
                    {!isCarousel &&
                      watchedValues.body &&
                      extractVariables(watchedValues.body).length > 0 && (
                        <div>
                          <Label className="text-sm font-medium">
                            Detected Variables
                          </Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {extractVariables(watchedValues.body).map(
                              (variable) => (
                                <Badge key={variable} variant="secondary">
                                  <Hash className="w-3 h-3 mr-1" />
                                  Variable {variable}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Carousel Cards Section */}
                {isCarousel && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-sm text-gray-700">
                      Carousel Content
                    </h3>

                    {/* Carousel body text */}
                    <FormField
                      control={form.control}
                      name="body"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Carousel Header Text (Optional)
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Check out our latest products!"
                              rows={2}
                              maxLength={bodyCharLimit}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Text shown above the carousel cards
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-gray-700">
                        Cards ({carouselFields.length}/10)
                      </h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCarouselCard}
                        disabled={carouselFields.length >= 10}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Card
                      </Button>
                    </div>

                    {carouselFields.length < 2 && (
                      <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                        Carousel templates require at least 2 cards.
                      </p>
                    )}

                    {carouselFields.map((cardField, cardIdx) => (
                      <div
                        key={cardField.id}
                        className="border rounded-lg p-4 space-y-3 bg-gray-50"
                      >
                        <div className="flex items-center justify-between">
                          <Label className="font-medium">
                            Card {cardIdx + 1}
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCard(cardIdx)}
                            disabled={carouselFields.length <= 2}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>

                        <FormField
                          control={form.control}
                          name={`carouselCards.${cardIdx}.mediaType`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Media</FormLabel>
                              <Select
                                onValueChange={(val) => {
                                  field.onChange(val);
                                  form.setValue(`carouselCards.${cardIdx}.mediaFile` as any, null);
                                  form.setValue(`carouselCards.${cardIdx}.mediaPreview` as any, "");
                                }}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="image">Image</SelectItem>
                                  <SelectItem value="video">Video</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <div className="space-y-1">
                          <Label className="text-xs">Upload Sample Media</Label>
                          <input
                            type="file"
                            accept={
                              watchedValues.carouselCards?.[cardIdx]?.mediaType === "video"
                                ? "video/*"
                                : "image/*"
                            }
                            className="text-xs w-full"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              form.setValue(`carouselCards.${cardIdx}.mediaFile` as any, file);
                              if (file && watchedValues.carouselCards?.[cardIdx]?.mediaType !== "video") {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  form.setValue(`carouselCards.${cardIdx}.mediaPreview` as any, reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              } else {
                                form.setValue(`carouselCards.${cardIdx}.mediaPreview` as any, "");
                              }
                            }}
                          />
                          {(watchedValues.carouselCards?.[cardIdx] as any)?.mediaPreview && (
                            <img
                              src={(watchedValues.carouselCards?.[cardIdx] as any).mediaPreview}
                              alt={`Card ${cardIdx + 1} preview`}
                              className="w-20 h-20 object-cover rounded border mt-1"
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            Required for Meta template review
                          </p>
                        </div>

                        <FormField
                          control={form.control}
                          name={`carouselCards.${cardIdx}.body`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Card Text</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Textarea
                                    placeholder="Card description..."
                                    rows={2}
                                    maxLength={160}
                                    {...field}
                                  />
                                  <span className="absolute right-2 bottom-2 text-xs text-gray-400">
                                    {field.value?.length || 0}/160
                                  </span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-2">
                          <Label className="text-xs">
                            Card Buttons (max 2)
                          </Label>
                          {(
                            watchedValues.carouselCards?.[cardIdx]?.buttons ||
                            []
                          ).map((_: any, btnIdx: number) => {
                            const btnType = watchedValues.carouselCards?.[cardIdx]?.buttons?.[btnIdx]?.type || "URL";
                            const btnErrors = (form.formState.errors as any)?.carouselCards?.[cardIdx]?.buttons?.[btnIdx];
                            return (
                            <div
                              key={btnIdx}
                              className="space-y-1.5"
                            >
                              <div className="flex items-center gap-2">
                              <select
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                value={btnType}
                                onChange={(e) => {
                                  form.setValue(
                                    `carouselCards.${cardIdx}.buttons.${btnIdx}.type` as any,
                                    e.target.value as any
                                  );
                                  form.setValue(
                                    `carouselCards.${cardIdx}.buttons.${btnIdx}.url` as any,
                                    ""
                                  );
                                  form.setValue(
                                    `carouselCards.${cardIdx}.buttons.${btnIdx}.phoneNumber` as any,
                                    ""
                                  );
                                }}
                              >
                                <option value="QUICK_REPLY">Quick Reply</option>
                                <option value="URL">URL</option>
                                <option value="PHONE_NUMBER">Phone</option>
                              </select>
                              <Input
                                className="h-8 text-xs"
                                placeholder="Button text"
                                value={
                                  watchedValues.carouselCards?.[cardIdx]
                                    ?.buttons?.[btnIdx]?.text || ""
                                }
                                onChange={(e) =>
                                  form.setValue(
                                    `carouselCards.${cardIdx}.buttons.${btnIdx}.text` as any,
                                    e.target.value
                                  )
                                }
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  const current =
                                    form.getValues(
                                      `carouselCards.${cardIdx}.buttons`
                                    ) || [];
                                  form.setValue(
                                    `carouselCards.${cardIdx}.buttons`,
                                    current.filter(
                                      (_: any, i: number) => i !== btnIdx
                                    )
                                  );
                                }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                              </div>
                              {btnType === "URL" && (
                                <div className="ml-0">
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder="https://example.com"
                                    value={
                                      watchedValues.carouselCards?.[cardIdx]
                                        ?.buttons?.[btnIdx]?.url || ""
                                    }
                                    onChange={(e) =>
                                      form.setValue(
                                        `carouselCards.${cardIdx}.buttons.${btnIdx}.url` as any,
                                        e.target.value
                                      )
                                    }
                                  />
                                  {btnErrors?.url?.message && (
                                    <p className="text-xs text-red-500 mt-0.5">{btnErrors.url.message}</p>
                                  )}
                                </div>
                              )}
                              {btnType === "PHONE_NUMBER" && (
                                <div className="ml-0">
                                  <Input
                                    className="h-8 text-xs"
                                    placeholder="+1234567890"
                                    value={
                                      watchedValues.carouselCards?.[cardIdx]
                                        ?.buttons?.[btnIdx]?.phoneNumber || ""
                                    }
                                    onChange={(e) =>
                                      form.setValue(
                                        `carouselCards.${cardIdx}.buttons.${btnIdx}.phoneNumber` as any,
                                        e.target.value
                                      )
                                    }
                                  />
                                  {btnErrors?.phoneNumber?.message && (
                                    <p className="text-xs text-red-500 mt-0.5">{btnErrors.phoneNumber.message}</p>
                                  )}
                                </div>
                              )}
                              {btnErrors?.text?.message && (
                                <p className="text-xs text-red-500 mt-0.5">{btnErrors.text.message}</p>
                              )}
                            </div>
                            );
                          })}
                          {(
                            watchedValues.carouselCards?.[cardIdx]?.buttons || []
                          ).length < 2 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                const current =
                                  form.getValues(
                                    `carouselCards.${cardIdx}.buttons`
                                  ) || [];
                                form.setValue(
                                  `carouselCards.${cardIdx}.buttons`,
                                  [
                                    ...current,
                                    {
                                      type: "URL",
                                      text: "",
                                      url: "",
                                      phoneNumber: "",
                                    },
                                  ]
                                );
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Add Button
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Buttons Section (non-carousel, non-auth) */}
                {!isCarousel && !isAuthentication && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-sm text-gray-700">
                          Action Buttons
                        </h3>
                        {(hasQuickReply || hasCTA || hasCopyCode) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {hasQuickReply
                              ? `Quick Reply buttons (${quickReplyCount}/3) - cannot mix with URL/Phone buttons`
                              : `CTA buttons (${ctaCount + copyCodeCount}/2) - cannot mix with Quick Reply buttons`}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddButton}
                        disabled={!canAddButton()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Button
                      </Button>
                    </div>

                    {buttonFields.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No buttons added. Click "Add Button" to create action
                        buttons.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {buttonFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="border rounded-lg p-4 space-y-4"
                          >
                            <div className="flex items-center justify-between">
                              <Label>Button {index + 1}</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeButton(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <FormField
                              control={form.control}
                              name={`buttons.${index}.type`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Button Type</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {getAvailableButtonTypes(index).map((bt) => (
                                        <SelectItem
                                          key={bt.value}
                                          value={bt.value}
                                        >
                                          <div className="flex items-center">
                                            <bt.icon className="w-4 h-4 mr-2" />
                                            {bt.label}
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            {watchedValues.buttons?.[index]?.type !==
                              "COPY_CODE" && (
                              <FormField
                                control={form.control}
                                name={`buttons.${index}.text`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Button Text</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Input
                                          placeholder="Click me"
                                          maxLength={25}
                                          {...field}
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                          {field.value?.length || 0}/25
                                        </span>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {watchedValues.buttons?.[index]?.type ===
                              "COPY_CODE" && (
                              <FormField
                                control={form.control}
                                name={`buttons.${index}.couponCode`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Code to Copy</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Input
                                          placeholder="SAVE25"
                                          maxLength={15}
                                          {...field}
                                          onChange={(e) =>
                                            field.onChange(
                                              e.target.value
                                                .toUpperCase()
                                                .replace(/[^A-Z0-9]/g, "")
                                            )
                                          }
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                                          {field.value?.length || 0}/15
                                        </span>
                                      </div>
                                    </FormControl>
                                    <FormDescription>
                                      Alphanumeric only, max 15 characters.
                                      Button text is auto-generated as "Copy
                                      offer code"
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {watchedValues.buttons?.[index]?.type ===
                              "URL" && (
                              <FormField
                                control={form.control}
                                name={`buttons.${index}.url`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>URL</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="https://example.com/{{1}}"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      You can use {"{{1}}"} as a dynamic
                                      variable at the end of the URL
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}

                            {watchedValues.buttons?.[index]?.type ===
                              "PHONE_NUMBER" && (
                              <FormField
                                control={form.control}
                                name={`buttons.${index}.phoneNumber`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="+1234567890"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Include country code
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right side - Preview */}
              <div className="bg-gray-50 rounded-lg p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-5 h-5" />
                  <span className="font-medium">WhatsApp Preview</span>
                  {category === "MARKETING" && (
                    <Badge variant="secondary" className="text-xs">
                      {
                        MARKETING_SUBTYPES.find(
                          (s) => s.value === marketingSubType
                        )?.label
                      }
                    </Badge>
                  )}
                  {isAuthentication && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-100 text-green-800"
                    >
                      {AUTH_TYPES.find((a) => a.value === authType)?.label}
                    </Badge>
                  )}
                </div>

                {/* WhatsApp phone frame */}
                <div className="bg-[#efeae2] rounded-2xl p-4 shadow-inner min-h-[300px] flex items-start justify-center">
                  <div className="w-full">{renderPreview()}</div>
                </div>

                {/* Guidelines */}
                <div className="mt-6 space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                      Template Guidelines
                    </h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>
                        - Template names must be unique and lowercase
                      </li>
                      <li>
                        - Variables are replaced with actual values when
                        sending
                      </li>
                      <li>
                        - Templates must be approved by WhatsApp before use
                      </li>
                      {isAuthentication && (
                        <>
                          <li>
                            - Authentication templates have auto-generated body
                            text
                          </li>
                          <li>
                            - OTP codes are provided at send time
                          </li>
                        </>
                      )}
                      {isCouponCode && (
                        <li>
                          - Coupon codes are limited to 15 alphanumeric
                          characters
                        </li>
                      )}
                      {isLTO && (
                        <li>
                          - Limited-time offers show a countdown timer on the
                          recipient's device
                        </li>
                      )}
                      {isCarousel && (
                        <>
                          <li>
                            - Carousel requires 2-10 cards
                          </li>
                          <li>
                            - Each card supports image/video + text + up to 2
                            buttons
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  {category === "MARKETING" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-amber-900 mb-2">
                        Marketing Template Notice
                      </h4>
                      <p className="text-xs text-amber-800">
                        Marketing templates can only be sent to users who
                        have opted in to receive promotional messages. Ensure
                        you have proper consent before sending.
                      </p>
                    </div>
                  )}

                  {/* Button mixing rule info */}
                  {!isAuthentication && !isCarousel && buttonFields.length > 0 && (
                    <div className="bg-gray-100 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-600">
                        <strong>Button Rules:</strong> Quick Reply buttons
                        (max 3) cannot be mixed with URL/Phone/Copy Code
                        buttons (max 2). All buttons in a template must be
                        the same category.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  user?.username === "demouser" ? true : isSubmitting
                }
              >
                {isSubmitting
                  ? "Submitting..."
                  : template
                  ? "Update Template"
                  : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
