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
  TrendingUp,
  Users,
  ShoppingCart,
  Calendar,
  Heart,
  GraduationCap,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { Link } from "wouter";
import { RiProfileFill } from "react-icons/ri";
import { FaUserCircle } from "react-icons/fa";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

const CaseStudies = () => {
  const { t } = useTranslation();
  const [selectedStudy, setSelectedStudy] = useState<any>(null);

  // Get stats from translations
  const stats = t("caseStudies.stats.list") as unknown as Array<{
    number: string;
    label: string;
  }>;

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const appName = brandSettings?.title ?? "";

  // Case studies data (keep as is - these are specific case studies)
  const caseStudies = [
    {
      id: 1,
      title: "FashionHub Increases Sales by 300%",
      company: "FashionHub",
      industry: "E-commerce",
      icon: ShoppingCart,
      image:
        "https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
      challenge: "High cart abandonment rates and low customer engagement",
      solution:
        "Implemented automated cart recovery campaigns and personalized product recommendations",
      results: {
        primary: "300% increase in recovered sales",
        metrics: [
          { label: "Cart Recovery Rate", value: "45%", increase: "+35%" },
          { label: "Customer Engagement", value: "78%", increase: "+52%" },
          { label: "Revenue Growth", value: "$2.1M", increase: "+300%" },
        ],
      },
      testimonial: {
        quote:
          "WPSaaS transformed our customer engagement. The automated workflows saved us hours while dramatically increasing our sales.",
        author: "Sarah Johnson",
        role: "Marketing Director",
      },
      timeline: "3 months",
      tags: ["Cart Recovery", "Automation", "Personalization"],
    },
    {
      id: 2,
      title: "HealthCare Plus Reduces No-Shows by 60%",
      company: "HealthCare Plus",
      industry: "Healthcare",
      icon: Heart,
      image:
        "https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
      challenge: "High appointment no-show rates affecting clinic efficiency",
      solution:
        "Automated appointment reminders and confirmation system via WhatsApp",
      results: {
        primary: "60% reduction in no-shows",
        metrics: [
          { label: "Appointment Attendance", value: "92%", increase: "+60%" },
          { label: "Patient Satisfaction", value: "4.8/5", increase: "+25%" },
          { label: "Operational Efficiency", value: "85%", increase: "+40%" },
        ],
      },
      testimonial: {
        quote:
          "Our patients love the WhatsApp reminders. It's convenient for them and has significantly improved our scheduling efficiency.",
        author: "Dr. Michael Chen",
        role: "Clinic Director",
      },
      timeline: "2 months",
      tags: ["Healthcare", "Reminders", "Efficiency"],
    },
    {
      id: 3,
      title: "EduTech Academy Boosts Engagement by 85%",
      company: "EduTech Academy",
      industry: "Education",
      icon: GraduationCap,
      image:
        "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
      challenge: "Low student and parent engagement with course updates",
      solution: "Personalized course updates and parent communication system",
      results: {
        primary: "85% increase in engagement",
        metrics: [
          { label: "Parent Engagement", value: "90%", increase: "+85%" },
          { label: "Course Completion", value: "78%", increase: "+45%" },
          { label: "Student Satisfaction", value: "4.7/5", increase: "+30%" },
        ],
      },
      testimonial: {
        quote:
          "Parents are now actively involved in their children's education journey. The communication has never been better.",
        author: "Lisa Rodriguez",
        role: "Academic Coordinator",
      },
      timeline: "4 months",
      tags: ["Education", "Parent Communication", "Engagement"],
    },
    {
      id: 4,
      title: "RestaurantPro Increases Orders by 120%",
      company: "RestaurantPro",
      industry: "Food & Beverage",
      icon: Users,
      image:
        "https://images.pexels.com/photos/1581384/pexels-photo-1581384.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop",
      challenge: "Declining customer retention and low repeat orders",
      solution:
        "Loyalty program notifications and personalized menu recommendations",
      results: {
        primary: "120% increase in orders",
        metrics: [
          { label: "Repeat Customers", value: "65%", increase: "+120%" },
          { label: "Average Order Value", value: "$45", increase: "+35%" },
          { label: "Customer Lifetime Value", value: "$280", increase: "+85%" },
        ],
      },
      testimonial: {
        quote:
          "Our customers love getting personalized menu suggestions. It's like having a personal food concierge.",
        author: "David Park",
        role: "Restaurant Owner",
      },
      timeline: "3 months",
      tags: ["Food Service", "Loyalty", "Personalization"],
    },
  ];

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 inline-flex gap-2">
            {t("caseStudies.hero.title")}
            <span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {t("caseStudies.hero.titleHighlight")}
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t("caseStudies.hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {caseStudies.map((study) => (
              <div
                key={study.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <div className="relative">
                  <img
                    src={study.image}
                    alt={study.company}
                    className="w-full h-64 object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-sm font-medium text-gray-700">
                      {study.industry}
                    </span>
                  </div>
                  <div className="absolute bottom-4 right-4 bg-green-500 p-2 rounded-lg">
                    <study.icon className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {study.title}
                  </h3>
                  <p className="text-gray-600 mb-6">{study.challenge}</p>

                  <div className="bg-green-50 p-4 rounded-lg mb-6">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      {study.results.primary}
                    </div>
                    <div className="text-sm text-gray-600">
                      {t("caseStudies.modal.primaryResult")}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {study.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => setSelectedStudy(study)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-lg hover:from-green-600 hover:to-green-700 transition-all flex items-center justify-center group"
                  >
                    {t("caseStudies.cta.buttonText")}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Study Modal */}
      {selectedStudy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img
                src={selectedStudy.image}
                alt={selectedStudy.company}
                className="w-full h-64 object-cover"
              />
              <button
                onClick={() => setSelectedStudy(null)}
                className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {selectedStudy.title}
                  </h2>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <span>{selectedStudy.company}</span>
                    <span>•</span>
                    <span>{selectedStudy.industry}</span>
                    <span>•</span>
                    <span>{selectedStudy.timeline}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {t("caseStudies.modal.challenge")}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {selectedStudy.challenge}
                  </p>

                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {t("caseStudies.modal.solution")}
                  </h3>
                  <p className="text-gray-600">{selectedStudy.solution}</p>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {t("caseStudies.modal.keyResults")}
                  </h3>
                  <div className="space-y-4">
                    {selectedStudy.results.metrics.map(
                      (metric: any, index: number) => (
                        <div key={index} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-700 font-medium">
                              {metric.label}
                            </span>
                            <span className="text-green-600 font-bold">
                              {metric.increase}
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">
                            {metric.value}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg mb-8">
                <blockquote className="text-lg text-gray-700 italic mb-4">
                  "{selectedStudy.testimonial.quote}"
                </blockquote>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <FaUserCircle className="text-gray-700 text-3xl" />
                  </div>

                  <div>
                    <div className="font-semibold text-gray-900">
                      {selectedStudy.testimonial.author}
                    </div>
                    <div className="text-gray-600">
                      {selectedStudy.testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
              {/* 
              <div className="flex space-x-4">
                <button className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors">
                  {t("caseStudies.cta.modalButtons.startStory")}
                </button>
                <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t("caseStudies.cta.modalButtons.share")}
                </button>
              </div> */}
            </div>
          </div>
        </div>
      )}

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            {t("caseStudies.stats.heading")}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-lg">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("caseStudies.ctaBanner.heading")}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t("caseStudies.ctaBanner.subtitle", {
              appName,
            })}
          </p>
          <Link
            href="/contact"
            className="w-fit
             bg-white text-green-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
          >
            {t("caseStudies.ctaBanner.button")}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CaseStudies;
