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

import {
  Plus,
  LogOut,
  Settings,
  User,
  Menu,
  ScrollText,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

import { useSidebar } from "@/contexts/sidebar-context";
import { LanguageSelector } from "../language-selector";
import { useTranslation } from "@/lib/i18n";
import NotificationBell from "@/components/notification/NotificationBell";

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  userPhotoUrl?: string;
}

export default function Header({
  title,
  subtitle,
  action,
  userPhotoUrl,
}: HeaderProps) {
  const [, setLocation] = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { t } = useTranslation();

  const username = (user?.firstName || "") + " " + (user?.lastName || "");

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const { isOpen, toggle } = useSidebar();

  // UI unchanged --------------------------------------
  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-100  px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={toggle}
              className="lg:hidden   p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h1 className="  text-base sm:text-lg lg:text-2xl font-bold text-gray-900">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-gray-600 hidden lg:block  ">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 ">
            <div className=" w-fit  ">
              {action && (
                <Button
                  onClick={action.onClick}
                  className="bg-green-600 text-white px-3 py-1 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{action.label}</span>
                </Button>
              )}
            </div>
            <div className=" w-fit hidden sm:block ">
              <LanguageSelector />
            </div>

            {user?.role != "superadmin" && (
              <>
                <button
                  onClick={() => setLocation("/settings?tab=support")}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Support"
                >
                  <Headphones className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setLocation("/settings?tab=message_logs")}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Message Logs"
                >
                  <ScrollText className="w-5 h-5 text-gray-600" />
                </button>
                <NotificationBell />
              </>
            )}

            <div className="relative" ref={dropdownRef}>
              <button
                className="w-10 h-10 rounded-full overflow-hidden border-2"
                onClick={() => setDropdownOpen((x) => !x)}
              >
                <img
                  src={
                    userPhotoUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      username
                    )}`
                  }
                  className="w-full h-full object-cover"
                />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-lg shadow-lg z-50">
                  <div className="px-4 py-2 border-b text-gray-800 font-semibold">
                    {username}
                  </div>

                  <button
                    className="flex items-center w-full px-4 py-2 hover:bg-gray-100"
                    onClick={() => {
                      setLocation("/settings");
                      setDropdownOpen(false);
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />  {t("Landing.header.Settings")}
                  </button>

                  <button
                    className="flex items-center w-full px-4 py-2 hover:bg-gray-100"
                    onClick={() => {
                      setLocation("/account");
                      setDropdownOpen(false);
                    }}
                  >
                    <User className="w-4 h-4 mr-2" />  {t("Landing.header.Account")}
                  </button>

                  <button
                    className="flex items-center w-full px-4 py-2 hover:bg-gray-100"
                    onClick={logout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />   {t("Landing.header.logout")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

    </>
  );
}
