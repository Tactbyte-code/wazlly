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
import { Link } from "wouter";
import {
  MessageCircle,
  Twitter,
  Linkedin,
  Github,
  Mail,
  ArrowRight,
  MessageSquare,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";

const Footer: React.FC = () => {
  const { t } = useTranslation();

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const productLinks = t(
    "Landing.footerSec.links.product"
  ) as unknown as string[];
  const companyLinks = t(
    "Landing.footerSec.links.company"
  ) as unknown as string[];
  const supportLinks = t(
    "Landing.footerSec.links.support"
  ) as unknown as string[];
  const resourcesLinks = t(
    "Landing.footerSec.links.resources"
  ) as unknown as string[];
  const legalLinks = t("Landing.footerSec.links.legal") as unknown as string[];

  const links = {
    product: [
      { name: productLinks[0], href: "/#features" },
      { name: productLinks[1], href: "/#how-it-works" },
      { name: productLinks[2], href: "/#use-cases" },
    ],
    company: [
      { name: companyLinks[0], href: "/about" },
      { name: companyLinks[1], href: "/contact" },
      { name: companyLinks[2], href: "/careers" },
    ],
    support: [
      { name: supportLinks[0], href: "#" },
      { name: supportLinks[1], href: "#" },
      { name: supportLinks[2], href: "#" },
      { name: supportLinks[3], href: "#" },
    ],
    resources: [
      { name: resourcesLinks[1], href: "/case-studies" },
      { name: resourcesLinks[2], href: "/whatsapp-guide" },
      { name: resourcesLinks[3], href: "/best-practices" },
    ],
    legal: [
      { name: legalLinks[0], href: "/privacy-policy" },
      { name: legalLinks[1], href: "/terms" },
      { name: legalLinks[2], href: "/cookie-policy" },
    ],
  };

  const renderLink = (link: { name: string; href: string }, index: number) => (
    <li key={index}>
      {link.href.startsWith("/") ? (
        <Link
          to={link.href}
          className="text-gray-400 hover:text-white text-sm transition-all duration-200 hover:translate-x-0.5 inline-block"
        >
          {link.name}
        </Link>
      ) : (
        <a
          href={link.href}
          className="text-gray-400 hover:text-white text-sm transition-all duration-200 hover:translate-x-0.5 inline-block"
        >
          {link.name}
        </a>
      )}
    </li>
  );

  return (
    <footer className="bg-gradient-to-b from-gray-900 to-gray-950 text-white relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
              {brandSettings?.logo2 && brandSettings.logo2 !== "/uploads/null" ? (
                <img
                  src={brandSettings.logo2}
                  alt="Logo"
                  className="h-12 object-contain"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              ) : brandSettings?.logo ? (
                <img
                  src={brandSettings.logo}
                  alt="Logo"
                  className="h-12 object-contain"
                  style={{ filter: "brightness(0) invert(1)" }}
                />
              ) : (
                <div className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl p-2.5">
                  <MessageSquare className="h-7 w-7" />
                </div>
              )}
            </Link>
            <p className="text-gray-400 mt-5 mb-8 max-w-sm text-sm leading-relaxed">
              {t("Landing.footerSec.brandSection.description")}
            </p>
            <div className="flex space-x-3">
              <a
                href="https://x.com"
                className="bg-gray-800/60 p-2.5 rounded-xl hover:bg-blue-500/20 border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300 group hover:scale-110"
                aria-label={t("Landing.footerSec.socialLinks.twitter")}
              >
                <Twitter className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors duration-300" />
              </a>
              <a
                href="https://linkedin.com/"
                className="bg-gray-800/60 p-2.5 rounded-xl hover:bg-blue-600/20 border border-gray-700/50 hover:border-blue-600/30 transition-all duration-300 group hover:scale-110"
                aria-label={t("Landing.footerSec.socialLinks.linkedin")}
              >
                <Linkedin className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
              </a>
              <a
                href="https://github.com/"
                className="bg-gray-800/60 p-2.5 rounded-xl hover:bg-gray-600/20 border border-gray-700/50 hover:border-gray-500/30 transition-all duration-300 group hover:scale-110"
                aria-label={t("Landing.footerSec.socialLinks.github")}
              >
                <Github className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-300" />
              </a>
              <a
                href="https://mail.google.com"
                className="bg-gray-800/60 p-2.5 rounded-xl hover:bg-emerald-500/20 border border-gray-700/50 hover:border-emerald-500/30 transition-all duration-300 group hover:scale-110"
                aria-label={t("Landing.footerSec.socialLinks.mail")}
              >
                <Mail className="w-4 h-4 text-gray-400 group-hover:text-emerald-400 transition-colors duration-300" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-5">
              Product
            </h3>
            <ul className="space-y-3">
              {links.product.map((link, index) => renderLink(link, index))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-5">
              Company
            </h3>
            <ul className="space-y-3">
              {links.company.map((link, index) => renderLink(link, index))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-5">
              Resources
            </h3>
            <ul className="space-y-3">
              {links.resources.map((link, index) => renderLink(link, index))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-5">
              Legal
            </h3>
            <ul className="space-y-3">
              {links.legal.map((link, index) => renderLink(link, index))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-xs">
              {t("Landing.footerSec.bottomBar.copyrightText", {
                appName: brandSettings?.title ?? "",
              })}
            </p>
            <div className="flex items-center space-x-6">
              <Link
                to="/terms"
                className="text-gray-500 hover:text-gray-300 text-xs transition-colors duration-200"
              >
                {t("Landing.footerSec.bottomBar.termsLink")}
              </Link>
              <Link
                to="/privacy-policy"
                className="text-gray-500 hover:text-gray-300 text-xs transition-colors duration-200"
              >
                {t("Landing.footerSec.bottomBar.privacyLink")}
              </Link>
              <Link
                to="/cookie-policy"
                className="text-gray-500 hover:text-gray-300 text-xs transition-colors duration-200"
              >
                {t("Landing.footerSec.bottomBar.cookieLink")}
              </Link>
            </div>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;
