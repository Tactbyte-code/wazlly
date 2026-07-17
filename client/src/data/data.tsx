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

// import {
//   LayoutDashboard,
//   MessageSquare,
//   Users,
//   Megaphone,
//   FileText,
//   Zap,
//   BarChart3,
//   Bot,
//   ScrollText,
//   UsersRound,
//   Settings,
//   Bell,
//   BookOpen,
//   Briefcase,
//   Calculator,
//   Code,
//   Mail,
//   TrendingUp,
// } from "lucide-react";
// import { GiUpgrade } from "react-icons/gi";
// import { MdGroups, MdOutlineSupportAgent } from "react-icons/md";
// import { TbInvoice } from "react-icons/tb";

// export const navItems = [
//   {
//     href: "/dashboard",
//     icon: LayoutDashboard,
//     labelKey: "navigation.dashboard",
//     color: "text-green-600",
//     alwaysVisible: true,
//     // requiredPrefix: "dashboard.",
//     allowedRoles: ["superadmin", "admin", "user", "team"],
//   },
//   {
//     href: "/inbox",
//     icon: MessageSquare,
//     labelKey: "navigation.inbox",
//     color: "text-blue-400",
//     requiredPrefix: "inbox.",
//     allowedRoles: ["admin"],
//   },
//   {
//     href: "/contacts",
//     icon: Users,
//     labelKey: "navigation.contacts",
//     color: "text-blue-600",
//     requiredPrefix: "contacts.",
//     allowedRoles: ["superadmin", "admin"],
//   },
//   {
//     href: "/groups",
//     icon: MdGroups,
//     labelKey: "Groups",
//     color: "text-blue-400",
//     // requiredPrefix: "groups.",
//     allowedRoles: ["admin"],
//   },
//   {
//     href: "/campaigns",
//     icon: Megaphone,
//     labelKey: "navigation.campaigns",
//     color: "text-orange-600",
//     requiredPrefix: "campaigns.",
//     allowedRoles: ["superadmin", "admin"],
//   },
//   {
//     href: "/templates",
//     icon: FileText,
//     labelKey: "navigation.templates",
//     color: "text-purple-600",
//     requiredPrefix: "templates.",
//     allowedRoles: ["superadmin", "admin"],
//   },
//   {
//     href: "/chat-hub",
//     icon: MessageSquare,
//     labelKey: "navigation.chatHub",
//     color: "text-red-600",
//     requiredPrefix: "chathub.",
//     allowedRoles: ["superadmin", "admin", "user"],
//   },
//   {
//     href: "/automation",
//     icon: Zap,
//     labelKey: "navigation.automations",
//     color: "text-indigo-600",
//     requiredPrefix: "automations.",
//     allowedRoles: ["superadmin", "admin"],
//   },
//   {
//     href: "/analytics",
//     icon: BarChart3,
//     labelKey: "navigation.analytics",
//     color: "text-pink-600",
//     requiredPrefix: "analytics.",
//     allowedRoles: ["superadmin", "admin"],
//   },
//   {
//     href: "/widget-builder",
//     icon: Bot,
//     labelKey: "navigation.widgetBuilder",
//     color: "text-teal-600",
//     requiredPrefix: "widgetbuilder.",
//     alwaysVisible: true,
//     allowedRoles: ["superadmin", "admin", "user"],
//   },
//   {
//     href: "/message-logs",
//     icon: ScrollText,
//     labelKey: "navigation.messageLogs",
//     color: "text-yellow-600",
//     requiredPrefix: "messagelogs.",
//     alwaysVisible: true,
//     allowedRoles: ["superadmin", "admin"],
//   },
//   {
//     href: "/team",
//     icon: UsersRound,
//     labelKey: "Team",
//     color: "text-teal-600",
//     requiredPrefix: "team.",
//     allowedRoles: ["superadmin", "admin"],
//   },
//   {
//     href: "/settings",
//     icon: Settings,
//     labelKey: "navigation.settings",
//     color: "text-gray-600",
//     requiredPrefix: "settings.",
//     alwaysVisible: true,
//     allowedRoles: ["superadmin", "admin"],
//   },
//   {
//     href: "/notifications",
//     icon: Bell,
//     labelKey: "navigation.notifications",
//     color: "text-indigo-400",
//     requiredPrefix: "notifications.",
//     allowedRoles: ["superadmin", "admin"],
//   },
//   {
//     href: "/plans",
//     icon: Bell,
//     labelKey: "navigation.plans",
//     color: "text-blue-400",
//     requiredPrefix: "plans.",
//     allowedRoles: ["superadmin"],
//   },
//   {
//     href: "/gateway",
//     icon: Bell,
//     labelKey: "navigation.plans",
//     color: "text-blue-400",
//     requiredPrefix: "gateway.",
//     allowedRoles: ["superadmin"],
//   },
//   {
//     href: "/support-tickets",
//     icon: Bell,
//     labelKey: "tickets-support",
//     requiredPrefix: "supporttickets.",
//     color: "text-blue-400",
//     allowedRoles: ["superadmin"],
//   },
//   {
//     href: "/user-support-tickets",
//     icon: MdOutlineSupportAgent,
//     labelKey: "Tickets Support",
//     requiredPrefix: "usersupporttickets.",
//     color: "text-blue-400",
//     allowedRoles: ["admin"],
//   },
//   {
//     href: "/plan-upgrade",
//     icon: GiUpgrade,
//     labelKey: "Upgrade Plan",
//     color: "text-blue-400",
//     allowedRoles: ["admin"],
//   },
//   {
//     href: "/billing",
//     icon: TbInvoice,
//     labelKey: "Billing & Credits",
//     color: "text-blue-400",
//     allowedRoles: ["admin"],
//   },
// ];

// export const aboutMenuItems = [
//   {
//     title: "About Us",
//     path: "/about",
//     description: "Learn about our mission and team",
//     icon: Users,
//     image:
//       "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop",
//   },
//   {
//     title: "Contact",
//     path: "/contact",
//     description: "Get in touch with our team",
//     icon: Mail,
//     image:
//       "https://images.pexels.com/photos/4386466/pexels-photo-4386466.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop",
//   },
//   {
//     title: "Careers",
//     path: "/careers",
//     description: "Join our growing team",
//     icon: Briefcase,
//     image:
//       "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop",
//   },
//   {
//     title: "Integrations",
//     path: "/integrations",
//     description: "Connect with 1000+ apps",
//     icon: Zap,
//     image:
//       "https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop",
//   },
// ];

// export const resourcesMenuItems = [
//   {
//     title: "Templates",
//     path: "/templates",
//     description: "Ready-to-use message templates",
//     icon: FileText,
//     image:
//       "https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop",
//   },
//   {
//     title: "Case Studies",
//     path: "/case-studies",
//     description: "Success stories from our clients",
//     icon: TrendingUp,
//     image:
//       "https://images.pexels.com/photos/1005638/pexels-photo-1005638.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop",
//   },
//   {
//     title: "WhatsApp Guide",
//     path: "/whatsapp-guide",
//     description: "Complete WhatsApp marketing guide",
//     icon: BookOpen,
//     image:
//       "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop",
//   },
//   {
//     title: "API Documentation",
//     path: "/api-docs",
//     description: "Developer resources and API docs",
//     icon: Code,
//     image:
//       "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop",
//   },
//   {
//     title: "Best Practices",
//     path: "/best-practices",
//     description: "Tips for WhatsApp marketing success",
//     icon: BookOpen,
//     image:
//       "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop",
//   },
//   {
//     title: "ROI Calculator",
//     path: "/roi-calculator",
//     description: "Calculate your WhatsApp marketing ROI",
//     icon: Calculator,
//     image:
//       "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop",
//   },
// ];
