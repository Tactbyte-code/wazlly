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

import { WidgetConfig, HelpCategory, TeamMember, QuickAction } from "./types";

export const DEFAULT_HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "1",
    icon: "book-open",
    label: "Getting Started",
    description: "Learn the basics",
  },
  {
    id: "2",
    icon: "users",
    label: "Team Setup",
    description: "Manage your team",
  },
  {
    id: "3",
    icon: "file-text",
    label: "Billing",
    description: "Plans & payments",
  },
  {
    id: "4",
    icon: "help-circle",
    label: "FAQs",
    description: "Common questions",
  },
];

export const DEFAULT_TEAM_MEMBERS: TeamMember[] = [
  { id: "1", name: "Sarah", avatar: "", role: "Support" },
  { id: "2", name: "Mike", avatar: "", role: "Sales" },
  { id: "3", name: "Lisa", avatar: "", role: "Success" },
];

export const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  {
    id: "1",
    icon: "calendar",
    label: "Book a demo",
    url: "",
    description: "Schedule a personalized demo",
    enabled: true,
  },
  {
    id: "2",
    icon: "play",
    label: "Product tour",
    url: "",
    description: "See how it works",
    enabled: true,
  },
  {
    id: "3",
    icon: "book",
    label: "Documentation",
    url: "",
    description: "Browse our guides",
    enabled: true,
  },
  {
    id: "4",
    icon: "phone",
    label: "Schedule a call",
    url: "",
    description: "Talk to an expert",
    enabled: false,
  },
];

export function createDefaultConfig(brandTitle?: string): WidgetConfig {
  return {
    primaryColor: "#3b82f6",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    accentColor: "#8b5cf6",
    position: "bottom-right",
    logoUrl: "",

    title: "Welcome!",
    subtitle: "How can we help?",
    greeting: "Hi! How can I help you today?",
    appName: brandTitle || "",

    tenantId: "814ce300-52c5-41d7-b103-a8e7bfa62a54",
    name: "My Site Name",
    domain: window.location.host,

    homeScreen: "messenger",
    showSearch: true,
    showTeamAvatars: true,
    showQuickActions: true,
    showRecentArticles: true,

    messengerButtonText: "Send us a message",
    messengerSearchPlaceholder: "Search our Help Center",
    articlesCount: 3,

    helpSearchPlaceholder: "Search for answers...",
    helpCategoriesTitle: "Browse by category",
    helpCtaText: "Chat with us",
    helpCategories: DEFAULT_HELP_CATEGORIES,
    categoriesCount: 6,

    contactTitle: "How can we help?",
    contactCtaText: "Start a conversation",
    contactStatusMessage: "We typically reply within a few minutes",
    showContactStatus: true,

    teamMembers: DEFAULT_TEAM_MEMBERS,
    responseTime: "A few minutes",

    quickActions: DEFAULT_QUICK_ACTIONS,

    enableChat: true,
    enableVoiceCall: true,
    enableVideoCall: false,
    enableKnowledgeBase: true,
    enableEmailCapture: true,
    enableAiAutoReply: true,

    widgetStyle: "modern",
    buttonSize: "large",
    roundedCorners: "lg",
    showPoweredBy: true,

    fontFamily: "system",
    buttonStyle: "solid",
    shadowIntensity: "medium",
    animationSpeed: "normal",
    enableSoundEffects: false,
    aiTone: "friendly",
    aiMaxResponseLength: 200,
    aiFallbackMessage:
      "I'm sorry, I don't have the information you're looking for.",
    systemPrompt:
      "You are a helpful customer support assistant. Guidelines: - Be friendly and professional- Keep responses concise- If you don't know something, admit it- Direct users to human support for complex issues- Use the customer's name when provided",
    trainFromKB: false,
    escalationRules: {
      enabled: true,
      maxAttempts: 3,
      triggerPhrases: ["speak to agent", "talk to human", "real person"],
      escalationMessage: "Let me connect you with a team member who can help you better.",
    },
  };
}
