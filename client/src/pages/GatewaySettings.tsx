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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiRazorpay, SiMercadopago } from "react-icons/si";
import { FaCcStripe, FaPaypal } from "react-icons/fa";
import Header from "@/components/layout/header";
import { apiRequest } from "@/lib/queryClient";
import { Loading } from "@/components/ui/loading";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { isDemoUser } from "@/utils/maskUtils";
import {
  PROVIDER_CURRENCY_OPTIONS,
  PROVIDER_METHOD_OPTIONS,
  type PaymentProviderKey,
} from "@shared/payment-currencies";

interface PaymentProvider {
  id: string;
  name: string;
  providerKey: "razorpay" | "stripe" | "paypal" | "paystack" | "mercadopago";
  description: string;
  logo: string;
  isActive: boolean;
  config: {
    apiKey: string;
    apiSecret: string;
    apiKeyTest: string;
    apiSecretTest: string;
    webhookSecret?: string;
    webhookSecretTest?: string;
    webhookId?: string;
    webhookIdTest?: string;
    isLive: boolean;
  };
  supportedCurrencies: string[];
  supportedMethods: string[];
}

interface PaymentFormData {
  provider: "razorpay" | "stripe" | "paypal" | "paystack" | "mercadopago";
  apiKey: string;
  apiSecret: string;
  apiKeyTest: string;
  apiSecretTest: string;
  webhookSecret: string;
  webhookSecretTest: string;
  webhookId: string;
  webhookIdTest: string;
  isLive: boolean;
  isActive: boolean;
  supportedCurrencies: string[];
}

export default function GatewaySettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [showApiKeyTest, setShowApiKeyTest] = useState(false);
  const [showApiSecretTest, setShowApiSecretTest] = useState(false);
  const [existingProviderId, setExistingProviderId] = useState<string | null>(
    null
  );
  const { user } = useAuth();

  // Payment Gateway Schema with translations
  const paymentGatewaySchema = z.object({
    provider: z.enum(["razorpay", "stripe", "paypal", "paystack", "mercadopago"], {
      required_error: t("gateway.validation.providerRequired"),
    }),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    apiKeyTest: z.string().optional(),
    apiSecretTest: z.string().optional(),
    webhookSecret: z.string().optional(),
    webhookSecretTest: z.string().optional(),
    webhookId: z.string().optional(),
    webhookIdTest: z.string().optional(),
    isLive: z.boolean().default(false),
    isActive: z.boolean().default(true),
    supportedCurrencies: z.array(z.string()).default([]),
  });

  type PaymentGatewayFormData = z.infer<typeof paymentGatewaySchema>;
  // Fetch existing providers
  const { data: paymentProviders, isLoading: paymentLoading } = useQuery({
    queryKey: ["/api/payment-providers"],
    queryFn: async () => {
      const res = await fetch("/api/payment-providers");
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Payment Gateway Form
  const paymentForm = useForm<PaymentFormData>({
    resolver: zodResolver(paymentGatewaySchema),
    defaultValues: {
      provider: "razorpay",
      apiKey: "",
      apiSecret: "",
      apiKeyTest: "",
      apiSecretTest: "",
      webhookSecret: "",
      webhookSecretTest: "",
      webhookId: "",
      webhookIdTest: "",
      isLive: false,
      isActive: true,
      supportedCurrencies: PROVIDER_CURRENCY_OPTIONS.razorpay,
    },
  });

  // Load selected provider data
  useEffect(() => {
    if (!paymentProviders?.data) return;

    const provider = paymentForm.getValues("provider");
    const selectedProvider = paymentProviders.data.find(
      (p: PaymentProvider) => p.providerKey === provider
    );

    if (selectedProvider) {
      setExistingProviderId(selectedProvider.id);
      const stored = Array.isArray(selectedProvider.supportedCurrencies)
        ? selectedProvider.supportedCurrencies
        : [];
      paymentForm.reset({
        provider: selectedProvider.providerKey,
        apiKey: selectedProvider.config?.apiKey || "",
        apiSecret: selectedProvider.config?.apiSecret || "",
        apiKeyTest: selectedProvider.config?.apiKeyTest || "",
        apiSecretTest: selectedProvider.config?.apiSecretTest || "",
        webhookSecret: selectedProvider.config?.webhookSecret || "",
        webhookSecretTest: selectedProvider.config?.webhookSecretTest || "",
        webhookId: selectedProvider.config?.webhookId || "",
        webhookIdTest: selectedProvider.config?.webhookIdTest || "",
        isLive: selectedProvider.config?.isLive || false,
        isActive: selectedProvider.isActive,
        supportedCurrencies:
          stored.length > 0
            ? stored
            : PROVIDER_CURRENCY_OPTIONS[
                selectedProvider.providerKey as PaymentProviderKey
              ] ?? [],
      });
    } else {
      setExistingProviderId(null);
      paymentForm.reset({
        provider,
        apiKey: "",
        apiSecret: "",
        apiKeyTest: "",
        apiSecretTest: "",
        webhookSecret: "",
        webhookSecretTest: "",
        webhookId: "",
        webhookIdTest: "",
        isLive: false,
        isActive: false,
        supportedCurrencies:
          PROVIDER_CURRENCY_OPTIONS[provider as PaymentProviderKey] ?? [],
      });
    }
  }, [paymentForm.watch("provider"), paymentProviders]);

  // Upsert provider
  const upsertMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const payload = {
        name: { razorpay: "Razorpay", stripe: "Stripe", paypal: "PayPal", paystack: "Paystack", mercadopago: "Mercado Pago" }[data.provider] || data.provider,
        providerKey: data.provider,
        description: "",
        logo: `${data.provider}.png`,
        isActive: data.isActive,
        config: {
          apiKey: data.apiKey,
          apiSecret: data.apiSecret,
          apiKeyTest: data.apiKeyTest,
          apiSecretTest: data.apiSecretTest,
          webhookSecret: data.webhookSecret,
          webhookSecretTest: data.webhookSecretTest,
          webhookId: data.webhookId,
          webhookIdTest: data.webhookIdTest,
          isLive: data.isLive,
        },
        supportedCurrencies: data.supportedCurrencies,
        supportedMethods:
          PROVIDER_METHOD_OPTIONS[data.provider as PaymentProviderKey] ?? [],
      };

      let url = "/api/payment-providers";
      let method = "POST";

      if (existingProviderId) {
        url = `/api/payment-providers/${existingProviderId}`;
        method = "PUT";
      }

      const res = await apiRequest(method as "POST" | "PUT", url, payload);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || t("gateway.toast.errorDesc"));
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: existingProviderId
          ? t("gateway.toast.updated")
          : t("gateway.toast.created"),
        description: data.message || t("gateway.toast.successDesc"),
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/payment-providers"],
      });
    },
    onError: (err: any) => {
      toast({
        title: t("gateway.toast.error"),
        description: err?.message || t("gateway.toast.errorDesc"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    upsertMutation.mutate(data);
  };

  if (paymentLoading) {
    return (
      <div className="flex-1 dots-bg min-h-screen">
        <Header title={t("gateway.title")} subtitle={t("gateway.subtitle")} />
        <main className="p-6">
          <Loading />
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header title={t("gateway.title")} subtitle={t("gateway.subtitle")} />

      <main className="p-6 space-y-6">
        {/* Stats Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("gateway.stats.activeProvider")}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">
                    {paymentProviders?.data?.find(
                      (p: PaymentProvider) => p.isActive
                    )?.name || t("gateway.stats.none")}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("gateway.stats.provider")}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">
                    {paymentForm.watch("provider")}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  {paymentForm.watch("provider") === "razorpay" ? (
                    <SiRazorpay className="w-6 h-6 text-purple-600" />
                  ) : paymentForm.watch("provider") === "paypal" ? (
                    <FaPaypal className="w-6 h-6 text-purple-600" />
                  ) : paymentForm.watch("provider") === "mercadopago" ? (
                    <SiMercadopago className="w-6 h-6 text-purple-600" />
                  ) : paymentForm.watch("provider") === "paystack" ? (
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  ) : (
                    <FaCcStripe className="w-6 h-6 text-purple-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("gateway.stats.environment")}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {paymentForm.watch("isLive")
                      ? t("gateway.stats.live")
                      : t("gateway.stats.test")}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    paymentForm.watch("isLive")
                      ? "bg-green-100"
                      : "bg-orange-100"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full ${
                      paymentForm.watch("isLive")
                        ? "bg-green-500"
                        : "bg-orange-500"
                    } flex items-center justify-center`}
                  >
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {t("gateway.stats.status")}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {paymentForm.watch("isActive")
                      ? t("gateway.stats.active")
                      : t("gateway.stats.inactive")}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    paymentForm.watch("isActive")
                      ? "bg-green-100"
                      : "bg-red-100"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full ${
                      paymentForm.watch("isActive")
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                {t("gateway.card.title")}
              </CardTitle>
              {existingProviderId && (
                <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  {t("gateway.card.configured")}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={paymentForm.handleSubmit(onSubmit)}
              className="space-y-6"
            >
              {/* Provider Select */}
              <div className="space-y-2">
                <Label>{t("gateway.form.providerLabel")}</Label>
                <Select
                  value={paymentForm.watch("provider")}
                  onValueChange={(value) =>
                    paymentForm.setValue("provider", value as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("gateway.form.selectProvider")}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="razorpay">
                      <div className="flex items-center gap-2">
                        <SiRazorpay className="w-4 h-4" />
                        <span>{t("gateway.form.razorpay")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="stripe">
                      <div className="flex items-center gap-2">
                        <FaCcStripe className="w-4 h-4" />
                        <span>{t("gateway.form.stripe")}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="paypal">
                      <div className="flex items-center gap-2">
                        <FaPaypal className="w-4 h-4" />
                        <span>PayPal</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="paystack">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        <span>Paystack</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="mercadopago">
                      <div className="flex items-center gap-2">
                        <SiMercadopago className="w-4 h-4" />
                        <span>Mercado Pago</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {paymentForm.formState.errors.provider && (
                  <p className="text-red-500 text-sm">
                    {paymentForm.formState.errors.provider.message}
                  </p>
                )}
              </div>

              {/* Environment Mode Toggle */}
              <div className="space-y-2">
                <Label>{t("gateway.form.environmentLabel")}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={
                      !paymentForm.watch("isLive") ? "default" : "outline"
                    }
                    onClick={() => paymentForm.setValue("isLive", false)}
                    className="flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      {t("gateway.form.testMode")}
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant={
                      paymentForm.watch("isLive") ? "default" : "outline"
                    }
                    onClick={() => paymentForm.setValue("isLive", true)}
                    className="flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {t("gateway.form.liveMode")}
                    </div>
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {paymentForm.watch("isLive")
                    ? t("gateway.form.liveModeWarning")
                    : t("gateway.form.testModeSafe")}
                </p>
              </div>

              {/* Test API Keys Section */}
              {!paymentForm.watch("isLive") && (
              <div className="space-y-4 p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-orange-900">
                    {t("gateway.form.testCredentials")}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Test API Key */}
                  <div className="space-y-2">
                    <Label htmlFor="apiKeyTest">
                      {t("gateway.form.testApiKey")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="apiKeyTest"
                        {...paymentForm.register("apiKeyTest")}
                        type={showApiKeyTest && !isDemoUser(user?.username) ? "text" : "password"}
                        placeholder={
                          paymentForm.watch("provider") === "razorpay"
                            ? t("gateway.form.testApiKeyPlaceholderRazorpay")
                            : paymentForm.watch("provider") === "paypal"
                            ? "PayPal Client ID"
                            : paymentForm.watch("provider") === "paystack"
                            ? "Paystack Public Key"
                            : paymentForm.watch("provider") === "mercadopago"
                            ? "Mercado Pago Public Key"
                            : t("gateway.form.testApiKeyPlaceholderStripe")
                        }
                        className="pr-10"
                        readOnly={isDemoUser(user?.username)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => !isDemoUser(user?.username) && setShowApiKeyTest(!showApiKeyTest)}
                        disabled={isDemoUser(user?.username)}
                      >
                        {showApiKeyTest && !isDemoUser(user?.username) ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                    {paymentForm.formState.errors.apiKeyTest && (
                      <p className="text-red-500 text-sm">
                        {paymentForm.formState.errors.apiKeyTest.message}
                      </p>
                    )}
                  </div>

                  {/* Test API Secret */}
                  <div className="space-y-2">
                    <Label htmlFor="apiSecretTest">
                      {t("gateway.form.testApiSecret")}
                    </Label>
                    <div className="relative">
                      <Input
                        id="apiSecretTest"
                        {...paymentForm.register("apiSecretTest")}
                        type={showApiSecretTest && !isDemoUser(user?.username) ? "text" : "password"}
                        placeholder={t("gateway.form.testApiSecretPlaceholder")}
                        className="pr-10"
                        readOnly={isDemoUser(user?.username)}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => !isDemoUser(user?.username) && setShowApiSecretTest(!showApiSecretTest)}
                        disabled={isDemoUser(user?.username)}
                      >
                        {showApiSecretTest && !isDemoUser(user?.username) ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                    {paymentForm.formState.errors.apiSecretTest && (
                      <p className="text-red-500 text-sm">
                        {paymentForm.formState.errors.apiSecretTest.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="webhookSecretTest">Webhook secret (test)</Label>
                    <Input
                      id="webhookSecretTest"
                      {...paymentForm.register("webhookSecretTest")}
                      type="password"
                      placeholder="Signing secret for sandbox webhook events"
                      readOnly={isDemoUser(user?.username)}
                    />
                  </div>

                  {paymentForm.watch("provider") === "paypal" && (
                    <div className="space-y-2">
                      <Label htmlFor="webhookIdTest">Webhook ID (test)</Label>
                      <Input
                        id="webhookIdTest"
                        {...paymentForm.register("webhookIdTest")}
                        placeholder="Sandbox webhook ID from PayPal"
                        readOnly={isDemoUser(user?.username)}
                      />
                    </div>
                  )}
                </div>
              </div>
              )}


               {paymentForm.watch("isLive") && (
  <div className="space-y-4 p-4 border-2 border-green-200 rounded-lg bg-green-50">
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
      <h3 className="text-lg font-semibold text-green-900">
        {t("gateway.form.liveCredentials")}
      </h3>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Live API Key */}
      <div className="space-y-2">
        <Label htmlFor="apiKey">{t("gateway.form.liveApiKey")}</Label>
        <div className="relative">
          <Input
            id="apiKey"
            {...paymentForm.register("apiKey")}
            type={showApiKey && !isDemoUser(user?.username) ? "text" : "password"}
            className="pr-10"
            readOnly={isDemoUser(user?.username)}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => !isDemoUser(user?.username) && setShowApiKey(!showApiKey)}
            disabled={isDemoUser(user?.username)}
          >
            {showApiKey && !isDemoUser(user?.username) ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Live API Secret */}
      <div className="space-y-2">
        <Label htmlFor="apiSecret">{t("gateway.form.liveApiSecret")}</Label>
        <div className="relative">
          <Input
            id="apiSecret"
            {...paymentForm.register("apiSecret")}
            type={showApiSecret && !isDemoUser(user?.username) ? "text" : "password"}
            className="pr-10"
            readOnly={isDemoUser(user?.username)}
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => !isDemoUser(user?.username) && setShowApiSecret(!showApiSecret)}
            disabled={isDemoUser(user?.username)}
          >
            {showApiSecret && !isDemoUser(user?.username) ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="webhookSecret">Webhook secret</Label>
        <Input
          id="webhookSecret"
          {...paymentForm.register("webhookSecret")}
          type="password"
          placeholder="Signing secret for live webhook events"
          readOnly={isDemoUser(user?.username)}
        />
      </div>

      {paymentForm.watch("provider") === "paypal" && (
        <div className="space-y-2">
          <Label htmlFor="webhookId">Webhook ID</Label>
          <Input
            id="webhookId"
            {...paymentForm.register("webhookId")}
            placeholder="Live webhook ID from PayPal"
            readOnly={isDemoUser(user?.username)}
          />
        </div>
      )}
    </div>
  </div>
)}

              {/* Supported Currencies multi-select */}
              <div className="space-y-2 p-4 border rounded-lg bg-gray-50">
                <Label className="font-medium">
                  Supported Currencies
                </Label>
                <p className="text-sm text-gray-600">
                  Select which currencies this gateway should be offered for
                  on the plan upgrade page. Leave at least one checked or this
                  gateway will not appear to customers.
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2">
                  {(PROVIDER_CURRENCY_OPTIONS[
                    paymentForm.watch("provider") as PaymentProviderKey
                  ] ?? []).map((cur) => {
                    const selected =
                      paymentForm.watch("supportedCurrencies") || [];
                    const checked = selected.includes(cur);
                    return (
                      <label
                        key={cur}
                        className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer text-sm ${
                          checked
                            ? "bg-blue-50 border-blue-400 text-blue-900"
                            : "bg-white border-gray-200 text-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isDemoUser(user?.username)}
                          onChange={(e) => {
                            const current =
                              paymentForm.getValues("supportedCurrencies") || [];
                            if (e.target.checked) {
                              if (!current.includes(cur)) {
                                paymentForm.setValue(
                                  "supportedCurrencies",
                                  [...current, cur],
                                  { shouldDirty: true }
                                );
                              }
                            } else {
                              paymentForm.setValue(
                                "supportedCurrencies",
                                current.filter((c) => c !== cur),
                                { shouldDirty: true }
                              );
                            }
                          }}
                        />
                        <span>{cur}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle */}
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div>
                  <Label htmlFor="isActive" className="font-medium">
                    {t("gateway.form.enableGateway")}
                  </Label>
                  <p className="text-sm text-gray-600">
                    {t("gateway.form.enableGatewayDesc")}
                  </p>
                </div>
                <input
                  id="isActive"
                  type="checkbox"
                  {...paymentForm.register("isActive")}
                  checked={paymentForm.watch("isActive")}
                  onChange={(e) =>
                    paymentForm.setValue("isActive", e.target.checked)
                  }
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div> 



              {/* Provider Information */}
              {paymentForm.watch("provider") === "razorpay" && (
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-900 flex items-center gap-2">
                      <SiRazorpay className="w-4 h-4" />
                      {t("gateway.razorpay.title")}
                    </h4>
                    <p className="text-sm text-blue-800">
                      {t("gateway.razorpay.description")}
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1 mt-2">
                      <li>
                        • {t("gateway.razorpay.testKeyInfo")}{" "}
                        <code className="bg-blue-100 px-1 rounded">
                          rzp_test_
                        </code>
                      </li>
                      <li>
                        • {t("gateway.razorpay.liveKeyInfo")}{" "}
                        <code className="bg-blue-100 px-1 rounded">
                          rzp_live_
                        </code>
                      </li>
                    </ul>
                    <a
                      href="https://dashboard.razorpay.com/app/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline inline-block mt-2"
                    >
                      {t("gateway.razorpay.getKeys")}
                    </a>
                  </div>
                </div>
              )}

              {paymentForm.watch("provider") === "stripe" && (
                <div className="p-4 border rounded-lg bg-purple-50">
                  <div className="space-y-2">
                    <h4 className="font-medium text-purple-900 flex items-center gap-2">
                      <FaCcStripe className="w-4 h-4" />
                      {t("gateway.stripe.title")}
                    </h4>
                    <p className="text-sm text-purple-800">
                      {t("gateway.stripe.description")}
                    </p>
                    <ul className="text-sm text-purple-800 space-y-1 mt-2">
                      <li>
                        • {t("gateway.stripe.testKeyInfo")}{" "}
                        <code className="bg-purple-100 px-1 rounded">
                          pk_test_
                        </code>{" "}
                        {t("gateway.stripe.testKeyInfoOr")}{" "}
                        <code className="bg-purple-100 px-1 rounded">
                          sk_test_
                        </code>
                      </li>
                      <li>
                        • {t("gateway.stripe.liveKeyInfo")}{" "}
                        <code className="bg-purple-100 px-1 rounded">
                          pk_live_
                        </code>{" "}
                        {t("gateway.stripe.liveKeyInfoOr")}{" "}
                        <code className="bg-purple-100 px-1 rounded">
                          sk_live_
                        </code>
                      </li>
                    </ul>
                    <a
                      href="https://dashboard.stripe.com/apikeys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-purple-600 hover:underline inline-block mt-2"
                    >
                      {t("gateway.stripe.getKeys")}
                    </a>
                  </div>
                </div>
              )}

              {paymentForm.watch("provider") === "paypal" && (
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-900 flex items-center gap-2">
                      <FaPaypal className="w-4 h-4" />
                      PayPal Configuration
                    </h4>
                    <p className="text-sm text-blue-800">
                      Configure your PayPal REST API credentials for subscription billing.
                    </p>
                    <ul className="text-sm text-blue-800 space-y-1 mt-2">
                      <li>
                        • API Key field = <strong>Client ID</strong>
                      </li>
                      <li>
                        • API Secret field = <strong>Client Secret</strong>
                      </li>
                      <li>
                        • Use Sandbox credentials in Test mode and Live credentials in Live mode
                      </li>
                    </ul>
                    <a
                      href="https://developer.paypal.com/dashboard/applications"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline inline-block mt-2"
                    >
                      Get PayPal API Credentials →
                    </a>
                  </div>
                </div>
              )}

              {paymentForm.watch("provider") === "paystack" && (
                <div className="p-4 border rounded-lg bg-teal-50">
                  <div className="space-y-2">
                    <h4 className="font-medium text-teal-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Paystack Configuration
                    </h4>
                    <p className="text-sm text-teal-800">
                      Configure your Paystack API credentials for payment processing.
                    </p>
                    <ul className="text-sm text-teal-800 space-y-1 mt-2">
                      <li>
                        • API Key field = <strong>Public Key</strong> (starts with{" "}
                        <code className="bg-teal-100 px-1 rounded">pk_test_</code> or{" "}
                        <code className="bg-teal-100 px-1 rounded">pk_live_</code>)
                      </li>
                      <li>
                        • API Secret field = <strong>Secret Key</strong> (starts with{" "}
                        <code className="bg-teal-100 px-1 rounded">sk_test_</code> or{" "}
                        <code className="bg-teal-100 px-1 rounded">sk_live_</code>)
                      </li>
                    </ul>
                    <a
                      href="https://dashboard.paystack.com/#/settings/developers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-teal-600 hover:underline inline-block mt-2"
                    >
                      Get Paystack API Keys →
                    </a>
                  </div>
                </div>
              )}

              {paymentForm.watch("provider") === "mercadopago" && (
                <div className="p-4 border rounded-lg bg-sky-50">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sky-900 flex items-center gap-2">
                      <SiMercadopago className="w-4 h-4" />
                      Mercado Pago Configuration
                    </h4>
                    <p className="text-sm text-sky-800">
                      Configure your Mercado Pago credentials for subscription billing.
                    </p>
                    <ul className="text-sm text-sky-800 space-y-1 mt-2">
                      <li>
                        • API Key field = <strong>Public Key</strong>
                      </li>
                      <li>
                        • API Secret field = <strong>Access Token</strong>
                      </li>
                      <li>
                        • Use test credentials from your Mercado Pago developer account for Test mode
                      </li>
                    </ul>
                    <a
                      href="https://www.mercadopago.com/developers/panel/app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-sky-600 hover:underline inline-block mt-2"
                    >
                      Get Mercado Pago Credentials →
                    </a>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  type="submit"
                  disabled={upsertMutation.isPending || user?.username === "demoadmin"}
                  className="min-w-[200px]"
                >
                  {upsertMutation.isPending
                    ? t("gateway.form.saving")
                    : existingProviderId
                    ? t("gateway.form.updateSettings")
                    : t("gateway.form.saveSettings")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
