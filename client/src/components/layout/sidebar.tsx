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

import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { MdOutlinePayment } from "react-icons/md";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  FileText,
  MessageSquare,
  Bot,
  BarChart3,
  Settings,
  Zap,
  ScrollText,
  UsersRound,
  Menu,
  LogOut,
  X,
  Bell,
  CheckCircle,
  SlidersHorizontal,
  Star,
  User,
  Globe,
  Code,
  BookOpen,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChannelSwitcher } from "@/components/channel-switcher";
import { useChannelContext } from "@/contexts/channel-context";
import { useTranslation } from "@/lib/i18n";
import { LanguageSelector } from "@/components/language-selector";
import { useAuth } from "@/contexts/auth-context";
// import logo from "../../images/logo1924.jpg";
import { GiUpgrade } from "react-icons/gi";
import { RiSecurePaymentFill } from "react-icons/ri";
import { AiOutlineTransaction } from "react-icons/ai";
import { MdOutlineSupportAgent, MdGroups } from "react-icons/md";
import { useSidebar } from "@/contexts/sidebar-context";
import { AdminCreditBox } from "../AdminCreditBox";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppSettings } from "@/types/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Role = "superadmin" | "admin" | "user" | "team";

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  badge?: string | number;
  color?: string;
  alwaysVisible?: boolean;
  requiredPrefix?: string;
  allowedRoles?: Role[];
}

function getNavItems(role: string): NavItem[] {
  if (role === "admin") {
    return [
      {
        href: "/dashboard",
        icon: LayoutDashboard,
        labelKey: "navigation.dashboard",
        color: "text-green-600",
        alwaysVisible: true,
        allowedRoles: ["superadmin", "admin", "user", "team"],
      },
      {
        href: "/inbox",
        icon: MessageSquare,
        labelKey: "navigation.inbox",
        color: "text-blue-400",
        allowedRoles: ["admin"],
      },
      {
        href: "/contacts",
        icon: Users,
        labelKey: "navigation.contacts",
        color: "text-blue-600",
        allowedRoles: ["superadmin", "admin"],
      },
      {
        href: "/groups",
        icon: MdGroups,
        labelKey: "navigation.groups",
        color: "text-blue-400",
        allowedRoles: ["admin"],
      },
      {
        href: "/campaigns",
        icon: Megaphone,
        labelKey: "navigation.campaigns",
        color: "text-orange-600",
        allowedRoles: ["superadmin", "admin"],
      },
      {
        href: "/templates",
        icon: FileText,
        labelKey: "navigation.templates",
        color: "text-purple-600",
        allowedRoles: ["superadmin", "admin"],
      },

      {
        href: "/automation",
        icon: Zap,
        labelKey: "navigation.automations",
        color: "text-indigo-600",
        allowedRoles: ["superadmin", "admin"],
      },
      {
        href: "/analytics",
        icon: BarChart3,
        labelKey: "navigation.analytics",
        color: "text-pink-600",
        allowedRoles: ["superadmin", "admin"],
      },
      {
        href: "/widget-builder",
        icon: Bot,
        labelKey: "navigation.widgetBuilder",
        color: "text-teal-600",
        alwaysVisible: true,
        allowedRoles: ["superadmin", "admin", "user"],
      },
      {
        href: "/api-docs",
        icon: Code,
        labelKey: "navigation.apiDocs",
        color: "text-cyan-600",
        allowedRoles: ["admin"],
      },

      // {
      //   href: "/settings",
      //   icon: Settings,
      //   labelKey: "navigation.settings",
      //   color: "text-gray-600",
      //   alwaysVisible: true,
      //   allowedRoles: ["superadmin", "admin"],
      // },

      {
        href: "/plans",
        icon: Bell,
        labelKey: "navigation.plans",
        color: "text-blue-400",
        allowedRoles: ["superadmin"],
      },
      {
        href: "/gateway",
        icon: Bell,
        labelKey: "navigation.plans",
        color: "text-blue-400",
        allowedRoles: ["superadmin"],
      },
      {
        href: "/languages",
        icon: Globe,
        labelKey: "navigation.languages",
        color: "text-violet-500",
        allowedRoles: ["superadmin"],
      },
      {
        href: "/support-tickets",
        icon: Bell,
        labelKey: "navigation.tickets_support",
        color: "text-blue-400",
        allowedRoles: ["superadmin"],
      },
    ];
  } else {
    // Team or default role
    return [
      {
        href: "/dashboard",
        icon: LayoutDashboard,
        labelKey: "navigation.dashboard",
        color: "text-green-600",
        alwaysVisible: true,
        allowedRoles: ["superadmin", "admin", "user", "team"],
      },
      {
        href: "/inbox",
        icon: MessageSquare,
        labelKey: "navigation.inbox",
        color: "text-blue-400",
        requiredPrefix: "inbox.",
        allowedRoles: ["team"],
      },
      {
        href: "/contacts",
        icon: Users,
        labelKey: "navigation.contacts",
        color: "text-blue-600",
        requiredPrefix: "contacts.",
        allowedRoles: ["team"],
      },
      {
        href: "/groups",
        icon: MdGroups,
        labelKey: "navigation.groups",
        color: "text-blue-400",
        requiredPrefix: "groups.",
        allowedRoles: ["team"],
      },
      {
        href: "/campaigns",
        icon: Megaphone,
        labelKey: "navigation.campaigns",
        color: "text-orange-600",
        requiredPrefix: "campaigns.",
        allowedRoles: ["team"],
      },
      {
        href: "/templates",
        icon: FileText,
        labelKey: "navigation.templates",
        color: "text-purple-600",
        requiredPrefix: "templates.",
        allowedRoles: ["team"],
      },

      {
        href: "/automation",
        icon: Zap,
        labelKey: "navigation.automations",
        color: "text-indigo-600",
        requiredPrefix: "automations.",
        allowedRoles: ["team"],
      },
      {
        href: "/analytics",
        icon: BarChart3,
        labelKey: "navigation.analytics",
        color: "text-pink-600",
        requiredPrefix: "analytics.",
        allowedRoles: ["team"],
      },
      {
        href: "/widget-builder",
        icon: Bot,
        labelKey: "navigation.widgetBuilder",
        color: "text-teal-600",
        alwaysVisible: true,
        requiredPrefix: "widgetbuilder.",
        allowedRoles: ["team"],
      },

      // {
      //   href: "/settings",
      //   icon: Settings,
      //   labelKey: "navigation.settings",
      //   color: "text-gray-600",
      //   alwaysVisible: true,
      //   requiredPrefix: "settings.",
      //   allowedRoles: ["team"],
      // },

      {
        href: "/plans",
        icon: Bell,
        labelKey: "navigation.plans",
        color: "text-blue-400",
        requiredPrefix: "plans.",
        allowedRoles: ["team"],
      },
      {
        href: "/gateway",
        icon: Bell,
        labelKey: "navigation.plans",
        color: "text-blue-400",
        requiredPrefix: "gateway.",
        allowedRoles: ["team"],
      },
    ];
  }
}

const sidebarItemsCategories = [
  {
    name: "navigation.dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    color: "text-green-600",
  },
  {
    name: "navigation.users",
    icon: Users,
    path: "/users",
    color: "text-green-600",
  },
  {
    name: "navigation.channels",
    icon: Smartphone,
    path: "/channels-management",
    color: "text-blue-500",
  },
  {
    name: "navigation.master_campaigns",
    icon: Megaphone,
    path: "/campaigns",
    badge: "",
    color: "text-blue-600",
  },
  {
    name: "navigation.master_templates",
    icon: FileText,
    path: "/templates",
    badge: "",
    color: "text-purple-600",
  },
  {
    name: "navigation.master_contacts",
    icon: Users,
    path: "/contacts-management",
    badge: "",
    color: "text-yellow-600",
  },
  {
    name: "navigation.analytics",
    icon: BarChart3,
    path: "/analytics",
    color: "text-teal-500",
  },
  {
    name: "navigation.notifications",
    icon: Bell,
    path: "/notifications",
    color: "text-pink-400",
  },
  {
    name: "navigation.subscription_plans",
    icon: MdOutlinePayment,
    path: "/plans",
    color: "text-blue-400",
  },
  {
    name: "navigation.master_subscriptions",
    icon: CheckCircle,
    path: "/master-subscriptions",
    badge: "",
    color: "text-green-600",
  },
  {
    name: "navigation.transactions_logs",
    icon: AiOutlineTransaction,
    path: "/transactions-logs",
    color: "text-[#00a63e]",
  },
  {
    name: "navigation.message_logs",
    icon: MessageSquare,
    path: "/message-logs",
    color: "text-cyan-600",
  },
  {
    name: "navigation.payment_gateway",
    icon: RiSecurePaymentFill,
    path: "/gateway",
    color: "text-[#ffb900]",
  },
  {
    name: "navigation.support_tickets",
    icon: MdOutlineSupportAgent,
    path: "/support-tickets",
    color: "text-black-400",
  },
  {
    name: "navigation.app_update",
    icon: GiUpgrade,
    path: "/app-update",
    color: "text-emerald-600",
  },
];

// Category-based structure for superadmin

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isSuper = user?.role === "superadmin";
  const isAdmin = user?.role === "admin";
  const { toast } = useToast();

  const navItems = getNavItems(user?.role || "");

  const { data: brandSettings } = useQuery<AppSettings>({
    queryKey: ["/api/brand-settings"],
    queryFn: () => fetch("/api/brand-settings").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const { data: versionData } = useQuery<{ version: string; product: string }>({
    queryKey: ["/api/version"],
    queryFn: () => fetch("/api/version").then((r) => r.json()),
    staleTime: 30 * 60 * 1000,
    enabled: isSuper,
  });

  const {
    isOpen,
    toggle,
    close,
    open,
    isCollapsed,
    selectedMenu,
    setCollapsed,
    setSelectedMenu,
  } = useSidebar();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setCollapsed(true);
      } else {
        // Mobile pe sidebar automatically collapse na ho, agar open hai tabhi setCollapsed(false)
        if (isOpen) setCollapsed(false);
      }
    };

    handleResize(); // Initial check on mount

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, setCollapsed]); // isOpen dependency add karo taaki resize pe updated value mile
  const canView = (item: NavItem): boolean => {
    if (!user) return false;

    const role = user.role as Role;

    // SUPERADMIN sees everything
    if (role === "superadmin") return true;

    // TEAM role must ONLY use permissions — but allow alwaysVisible items
    if (role === "team") {
      // allow items with no requiredPrefix if they are alwaysVisible
      if (!item.requiredPrefix) {
        return item.alwaysVisible === true;
      }

      if (!user.permissions) return false;

      const perms = Array.isArray(user.permissions)
        ? user.permissions
        : Object.keys(user.permissions);

      const normalize = (str: string) => str.replace(".", ":");

      return perms.some((perm) =>
        perm.startsWith(normalize(item.requiredPrefix!)),
      );
    }

    // ---- ADMIN / USER LOGIC ----
    if (item.allowedRoles && !item.allowedRoles.includes(role)) {
      return false;
    }

    if (item.alwaysVisible) return true;

    if (!item.requiredPrefix) return true;

    if (!user.permissions) return false;

    const perms = Array.isArray(user.permissions)
      ? user.permissions
      : Object.keys(user.permissions);

    const normalize = (str: string) => str.replace(".", ":");

    return perms.some((perm) =>
      perm.startsWith(normalize(item.requiredPrefix!)),
    );
  };

  const canViewOld = (item: NavItem): boolean => {
    if (!user) return false;
    if (item.allowedRoles && !item.allowedRoles.includes(user.role as Role)) {
      return false;
    }
    if (user.role === "superadmin") {
      return true;
    }

    // --- TEAM ROLE custom permission-based ---
    if (user.role === "team") {
      if (!user.permissions) return false;

      // requiredPrefix must match permission
      if (!item.requiredPrefix) return false;

      const perms = Array.isArray(user.permissions)
        ? user.permissions
        : Object.keys(user.permissions);

      const normalize = (str: string) => str.replace(".", ":");

      return perms.some((perm) =>
        perm.startsWith(normalize(item.requiredPrefix!)),
      );
    }
    if (item.alwaysVisible) {
      return true;
    }
    if (!item.requiredPrefix) {
      return true;
    }
    if (!user.permissions) {
      return false;
    }
    const perms = Array.isArray(user.permissions)
      ? user.permissions
      : Object.keys(user.permissions);
    const normalize = (str: string) => str.replace(".", ":");
    return perms.some((perm) =>
      perm.startsWith(normalize(item.requiredPrefix!)),
    );
  };

  const renderLink = (
    name: string,
    Icon: React.ComponentType<{ className?: string }>,
    path: string,
    badge?: string | number,
    colorClass?: string,
  ) => {
    const isActive = location === path;
    return (
      <Link
        key={path}
        href={path}
        className={cn(
          "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
          isActive
            ? "bg-primary/10 text-primary border-l-4 border-primary"
            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
        )}
        onClick={toggle}
      >
        <Icon
          className={cn("w-5 h-5 mr-3", isActive ? "text-primary" : colorClass)}
        />

        {name}
        {badge && (
          <span className="ml-auto bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const queryClient = useQueryClient();
  const { selectedChannel } = useChannelContext();
  const channelId = selectedChannel?.id;

  const {
    data: aiData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["/api/ai-settings/channel", channelId],
    queryFn: async () => {
      if (!channelId) return null;
      const res = await fetch(`/api/ai-settings/channel/${channelId}`);
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    enabled: !!channelId,
  });

  const aiSettings = aiData || null;
  const isAIActive = aiSettings?.isActive ?? false;

  const handleToggleAI = async () => {
    // if (!aiSettings) return;
    if (!aiSettings) {
      toast({
        title: "No settings found",
        description: "Please add AI settings.",
        variant: "destructive",
      });
      return;
    }

    const updatedValue = !isAIActive;

    try {
      const res = await apiRequest("PUT", `/api/ai-settings/${aiSettings.id}`, {
        isActive: updatedValue,
      });

      if (!res.ok) throw new Error();

      toast({
        title: "Updated",
        description: "AI status updated successfully.",
      });

      refetch();
      queryClient.invalidateQueries({
        queryKey: ["/api/ai-settings/channel", channelId],
      });
    } catch {
      toast({
        title: "Error",
        description: "Unable to update AI status.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggle}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background shadow-lg border-r border-gray-100 transform transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <Link
              href="/"
              className="flex items-center flex-col space-x-2 sm:space-x-3"
            >
              {/* <img
                src="https://wazlly.s3.ap-south-2.amazonaws.com/public/uploads/26acae76-1f16-4744-a70a-389d7d615eeb/full-logo-bg.png"
                alt="wazlly-logo"
                className="h-16 w-50 object-contain transition-transform duration-300 group-hover:scale-105"
              /> */}
              {brandSettings?.logo ? (
                <img
                  src={brandSettings?.logo}
                  alt="Logo"
                  className="h-16 w-50 object-contain"
                />
              ) : (
                <img
                  src="https://wazlly.s3.ap-south-2.amazonaws.com/public/uploads/26acae76-1f16-4744-a70a-389d7d615eeb/full-logo-bg.png"
                  alt="wazlly-logo"
                  className="h-16 w-50 object-contain transition-transform duration-300 group-hover:scale-105"
                />
              )}
              {/* <span className=" text-[10px] sm:text-xs pl-8">
                {brandSettings?.tagline}
              </span> */}
            </Link>

            <button
              onClick={toggle}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isAdmin || user?.role == "team" ? (
            <div className="px-6 py-3 border-b border-gray-100">
              <ChannelSwitcher />
            </div>
          ) : (
            ""
          )}

          <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
            {isSuper
              ? sidebarItemsCategories.map((item) =>
                  renderLink(
                    t(item.name),
                    item.icon,
                    item.path,
                    item.badge,
                    item.color,
                  ),
                )
              : navItems
                  .filter(canView)
                  .map((item) =>
                    renderLink(
                      t(item.labelKey),
                      item.icon,
                      item.href,
                      item.badge,
                      item.color,
                    ),
                  )}
          </nav>

          <div className="w-[180px] px-4 py-2 border-t border-gray-100 sm:hidden ">
            <LanguageSelector />
          </div>
          {/* {isAdmin ? (
          ) : (
            ""
          )} */}

          {/* {isAdmin && (
            <div className="px-3 py-2">
              <AdminCreditBox />
            </div>
          )} */}

          {/* Smaller Toggle Button with Green Color */}
          {isAdmin && (
            <div className="p-2 border-t border-gray-100">
              <div className="flex items-center space-x-3 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                {/* Icon Box */}
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>

                {/* Text + Status Dot */}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {t("common.aiAssistant")}
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-3">
                      {/* Status Dot */}
                      <div
                        className={`w-2 h-2 rounded-full transition-all ${
                          isAIActive
                            ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"
                            : "bg-gray-400"
                        }`}
                      ></div>

                      {/* Status Text */}
                      <span className="text-xs text-gray-600">
                        {isAIActive ? t("common.active") : t("common.inactive")}
                      </span>

                      {/* Toggle Button */}
                      <button
                        onClick={handleToggleAI}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors 
                                                    ${
                                                      !aiSettings
                                                        ? "bg-gray-300 cursor-not-allowed"
                                                        : isAIActive
                                                          ? "bg-primary"
                                                          : "bg-gray-200"
                                                    }
                                                `}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition 
        ${isAIActive ? "translate-x-5" : "translate-x-1"}
      `}
                        />
                      </button>
                    </div>
                  </div>
                </div>
                <Link href="/settings?tab=ai_setting">
                  <button
                    className="p-1.5 rounded-md hover:bg-primary/10 transition-colors"
                    title={t("common.aiSettings")}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                  </button>
                </Link>
              </div>
            </div>
          )}

          {isSuper && versionData?.version && (
            <div className="px-4 py-1.5 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 text-center">
                v{versionData.version}
              </p>
            </div>
          )}

          {/* User Profile */}
          <div className="p-2 border-t border-gray-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center space-x-3 hover:bg-primary/5 rounded-lg p-2 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm">
                    <span className="text-sm font-medium text-white">
                      {user
                        ? (
                            user.firstName?.[0] || user.username[0]
                          ).toUpperCase()
                        : "U"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user
                        ? user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : user.username
                        : t("common.user")}
                    </p>
                    <p className="text-xs text-gray-500 truncate capitalize">
                      {user?.role || t("common.user")}
                    </p>
                  </div>
                  <Settings className="w-4 h-4 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {isAdmin && (
                  <div className="px-3 py-2">
                    <AdminCreditBox />
                  </div>
                )}
                <DropdownMenuLabel>{t("common.myAccount")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t("navigation.settings")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t("navigation.account")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("common.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </>
  );
}
