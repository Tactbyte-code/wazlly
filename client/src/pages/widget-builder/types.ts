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

export interface TeamMember {
  id: string;
  name: string;
  avatar: string;
  role: string;
  userId?: string;
  email?: string;
}

export interface QuickAction {
  id: string;
  icon: string;
  label: string;
  url: string;
  description: string;
  enabled: boolean;
}

export interface HelpCategory {
  id: string;
  icon: string;
  label: string;
  description: string;
}

export interface EscalationRules {
  enabled: boolean;
  maxAttempts: number;
  triggerPhrases: string[];
  escalationMessage: string;
}

export interface WidgetConfig {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  position: string;
  logoUrl: string;

  title: string;
  subtitle: string;
  greeting: string;
  appName: string;

  tenantId: string;
  name: string;
  domain: string;

  homeScreen: string;
  showSearch: boolean;
  showTeamAvatars: boolean;
  showQuickActions: boolean;
  showRecentArticles: boolean;

  messengerButtonText: string;
  messengerSearchPlaceholder: string;
  articlesCount: number;

  helpSearchPlaceholder: string;
  helpCategoriesTitle: string;
  helpCtaText: string;
  helpCategories: HelpCategory[];
  categoriesCount: number;

  contactTitle: string;
  contactCtaText: string;
  contactStatusMessage: string;
  showContactStatus: boolean;

  teamMembers: TeamMember[];
  responseTime: string;

  quickActions: QuickAction[];

  enableChat: boolean;
  enableVoiceCall: boolean;
  enableVideoCall: boolean;
  enableKnowledgeBase: boolean;
  enableEmailCapture: boolean;
  enableAiAutoReply: boolean;

  widgetStyle: string;
  buttonSize: string;
  roundedCorners: string;
  showPoweredBy: boolean;

  fontFamily: string;
  buttonStyle: string;
  shadowIntensity: string;
  animationSpeed: string;
  enableSoundEffects: boolean;
  aiTone: string;
  aiMaxResponseLength: number;
  aiFallbackMessage: string;
  systemPrompt: string;
  trainFromKB: boolean;
  escalationRules: EscalationRules;
}

export interface ChatMessage {
  role: string;
  text: string;
  time: string;
}

export type PreviewScreen = "home" | "chat" | "search" | "article";
