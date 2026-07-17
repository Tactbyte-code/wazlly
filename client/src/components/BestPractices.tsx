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

import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  CheckCircle,
  TrendingUp,
  Users,
  MessageCircle,
  Clock,
  Shield,
  Target,
  Zap,
  AlertTriangle,
  Star,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

type CategoryId =
  | "messaging"
  | "automation"
  | "engagement"
  | "compliance"
  | "timing"
  | "optimization";

interface Category {
  id: CategoryId;
  name: string;
}

interface PracticeItem {
  title: string;
  description: string;
  tips: string[];
  impact: string;
}

type PracticesMap = Record<CategoryId, PracticeItem[]>;

interface QuickTip {
  title: string;
  tip: string;
}

const BestPractices = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<CategoryId>("messaging");

  const categories = (t("bestPractices.categories", {
    returnObjects: true,
  }) || []) as Category[];

  const practices = (t("bestPractices.practices", {
    returnObjects: true,
  }) || {}) as PracticesMap;

  const quickTips = (t("bestPractices.quickTips.tips", {
    returnObjects: true,
  }) || []) as QuickTip[];

  const sectionIcons: Record<
    CategoryId,
    React.ComponentType<{ className?: string }>
  > = {
    messaging: MessageCircle,
    automation: Zap,
    engagement: Users,
    compliance: Shield,
    timing: Clock,
    optimization: TrendingUp,
  };

  const quickTipIcons: React.ComponentType<{ className?: string }>[] = [
    Target,
    Clock,
    Users,
    Shield,
    MessageCircle,
    TrendingUp,
  ];

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title ?? "";

  const currentPractices = practices[activeCategory] || [];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-green-100 p-4 rounded-full w-fit mx-auto mb-6">
            <Star className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {t("bestPractices.hero.title")}
            <span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {t("bestPractices.hero.titleHighlight")}
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t("bestPractices.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category) => {
              const Icon = sectionIcons[category.id] || MessageCircle;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                    activeCategory === category.id
                      ? "bg-green-500 text-white shadow-lg transform scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Best Practices Content */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            {currentPractices.map((practice, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">
                      {practice.title}
                    </h3>
                    <p className="text-gray-600 text-lg">
                      {practice.description}
                    </p>
                  </div>
                  <div className="bg-green-100 px-4 py-2 rounded-full ml-6">
                    <span className="text-green-800 font-semibold text-sm">
                      {practice.impact}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">
                      {t("bestPractices.implementationTips")}
                    </h4>
                    <ul className="space-y-2">
                      {practice.tips.map((tip, tipIndex) => (
                        <li
                          key={tipIndex}
                          className="flex items-start space-x-3"
                        >
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl">
                    <div className="flex items-center space-x-3 mb-4">
                      <TrendingUp className="w-6 h-6 text-blue-600" />
                      <h4 className="font-semibold text-gray-900">
                        {t("bestPractices.expectedImpact")}
                      </h4>
                    </div>
                    <p className="text-gray-700 mb-4">
                      {t("bestPractices.expectedImpactDesc")}
                    </p>
                    <div className="bg-white p-3 rounded-lg">
                      <span className="text-blue-600 font-bold text-lg">
                        {practice.impact}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Tips */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t("bestPractices.quickTips.heading")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("bestPractices.quickTips.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {quickTips.map((tip, index) => {
              const Icon = quickTipIcons[index] || Target;
              return (
                <div
                  key={index}
                  className="bg-gray-50 p-6 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="bg-green-100 p-3 rounded-lg w-fit mb-4">
                    <Icon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {tip.title}
                  </h3>
                  <p className="text-gray-600">{tip.tip}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Warning Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-red-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow-lg border-l-4 border-red-500">
            <div className="flex items-start space-x-4">
              <AlertTriangle className="w-8 h-8 text-red-500 mt-1" />
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {t("bestPractices.warning.heading")}
                </h3>
                <p className="text-gray-700 mb-4">
                  {t("bestPractices.warning.description")}
                </p>
                <ul className="space-y-2 text-gray-600">
                  {(
                    t("bestPractices.warning.points", {
                      returnObjects: true,
                    }) as string[]
                  ).map((point, index) => (
                    <li key={index}>• {point}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("bestPractices.cta.heading")}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t("bestPractices.cta.subtitle", {
              appName,
            })}
          </p>
          <Link
            href="/contact"
            className="bg-white text-green-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
          >
            {t("bestPractices.cta.button")}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default BestPractices;
