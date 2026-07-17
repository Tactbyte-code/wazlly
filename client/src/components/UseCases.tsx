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
import {
  ShoppingCart,
  GraduationCap,
  Heart,
  Building,
  Utensils,
  Car,
  ArrowRight,
  TrendingUp,
  Users,
  MessageCircle,
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "@/lib/i18n";

const UseCases = () => {
  const [activeUseCase, setActiveUseCase] = useState(0);
  const { t } = useTranslation();

  const useCases = [
    {
      icon: ShoppingCart,
      title: t("Landing.useCasesSec.useCases.0.title"),
      description: t("Landing.useCasesSec.useCases.0.description"),
      color: "from-green-500 to-green-600",
      bgColor: "bg-green-50",
      stats: {
        increase: "300%",
        metric: t("Landing.useCasesSec.useCases.0.stats.metric"),
      },
      features: [
        t("Landing.useCasesSec.useCases.0.features.0"),
        t("Landing.useCasesSec.useCases.0.features.1"),
        t("Landing.useCasesSec.useCases.0.features.2"),
        t("Landing.useCasesSec.useCases.0.features.3"),
      ],
    },
    {
      icon: GraduationCap,
      title: t("Landing.useCasesSec.useCases.1.title"),
      description: t("Landing.useCasesSec.useCases.1.description"),
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      stats: {
        increase: "85%",
        metric: t("Landing.useCasesSec.useCases.1.stats.metric"),
      },
      features: [
        t("Landing.useCasesSec.useCases.1.features.0"),
        t("Landing.useCasesSec.useCases.1.features.1"),
        t("Landing.useCasesSec.useCases.1.features.2"),
        t("Landing.useCasesSec.useCases.1.features.3"),
      ],
    },
    {
      icon: Heart,
      title: t("Landing.useCasesSec.useCases.2.title"),
      description: t("Landing.useCasesSec.useCases.2.description"),
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-50",
      stats: {
        increase: "60%",
        metric: t("Landing.useCasesSec.useCases.2.stats.metric"),
      },
      features: [
        t("Landing.useCasesSec.useCases.2.features.0"),
        t("Landing.useCasesSec.useCases.2.features.1"),
        t("Landing.useCasesSec.useCases.2.features.2"),
        t("Landing.useCasesSec.useCases.2.features.3"),
      ],
    },
    {
      icon: Building,
      title: t("Landing.useCasesSec.useCases.3.title"),
      description: t("Landing.useCasesSec.useCases.3.description"),
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50",
      stats: {
        increase: "45%",
        metric: t("Landing.useCasesSec.useCases.3.stats.metric"),
      },
      features: [
        t("Landing.useCasesSec.useCases.3.features.0"),
        t("Landing.useCasesSec.useCases.3.features.1"),
        t("Landing.useCasesSec.useCases.3.features.2"),
        t("Landing.useCasesSec.useCases.3.features.3"),
      ],
    },
    {
      icon: Utensils,
      title: t("Landing.useCasesSec.useCases.4.title"),
      description: t("Landing.useCasesSec.useCases.4.description"),
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-50",
      stats: {
        increase: "120%",
        metric: t("Landing.useCasesSec.useCases.4.stats.metric"),
      },
      features: [
        t("Landing.useCasesSec.useCases.4.features.0"),
        t("Landing.useCasesSec.useCases.4.features.1"),
        t("Landing.useCasesSec.useCases.4.features.2"),
        t("Landing.useCasesSec.useCases.4.features.3"),
      ],
    },
    {
      icon: Car,
      title: t("Landing.useCasesSec.useCases.5.title"),
      description: t("Landing.useCasesSec.useCases.5.description"),
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-50",
      stats: {
        increase: "75%",
        metric: t("Landing.useCasesSec.useCases.5.stats.metric"),
      },
      features: [
        t("Landing.useCasesSec.useCases.5.features.0"),
        t("Landing.useCasesSec.useCases.5.features.1"),
        t("Landing.useCasesSec.useCases.5.features.2"),
        t("Landing.useCasesSec.useCases.5.features.3"),
      ],
    },
  ];

  return (
    <section id="use-cases" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-indigo-100">
            <Building className="w-4 h-4 mr-2" />
            {t("Landing.useCasesSec.introTagline")}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t("Landing.useCasesSec.headlinePre")}{" "}
            <span className="block bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              {t("Landing.useCasesSec.headlineHighlight")}
            </span>
          </h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto leading-relaxed">
            {t("Landing.useCasesSec.subHeadline")}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {useCases.map((useCase, index) => (
            <button
              key={index}
              onClick={() => setActiveUseCase(index)}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activeUseCase === index
                  ? `bg-gradient-to-r ${useCase.color} text-white shadow-md`
                  : "bg-white text-gray-600 hover:text-gray-900 hover:shadow-sm border border-gray-200 hover:border-gray-300"
              }`}
            >
              <useCase.icon className="w-4 h-4" />
              <span>{useCase.title}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div
            className="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all duration-500"
          >
            <div className="flex items-center space-x-4 mb-6">
              <div
                className={`p-3.5 rounded-xl bg-gradient-to-r ${useCases[activeUseCase].color} shadow-sm`}
              >
                {React.createElement(useCases[activeUseCase].icon, {
                  className: "w-7 h-7 text-white",
                })}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {useCases[activeUseCase].title}
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  {useCases[activeUseCase].description}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm">
                  Success Metric
                </span>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <span className="text-xl font-bold text-emerald-600">
                    {useCases[activeUseCase].stats.increase}
                  </span>
                </div>
              </div>
              <p className="text-gray-700 text-sm font-medium">
                {useCases[activeUseCase].stats.metric}
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 text-sm mb-3">
                {t("Landing.useCasesSec.keyFeatures")}
              </h4>
              {useCases[activeUseCase].features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                  <span className="text-gray-600 text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/case-studies"
              className="inline-flex w-fit mt-7 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all items-center group"
            >
              {t("Landing.useCasesSec.cta.viewCaseStudyButton")}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-5">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-4 mb-5">
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-emerald-100 ring-offset-2">
                  <img
                    src="https://plus.unsplash.com/premium_photo-1689977968861-9c91dbb16049?q=80&w=870&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Customer Success Story
                  </h4>
                  <p className="text-gray-400 text-xs">
                    Real results from our platform
                  </p>
                </div>
              </div>
              <blockquote className="text-gray-600 italic text-sm leading-relaxed mb-5 pl-4 border-l-2 border-emerald-200">
                {String(t("Landing.useCasesSec.cta.customerSuccessQuote"))
                  .replace(
                    "{industry}",
                    useCases[activeUseCase].title.toLowerCase()
                  )
                  .replace(
                    "{increase}",
                    useCases[activeUseCase].stats.increase
                  )}
              </blockquote>
              <div className="flex items-center space-x-3">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {t("Landing.useCasesSec.cta.testimonialName")}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {t("Landing.useCasesSec.cta.testimonialPosition")}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center space-x-3 mb-5">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-gray-900">
                  {t("Landing.useCasesSec.quickStatsTitle")}
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50/50 rounded-xl">
                  <div className="text-xl font-bold text-blue-600">
                    {t("Landing.useCasesSec.quickStats.0.value")}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {t("Landing.useCasesSec.quickStats.0.label")}
                  </div>
                </div>
                <div className="text-center p-3 bg-emerald-50/50 rounded-xl">
                  <div className="text-xl font-bold text-emerald-600">
                    {t("Landing.useCasesSec.quickStats.1.value")}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {t("Landing.useCasesSec.quickStats.1.label")}
                  </div>
                </div>
                <div className="text-center p-3 bg-violet-50/50 rounded-xl">
                  <div className="text-xl font-bold text-violet-600">
                    {t("Landing.useCasesSec.quickStats.2.value")}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {t("Landing.useCasesSec.quickStats.2.label")}
                  </div>
                </div>
                <div className="text-center p-3 bg-amber-50/50 rounded-xl">
                  <div className="text-xl font-bold text-amber-600">
                    {t("Landing.useCasesSec.quickStats.3.value")}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {t("Landing.useCasesSec.quickStats.3.label")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UseCases;
