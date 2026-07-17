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
  MessageSquare,
  Workflow,
  BarChart3,
  Users,
  Bot,
  Calendar,
  Globe,
  Target,
  Send,
  ArrowRight,
  CheckCircle,
  Smartphone,
  Play,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const Features = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { t } = useTranslation();

  const features = [
    {
      icon: MessageSquare,
      title: t("Landing.featuresSec.featureTabs.0.title"),
      description: t("Landing.featuresSec.featureTabs.0.description"),
      color: "from-green-500 to-emerald-600",
      lightBg: "bg-green-50",
      lightColor: "text-green-600",
      demo: {
        title: t("Landing.featuresSec.featureTabs.0.demo.title"),
        stats: t("Landing.featuresSec.featureTabs.0.demo.stats"),
        features: (t as any)(
          "Landing.featuresSec.featureTabs.0.demo.features",
          { returnObjects: true }
        ),
      },
    },
    {
      icon: Workflow,
      title: t("Landing.featuresSec.featureTabs.1.title"),
      description: t("Landing.featuresSec.featureTabs.1.description"),
      color: "from-blue-500 to-blue-600",
      lightBg: "bg-blue-50",
      lightColor: "text-blue-600",
      demo: {
        title: t("Landing.featuresSec.featureTabs.1.demo.title"),
        stats: t("Landing.featuresSec.featureTabs.1.demo.stats"),
        features: (t as any)(
          "Landing.featuresSec.featureTabs.1.demo.features",
          { returnObjects: true }
        ),
      },
    },
    {
      icon: BarChart3,
      title: t("Landing.featuresSec.featureTabs.2.title"),
      description: t("Landing.featuresSec.featureTabs.2.description"),
      color: "from-purple-500 to-purple-600",
      lightBg: "bg-purple-50",
      lightColor: "text-purple-600",
      demo: {
        title: t("Landing.featuresSec.featureTabs.2.demo.title"),
        stats: t("Landing.featuresSec.featureTabs.2.demo.stats"),
        features: (t as any)(
          "Landing.featuresSec.featureTabs.2.demo.features",
          { returnObjects: true }
        ),
      },
    },
    {
      icon: Users,
      title: t("Landing.featuresSec.featureTabs.3.title"),
      description: t("Landing.featuresSec.featureTabs.3.description"),
      color: "from-orange-500 to-orange-600",
      lightBg: "bg-orange-50",
      lightColor: "text-orange-600",
      demo: {
        title: t("Landing.featuresSec.featureTabs.3.demo.title"),
        stats: t("Landing.featuresSec.featureTabs.3.demo.stats"),
        features: (t as any)(
          "Landing.featuresSec.featureTabs.3.demo.features",
          { returnObjects: true }
        ),
      },
    },
    {
      icon: Bot,
      title: t("Landing.featuresSec.featureTabs.4.title"),
      description: t("Landing.featuresSec.featureTabs.4.description"),
      color: "from-indigo-500 to-indigo-600",
      lightBg: "bg-indigo-50",
      lightColor: "text-indigo-600",
      demo: {
        title: t("Landing.featuresSec.featureTabs.4.demo.title"),
        stats: t("Landing.featuresSec.featureTabs.4.demo.stats"),
        features: (t as any)(
          "Landing.featuresSec.featureTabs.4.demo.features",
          { returnObjects: true }
        ),
      },
    },
    {
      icon: Calendar,
      title: t("Landing.featuresSec.featureTabs.5.title"),
      description: t("Landing.featuresSec.featureTabs.5.description"),
      color: "from-pink-500 to-pink-600",
      lightBg: "bg-pink-50",
      lightColor: "text-pink-600",
      demo: {
        title: t("Landing.featuresSec.featureTabs.5.demo.title"),
        stats: t("Landing.featuresSec.featureTabs.5.demo.stats"),
        features: (t as any)(
          "Landing.featuresSec.featureTabs.5.demo.features",
          { returnObjects: true }
        ),
      },
    },
  ];

  const additionalFeatures = (t as any)(
    "Landing.featuresSec.additionalFeatures",
    {
      returnObjects: true,
    }
  );

  const additionalIcons = [Globe, Target, Send];

  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-gray-50/50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-emerald-100">
            <Smartphone className="w-4 h-4 mr-2" />
            {t("Landing.featuresSec.introTagline")}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t("Landing.featuresSec.headlinePre")}
            <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {t("Landing.featuresSec.headlineHighlight")}
            </span>
          </h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto leading-relaxed">
            {t("Landing.featuresSec.subHeadline")}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {features.map((feature, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                activeTab === index
                  ? `bg-gradient-to-r ${feature.color} text-white shadow-lg shadow-gray-200`
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <feature.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{feature.title}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:p-8">
            <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${features[activeTab].color} mb-5`}>
              {React.createElement(features[activeTab].icon, {
                className: "w-6 h-6 text-white",
              })}
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {features[activeTab].title}
            </h3>
            <p className="text-gray-500 leading-relaxed mb-6">
              {features[activeTab].description}
            </p>

            {features[activeTab].demo.features && Array.isArray(features[activeTab].demo.features) && (
              <div className="space-y-3">
                {(features[activeTab].demo.features as string[]).map((feat: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1 rounded-full ${features[activeTab].lightBg}`}>
                      <CheckCircle className={`w-3.5 h-3.5 ${features[activeTab].lightColor}`} />
                    </div>
                    <span className="text-sm text-gray-600">{feat}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-3">
            <div className="bg-gray-950 p-6 rounded-3xl shadow-2xl">
              <div className="flex items-center space-x-2 mb-5">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-gray-500 text-xs ml-3 font-medium tracking-wide uppercase">
                  {t("Landing.featuresSec.whatsAppAPI")}
                </span>
              </div>

              <div className="bg-white p-6 rounded-2xl">
                <div className="flex items-center space-x-3 mb-6">
                  <div
                    className={`p-2.5 rounded-lg bg-gradient-to-r ${features[activeTab].color}`}
                  >
                    {React.createElement(features[activeTab].icon, {
                      className: "w-5 h-5 text-white",
                    })}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {features[activeTab].demo.title}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {features[activeTab].demo.stats}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {features[activeTab].demo.features && Array.isArray(features[activeTab].demo.features) &&
                    (features[activeTab].demo.features as string[]).slice(0, 3).map((feat: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${features[activeTab].color}`}></div>
                          <span className="text-sm text-gray-700">{feat}</span>
                        </div>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      </div>
                    ))}
                </div>

                <div className="mt-6 bg-gray-50 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">
                      {t("Landing.featuresSec.campaign_progress")}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {Math.round((activeTab + 1) * 16.67)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`bg-gradient-to-r ${features[activeTab].color} h-2 rounded-full transition-all duration-1000`}
                      style={{ width: `${(activeTab + 1) * 16.67}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {additionalFeatures.map(
            (item: { title: string; desc: string }, index: number) => (
              <div
                key={index}
                className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-3 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform duration-300">
                  {React.createElement(additionalIcons[index] || Globe, {
                    className: "w-6 h-6 text-emerald-600",
                  })}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
};

export default Features;
