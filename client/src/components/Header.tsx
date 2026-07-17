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

import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  MessageCircle,
  Menu,
  X,
  ArrowRight,
  ChevronDown,
  Users,
  Briefcase,
  Mail,
  Zap,
  BookOpen,
  Calculator,
  FileText,
  Code,
  TrendingUp,
  LogOut,
  User,
  Settings,
  MessageSquare,
} from "lucide-react";
import LoadingAnimation from "./LoadingAnimation";
import { useAuth } from "@/contexts/auth-context";
import useStaticData from "@/hooks/useStaticData";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "./language-selector";
import { AppSettings } from "@/types/types";
import { useQuery } from "@tanstack/react-query";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showAboutMega, setShowAboutMega] = useState(false);
  const [showResourcesMega, setShowResourcesMega] = useState(false);
  const [showAboutMobile, setShowAboutMobile] = useState(false);
  const [showResourcesMobile, setShowResourcesMobile] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [getStartedLoading, setGetStartedLoading] = useState(false);
  const [location, setLocation] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, user, logout } = useAuth();

  const staticData = useStaticData();
  const { t } = useTranslation();

  const username = (user?.firstName || "") + " " + (user?.lastName || "");

  const logos = user?.avatar;

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
    setShowAboutMobile(false);
    setShowResourcesMobile(false);
    closeMegaMenus();
  }, [location]);

  const handleLogin = () => {
    setLoginLoading(true);
    setTimeout(() => {
      setLoginLoading(false);
    }, 2000);
  };

  const handleGetStarted = () => {
    setGetStartedLoading(true);
    setTimeout(() => {
      setGetStartedLoading(false);
    }, 2000);
  };

  const closeMegaMenus = () => {
    setShowAboutMega(false);
    setShowResourcesMega(false);
  };

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
    if (isMenuOpen) {
      setShowAboutMobile(false);
      setShowResourcesMobile(false);
    }
  };

  const MegaMenu = ({
    items,
    isVisible,
  }: {
    items: typeof staticData.header.aboutMenuItems;
    isVisible: boolean;
    title: string;
  }) => (
    <div
      className={`fixed left-0 right-0 w-screen bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-emerald-100/50 dark:border-emerald-800/30 z-50 transition-all duration-400 ease-out max-h-[80vh] overflow-y-auto ${isVisible
        ? "opacity-100 translate-y-0 visible"
        : "opacity-0 -translate-y-2 invisible pointer-events-none"
        }`}
      style={{
        top: isScrolled ? "64px" : "72px",
      }}
    >
      <div className="max-w-7xl mx-auto p-5 sm:p-6 md:p-8">
        <div
          className={`grid gap-4 md:gap-5 ${items.length === 4
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
        >
          {items.map((item, index) => (
            <Link
              key={`${item.title}-${index}`}
              href={item.path}
              className="group relative bg-gradient-to-br from-gray-50/80 to-white dark:from-gray-800/60 dark:to-gray-800/40 rounded-2xl p-5 hover:shadow-xl hover:shadow-emerald-500/5 border border-gray-100/80 dark:border-gray-700/50 hover:border-emerald-200 dark:hover:border-emerald-700/50 transition-all duration-300 transform hover:-translate-y-0.5"
              onClick={closeMegaMenus}
            >
              <div className="relative overflow-hidden rounded-xl mb-4">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-28 sm:h-32 object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
                <div className="absolute bottom-2.5 right-2.5 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-2 rounded-xl shadow-sm">
                  <item.icon className="w-4 h-4 text-emerald-600" />
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-1.5 group-hover:text-emerald-600 transition-colors text-[15px]">
                {item.title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed line-clamp-2">
                {item.description}
              </p>

              <div className="flex items-center mt-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
                <span className="text-sm font-medium">
                  {t("Landing.header.Learn")}
                </span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100/80 dark:border-gray-700/50 hidden md:block">
          <div className="bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-900/15 dark:to-teal-900/15 rounded-2xl p-6 border border-emerald-100/50 dark:border-emerald-800/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {t("Landing.header.redystart")}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {t("Landing.header.join", {
                    appName: brandSettings?.title ?? "",
                  })}
                </p>
              </div>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-2.5 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 flex items-center group text-sm font-medium shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 whitespace-nowrap"
                onClick={closeMegaMenus}
              >
                {t("Landing.header.start")}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ease-out ${isScrolled
          ? "bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl shadow-lg shadow-black/[0.03] border-b border-gray-200/50 dark:border-gray-700/50"
          : "bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`flex justify-between items-center transition-all duration-500 ${isScrolled ? "h-16" : "h-[72px]"
              }`}
          >
            <Link href="/" className="flex items-center space-x-2.5 group">
              {brandSettings?.logo ? (
                <img
                  src={brandSettings?.logo}
                  alt={t("Landing.header.logoAlt")}
                  className="h-10 object-contain transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-xl p-2.5 shadow-lg shadow-emerald-500/20 transition-transform duration-300 group-hover:scale-105">
                  <MessageSquare className="h-6 w-6" />
                </div>
              )}
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              <Link
                href="/"
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${location === "/"
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-900/20"
                  : "text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
              >
                {t("Landing.header.Navlinks.0")}
              </Link>

              <div
                className="relative group"
                onMouseEnter={() => setShowAboutMega(true)}
                onMouseLeave={() => setShowAboutMega(false)}
              >
                <button
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer bg-transparent border-none ${showAboutMega
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-900/20"
                    : "text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  aria-haspopup="true"
                  aria-expanded={showAboutMega}
                  type="button"
                >
                  {t("Landing.header.Navlinks.1")}
                  <ChevronDown
                    className={`w-3.5 h-3.5 ml-1 transition-transform duration-300 ${showAboutMega ? "rotate-180" : ""
                      }`}
                  />
                </button>

                <div
                  className="absolute left-0 right-0 h-4 top-full"
                  style={{ top: "100%" }}
                />

                <MegaMenu
                  items={staticData.header.aboutMenuItems}
                  isVisible={showAboutMega}
                  title={t("Landing.header.megaMenuTitles.about")}
                />
              </div>

              <div
                className="relative group"
                onMouseEnter={() => setShowResourcesMega(true)}
                onMouseLeave={() => setShowResourcesMega(false)}
              >
                <button
                  className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 cursor-pointer bg-transparent border-none ${showResourcesMega
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-900/20"
                    : "text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }`}
                  aria-haspopup="true"
                  aria-expanded={showResourcesMega}
                  type="button"
                >
                  {t("Landing.header.Navlinks.2")}
                  <ChevronDown
                    className={`w-3.5 h-3.5 ml-1 transition-transform duration-300 ${showResourcesMega ? "rotate-180" : ""
                      }`}
                  />
                </button>

                <div
                  className="absolute left-0 right-0 h-4 top-full"
                  style={{ top: "100%" }}
                />

                <MegaMenu
                  items={staticData.header.resourcesMenuItems}
                  isVisible={showResourcesMega}
                  title={t("Landing.header.megaMenuTitles.resources")}
                />
              </div>

              <div className="mx-1">
                <LanguageSelector />
              </div>

              {!isAuthenticated && (
                <div className="flex items-center gap-2 ml-2">
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-300"
                  >
                    {t("Landing.header.Navlinks.3")}
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-5 py-2.5 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02] flex items-center group text-sm font-medium"
                  >
                    {t("Landing.header.getstart")}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              )}

              {isAuthenticated && (
                <div className="flex items-center gap-3 ml-2">
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-300"
                  >
                    {t("Landing.header.dash")}
                  </Link>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      className="w-10 h-10 rounded-xl overflow-hidden border-2 border-gray-200/80 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 hover:shadow-md hover:shadow-emerald-500/10 ring-0 hover:ring-2 hover:ring-emerald-500/20"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                          username
                        )}`}
                        alt={t("Landing.header.ariaLabels.userAvatar")}
                        className="w-full h-full object-cover"
                      />
                    </button>

                    <div
                      className={`absolute right-0 mt-2 w-56 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-200/80 dark:border-gray-700/80 rounded-2xl shadow-xl shadow-black/[0.08] z-50 overflow-hidden transition-all duration-300 origin-top-right ${dropdownOpen
                        ? "opacity-100 scale-100 visible"
                        : "opacity-0 scale-95 invisible pointer-events-none"
                        }`}
                    >
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/80 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {username}
                        </p>
                      </div>

                      <div className="p-1.5">
                        <button
                          className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all duration-200"
                          onClick={() => {
                            setLocation("/settings");
                            setDropdownOpen(false);
                          }}
                        >
                          <Settings className="w-4 h-4 mr-2.5 opacity-70" />
                          {t("Landing.header.Settings")}
                        </button>
                        <button
                          className="flex items-center w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all duration-200"
                          onClick={() => {
                            setLocation("/account");
                            setDropdownOpen(false);
                          }}
                        >
                          <User className="w-4 h-4 mr-2.5 opacity-70" />
                          {t("Landing.header.Account")}
                        </button>
                        <div className="my-1 border-t border-gray-100 dark:border-gray-700/50"></div>
                        <button
                          className="flex items-center w-full px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/15 rounded-xl transition-all duration-200"
                          onClick={() => {
                            logout();
                            setDropdownOpen(false);
                          }}
                        >
                          <LogOut className="w-4 h-4 mr-2.5 opacity-70" />
                          {t("Landing.header.logout")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </nav>

            <button
              className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800/80 transition-all duration-300"
              onClick={handleMenuToggle}
              aria-label={t("Landing.header.ariaLabels.toggleMenu")}
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              ) : (
                <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </header>

      <div
        className={`lg:hidden fixed inset-0 z-30 transition-all duration-500 ${isMenuOpen
          ? "visible"
          : "invisible pointer-events-none"
          }`}
      >
        <div
          className={`absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${isMenuOpen ? "opacity-100" : "opacity-0"
            }`}
          onClick={() => setIsMenuOpen(false)}
        />

        <div
          className={`absolute top-0 right-0 w-full max-w-sm h-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-l border-gray-200/50 dark:border-gray-700/50 shadow-2xl transition-transform duration-500 ease-out overflow-y-auto ${isMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
          style={{ paddingTop: isScrolled ? "64px" : "72px" }}
        >
          <div className="px-5 py-6 space-y-1">
            <Link
              href="/"
              className={`block px-4 py-3 rounded-xl font-medium text-sm transition-all duration-300 ${location === "/"
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50/80 dark:bg-emerald-900/20"
                : "text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }`}
              onClick={() => setIsMenuOpen(false)}
            >
              {t("Landing.header.Navlinks.0")}
            </Link>

            <div>
              <button
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-gray-900 dark:text-white font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-300"
                onClick={() => setShowAboutMobile(!showAboutMobile)}
                aria-expanded={showAboutMobile}
              >
                <span>{t("Landing.header.Navlinks.1")}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showAboutMobile ? "rotate-180" : ""
                    }`}
                />
              </button>

              <div
                className={`grid overflow-hidden transition-all duration-400 ease-in-out ${showAboutMobile
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
                  }`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-0.5 pl-4 pr-2 pb-2">
                    {staticData.header.aboutMenuItems.map((item, index) => (
                      <Link
                        key={`mobile-about-${index}`}
                        href={item.path}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/15 font-medium text-sm transition-all duration-200"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-4 h-4 text-emerald-600" />
                        </div>
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <button
                className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-gray-900 dark:text-white font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-300"
                onClick={() => setShowResourcesMobile(!showResourcesMobile)}
                aria-expanded={showResourcesMobile}
              >
                <span>{t("Landing.header.Navlinks.2")}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${showResourcesMobile ? "rotate-180" : ""
                    }`}
                />
              </button>

              <div
                className={`grid overflow-hidden transition-all duration-400 ease-in-out ${showResourcesMobile
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
                  }`}
              >
                <div className="overflow-hidden">
                  <div className="space-y-0.5 pl-4 pr-2 pb-2">
                    {staticData.header.resourcesMenuItems.map((item, index) => (
                      <Link
                        key={`mobile-resources-${index}`}
                        href={item.path}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50/60 dark:hover:bg-emerald-900/15 font-medium text-sm transition-all duration-200"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-4 h-4 text-emerald-600" />
                        </div>
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("Landing.header.Language") || "Language"}
                </span>
                <LanguageSelector />
              </div>
              {!isAuthenticated ? (
                <>
                  <Link
                    href="/login"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleLogin();
                    }}
                    className="block w-full text-center px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium text-sm transition-all duration-300"
                  >
                    {loginLoading ? (
                      <LoadingAnimation size="sm" color="green" />
                    ) : (
                      t("Landing.header.Navlinks.3")
                    )}
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleGetStarted();
                    }}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 font-medium flex items-center justify-center text-sm shadow-lg shadow-emerald-500/20"
                  >
                    {getStartedLoading ? (
                      <LoadingAnimation size="sm" color="white" />
                    ) : (
                      <>
                        {t("Landing.header.getstart")}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 font-medium text-sm transition-all duration-300"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t("Landing.header.dash")}
                  </Link>

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
                    <div className="flex items-center gap-3 px-4 mb-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-emerald-200/50 dark:border-emerald-800/50 shadow-sm">
                        <img
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                            username
                          )}`}
                          alt={t("Landing.header.ariaLabels.userAvatar")}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white font-semibold">
                        {username}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <button
                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all duration-200"
                        onClick={() => {
                          setLocation("/settings");
                          setIsMenuOpen(false);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-2.5 opacity-70" />
                        {t("Landing.header.Settings")}
                      </button>
                      <button
                        className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all duration-200"
                        onClick={() => {
                          setLocation("/account");
                          setIsMenuOpen(false);
                        }}
                      >
                        <User className="w-4 h-4 mr-2.5 opacity-70" />
                        {t("Landing.header.Account")}
                      </button>
                      <button
                        className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/15 rounded-xl transition-all duration-200"
                        onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                        }}
                      >
                        <LogOut className="w-4 h-4 mr-2.5 opacity-70" />
                        {t("Landing.header.logout")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {(showAboutMega || showResourcesMega) && (
        <div
          className="fixed inset-0 bg-black/5 dark:bg-black/20 backdrop-blur-[2px] z-30 transition-opacity duration-300"
          onClick={closeMegaMenus}
        />
      )}
    </>
  );
};

export default Header;
