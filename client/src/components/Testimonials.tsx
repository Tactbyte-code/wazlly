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
import { Star, Quote, ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const Testimonials: React.FC = () => {
  const { t } = useTranslation();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = t(
    "Landing.testimonialsSec.testimonials"
  ) as unknown as Array<{
    name: string;
    role: string;
    company: string;
    image: string;
    rating: number;
    text: string;
    results: string;
  }>;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const navButtons = t("Landing.testimonialsSec.navButtons") as unknown as {
    previous: string;
    next: string;
  };

  const statsGrid = t("Landing.testimonialsSec.statsGrid") as unknown as Array<{
    number: string;
    label: string;
  }>;

  const prevTestimonial = () => {
    setCurrentTestimonial(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length
    );
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-slate-50 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-emerald-100/40 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-cyan-100/40 rounded-full blur-3xl"></div>

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-amber-50 text-amber-700 px-5 py-2 rounded-full text-sm font-medium mb-6 border border-amber-200/60">
            <Star className="w-4 h-4 mr-2 fill-amber-400 text-amber-400" />
            {t("Landing.testimonialsSec.introTagline")}
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 tracking-tight">
            {t("Landing.testimonialsSec.headlinePre")}
            <span className="block bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mt-1">
              {t("Landing.testimonialsSec.headlineHighlight")}
            </span>
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {t("Landing.testimonialsSec.subHeadline")}
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto mb-12">
          <div className="bg-white/80 backdrop-blur-sm p-8 md:p-12 rounded-2xl border border-gray-200/80 relative transition-all duration-500">
            <Quote className="absolute top-6 left-6 w-8 h-8 text-emerald-200/60" />

            <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full opacity-20 blur-sm"></div>
                  <img
                    src={testimonials[currentTestimonial].image}
                    alt={testimonials[currentTestimonial].name}
                    className="w-20 h-20 rounded-full object-cover relative ring-2 ring-white"
                  />
                </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                <div className="flex justify-center md:justify-start space-x-1 mb-4">
                  {[...Array(testimonials[currentTestimonial].rating)].map(
                    (_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 text-amber-400 fill-amber-400"
                      />
                    )
                  )}
                </div>

                <blockquote className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed font-light">
                  "{testimonials[currentTestimonial].text}"
                </blockquote>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {testimonials[currentTestimonial].name}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {testimonials[currentTestimonial].role} at{" "}
                      {testimonials[currentTestimonial].company}
                    </p>
                  </div>

                  <div className="mt-4 md:mt-0 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-lg">
                    <p className="text-sm font-medium text-emerald-700">
                      {testimonials[currentTestimonial].results}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={prevTestimonial}
            className="absolute -left-4 md:-left-5 top-1/2 transform -translate-y-1/2 bg-white p-2.5 rounded-full border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 shadow-sm"
            aria-label={navButtons.previous}
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={nextTestimonial}
            className="absolute -right-4 md:-right-5 top-1/2 transform -translate-y-1/2 bg-white p-2.5 rounded-full border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-200 shadow-sm"
            aria-label={navButtons.next}
          >
            <ArrowRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex justify-center space-x-2 mb-16">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTestimonial(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentTestimonial
                  ? "bg-emerald-500 w-8"
                  : "bg-gray-300/60 w-2 hover:bg-gray-400"
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {statsGrid.map((stat, index) => (
            <div
              key={index}
              className="text-center bg-white/60 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-6 hover:border-emerald-200/80 transition-colors duration-200"
            >
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-1">
                {stat.number}
              </div>
              <div className="text-gray-500 text-sm font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
