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
import {
  MessageCircle,
  Users,
  Target,
  Zap,
  Heart,
  Globe,
  Award,
  TrendingUp,
  Shield,
  Clock,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

const AboutUs: React.FC = () => {
  const { t } = useTranslation();

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title ?? "";

  const valuesList = t("aboutUs.values.list") as unknown as Array<{
    title: string;
    description: string;
  }>;

  const achievements = t("aboutUs.values.achievements") as unknown as Array<{
    title: string;
    subtitle: string;
  }>;

  const journeyMilestones = t(
    "aboutUs.story.journey.milestones"
  ) as unknown as Array<{
    year: string;
    label: string;
  }>;

  const valueIcons = [Users, Zap, Shield, Clock];
  const valueColors = ["green", "blue", "purple", "orange"];

  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600 text-white py-28 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3" />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center bg-white/15 backdrop-blur-md px-5 py-2.5 rounded-full text-sm font-medium mb-10 border border-white/20">
            <MessageCircle className="w-4 h-4 mr-2" />
            {t("aboutUs.hero.badge", {
              appName,
            })}
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 tracking-tight">
            {t("aboutUs.hero.title")}
            <span className="block mt-2 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
              {t("aboutUs.hero.titleHighlight")}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
            {t("aboutUs.hero.subtitle")}
          </p>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-emerald-100">
                <Target className="w-4 h-4 mr-2" />
                {t("aboutUs.mission.badge")}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {t("aboutUs.mission.title")}
                <span className="text-emerald-600">
                  {" "}
                  {t("aboutUs.mission.titleHighlight")}
                </span>
              </h2>
              <p className="text-gray-600 mb-5 leading-relaxed text-lg">
                {t("aboutUs.mission.description1")}
              </p>
              <p className="text-gray-600 mb-10 leading-relaxed text-lg">
                {t("aboutUs.mission.description2", {
                  appName,
                })}
              </p>
              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="text-3xl font-extrabold text-emerald-600 mb-1">
                    {t("aboutUs.mission.stats.businesses")}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    {t("aboutUs.mission.stats.businessesLabel")}
                  </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="text-3xl font-extrabold text-emerald-600 mb-1">
                    {t("aboutUs.mission.stats.messages")}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    {t("aboutUs.mission.stats.messagesLabel")}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-3xl p-10 h-[500px] flex items-center justify-center border border-emerald-100/50">
                <MessageCircle className="w-64 h-64 text-emerald-400 opacity-10" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-sm border border-white">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      {t("aboutUs.mission.card.title")}
                    </h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      {t("aboutUs.mission.card.description", {
                        appName,
                      })}
                    </p>
                    <div className="flex items-center space-x-4">
                      <div className="flex -space-x-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 ring-2 ring-white"></div>
                        <div className="w-10 h-10 rounded-full bg-teal-500 ring-2 ring-white"></div>
                        <div className="w-10 h-10 rounded-full bg-cyan-500 ring-2 ring-white"></div>
                      </div>
                      <div className="text-sm text-gray-500 font-medium">
                        {t("aboutUs.mission.card.count")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative order-2 lg:order-1">
              <div className="bg-gradient-to-br from-cyan-50 to-emerald-50 rounded-3xl p-10 border border-cyan-100/50">
                <div className="flex items-center space-x-3 mb-8">
                  <Users className="w-6 h-6 text-teal-600" />
                  <h3 className="text-xl font-bold text-gray-900">
                    {t("aboutUs.story.journey.title")}
                  </h3>
                </div>
                <div className="relative space-y-0">
                  <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-emerald-300 via-teal-300 to-cyan-300" />
                  {journeyMilestones.map((milestone, index) => {
                    const icons = [Zap, TrendingUp, Award];
                    const Icon = icons[index];
                    const bgColors = [
                      "bg-emerald-500",
                      "bg-teal-500",
                      "bg-cyan-500",
                    ];

                    return (
                      <div
                        key={index}
                        className="relative flex items-start space-x-5 py-4"
                      >
                        <div
                          className={`${bgColors[index]} w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-white shadow-md z-10`}
                        >
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="pt-1">
                          <div className="font-bold text-gray-900 text-lg">
                            {milestone.year}
                          </div>
                          <div className="text-gray-500 mt-0.5">
                            {milestone.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center bg-cyan-50 text-cyan-700 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-cyan-100">
                <Heart className="w-4 h-4 mr-2" />
                {t("aboutUs.story.badge")}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                {t("aboutUs.story.title")}
                <span className="text-emerald-600">
                  {" "}
                  {t("aboutUs.story.titleHighlight")}
                </span>
              </h2>
              <p className="text-gray-600 mb-5 leading-relaxed text-lg">
                {t("aboutUs.story.description1", {
                  appName,
                })}
              </p>
              <p className="text-gray-600 mb-5 leading-relaxed text-lg">
                {t("aboutUs.story.description2", {
                  appName,
                })}
              </p>
              <p className="text-gray-600 mb-10 leading-relaxed text-lg">
                {t("aboutUs.story.description3")}
              </p>
              <div className="flex items-center space-x-4 bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                <div className="bg-emerald-100 p-3 rounded-xl">
                  <Globe className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">
                    {t("aboutUs.story.globalPresence")}
                  </div>
                  <div className="text-gray-500 text-sm">
                    {t("aboutUs.story.globalPresenceDesc")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-purple-100">
              <Shield className="w-4 h-4 mr-2" />
              {t("aboutUs.values.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
              {t("aboutUs.values.title")}
              <span className="text-emerald-600">
                {" "}
                {t("aboutUs.values.titleHighlight")}
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
            {valuesList.map((value, index) => {
              const Icon = valueIcons[index];
              const borderColors = [
                "border-l-emerald-500",
                "border-l-blue-500",
                "border-l-purple-500",
                "border-l-orange-500",
              ];
              const iconBgColors = [
                "bg-emerald-50 text-emerald-600",
                "bg-blue-50 text-blue-600",
                "bg-purple-50 text-purple-600",
                "bg-orange-50 text-orange-600",
              ];

              return (
                <div
                  key={index}
                  className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 ${borderColors[index]} hover:shadow-md transition-all duration-200`}
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 rounded-xl flex-shrink-0 ${iconBgColors[index]}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1.5">
                        {value.title}
                      </h3>
                      <p className="text-gray-500 leading-relaxed">
                        {value.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {achievements.map((achievement, index) => {
              const icons = [Award, TrendingUp, Globe];
              const Icon = icons[index];
              const gradients = [
                "from-emerald-500 to-teal-600",
                "from-teal-500 to-cyan-600",
                "from-cyan-500 to-blue-600",
              ];

              return (
                <div
                  key={index}
                  className="relative bg-white/70 backdrop-blur-sm p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 group overflow-hidden"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradients[index]} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                  <div
                    className={`bg-gradient-to-br ${gradients[index]} w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="font-extrabold text-xl text-gray-900 mb-1">
                    {achievement.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {achievement.subtitle}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-600">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/3 translate-y-1/3" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            {t("aboutUs.cta.title")}
            <span className="block mt-2 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
              {t("aboutUs.cta.titleHighlight")}
            </span>
          </h2>
          <p className="text-lg md:text-xl text-white/80 mb-10 leading-relaxed">
            {t("aboutUs.cta.subtitle", {
              appName,
            })}
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center bg-white text-emerald-600 px-10 py-4 rounded-2xl font-bold hover:bg-emerald-50 transition-all duration-200 transform hover:scale-105 shadow-xl text-lg"
          >
            {t("aboutUs.cta.button")}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
