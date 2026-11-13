import React, { useEffect, useState } from "react";
import {
  Check,
  X,
  Zap,
  Crown,
  Rocket,
  Building,
  ArrowRight,
  AlertCircle,
  Star,
  ShieldCheck,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { PaymentProvidersResponse, Plan, PlansDataTypes } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import CheckoutModal from "./modals/CheckoutPage";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Link, useLocation } from "wouter";

type BillingCycle = "monthly" | "quarterly" | "annual";

const Pricing = () => {
  const { t } = useTranslation();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedCurrency, setSelectedCurrency] = useState("");

  const { toast } = useToast();
  const { user, currencySymbol, currency } = useAuth();
  const [, setLocation] = useLocation();

  const isAnnual = billingCycle === "annual";

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

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Zap,
    Crown,
    Rocket,
    Star,
    Building,
  };

  // --------------------------------------------------
  // Payment providers
  // --------------------------------------------------

  const { data: paymentProviders, isLoading: isLoadingProviders } =
    useQuery<PaymentProvidersResponse>({
      queryKey: ["/api/payment-providers"],
      queryFn: async () => {
        const res = await apiRequest("GET", "/api/payment-providers");

        if (!res.ok) {
          throw new Error("Failed to fetch payment providers");
        }

        return res.json();
      },
      enabled: !!user?.id,
    });

  // --------------------------------------------------
  // Currency configuration
  // --------------------------------------------------

  const { data: currencyMapData } = useQuery<{
    success: boolean;
    data: {
      currencyMap: Record<
        string,
        {
          providerKey: string;
          providerId: string;
          providerName: string;
        }[]
      >;
      availableCurrencies: string[];
    };
  }>({
    queryKey: ["/api/payment-providers/currency-map"],
    queryFn: async () => {
      const res = await apiRequest(
        "GET",
        "/api/payment-providers/currency-map",
      );

      return res.json();
    },
    enabled: !!user?.id,
  });

  const availableCurrencies = currencyMapData?.data?.availableCurrencies || [];

  const displayedCurrencies = availableCurrencies.filter((cur) => {
    if (cur === "USD" || cur === currency?.toUpperCase()) {
      return true;
    }

    return plans.some(
      (plan) => plan.multiCurrencyPrices && plan.multiCurrencyPrices[cur],
    );
  });

  useEffect(() => {
    if (displayedCurrencies.length === 0 || selectedCurrency) {
      return;
    }

    const userCurrency = currency?.toUpperCase() || "";

    if (displayedCurrencies.includes("USD")) {
      setSelectedCurrency("USD");
    } else if (displayedCurrencies.includes(userCurrency)) {
      setSelectedCurrency(userCurrency);
    } else {
      setSelectedCurrency(displayedCurrencies[0]);
    }
  }, [displayedCurrencies, currency, selectedCurrency]);

  // --------------------------------------------------
  // Fetch plans
  // --------------------------------------------------

  const fetchPlans = async () => {
    try {
      setLoading(true);

      const response = await apiRequest("GET", "/api/admin/plans");
      const data: PlansDataTypes = await response.json();

      if (data.success) {
        // Preserve backend ordering across all billing cycles.
        setPlans(data.data);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);

      toast({
        title: "Error",
        description: "Failed to fetch plans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // --------------------------------------------------
  // Pricing helpers
  // --------------------------------------------------

  const getBasePrice = (plan: Plan, cycle: BillingCycle) => {
    const priceKey =
      cycle === "monthly"
        ? "monthlyPrice"
        : cycle === "quarterly"
          ? "quarterlyPrice"
          : "annualPrice";

    return (plan as unknown as Record<string, unknown>)[priceKey];
  };

  const getCurrencyPrices = (plan: Plan) => {
    if (!selectedCurrency) return undefined;

    return (
      plan.multiCurrencyPrices as
        | Record<
            string,
            {
              monthly?: string | number;
              quarterly?: string | number;
              annual?: string | number;
            }
          >
        | undefined
    )?.[selectedCurrency];
  };

  const getPlanPricing = (plan: Plan) => {
    const currencyPrices = getCurrencyPrices(plan);

    const currencySpecificPrice = currencyPrices?.[billingCycle];

    const basePrice =
      currencySpecificPrice !== undefined &&
      currencySpecificPrice !== null &&
      currencySpecificPrice !== ""
        ? currencySpecificPrice
        : getBasePrice(plan, billingCycle);

    const monthlyEquivalent =
      basePrice === undefined || basePrice === null || basePrice === ""
        ? Number.NaN
        : Number(basePrice);

    const cycleMonths =
      billingCycle === "quarterly" ? 3 : billingCycle === "annual" ? 12 : 1;

    const totalPrice = monthlyEquivalent * cycleMonths;

    const planCurrencySymbol =
      currencySpecificPrice !== undefined &&
      currencySpecificPrice !== null &&
      currencySpecificPrice !== ""
        ? currencySymbolMap[selectedCurrency] || `${selectedCurrency} `
        : currencySymbol;

    return {
      monthlyEquivalent,
      totalPrice,
      planCurrencySymbol,
    };
  };

  const formatPrice = (price: number) => {
    return Number.isFinite(price)
      ? price.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "—";
  };

  // --------------------------------------------------
  // Billing cycle discount
  // --------------------------------------------------
  const getBillingDiscount = (cycle: "quarterly" | "annual" | "monthly") => {
    if (cycle === "monthly" || !plans.length) return 0;

    const referencePlan = plans
      .filter((plan) => plan.name !== "Free")
      .find((plan) => {
        const currencyPrices = getCurrencyPrices(plan);

        const monthlyPrice = Number(
          currencyPrices?.monthly ?? getBasePrice(plan, "monthly"),
        );

        const cyclePrice = Number(
          currencyPrices?.[cycle] ?? getBasePrice(plan, cycle),
        );

        return (
          Number.isFinite(monthlyPrice) &&
          Number.isFinite(cyclePrice) &&
          monthlyPrice > 0 &&
          cyclePrice > 0 &&
          cyclePrice < monthlyPrice
        );
      });

    if (!referencePlan) return 0;

    const currencyPrices = getCurrencyPrices(referencePlan);

    const monthlyPrice = Number(
      currencyPrices?.monthly ?? getBasePrice(referencePlan, "monthly"),
    );

    const cyclePrice = Number(
      currencyPrices?.[cycle] ?? getBasePrice(referencePlan, cycle),
    );

    return Math.round(((monthlyPrice - cyclePrice) / monthlyPrice) * 100);
  };

  const billingDiscount = getBillingDiscount(billingCycle);

  // --------------------------------------------------
  // Plan selection
  // --------------------------------------------------

  const handleSelectPlan = (plan: Plan) => {
    if (!user) {
      setLocation("/login");
      return;
    }

    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  const getBillingDescription = (pricing: {
    totalPrice: number;
    planCurrencySymbol: string;
  }) => {
    if (billingCycle === "monthly") {
      return "Billed monthly";
    }

    if (billingCycle === "quarterly") {
      return `Billed every 3 months`;
    }

    return `Billed annually`;
  };

  // --------------------------------------------------
  // Plans content
  // --------------------------------------------------
  const renderPlansContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-28">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-green-600" />

          <p className="mt-5 text-sm font-medium text-gray-500">
            {t("Landing.pricingSec.loading")}
          </p>
        </div>
      );
    }

    if (plans.length === 0) {
      return (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-6 py-20 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-gray-400" />

          <h3 className="text-xl font-semibold text-gray-900">
            {t("Landing.pricingSec.noPlans.title")}
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            {t("Landing.pricingSec.noPlans.description")}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {[...plans]
          .sort((a, b) => {
            const order = ["free", "growth", "professional", "enterprise"];

            return (
              order.indexOf(a.name?.toLowerCase()) -
              order.indexOf(b.name?.toLowerCase())
            );
          })
          .map((plan) => {
            console.log("plans: ", plans);

            const IconComponent = iconMap[plan.icon] || Zap;
            const pricing = getPlanPricing(plan);
            const isPopular = plan.popular;
            const isFree = pricing.monthlyEquivalent === 0;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl bg-white transition-all duration-300 ${
                  isPopular
                    ? "border-2 border-green-600 shadow-[0_12px_40px_rgba(22,163,74,0.10)]"
                    : "border border-gray-200 shadow-sm hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-1.5 text-xs font-semibold text-white shadow-md">
                      <Sparkles className="h-3.5 w-3.5" />
                      {plan.badge || "Most Popular"}
                    </span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  {/* Plan identity */}
                  <div className="mb-2">
                    <div
                      className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${plan.color || "#16a34a"}12`,
                      }}
                    >
                      <IconComponent
                        className="h-6 w-6"
                        style={{
                          color: plan.color || "#16a34a",
                        }}
                      />
                    </div>

                    <h3 className="text-xl font-bold tracking-tight text-gray-950">
                      {plan.name}
                    </h3>

                    <p className="mt-2 min-h-[42px] text-sm leading-6 text-gray-500">
                      {plan.description}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6 border-b border-gray-100 pb-6">
                    <div className="flex min-h-[52px] items-baseline gap-1">
                      <span className="text-3xl font-bold tracking-tight text-gray-950">
                        {pricing.planCurrencySymbol}
                        {formatPrice(pricing.monthlyEquivalent)}
                      </span>

                      <span className="text-sm text-gray-500">
                        /{t("Landing.pricingSec.pricing.month")}
                      </span>
                    </div>

                    <p className="mt-0 text-xs font-medium text-gray-500">
                      {getBillingDescription(pricing)}
                    </p>

                    {billingCycle !== "monthly" && (
                      <p className="mt-1 text-xs text-gray-400">
                        {billingCycle === "quarterly"
                          ? "Charged once every 3 months"
                          : "Charged once every 12 months"}
                      </p>
                    )}

                    {billingDiscount > 0 && (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700">
                        <Check className="h-3.5 w-3.5" />
                        You save {billingDiscount}% on this plan
                      </div>
                    )}
                  </div>

                  {/* Permissions */}
                  {plan.permissions && (
                    <div className="mb-6 space-y-3">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-500">
                          {t("Landing.pricingSec.pricing.contacts")}
                        </span>

                        <span className="font-semibold text-gray-900">
                          {t("Landing.pricingSec.pricing.upTo")}{" "}
                          {plan.permissions.contacts}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-500">
                          {t("Landing.pricingSec.pricing.channels")}
                        </span>

                        <span className="font-semibold text-gray-900">
                          {plan.permissions.channel}
                        </span>
                      </div>

                      {plan.permissions.automation && (
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="text-gray-500">
                            {t("Landing.pricingSec.pricing.automation")}
                          </span>

                          <span className="font-semibold text-gray-900">
                            {plan.permissions.automation}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Features */}
                  <div className="flex-1 border-t border-gray-100 pt-6">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      What's included
                    </p>

                    <ul className="space-y-3.5">
                      {plan.features && plan.features.length > 0 ? (
                        plan.features.map((feature, index) => (
                          <li
                            key={`${feature.name}-${index}`}
                            className="flex items-start gap-2.5"
                          >
                            {feature.included ? (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            ) : (
                              <X className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                            )}

                            <span
                              className={`text-sm leading-5 ${
                                feature.included
                                  ? "text-gray-600"
                                  : "text-gray-400"
                              }`}
                            >
                              {feature.name}
                            </span>
                          </li>
                        ))
                      ) : (
                        <>
                          <li className="flex items-start gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            <span className="text-sm text-gray-600">
                              {plan.permissions?.contacts}{" "}
                              {t("Landing.pricingSec.pricing.contacts")}
                            </span>
                          </li>

                          <li className="flex items-start gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            <span className="text-sm text-gray-600">
                              {plan.permissions?.channel}{" "}
                              {t("Landing.pricingSec.pricing.channels")}
                            </span>
                          </li>

                          <li className="flex items-start gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            <span className="text-sm text-gray-600">
                              {plan.permissions?.automation}{" "}
                              {t("Landing.pricingSec.pricing.automation")}
                            </span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan)}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-all duration-200 ${
                        isPopular
                          ? "bg-green-600 text-white shadow-sm hover:bg-green-700"
                          : "bg-gray-900 text-white hover:bg-gray-800"
                      }`}
                      style={
                        isPopular
                          ? {
                              backgroundColor: plan.buttonColor || "#16a34a",
                            }
                          : {}
                      }
                    >
                      {isFree
                        ? t("Landing.pricingSec.planCTA.freeButton")
                        : t("Landing.pricingSec.planCTA.paidButton")}

                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    );
  };

  // --------------------------------------------------
  // FAQ
  // --------------------------------------------------

  const faqData = t("Landing.pricingSec.faq.questions") as unknown as Array<{
    q: string;
    a: string;
  }>;

  // --------------------------------------------------
  // Main UI
  // --------------------------------------------------

  return (
    <>
      <section
        id="pricing"
        className="bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-100 bg-green-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-green-700">
              <Crown className="h-4 w-4" />
              {t("Landing.pricingSec.introTagline")}
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
              {t("Landing.pricingSec.headlinePre")}{" "}
              <span className="text-green-600">
                {t("Landing.pricingSec.headlineHighlight")}
              </span>
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-500 sm:text-lg">
              {t("Landing.pricingSec.subHeadline")}
            </p>

            {/* Billing selector and discount */}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex flex-wrap items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                {[
                  {
                    value: "monthly",
                    label: t("Landing.pricingSec.billingToggle.monthly"),
                  },
                  {
                    value: "quarterly",
                    label: "Quarterly",
                  },
                  {
                    value: "annual",
                    label: t("Landing.pricingSec.billingToggle.annual"),
                  },
                ].map((cycle) => {
                  const isSelected = billingCycle === cycle.value;

                  return (
                    <button
                      key={cycle.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() =>
                        setBillingCycle(cycle.value as BillingCycle)
                      }
                      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                        isSelected
                          ? "bg-white text-gray-950 shadow-sm ring-1 ring-gray-200"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {cycle.label}
                    </button>
                  );
                })}
              </div>

              {/* Dynamic discount badge */}
              {billingCycle !== "monthly" && billingDiscount > 0 && (
                <div
                  key={billingCycle}
                  className="inline-flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 animate-in fade-in duration-200"
                >
                  <Sparkles className="h-4 w-4" />

                  <span>
                    Save {billingDiscount}%
                    <span className="ml-1 font-medium text-green-600">
                      {billingCycle === "quarterly" ? "Quarterly" : "Annually"}
                    </span>
                  </span>
                </div>
              )}

              {/* Currency selector */}
              {displayedCurrencies.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    aria-label="Select currency"
                    className="min-w-[125px] appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  >
                    {displayedCurrencies.map((cur) => (
                      <option key={cur} value={cur}>
                        {currencySymbolMap[cur] || ""} {cur}
                      </option>
                    ))}
                  </select>

                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              )}
            </div>

            <p className="mt-4 text-xs text-gray-400">
              {billingCycle === "monthly"
                ? "Flexible monthly billing. Change your plan whenever you need."
                : billingCycle === "quarterly"
                  ? "Pay every 3 months and enjoy discounted pricing."
                  : "Get the best value with our annual billing option."}
            </p>
          </div>

          {/* Plans */}
          {renderPlansContent()}

          {/* Trust indicators */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 border-b border-gray-100 pb-14 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              Secure payments
            </div>

            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Transparent pricing
            </div>

            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-green-600" />
              Flexible billing
            </div>
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-20 max-w-5xl">
            <div className="mb-10 text-center">
              <h3 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                {t("Landing.pricingSec.faq.title")}
              </h3>

              <p className="mt-3 text-sm text-gray-500">
                Find answers to common questions about our plans and billing.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {faqData.map((faq, index) => (
                <div
                  key={`${faq.q}-${index}`}
                  className="rounded-xl border border-gray-200 bg-white p-6 transition-colors hover:border-gray-300"
                >
                  <h4 className="font-semibold text-gray-900">{faq.q}</h4>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Enterprise */}
          <div className="relative mt-20 overflow-hidden rounded-2xl bg-gray-950 px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute -right-20 -top-32 h-72 w-72 rounded-full bg-green-500/10 blur-3xl" />

            <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative mx-auto max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-300">
                <Building className="h-3.5 w-3.5" />
                Enterprise solutions
              </div>

              <h3 className="text-2xl font-bold text-white sm:text-3xl">
                {t("Landing.pricingSec.enterprise.title")}
              </h3>

              <p className="mt-4 text-sm leading-7 text-gray-400 sm:text-base">
                {t("Landing.pricingSec.enterprise.description")}
              </p>

              <Link
                href="/contact"
                className="group mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-gray-950 transition-all hover:bg-gray-100"
              >
                {t("Landing.pricingSec.enterprise.button")}

                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Checkout */}
      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          isAnnual={isAnnual}
          billingCycle={billingCycle}
          open={checkoutOpen}
          onOpenChange={setCheckoutOpen}
          userId={user?.id}
          paymentProviders={paymentProviders?.data}
          isLoadingProviders={isLoadingProviders}
          selectedCurrency={selectedCurrency}
        />
      )}
    </>
  );
};

export default Pricing;
