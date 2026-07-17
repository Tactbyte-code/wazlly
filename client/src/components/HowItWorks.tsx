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

import React, { useState, useEffect } from "react";
import {
  Upload,
  MessageSquare,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Play,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useTranslation } from "@/lib/i18n";

import step1Image from "../images/Connect_Your_Meta_API.png";
import step2Image from "../images/Import_Your_Contacts.png";
import step3Image from "../images/create_lanch_campaigns.png";
import step4Image from "../images/Track_&_Optimize.png";
import { Link } from "wouter";

interface FeatureStep {
  icon: keyof typeof LucideIcons;
  title: string;
  description: string;
  details: string[];
  color: string;
  bgColor: string;
  demo?: {
    title?: string;
    stats?: string;
    features?: string[];
  };
}

const HowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);
  const { t } = useTranslation();

  const steps: FeatureStep[] = (t as any)("Landing.howItWorksSec.steps", {
    returnObjects: true,
  });

  const stepImages = [step1Image, step2Image, step3Image, step4Image];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [steps.length]);

  const progressBarLabels = (t as any)("Landing.howItWorksSec.progressBar", {
    returnObjects: true,
  }) as { previous: string; nextStep: string };

  const visualDemoLabel = t(
    "Landing.howItWorksSec.visualDemo.whatsAppBusinessDashboard"
  );

  const cta = (t as any)("Landing.howItWorksSec.cta", {
    returnObjects: true,
  }) as {
    readyToGetStarted: string;
    joinText: string;
    startFreeTrial: string;
  };

  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-violet-50 text-violet-700 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-violet-100">
            <Play className="w-4 h-4 mr-2" />
            {t("Landing.howItWorksSec.introTagline")}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t("Landing.howItWorksSec.headlinePre")}
            <span className="block bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              {t("Landing.howItWorksSec.headlineHighlight")}
            </span>
          </h2>
          <p className="text-lg text-gray-500 max-w-3xl mx-auto leading-relaxed">
            {t("Landing.howItWorksSec.subHeadline")}
          </p>
        </div>

        <div className="mb-16 relative">
          <div className="relative flex justify-between items-start">
            <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 z-0"></div>
            <div
              className="absolute top-4 left-6 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 z-0 transition-all duration-700"
              style={{ width: activeStep === 0 ? '0%' : `calc(${(activeStep / (steps.length - 1)) * 100}% - 48px)` }}
            ></div>
            {steps.map((step: FeatureStep, index: number) => (
              <div
                key={index}
                className="flex flex-col items-center cursor-pointer transition-all z-10 flex-1"
                onClick={() => setActiveStep(index)}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 mb-2 ${
                    index <= activeStep
                      ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-200"
                      : "bg-white text-gray-400 border-2 border-gray-200"
                  }`}
                >
                  {index + 1}
                </div>
                <span className={`hidden sm:block font-medium text-xs text-center transition-colors max-w-[120px] leading-tight ${
                  index <= activeStep ? "text-violet-700" : "text-gray-400"
                }`}>
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div
              className="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all duration-500"
            >
              <div className="flex items-center space-x-4 mb-6">
                <div
                  className={`p-3.5 rounded-xl bg-gradient-to-r ${steps[activeStep].color} shadow-sm`}
                >
                  {(() => {
                    const Icon = LucideIcons[
                      steps[activeStep].icon
                    ] as unknown as React.ComponentType<any>;
                    return Icon ? (
                      <Icon className="w-7 h-7 text-white" />
                    ) : null;
                  })()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {steps[activeStep].title}
                  </h3>
                  <p className="text-gray-500 mt-1 text-sm leading-relaxed">
                    {steps[activeStep].description}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {steps[activeStep].details.map((detail, idx) => (
                  <div key={idx} className="flex items-center space-x-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-gray-600 text-sm">{detail}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {progressBarLabels.previous}
              </button>
              <button
                onClick={() =>
                  setActiveStep(Math.min(steps.length - 1, activeStep + 1))
                }
                disabled={activeStep === steps.length - 1}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-xl text-sm font-medium hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center shadow-sm"
              >
                {progressBarLabels.nextStep}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="bg-gray-950 p-5 rounded-3xl shadow-xl">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-gray-500 text-xs ml-3 font-medium tracking-wide uppercase">
                  {visualDemoLabel}
                </span>
              </div>
              <div className="bg-white rounded-2xl p-2 min-h-[250px] overflow-hidden">
                <img
                  src={stepImages[activeStep]}
                  alt={`Step ${activeStep + 1}: ${steps[activeStep].title}`}
                  className="w-full h-full object-cover rounded-xl transition-all duration-500 ease-in-out"
                  key={activeStep}
                />
              </div>
            </div>

            <div className="absolute inset-0 pointer-events-none">
              <div
                className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${steps[activeStep].color} opacity-10 rounded-full blur-3xl transition-all duration-1000`}
              ></div>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center">
          <div className="bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-10 rounded-3xl border border-violet-100/50">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {cta.readyToGetStarted}
            </h3>
            <p className="text-gray-500 mb-8 max-w-lg mx-auto">{cta.joinText}</p>
            <Link
              href="/contact"
              className="inline-flex items-center bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-violet-600 hover:to-fuchsia-600 transition-all shadow-md shadow-violet-200 hover:shadow-lg hover:shadow-violet-200"
            >
              {cta.startFreeTrial}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
