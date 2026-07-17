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
import { ArrowRight, Play, Users, TrendingUp, Zap } from "lucide-react";
import LoadingAnimation from "./LoadingAnimation";
import { useTranslation } from "@/lib/i18n";
import { Link } from "wouter";

const TYPING_WORDS = [
  "WhatsApp Marketing",
  "Customer Engagement",
  "Business Growth",
];

const Hero = () => {
  const [currentStat, setCurrentStat] = useState(0);
  const [animatedNumbers, setAnimatedNumbers] = useState({
    users: 0,
    delivery: 0,
    engagement: 0,
  });
  const { t } = useTranslation();
  const [startTrialLoading, setStartTrialLoading] = useState(false);

  const [wordIndex, setWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = TYPING_WORDS[wordIndex];
    let timeout: NodeJS.Timeout;

    if (!isDeleting && displayText === currentWord) {
      timeout = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setWordIndex((prev) => (prev + 1) % TYPING_WORDS.length);
    } else {
      const speed = isDeleting ? 40 : 80;
      timeout = setTimeout(() => {
        setDisplayText(
          isDeleting
            ? currentWord.substring(0, displayText.length - 1)
            : currentWord.substring(0, displayText.length + 1)
        );
      }, speed);
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, wordIndex]);

  const stats = [
    {
      icon: Users,
      value: 50000,
      label: t("Landing.heroSec.stats.0.label"),
      suffix: "+",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: TrendingUp,
      value: 98,
      label: t("Landing.heroSec.stats.1.label"),
      suffix: t("Landing.heroSec.stats.1.suffix"),
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: Zap,
      value: 5,
      label: t("Landing.heroSec.stats.2.label"),
      suffix: t("Landing.heroSec.stats.2.suffix"),
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % stats.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const animateNumbers = () => {
      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;

      let step = 0;
      const timer = setInterval(() => {
        step++;
        const progress = step / steps;

        setAnimatedNumbers({
          users: Math.floor(50000 * progress),
          delivery: Math.floor(98 * progress),
          engagement: Math.floor(5 * progress),
        });

        if (step >= steps) clearInterval(timer);
      }, stepDuration);
    };

    animateNumbers();
  }, []);

  const handleStartTrial = () => {
    setStartTrialLoading(true);
    setTimeout(() => {
      setStartTrialLoading(false);
    }, 2000);
  };

  return (
    <section className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-[pulse_6s_ease-in-out_infinite]"></div>
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-[pulse_8s_ease-in-out_infinite_2s]"></div>
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-[600px] h-[600px] bg-violet-50 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-[pulse_10s_ease-in-out_infinite_4s]"></div>
      </div>

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-emerald-200/60 animate-[fadeInDown_0.6s_ease-out]">
            <Zap className="w-4 h-4 mr-2" />
            {t("Landing.heroSec.animatedBgGreenText")}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-[1.1] tracking-tight animate-[fadeIn_0.7s_ease-out]">
            {t("Landing.heroSec.headline")}{" "}
            <span className="block bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mt-2 pb-4">
              {displayText}
              <span className="inline-block w-[3px] h-[0.8em] bg-emerald-500 ml-1 align-middle animate-[blink_1s_step-end_infinite]"></span>
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-3xl mx-auto mb-12 leading-relaxed animate-[fadeIn_0.8s_ease-out]">
            {t("Landing.heroSec.subHeadline")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-[fadeInUp_0.9s_ease-out]">
            <Link
              href="/contact"
              className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-600 transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 flex items-center group min-w-[180px] justify-center"
            >
              {startTrialLoading ? (
                <LoadingAnimation size="md" color="white" />
              ) : (
                <>
                  {t("Landing.heroSec.startTrialButton")}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 max-w-3xl mx-auto">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 animate-[fadeInUp_0.6s_ease-out] ${
                  currentStat === index
                    ? "ring-1 ring-emerald-400/50 shadow-md border-emerald-100"
                    : ""
                }`}
                style={{ animationDelay: `${index * 0.1}s`, animationFillMode: "both" }}
              >
                <div
                  className={`${stat.bg} p-3 rounded-xl w-fit mx-auto mb-3`}
                >
                  <stat.icon
                    className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.color}`}
                  />
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1 tracking-tight">
                  {index === 0
                    ? animatedNumbers.users.toLocaleString()
                    : index === 1
                    ? animatedNumbers.delivery
                    : animatedNumbers.engagement}
                  {stat.suffix || ""}
                </h3>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center animate-[fadeIn_1s_ease-out]">
          <p className="text-sm text-gray-400 mb-6 font-medium uppercase tracking-wider">
            {t("Landing.heroSec.trustedByText")}
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6">
            {["Shopify", "WooCommerce", "Salesforce", "HubSpot", "Zapier"].map(
              (brand, index) => (
                <div
                  key={index}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-400 bg-gray-50 border border-gray-100 transition-colors duration-200 hover:text-gray-500 hover:border-gray-200"
                >
                  {brand}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
};

export default Hero;
