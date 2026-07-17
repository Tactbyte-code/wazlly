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
  BookOpen,
  ArrowRight,
  MessageCircle,
  Settings,
  Users,
  BarChart3,
  Zap,
  Shield,
  Globe,
} from "lucide-react";

// Define types for better type safety
interface Section {
  id: string;
  title: string;
}

interface QuickTip {
  title: string;
  tip: string;
}

interface ContentItem {
  title: string;
  text: string;
}

interface SectionContent {
  title: string;
  items: ContentItem[];
}

const WhatsAppGuide = () => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState("getting-started");

  // Get translated data with proper type assertions
  const sections = (t("whatsappGuide.sections", {
    returnObjects: true,
  }) || []) as Section[];

  const quickTips = (t("whatsappGuide.quickTips.tips", {
    returnObjects: true,
  }) || []) as QuickTip[];

  // Icon mapping for sections
  const sectionIcons: Record<
    string,
    React.ComponentType<{ className?: string }>
  > = {
    "getting-started": Zap,
    setup: Settings,
    campaigns: MessageCircle,
    automation: BarChart3,
    "best-practices": Shield,
    compliance: Globe,
  };

  // Icon mapping for quick tips
  const tipIcons: React.ComponentType<{ className?: string }>[] = [
    Users,
    MessageCircle,
    BarChart3,
    Zap,
    Shield,
    Globe,
  ];

  // Get current section content with proper typing
  const getCurrentContent = (): SectionContent => {
    const content = t(`whatsappGuide.content.${activeSection}`, {
      returnObjects: true,
    });

    // Default fallback structure
    const defaultContent: SectionContent = {
      title: "Loading...",
      items: [],
    };

    if (!content || typeof content !== "object") {
      return defaultContent;
    }

    return content as SectionContent;
  };

  const currentContent = getCurrentContent();

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-green-100 p-4 rounded-full w-fit mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {t("whatsappGuide.hero.title")}
            <span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {t("whatsappGuide.hero.titleHighlight")}
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t("whatsappGuide.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Guide Content */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {t("whatsappGuide.sidebarTitle")}
                </h3>
                <nav className="space-y-2">
                  {sections.map((section) => {
                    const Icon = sectionIcons[section.id] || Zap;
                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all ${
                          activeSection === section.id
                            ? "bg-green-500 text-white shadow-lg"
                            : "text-gray-700 hover:bg-white hover:shadow-md"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{section.title}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white">
                <h2 className="text-3xl font-bold text-gray-900 mb-8">
                  {currentContent.title}
                </h2>

                <div className="space-y-8">
                  {currentContent.items && currentContent.items.length > 0 ? (
                    currentContent.items.map((item, index) => (
                      <div
                        key={index}
                        className="border-l-4 border-green-500 pl-6"
                      >
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          {item.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">No content available</p>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const currentIndex = sections.findIndex(
                        (s) => s.id === activeSection
                      );
                      if (currentIndex > 0) {
                        setActiveSection(sections[currentIndex - 1].id);
                      }
                    }}
                    disabled={
                      sections.findIndex((s) => s.id === activeSection) === 0
                    }
                    className="flex items-center space-x-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span>{t("whatsappGuide.navigation.previous")}</span>
                  </button>

                  <button
                    onClick={() => {
                      const currentIndex = sections.findIndex(
                        (s) => s.id === activeSection
                      );
                      if (currentIndex < sections.length - 1) {
                        setActiveSection(sections[currentIndex + 1].id);
                      }
                    }}
                    disabled={
                      sections.findIndex((s) => s.id === activeSection) ===
                      sections.length - 1
                    }
                    className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span>{t("whatsappGuide.navigation.next")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Tips */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t("whatsappGuide.quickTips.heading")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("whatsappGuide.quickTips.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {quickTips.map((tip, index) => {
              const Icon = tipIcons[index] || Users;
              return (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
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

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("whatsappGuide.cta.heading")}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t("whatsappGuide.cta.subtitle")}
          </p>
          <button className="bg-white text-green-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl">
            {t("whatsappGuide.cta.button")}
          </button>
        </div>
      </section>
    </div>
  );
};

export default WhatsAppGuide;
