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
  Briefcase,
  MapPin,
  Clock,
  Users,
  Heart,
  Zap,
  Globe,
  TrendingUp,
  ArrowRight,
  Search,
} from "lucide-react";
import { Link } from "wouter";

const Careers = () => {
  const { t } = useTranslation();
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  // Get translated data
  const departments = t("careers.positions.departments") as unknown as Array<{
    id: string;
    name: string;
  }>;

  const stats = t("careers.stats") as unknown as Array<{
    number: string;
    label: string;
  }>;

  const benefits = t("careers.benefits.list") as unknown as Array<{
    title: string;
    description: string;
  }>;

  const values = t("careers.values.list") as unknown as Array<{
    title: string;
    description: string;
  }>;
  const jobs = [
    {
      id: 1,
      title: "Senior Full Stack Engineer",
      department: "engineering",
      location: "San Francisco, CA / Remote",
      type: "Full-time",
      experience: "5+ years",
      description:
        "Join our engineering team to build scalable WhatsApp marketing solutions.",
      requirements: ["React/TypeScript", "Node.js", "PostgreSQL", "AWS/GCP"],
      posted: "2 days ago",
    },
    {
      id: 2,
      title: "Product Manager",
      department: "product",
      location: "San Francisco, CA",
      type: "Full-time",
      experience: "3+ years",
      description:
        "Lead product strategy and roadmap for our WhatsApp marketing platform.",
      requirements: [
        "Product Management",
        "SaaS Experience",
        "Analytics",
        "User Research",
      ],
      posted: "1 week ago",
    },
    {
      id: 3,
      title: "Growth Marketing Manager",
      department: "marketing",
      location: "Remote",
      type: "Full-time",
      experience: "4+ years",
      description:
        "Drive user acquisition and growth through data-driven marketing strategies.",
      requirements: [
        "Growth Marketing",
        "Analytics",
        "A/B Testing",
        "SaaS Marketing",
      ],
      posted: "3 days ago",
    },
    {
      id: 4,
      title: "Customer Success Manager",
      department: "support",
      location: "San Francisco, CA / Remote",
      type: "Full-time",
      experience: "2+ years",
      description:
        "Help customers succeed with our WhatsApp marketing platform.",
      requirements: [
        "Customer Success",
        "SaaS Experience",
        "Communication",
        "Problem Solving",
      ],
      posted: "5 days ago",
    },
    {
      id: 5,
      title: "Sales Development Representative",
      department: "sales",
      location: "Remote",
      type: "Full-time",
      experience: "1+ years",
      description: "Generate and qualify leads for our enterprise sales team.",
      requirements: [
        "Sales Experience",
        "Lead Generation",
        "CRM Tools",
        "Communication",
      ],
      posted: "1 week ago",
    },
    {
      id: 6,
      title: "DevOps Engineer",
      department: "engineering",
      location: "San Francisco, CA / Remote",
      type: "Full-time",
      experience: "4+ years",
      description:
        "Build and maintain our cloud infrastructure and deployment pipelines.",
      requirements: ["AWS/GCP", "Kubernetes", "CI/CD", "Monitoring"],
      posted: "4 days ago",
    },
  ];

  // Icon mapping for benefits
  const benefitIcons = [Heart, Zap, TrendingUp, Users, Globe, Briefcase];

  const filteredJobs =
    selectedDepartment === "all"
      ? jobs
      : jobs.filter((job) => job.department === selectedDepartment);

  return (
    <div className="pt-16">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-green-50 via-white to-blue-50">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-green-100 p-4 rounded-full w-fit mx-auto mb-6">
            <Briefcase className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {t("careers.hero.title")}
            <span className="block bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {t("careers.hero.titleHighlight")}
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            {t("careers.hero.subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#careers"
              className="bg-green-500 text-white px-8 py-4 rounded-xl font-bold hover:bg-green-600 transition-all transform hover:scale-105 shadow-xl"
            >
              {t("careers.hero.buttons.viewPositions")}
            </a>
          </div>
        </div>
      </section>

      {/* Company Stats */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="careers" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t("careers.positions.heading")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("careers.positions.subtitle")}
            </p>
          </div>

          {/* Department Filter */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {departments.map((dept) => (
              <button
                key={dept.id}
                onClick={() => setSelectedDepartment(dept.id)}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  selectedDepartment === dept.id
                    ? "bg-green-500 text-white shadow-lg"
                    : "bg-white text-gray-700 hover:bg-gray-100 shadow-md"
                }`}
              >
                {dept.name}
              </button>
            ))}
          </div>

          {/* Job Listings */}
          <div className="space-y-6">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-4">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {job.title}
                      </h3>
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        {job.department}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-gray-600 mb-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4" />
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>{job.type}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>{job.experience}</span>
                      </div>
                    </div>

                    <p className="text-gray-700 mb-4">{job.description}</p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.requirements.map((req, index) => (
                        <span
                          key={index}
                          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                        >
                          {req}
                        </span>
                      ))}
                    </div>

                    <div className="text-sm text-gray-500">
                      Posted {job.posted}
                    </div>
                  </div>

                  <div className="mt-6 lg:mt-0 lg:ml-8">
                    <Link
                      href="/contact"
                      className="w-fit lg:w-auto bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition-all flex items-center justify-center group"
                    >
                      {t("careers.positions.applyButton")}
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                {t("careers.positions.noResults.title")}
              </h3>
              <p className="text-gray-500">
                {t("careers.positions.noResults.description")}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t("careers.benefits.heading")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("careers.benefits.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefitIcons[index];
              return (
                <div
                  key={index}
                  className="bg-gray-50 p-6 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="bg-green-100 p-3 rounded-lg w-fit mb-4">
                    <Icon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Company Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t("careers.values.heading")}
            </h2>
            <p className="text-xl text-gray-600">
              {t("careers.values.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div key={index} className="bg-white p-8 rounded-xl shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {value.title}
                </h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("careers.cta.heading")}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t("careers.cta.subtitle")}
          </p>
          <Link
            href="/contact"
            className="bg-white text-green-600 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl"
          >
            {t("careers.cta.button")}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Careers;
