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
import {
  Check,
  X,
  Zap,
  Crown,
  Rocket,
  Star,
  Plus,
  Edit,
  Trash2,
  Save,
  XCircle,
  AlertCircle,
  RefreshCw,
  Award,
} from "lucide-react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Feature,
  PaymentProvidersResponse,
  Plan,
  PlanPermissions,
  PlansDataTypes,
  SubscriptionData,
  SubscriptionResponse,
} from "@/types/types";
import { useAuth } from "@/contexts/auth-context";
import CheckoutModal from "@/components/modals/CheckoutPage";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import BillingSubscriptionPage from "@/components/billing-subscription-page";

// Interfaces
interface FormData {
  name: string;
  description: string;
  icon: string;
  popular: boolean;
  badge: string;
  color: string;
  buttonColor: string;
  monthlyPrice: string;
  annualPrice: string;
  multiCurrencyPrices: Record<string, { monthly: string; annual: string }>;
  permissions: PlanPermissions;
  features: Feature[];
}

export default function Plans() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isAnnual, setIsAnnual] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { user, currencySymbol, currency, userPlans } = useAuth();

  // userPlans from auth context is loosely typed (`any[]`) but at runtime is
  // a SubscriptionResponse once the query resolves, or an empty array before
  // it resolves. Normalize to a typed list of items for safe access.
  const userPlansResponse = userPlans as SubscriptionResponse | SubscriptionData[] | undefined;
  const userPlanItems: SubscriptionData[] = Array.isArray(userPlansResponse)
    ? []
    : userPlansResponse?.data ?? [];

  const { data: currencyMapData } = useQuery<{
    success: boolean;
    data: {
      currencyMap: Record<string, { providerKey: string; providerId: string; providerName: string }[]>;
      availableCurrencies: string[];
    };
  }>({
    queryKey: ["/api/payment-providers/currency-map"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/payment-providers/currency-map");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const availableCurrencies = currencyMapData?.data?.availableCurrencies || [];
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");

  // Filter currencies to only show those configured by admin, plus default/USD
  const displayedCurrencies = availableCurrencies.filter(cur => {
    if (cur === "USD" || cur === currency?.toUpperCase()) return true;
    return plans.some(p => p.multiCurrencyPrices && p.multiCurrencyPrices[cur]);
  });

  useEffect(() => {
    if (displayedCurrencies.length > 0 && !selectedCurrency) {
      if (displayedCurrencies.includes("USD")) {
        setSelectedCurrency("USD");
      } else {
        const upper = currency?.toUpperCase() || "";
        if (displayedCurrencies.includes(upper)) {
          setSelectedCurrency(upper);
        } else {
          setSelectedCurrency(displayedCurrencies[0]);
        }
      }
    }
  }, [displayedCurrencies, currency]);

  const currencySymbolMap: Record<string, string> = {
    USD: "$",
    INR: "₹",
    EUR: "€",
    GBP: "£",
    AED: "د.إ",
    SGD: "S$",
    AUD: "A$",
    CAD: "C$",
    JPY: "¥",
    CNY: "¥",
    BRL: "R$",
    MXN: "MX$",
    ZAR: "R",
  };
  const activeCurrencySymbol = selectedCurrency
    ? (currencySymbolMap[selectedCurrency] || selectedCurrency + " ")
    : currencySymbol;

  const purchasedPlans = userPlanItems
    .filter((p): p is SubscriptionData => !!p?.subscription)
    .map((p) => ({
      planId: p.subscription.planId,
      name: p.subscription.planData?.name,
      status: p.subscription.status, // active / expired
    }));

  console.log("userPlans in plans page:", purchasedPlans);

  const isSuper = user?.role === "superadmin";

  const { data: paymentProviders, isLoading: isLoadingProviders } =
    useQuery<PaymentProvidersResponse>({
      queryKey: ["/api/payment-providers"],
      queryFn: async () => {
        const res = await apiRequest("GET", "/api/payment-providers");
        if (!res.ok) throw new Error("Failed to fetch payment providers");
        const data = await res.json();
        return data;
      },
      enabled: !!user?.id,
    });

  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    icon: "Zap",
    popular: false,
    badge: "",
    color: "border-gray-200",
    buttonColor: "bg-blue-500 hover:bg-blue-600",
    monthlyPrice: "0",
    annualPrice: "0",
    multiCurrencyPrices: {},
    permissions: {
      channel: "",
      contacts: "",
      automation: "",
      campaign: "",
    },
    features: [],
  });

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Zap,
    Crown,
    Rocket,
    Star,
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const [changingPlanId, setChangingPlanId] = useState<string | null>(null);

  const handleSelectPlan = (plan: Plan) => {
    if (!user) {
      return toast({
        title: t("plans.toast.authRequired"),
        description: t("plans.toast.authRequiredDesc"),
        variant: "destructive",
      });
    }
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  const handleChangePlan = async (plan: Plan) => {
    if (!user) {
      return toast({
        title: t("plans.toast.authRequired"),
        description: t("plans.toast.authRequiredDesc"),
        variant: "destructive",
      });
    }

    const activeSub = userPlanItems.find(
      (p) => p?.subscription?.status === "active"
    )?.subscription;

    if (!activeSub) {
      setSelectedPlan(plan);
      setCheckoutOpen(true);
      return;
    }

    const currentMonthlyPrice = Number(activeSub.planData?.monthlyPrice || 0);
    const newMonthlyPrice = Number(plan.monthlyPrice || 0);
    const isDowngrade = newMonthlyPrice < currentMonthlyPrice;

    if (!isDowngrade) {
      setSelectedPlan(plan);
      setCheckoutOpen(true);
      return;
    }

    if (!confirm(`Are you sure you want to downgrade to ${plan.name}? Your plan features will be reduced.`)) return;

    setChangingPlanId(plan.id);
    try {
      const response = await apiRequest("POST", "/api/subscriptions/change-plan", {
        userId: user.id,
        newPlanId: plan.id,
        billingCycle: activeSub.billingCycle || "monthly",
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Plan Downgraded",
          description: `Your plan has been changed to ${plan.name} successfully.`,
        });
        window.location.reload();
      } else {
        throw new Error(data.message || "Failed to change plan");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change plan",
        variant: "destructive",
      });
    } finally {
      setChangingPlanId(null);
    }
  };

  const fetchPlans = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await apiRequest("GET", "/api/admin/plans");
      const data: PlansDataTypes = await response.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast({
        title: t("plans.toast.error"),
        description: t("plans.toast.fetchError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      const url = editingPlan
        ? `/api/admin/plans/${editingPlan.id}`
        : `/api/admin/plans`;

      const method = editingPlan ? "PUT" : "POST";

      const response = await apiRequest(method as "POST" | "PUT", url, formData);

      const data = await response.json();

      if (data.success) {
        toast({
          title: editingPlan
            ? t("plans.toast.planUpdated")
            : t("plans.toast.planCreated"),
          description: editingPlan
            ? t("plans.toast.planUpdatedDesc")
            : t("plans.toast.planCreatedDesc"),
        });
        fetchPlans();
        resetForm();
      }
    } catch (error) {
      console.error("Error saving plan:", error);
      toast({
        title: t("plans.toast.error"),
        description: t("plans.toast.saveError"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm(t("plans.toast.deleteConfirm"))) return;

    try {
      const response = await apiRequest("DELETE", `/api/admin/plans/${id}`);

      const data = await response.json();

      if (data.success) {
        toast({
          title: t("plans.toast.planDeleted"),
          description: t("plans.toast.planDeletedDesc"),
        });
        fetchPlans();
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({
        title: t("plans.toast.error"),
        description: t("plans.toast.deleteError"),
        variant: "destructive",
      });
    }
  };

  const [syncingPlanId, setSyncingPlanId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const handleSyncPlan = async (planId: string): Promise<void> => {
    setSyncingPlanId(planId);
    try {
      const response = await apiRequest("POST", `/api/admin/plans/${planId}/sync-gateway`, {});
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Plan Synced",
          description: "Plan has been synced to payment gateways successfully.",
        });
        fetchPlans();
      } else {
        throw new Error(data.message || "Sync failed");
      }
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync plan to gateways",
        variant: "destructive",
      });
    } finally {
      setSyncingPlanId(null);
    }
  };

  const handleSyncAllPlans = async (): Promise<void> => {
    setSyncingAll(true);
    try {
      const response = await apiRequest("POST", "/api/admin/plans/sync-all-gateways", {});
      const data = await response.json();
      if (data.success) {
        toast({
          title: "All Plans Synced",
          description: `${data.data.synced} plans synced, ${data.data.failed} failed.`,
        });
        fetchPlans();
      } else {
        throw new Error(data.message || "Bulk sync failed");
      }
    } catch (error: any) {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync plans to gateways",
        variant: "destructive",
      });
    } finally {
      setSyncingAll(false);
    }
  };

  const [newCurrencyToAdd, setNewCurrencyToAdd] = useState("");

  const handleEdit = (plan: Plan): void => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name || "",
      description: plan.description || "",
      icon: plan.icon || "Zap",
      popular: plan.popular || false,
      badge: plan.badge || "",
      color: plan.color || "border-gray-200",
      buttonColor: plan.buttonColor || "bg-blue-500 hover:bg-blue-600",
      monthlyPrice: plan.monthlyPrice || "0",
      annualPrice: plan.annualPrice || "0",
      multiCurrencyPrices: plan.multiCurrencyPrices || {},
      permissions: {
        channel: "",
        contacts: "",
        automation: "",
        campaign: "",
        apiRequestsPerMonth: "",
        apiRateLimitPerMinute: "",
        ...(plan.permissions || {}),
      },
      features: (plan.features || []).map((f: any) => {
        if (typeof f === "string") {
          return { name: f, included: true };
        }
        if (typeof f === "object" && f !== null) {
          return {
            name: typeof f.name === "string" ? f.name : "",
            included: typeof f.included === "boolean" ? f.included : true,
          };
        }
        return { name: "", included: true };
      }),
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = (): void => {
    setFormData({
      name: "",
      description: "",
      icon: "Zap",
      popular: false,
      badge: "",
      color: "border-gray-200",
      buttonColor: "bg-blue-500 hover:bg-blue-600",
      monthlyPrice: "0",
      annualPrice: "0",
      multiCurrencyPrices: {},
      permissions: { channel: "", contacts: "", automation: "", campaign: "", apiRequestsPerMonth: "", apiRateLimitPerMinute: "" },
      features: [],
    });
    setEditingPlan(null);
    setShowForm(false);
  };

  const addFeature = (): void => {
    setFormData({
      ...formData,
      features: [...formData.features, { name: "", included: true }],
    });
  };

  const updateFeature = (
    index: number,
    field: keyof Feature,
    value: string | boolean
  ): void => {
    const newFeatures = [...formData.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setFormData({ ...formData, features: newFeatures });
  };

  const removeFeature = (index: number): void => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData({ ...formData, features: newFeatures });
  };

  return (
    <div className="flex-1 dots-bg min-h-screen dots-bg">
      {user?.role === "superadmin" ? (
        <Header
          title={t("plans.adminTitle")}
          subtitle={t("plans.adminSubTitle")}
        />
      ) : (
        <Header title={t("plans.title")} subtitle={t("plans.subtitle")} />
      )}

      {user?.role !== "superadmin" && <BillingSubscriptionPage />}

      <main className="p-6 space-y-6">
        {/* Stats Card */}
        {isSuper && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("plans.stats.totalPlans")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {plans.length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Award className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("plans.stats.featured")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {plans.filter((p) => p.popular).length}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Star className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("plans.stats.active")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {plans.length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {t("plans.stats.billing")}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {isAnnual
                        ? t("plans.stats.annual")
                        : t("plans.stats.monthly")}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <RefreshCw className="w-6 h-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                {t("plans.title").split(" ")[2]}
              </CardTitle>
              <div className="w-full">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setIsAnnual(false)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all w-full sm:w-auto text-center ${
                          !isAnnual
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                        aria-pressed={!isAnnual}
                      >
                        <span className="truncate">
                          {t("plans.billingToggle.monthly")}
                        </span>
                      </button>

                      <button
                        onClick={() => setIsAnnual(true)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all w-full sm:w-auto text-center ${
                          isAnnual
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                        aria-pressed={isAnnual}
                      >
                        <span className="truncate inline-flex items-center">
                          {t("plans.billingToggle.annual")}
                          {isAnnual && (
                            <span className="ml-1 text-xs text-green-600 font-bold">
                              {t("plans.billingToggle.discount")}
                            </span>
                          )}
                        </span>
                      </button>
                    </div>

                    {displayedCurrencies.length > 1 && (
                      <select
                        value={selectedCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer"
                      >
                        {displayedCurrencies.map((cur) => (
                          <option key={cur} value={cur}>
                            {currencySymbolMap[cur] || ""} {cur}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {isSuper && (
                    <div className="flex-shrink-0 w-full sm:w-auto flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleSyncAllPlans}
                        disabled={syncingAll}
                        className="flex items-center justify-center"
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${syncingAll ? "animate-spin" : ""}`} />
                        {syncingAll ? "Syncing..." : "Sync All to Gateways"}
                      </Button>
                      <Button
                        onClick={() => setShowForm(!showForm)}
                        className="w-full sm:w-auto flex items-center justify-center"
                        aria-expanded={showForm}
                      >
                        {showForm ? (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            {t("plans.buttons.cancel")}
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            {t("plans.buttons.createPlan")}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Create/Edit Form */}
            {showForm && (
              <div className="mb-8 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingPlan
                    ? t("plans.form.editTitle")
                    : t("plans.form.createTitle")}
                </h3>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.planName")}
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder={t("plans.form.planNamePlaceholder")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.icon")}
                      </label>
                      <select
                        value={formData.icon}
                        onChange={(e) =>
                          setFormData({ ...formData, icon: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="Zap">
                          {t("plans.form.iconOptions.zap")}
                        </option>
                        <option value="Crown">
                          {t("plans.form.iconOptions.crown")}
                        </option>
                        <option value="Rocket">
                          {t("plans.form.iconOptions.rocket")}
                        </option>
                        <option value="Star">
                          {t("plans.form.iconOptions.star")}
                        </option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.description")}
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder={t("plans.form.descriptionPlaceholder")}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.monthlyPrice")} ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.monthlyPrice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            monthlyPrice: e.target.value,
                          })
                        }
                        placeholder={t("plans.form.monthlyPricePlaceholder")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.annualPrice")} ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.annualPrice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            annualPrice: e.target.value,
                          })
                        }
                        placeholder={t("plans.form.annualPricePlaceholder")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Multi-Currency Pricing */}
                  <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Multi-Currency Pricing (Optional)</h4>
                      <div className="flex items-center gap-2">
                        <select
                          id="new-currency-select"
                          className="px-2 py-1 text-sm border border-gray-300 rounded-md outline-none"
                          value={newCurrencyToAdd}
                          onChange={(e) => setNewCurrencyToAdd(e.target.value)}
                        >
                          <option value="" disabled>Add Currency...</option>
                          {availableCurrencies
                            .filter(cur => cur !== currency && !formData.multiCurrencyPrices[cur])
                            .map(cur => (
                              <option key={cur} value={cur}>{cur}</option>
                            ))
                          }
                        </select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (newCurrencyToAdd) {
                              setFormData({
                                ...formData,
                                multiCurrencyPrices: {
                                  ...formData.multiCurrencyPrices,
                                  [newCurrencyToAdd]: { monthly: "0", annual: "0" }
                                }
                              });
                              setNewCurrencyToAdd("");
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {Object.entries(formData.multiCurrencyPrices).map(([cur, prices]) => (
                        <div key={cur} className="flex items-center gap-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                          <span className="font-bold text-gray-700 min-w-[50px]">{cur}</span>
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Monthly</label>
                              <input
                                type="number"
                                step="0.01"
                                value={prices.monthly}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  multiCurrencyPrices: {
                                    ...formData.multiCurrencyPrices,
                                    [cur]: { ...prices, monthly: e.target.value }
                                  }
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Annual</label>
                              <input
                                type="number"
                                step="0.01"
                                value={prices.annual}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  multiCurrencyPrices: {
                                    ...formData.multiCurrencyPrices,
                                    [cur]: { ...prices, annual: e.target.value }
                                  }
                                })}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newPrices = { ...formData.multiCurrencyPrices };
                              delete newPrices[cur];
                              setFormData({ ...formData, multiCurrencyPrices: newPrices });
                            }}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors self-end"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Customization */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.badgeText")}
                      </label>
                      <input
                        type="text"
                        value={formData.badge}
                        onChange={(e) =>
                          setFormData({ ...formData, badge: e.target.value })
                        }
                        placeholder={t("plans.form.badgePlaceholder")}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.borderColor")}
                      </label>
                      <select
                        value={formData.color}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="border-gray-200">
                          {t("plans.form.borderOptions.gray")}
                        </option>
                        <option value="border-blue-500">
                          {t("plans.form.borderOptions.blue")}
                        </option>
                        <option value="border-purple-500">
                          {t("plans.form.borderOptions.purple")}
                        </option>
                        <option value="border-green-500">
                          {t("plans.form.borderOptions.green")}
                        </option>
                        <option value="border-pink-500">
                          {t("plans.form.borderOptions.pink")}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.permissions.channels")}
                      </label>
                      <input
                        type="text"
                        value={formData.permissions.channel}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            permissions: {
                              ...formData.permissions,
                              channel: e.target.value,
                            },
                          })
                        }
                        placeholder={t(
                          "plans.form.permissions.channelsPlaceholder"
                        )}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.permissions.contacts")}
                      </label>
                      <input
                        type="text"
                        value={formData.permissions.contacts}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            permissions: {
                              ...formData.permissions,
                              contacts: e.target.value,
                            },
                          })
                        }
                        placeholder={t(
                          "plans.form.permissions.contactsPlaceholder"
                        )}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.permissions.automation")}
                      </label>
                      <input
                        type="text"
                        value={formData.permissions.automation}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            permissions: {
                              ...formData.permissions,
                              automation: e.target.value,
                            },
                          })
                        }
                        placeholder={t(
                          "plans.form.permissions.automationPlaceholder"
                        )}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.permissions.campaign")}
                      </label>
                      <input
                        type="text"
                        value={formData.permissions.campaign}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            permissions: {
                              ...formData.permissions,
                              campaign: e.target.value,
                            },
                          })
                        }
                        placeholder={t(
                          "plans.form.permissions.campaignPlaceholder"
                        )}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.permissions.apiRequestsPerMonth")}
                      </label>
                      <input
                        type="text"
                        value={formData.permissions.apiRequestsPerMonth || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            permissions: {
                              ...formData.permissions,
                              apiRequestsPerMonth: e.target.value,
                            },
                          })
                        }
                        placeholder={t(
                          "plans.form.permissions.apiRequestsPerMonthPlaceholder"
                        )}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t("plans.form.permissions.apiRateLimitPerMinute")}
                      </label>
                      <input
                        type="text"
                        value={formData.permissions.apiRateLimitPerMinute || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            permissions: {
                              ...formData.permissions,
                              apiRateLimitPerMinute: e.target.value,
                            },
                          })
                        }
                        placeholder={t(
                          "plans.form.permissions.apiRateLimitPerMinutePlaceholder"
                        )}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Popular Toggle */}
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.popular}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            popular: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {t("plans.form.popularToggle")}
                      </span>
                    </label>
                  </div>

                  {/* Features */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        {t("plans.form.features")}
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addFeature}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        {t("plans.buttons.addFeature")}
                      </Button>
                    </div>

                    {formData.features.length === 0 ? (
                      <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          {t("plans.form.noFeatures")}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {formData.features.map((feature, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200"
                          >
                            <input
                              type="text"
                              value={feature.name}
                              onChange={(e) =>
                                updateFeature(index, "name", e.target.value)
                              }
                              placeholder={t("plans.form.featureName")}
                              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                            />
                            <label className="flex items-center gap-1.5 text-sm">
                              <input
                                type="checkbox"
                                checked={feature.included}
                                onChange={(e) =>
                                  updateFeature(
                                    index,
                                    "included",
                                    e.target.checked
                                  )
                                }
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              {t("plans.form.featureIncluded")}
                            </label>
                            <button
                              type="button"
                              onClick={() => removeFeature(index)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="flex-1"
                    >
                      {t("plans.buttons.cancel")}
                    </Button>
                    <Button onClick={handleSubmit} className="flex-1" disabled={user?.username === "demoadmin"}>
                      <Save className="w-4 h-4 mr-2" />
                      {editingPlan
                        ? t("plans.buttons.updatePlan")
                        : t("plans.buttons.createPlan")}
                        
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Plans Grid */}
            {(() => {
              if (loading) {
                return <Loading />;
              }

              if (plans.length === 0) {
                return (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {t("plans.empty.title")}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {t("plans.empty.description")}
                    </p>
                    {isSuper && (
                      <Button onClick={() => setShowForm(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t("plans.empty.button")}
                      </Button>
                    )}
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {plans.map((plan) => {
                    const IconComponent = iconMap[plan.icon] || Zap;
                    const isPopular = plan.popular;

                    const isActivePlan = userPlanItems.some(
                      (p) =>
                        p?.subscription?.planId === plan.id &&
                        p?.subscription?.status === "active"
                    );

                    const activePlan = userPlanItems.find(
                      (p) => p?.subscription?.status === "active"
                    )?.subscription;

                    // console.log("Active Plan@@@@@@@@@@@@@:", activePlan);

                    const currentPlanPrice = Number(
                      activePlan?.planData?.monthlyPrice || 0
                    );
                    const thisPlanPrice = Number(plan.monthlyPrice);

                    // console.log("Current Plan Price:", currentPlanPrice);
                    // console.log("This Plan Price:", thisPlanPrice);

                    let monthlyPrice = plan.monthlyPrice;
                    let annualPrice = plan.annualPrice;
                    let planCurrencySymbol = currencySymbol; // Default to brand symbol

                    if (selectedCurrency && plan.multiCurrencyPrices && plan.multiCurrencyPrices[selectedCurrency]) {
                      monthlyPrice = plan.multiCurrencyPrices[selectedCurrency].monthly;
                      annualPrice = plan.multiCurrencyPrices[selectedCurrency].annual;
                      planCurrencySymbol = currencySymbolMap[selectedCurrency] || selectedCurrency + " ";
                    }

                    return (
                      <div
                        key={plan.id}
                        className={`relative bg-white rounded-xl shadow-md border-2 ${
                          plan.color
                        } hover:shadow-lg transition-all duration-300 overflow-hidden ${
                          isPopular ? "ring-2 ring-blue-500 ring-offset-2" : ""
                        } flex flex-col h-full`}
                      >
                        {plan.badge && (
                          <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                            {plan.badge}
                          </div>
                        )}

                        <div className="p-6 flex flex-col flex-1">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                            <IconComponent className="w-6 h-6 text-blue-600" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">
                            {plan.name}
                          </h3>
                          <p className="text-sm text-gray-600 mb-4 min-h-[40px] line-clamp-2">
                            {plan.description}
                          </p>
                          <div className="mb-4">
                            <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-black text-gray-900">
                                {planCurrencySymbol}
                                {isAnnual
                                  ? annualPrice
                                  : monthlyPrice}
                              </span>
                              <span className="text-sm text-gray-600 font-medium">
                                /
                                {isAnnual
                                  ? t("plans.card.perYear")
                                  : t("plans.card.perMonth")}
                              </span>
                            </div>
                            {plan.permissions && (
                              <div className="mt-2 space-y-1">
                                {Object.entries(plan.permissions)
                                  .filter(([_, value]) => value && String(value).trim() !== "")
                                  .map(([key, value]) => {
                                    const labelMap: Record<string, string> = {
                                      channel: t("plans.form.permissions.channels"),
                                      contacts: t("plans.form.permissions.contacts"),
                                      automation: t("plans.form.permissions.automation"),
                                      campaign: t("plans.form.permissions.campaign"),
                                      apiRequestsPerMonth: t("plans.form.permissions.apiRequestsPerMonth"),
                                      apiRateLimitPerMinute: t("plans.form.permissions.apiRateLimitPerMinute"),
                                    };
                                    return (
                                      <div
                                        key={key}
                                        className="text-xs text-gray-600"
                                      >
                                        ✓ {value} {labelMap[key] || key}
                                      </div>
                                    );
                                  })}
                              </div>
                            )}
                          </div>
                          <ul className="space-y-2 mb-6 flex-1">
                            {plan.features &&
                              plan.features.slice(0, 4).map((feature, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2"
                                >
                                  {feature.included ? (
                                    <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  ) : (
                                    <X className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                  )}
                                  <span
                                    className={`text-sm ${
                                      feature.included
                                        ? "text-gray-700"
                                        : "text-gray-400"
                                    }`}
                                  >
                                    {feature.name}
                                  </span>
                                </li>
                              ))}
                          </ul>
                          <div className="mt-auto">
                            {!isSuper && (
                              <>
                                {/* {isActivePlan ? (
                                  <Button
                                    className="w-full bg-green-600 text-white"
                                    disabled
                                  >
                                    Active
                                  </Button>
                                ) : (
                                  <Button
                                    className="w-full"
                                    onClick={() => handleSelectPlan(plan)}
                                  >
                                    {t("plans.buttons.buy")}
                                  </Button>
                                )} */}

                                {/* Action Button */}
                                {/* Action Button */}
                                {!activePlan ? (
                                  <Button
                                    className="w-full"
                                    onClick={() => handleSelectPlan(plan)}
                                  >
                                    {t("plans.buttons.buy")}
                                  </Button>
                                ) : isActivePlan ? (
                                  <Button
                                    className="w-full bg-green-600 text-white"
                                    disabled
                                  >
                                    Current Plan
                                  </Button>
                                ) : thisPlanPrice > currentPlanPrice ? (
                                  <Button
                                    className="w-full bg-blue-600 text-white"
                                    onClick={() => handleChangePlan(plan)}
                                    disabled={changingPlanId === plan.id}
                                  >
                                    {changingPlanId === plan.id ? "Processing..." : "Upgrade"}
                                  </Button>
                                ) : (
                                  <Button
                                    className="w-full bg-yellow-600 text-white"
                                    onClick={() => handleChangePlan(plan)}
                                    disabled={changingPlanId === plan.id}
                                  >
                                    {changingPlanId === plan.id ? "Processing..." : "Downgrade"}
                                  </Button>
                                )}
                              </>
                            )}
                            {isSuper && (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(plan)}
                                  >
                                    <Edit className="w-3 h-3 mr-1" />
                                    {t("plans.buttons.edit")}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(plan.id)}
                                    className="text-red-600 hover:bg-red-50"
                                    disabled={user?.username === "demoadmin"}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1" />
                                    {t("plans.buttons.delete")}
                                  </Button>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => handleSyncPlan(plan.id)}
                                  disabled={syncingPlanId === plan.id}
                                >
                                  <RefreshCw className={`w-3 h-3 mr-1 ${syncingPlanId === plan.id ? "animate-spin" : ""}`} />
                                  {syncingPlanId === plan.id ? "Syncing..." : "Sync to Gateways"}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </main>

      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          isAnnual={isAnnual}
          open={checkoutOpen}
          onOpenChange={(open) => {
            setCheckoutOpen(open);
            if (!open) setSelectedPlan(null);
          }}
          userId={user?.id}
          paymentProviders={paymentProviders?.data}
          isLoadingProviders={isLoadingProviders}
          selectedCurrency={selectedCurrency}
        />
      )}
    </div>
  );
}
