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
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { PaymentProvidersResponse, Plan, PlansDataTypes } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import CheckoutModal from "./modals/CheckoutPage";
import { useAuth } from "@/contexts/auth-context";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { Link, useLocation } from "wouter";

const Pricing = () => {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAnnual, setIsAnnual] = useState(false);
  const { toast } = useToast();
  const { user, currencySymbol, currency } = useAuth();

  const [, setLocation] = useLocation();
  // Fetch payment providers
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

  // Fetch currency map
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

  // Icon mapping
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Zap,
    Crown,
    Rocket,
    Star,
    Building,
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

  // Handle plan selection
  const handleSelectPlan = (plan: Plan) => {
    if (!user) {
      setLocation("/login");
      // return toast({
      //   title: t("Landing.pricingSec.authRequired.title"),
      //   description: t("Landing.pricingSec.authRequired.description"),
      //   variant: "destructive",
      // });
    }
    setSelectedPlan(plan);
    setCheckoutOpen(true);
  };

  const renderPlansContent = () => {
    if (loading) {
      return (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
          <p className="text-gray-600 font-medium">
            {t("Landing.pricingSec.loading")}
          </p>
        </div>
      );
    }

    if (plans.length === 0) {
      return (
        <div className="text-center py-20 bg-gray-50 rounded-2xl">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {t("Landing.pricingSec.noPlans.title")}
          </h3>
          <p className="text-gray-600">
            {t("Landing.pricingSec.noPlans.description")}
          </p>
        </div>
      );
    }
    const sortedPlans = plans.sort((a, b) => {
      const priceA = Number(isAnnual ? a.annualPrice : a.monthlyPrice);
      const priceB = Number(isAnnual ? b.annualPrice : b.monthlyPrice);
      return priceA - priceB;
    });
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 mb-16">
        {sortedPlans.map((plan, index) => {
          const IconComponent = iconMap[plan.icon] || Zap;
          const isPopular = plan.popular;

          return (
            <div
              key={plan.id}
              className={`bg-white p-8 rounded-2xl shadow-lg border-2 ${
                isPopular ? "relative transform scale-105" : ""
              } hover:shadow-xl transition-all flex flex-col h-full`}
              style={{ borderColor: plan.color || '#e5e7eb' }}
            >
              {/* Popular Badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="text-center mb-8 flex-shrink-0">
                {/* Icon */}
                <div className="bg-gray-100 p-3 rounded-xl w-fit mx-auto mb-4">
                  <IconComponent className="w-8 h-8 text-gray-700" />
                </div>

                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>

                {/* Description */}
                <p className="text-gray-600 text-sm mb-4 min-h-[40px]">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline justify-center mb-2">
                  <span className="text-4xl font-bold text-gray-900">
                    {(() => {
                      let monthlyPrice = plan.monthlyPrice;
                      let annualPrice = plan.annualPrice;
                      let planCurrencySymbol = currencySymbol; // Default to brand symbol

                      if (selectedCurrency && plan.multiCurrencyPrices && plan.multiCurrencyPrices[selectedCurrency]) {
                        monthlyPrice = plan.multiCurrencyPrices[selectedCurrency].monthly;
                        annualPrice = plan.multiCurrencyPrices[selectedCurrency].annual;
                        planCurrencySymbol = currencySymbolMap[selectedCurrency] || selectedCurrency + " ";
                      }

                      return (
                        <>
                          {planCurrencySymbol}
                          {isAnnual ? annualPrice : monthlyPrice}
                        </>
                      );
                    })()}
                  </span>
                  <span className="text-gray-600 ml-2">
                    /
                    {isAnnual
                      ? t("Landing.pricingSec.pricing.year")
                      : t("Landing.pricingSec.pricing.month")}
                  </span>
                </div>

                {/* Permissions */}
                {plan.permissions && (
                  <div className="space-y-1">
                    <div className="text-gray-600 text-sm">
                      {t("Landing.pricingSec.pricing.upTo")}{" "}
                      {plan.permissions.contacts}{" "}
                      {t("Landing.pricingSec.pricing.contacts")}
                    </div>
                    <div className="text-gray-600 text-sm">
                      {plan.permissions.channel}{" "}
                      {t("Landing.pricingSec.pricing.channels")}
                    </div>
                    {plan.permissions.automation && (
                      <div className="text-gray-600 text-sm">
                        {plan.permissions.automation}{" "}
                        {t("Landing.pricingSec.pricing.automation")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Features - Grow to fill space */}
              <ul className="space-y-4 mb-8 flex-grow">
                {plan.features && plan.features.length > 0 ? (
                  plan.features.map((feature, featureIndex) => (
                    <li
                      key={`${feature.name}-${featureIndex}`}
                      className="flex items-start space-x-3"
                    >
                      {feature.included ? (
                        <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 mt-0.5 flex-shrink-0" />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included ? "text-gray-700" : "text-gray-400"
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {plan.permissions.contacts}{" "}
                        {t("Landing.pricingSec.pricing.contacts")}
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {plan.permissions.channel}{" "}
                        {t("Landing.pricingSec.pricing.channels")}
                      </span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">
                        {plan.permissions.automation}{" "}
                        {t("Landing.pricingSec.pricing.automation")}
                      </span>
                    </li>
                  </>
                )}
              </ul>

              {/* CTA Button - Always at bottom */}
              <button
                onClick={() => handleSelectPlan(plan)}
                className="w-full py-3 rounded-xl font-semibold transition-all transform hover:scale-105 text-white flex-shrink-0 hover:opacity-90"
                style={{ backgroundColor: plan.buttonColor || '#10b981' }}
              >
                {Number.parseFloat(plan.monthlyPrice) === 0
                  ? t("Landing.pricingSec.planCTA.freeButton")
                  : t("Landing.pricingSec.planCTA.paidButton")}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Get FAQ data from translation
  const faqData = t("Landing.pricingSec.faq.questions") as unknown as Array<{
    q: string;
    a: string;
  }>;

  return (
    <>
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Crown className="w-4 h-4 mr-2" />
              {t("Landing.pricingSec.introTagline")}
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              {t("Landing.pricingSec.headlinePre")}{" "}
              <span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                {t("Landing.pricingSec.headlineHighlight")}
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              {t("Landing.pricingSec.subHeadline")}
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center space-x-4 mb-12 flex-wrap gap-4">
              <span
                className={`font-medium ${
                  isAnnual ? "text-gray-500" : "text-gray-900"
                }`}
              >
                {t("Landing.pricingSec.billingToggle.monthly")}
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  isAnnual ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-transform ${
                    isAnnual ? "translate-x-7" : "translate-x-1"
                  }`}
                ></div>
              </button>
              <span
                className={`font-medium ${
                  isAnnual ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {t("Landing.pricingSec.billingToggle.annual")}
              </span>
              {isAnnual && (
                <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-medium">
                  {t("Landing.pricingSec.billingToggle.saveLabel")}
                </span>
              )}
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
          </div>

          {/* Plans Content */}
          {renderPlansContent()}

          {/* FAQ Section */}
          <div className="bg-gray-50 p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
              {t("Landing.pricingSec.faq.title")}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {faqData.map((faq, index) => (
                <div
                  key={`${faq.q}-${index}`}
                  className="bg-white p-6 rounded-xl"
                >
                  <h4 className="font-semibold text-gray-900 mb-2">{faq.q}</h4>
                  <p className="text-gray-600 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Enterprise CTA */}
          <div className="mt-16 bg-gradient-to-r from-gray-900 to-gray-800 p-8 rounded-2xl text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              {t("Landing.pricingSec.enterprise.title")}
            </h3>
            <p className="text-gray-300 mb-6">
              {t("Landing.pricingSec.enterprise.description")}
            </p>
            <Link
              href="/contact"
              className="bg-white text-gray-900 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-all flex items-center mx-auto group w-fit"
            >
              {t("Landing.pricingSec.enterprise.button")}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      {selectedPlan && (
        <CheckoutModal
          plan={selectedPlan}
          isAnnual={isAnnual}
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
