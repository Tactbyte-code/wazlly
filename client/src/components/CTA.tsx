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

import React from "react";
import { ArrowRight, MessageCircle, Zap, Shield, Clock } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Link } from "wouter";

const CTA: React.FC = () => {
  const { t } = useTranslation();

  const iconMap = {
    "Instant Setup": Zap,
    "Secure & Compliant": Shield,
    "24/7 Support": Clock,
    "Free Forever": MessageCircle,
  };

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/[0.07] rounded-full blur-2xl"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/[0.07] rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/[0.04] rounded-full blur-3xl"></div>
        <div className="absolute top-20 left-20 w-2 h-2 bg-white/20 rounded-full"></div>
        <div className="absolute bottom-32 right-40 w-1.5 h-1.5 bg-white/25 rounded-full"></div>
        <div className="absolute top-40 right-1/4 w-1 h-1 bg-white/30 rounded-full"></div>
      </div>

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-white/15 backdrop-blur-md text-white/90 px-5 py-2 rounded-full text-sm font-medium mb-8 border border-white/10">
            <MessageCircle className="w-4 h-4 mr-2" />
            {t("Landing.ctaSec.introTagline")}
          </div>

          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            {t("Landing.ctaSec.headline")}
          </h2>

          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-12 leading-relaxed">
            {t("Landing.ctaSec.subHeadline")}
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-16">
            <Link
              href="/contact"
              className="bg-white text-emerald-700 px-8 py-4 rounded-xl font-semibold hover:bg-white/95 transition-all duration-200 transform hover:scale-[1.02] shadow-lg shadow-black/10 flex items-center group text-lg"
            >
              {t("Landing.ctaSec.buttons.startTrial")}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 max-w-4xl mx-auto">
            {(t("Landing.ctaSec.trustIndicators") as unknown as any[]).map(
              (item: any, index: number) => {
                const IconComponent =
                  iconMap[item.title as keyof typeof iconMap] || Zap;
                return (
                  <div
                    key={`${item.title}-${index}`}
                    className="text-center bg-white/[0.08] backdrop-blur-md border border-white/[0.12] rounded-2xl p-6 hover:bg-white/[0.12] transition-all duration-200"
                  >
                    <div className="bg-white/15 p-3 rounded-xl w-fit mx-auto mb-4">
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-white/65 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                );
              }
            )}
          </div>
        </div>

        <div className="bg-white/[0.08] backdrop-blur-md p-6 md:p-8 rounded-2xl border border-white/[0.12]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 text-center">
            {(t("Landing.ctaSec.stats") as unknown as any[]).map(
              (stat: any, index: number) => (
                <div key={`${stat.label}-${index}`}>
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">
                    {stat.number}
                  </div>
                  <div className="text-white/60 text-sm font-medium">{stat.label}</div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
