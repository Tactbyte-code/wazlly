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
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  MessageCircle,
  Users,
  Headphones,
  ChevronDown,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { toast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";
import { apiRequest } from "@/lib/queryClient";

const ContactusLanding = () => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      const response = await apiRequest("POST", "/api/contact/sendmail", formData);
      const data = await response.json();

      if (!data?.success) {
        toast({
          title: "Failed to send message",
          description: data?.message || "Something went wrong.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Message Sent Successfully",
        description: "We received your message and will respond shortly.",
      });

      setFormData({
        name: "",
        email: "",
        company: "",
        subject: "",
        message: "",
      });
    } catch (error: unknown) {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const contactInfo = t("contactUs.contactInfo.list") as unknown as Array<{
    title: string;
    details: string;
    description: string;
  }>;

  const faqQuestions = t("contactUs.faq.questions") as unknown as Array<{
    q: string;
    a: string;
  }>;

  const iconMap = [Mail, MapPin];

  return (
    <div className="pt-16">
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 via-white to-white relative overflow-hidden">
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-emerald-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-cyan-100/30 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto text-center relative">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
            {t("contactUs.hero.title")}
            <span className="bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent ml-3">
              {t("contactUs.hero.titleHighlight")}
            </span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {t("contactUs.hero.subtitle")}
          </p>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-white p-8 md:p-10 rounded-2xl border border-gray-200/80 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">
                {t("contactUs.form.heading")}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="peer w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-200 placeholder-transparent bg-gray-50/50 focus:bg-white"
                      placeholder={t("contactUs.form.fields.name")}
                      required
                    />
                    <label className="absolute left-4 -top-2.5 text-xs font-medium text-gray-500 bg-white px-1 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white">
                      {t("contactUs.form.fields.name")} {t("contactUs.form.fields.required")}
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="peer w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-200 placeholder-transparent bg-gray-50/50 focus:bg-white"
                      placeholder={t("contactUs.form.fields.email")}
                      required
                    />
                    <label className="absolute left-4 -top-2.5 text-xs font-medium text-gray-500 bg-white px-1 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white">
                      {t("contactUs.form.fields.email")} {t("contactUs.form.fields.required")}
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="relative">
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="peer w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-200 placeholder-transparent bg-gray-50/50 focus:bg-white"
                      placeholder={t("contactUs.form.fields.company")}
                    />
                    <label className="absolute left-4 -top-2.5 text-xs font-medium text-gray-500 bg-white px-1 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white">
                      {t("contactUs.form.fields.company")}
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">
                      {t("contactUs.form.fields.subject")}{" "}
                      {t("contactUs.form.fields.required")}
                    </label>
                    <select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-200 bg-gray-50/50 focus:bg-white appearance-none"
                      required
                    >
                      <option value="">
                        {t("contactUs.form.placeholders.selectSubject")}
                      </option>
                      <option value="general">
                        {t("contactUs.form.subjects.general")}
                      </option>
                      <option value="support">
                        {t("contactUs.form.subjects.support")}
                      </option>
                      <option value="sales">
                        {t("contactUs.form.subjects.sales")}
                      </option>
                      <option value="partnership">
                        {t("contactUs.form.subjects.partnership")}
                      </option>
                      <option value="feedback">
                        {t("contactUs.form.subjects.feedback")}
                      </option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    className="peer w-full px-4 py-3.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all duration-200 placeholder-transparent bg-gray-50/50 focus:bg-white resize-none"
                    placeholder={t("contactUs.form.fields.message")}
                    required
                  ></textarea>
                  <label className="absolute left-4 -top-2.5 text-xs font-medium text-gray-500 bg-white px-1 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-placeholder-shown:bg-transparent peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-emerald-600 peer-focus:bg-white">
                    {t("contactUs.form.fields.message")} {t("contactUs.form.fields.required")}
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3.5 rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 flex items-center justify-center group shadow-sm shadow-emerald-200 disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      {t("contactUs.form.button")}
                      <Send className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-8">
                  {t("contactUs.contactInfo.heading")}
                </h2>
                <div className="space-y-4">
                  {contactInfo.map((info, index) => {
                    const Icon = iconMap[index];
                    const details =
                      info.title === "Email Us"
                        ? brandSettings?.supportEmail
                        : info.details;

                    return (
                      <div
                        key={index}
                        className="flex items-start space-x-4 p-5 rounded-xl border border-gray-100 bg-gray-50/50 hover:border-emerald-200/60 hover:bg-emerald-50/30 transition-all duration-200"
                      >
                        <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-3 rounded-xl shadow-sm shadow-emerald-200/50 flex-shrink-0">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {info.title}
                          </h3>
                          <p className="text-gray-700 font-medium text-sm mt-0.5">{details}</p>
                          <p className="text-gray-400 text-xs mt-1">
                            {info.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50/80">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
              {t("contactUs.faq.heading")}
            </h2>
            <p className="text-lg text-gray-500">
              {t("contactUs.faq.subtitle")}
            </p>
          </div>

          <div className="space-y-3">
            {faqQuestions.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-gray-200/80 overflow-hidden transition-all duration-200 hover:border-gray-300/80"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <h3 className="font-semibold text-gray-900 text-sm pr-4">{faq.q}</h3>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      openFaq === index ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    openFaq === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="px-5 pb-5 text-gray-500 text-sm leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactusLanding;
