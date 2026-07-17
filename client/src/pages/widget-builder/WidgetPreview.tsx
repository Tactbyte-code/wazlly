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

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Send,
  X,
  Phone,
  Search,
  ArrowLeft,
  Calendar,
  BookOpen,
  Users,
  Play,
  Mail,
  FileText,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Clock,
} from "lucide-react";
import { WidgetConfig, ChatMessage, PreviewScreen } from "./types";

interface WidgetPreviewProps {
  config: WidgetConfig;
  isPreviewOpen: boolean;
  setIsPreviewOpen: (open: boolean) => void;
  previewScreen: PreviewScreen;
  setPreviewScreen: (screen: PreviewScreen) => void;
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  sendChatMessage: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sampleArticles: any[];
  qaPairs: Array<{ id: string; question: string; answer: string; category: string; isActive: boolean }>;
}

export default function WidgetPreview({
  config,
  isPreviewOpen,
  setIsPreviewOpen,
  previewScreen,
  setPreviewScreen,
  chatMessages,
  chatInput,
  setChatInput,
  sendChatMessage,
  searchQuery,
  setSearchQuery,
  sampleArticles,
  qaPairs,
}: WidgetPreviewProps) {
  const fontFamilyMap: Record<string, string> = {
    system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    inter: "'Inter', sans-serif",
    roboto: "'Roboto', sans-serif",
    "open-sans": "'Open Sans', sans-serif",
    poppins: "'Poppins', sans-serif",
    lato: "'Lato', sans-serif",
    montserrat: "'Montserrat', sans-serif",
    nunito: "'Nunito', sans-serif",
    raleway: "'Raleway', sans-serif",
    playfair: "'Playfair Display', serif",
    "source-sans": "'Source Sans 3', sans-serif",
    "pt-sans": "'PT Sans', sans-serif",
  };

  const fontFamilyValue = fontFamilyMap[config.fontFamily] || fontFamilyMap.system;

  const shadowMap: Record<string, string> = {
    none: "none",
    light: "0 4px 16px rgba(0, 0, 0, 0.1)",
    medium: "0 10px 40px rgba(0, 0, 0, 0.2)",
    strong: "0 16px 64px rgba(0, 0, 0, 0.3)",
  };

  const containerShadow = shadowMap[config.shadowIntensity] || shadowMap.medium;

  const animationMap: Record<string, string> = {
    none: "0s",
    slow: "0.5s",
    normal: "0.3s",
    fast: "0.15s",
  };

  const transitionSpeed = animationMap[config.animationSpeed] || animationMap.normal;

  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  const getButtonStyle = () => {
    if (config.buttonStyle === "outline") {
      return {
        backgroundColor: "transparent",
        color: config.primaryColor,
        border: `2px solid ${config.primaryColor}`,
      };
    }
    if (config.buttonStyle === "gradient") {
      return {
        background: `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})`,
        color: "white",
        border: "none",
      };
    }
    return {
      backgroundColor: config.primaryColor,
      color: "white",
      border: "none",
    };
  };

  const googleFontLinks: Record<string, string> = {
    inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    roboto: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
    "open-sans": "https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap",
    poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
    lato: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap",
    montserrat: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap",
    nunito: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap",
    raleway: "https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap",
    playfair: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
    "source-sans": "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap",
    "pt-sans": "https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap",
  };
  const googleFontLink = googleFontLinks[config.fontFamily] || null;

  return (
    <>
      {googleFontLink && (
        <link rel="stylesheet" href={googleFontLink} />
      )}
      <style>{`
        #widget-preview-container,
        #widget-preview-container *,
        #widget-preview-container *::before,
        #widget-preview-container *::after {
          font-family: ${fontFamilyValue} !important;
        }
      `}</style>
    <div className="relative h-[680px] bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-2xl font-bold text-slate-300">
            Your Website
          </p>
          <p className="text-sm text-slate-400">Widget preview</p>
        </div>
      </div>

      {/* Widget Container */}
      {isPreviewOpen && (
        <div
          id="widget-preview-container"
          className={`absolute ${
            config.position.includes("right") ? "right-6" : "left-6"
          } ${
            config.position.includes("top") ? "top-6" : "bottom-6"
          } w-[380px] h-[600px] flex flex-col bg-white rounded-2xl border overflow-hidden`}
          style={{
            fontFamily: fontFamilyValue,
            boxShadow: containerShadow,
            transition: `all ${transitionSpeed} ease`,
            borderRadius:
              config.roundedCorners === "sm"
                ? "0.5rem"
                : config.roundedCorners === "lg"
                ? "1rem"
                : "1.5rem",
          }}
        >
          {/* Widget Header */}
          <div
            className={`p-4 text-white ${
              config.widgetStyle === "modern"
                ? "bg-gradient-to-r"
                : "bg-solid"
            }`}
            style={{
              background:
                config.widgetStyle === "modern"
                  ? `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})`
                  : config.primaryColor,
            }}
          >
            <div className="flex items-center justify-between">
              {previewScreen === "home" ? (
                <>
                  <div className="flex items-center gap-3">
                    {config.logoUrl && (
                      <img
                        src={config.logoUrl}
                        alt="Company Logo"
                        className="h-10 w-10 object-contain rounded"
                        onError={(e) => {
                          (
                            e.target as HTMLImageElement
                          ).style.display = "none";
                        }}
                      />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">
                        {config.title}
                      </h3>
                      <p className="text-sm opacity-90">
                        {config.subtitle}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-1 hover:bg-white/20 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setPreviewScreen("home")}
                    className="p-1 hover:bg-white/20 rounded"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="font-medium">
                    {previewScreen === "chat"
                      ? "Conversation"
                      : previewScreen === "search"
                      ? "Search FAQs"
                      : "FAQ"}
                  </span>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-1 hover:bg-white/20 rounded"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Widget Content */}
          <ScrollArea className="flex-1">
            {previewScreen === "home" && (
              <div className="p-4 space-y-4">
                    {/* Start Conversation Card */}
                    <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-3">
                        {config.showTeamAvatars && (
                        <div className="flex -space-x-2">
                          {config.teamMembers
                            .slice(0, 3)
                            .map((member) => (
                              <Avatar
                                key={member.id}
                                className="h-10 w-10 border-2 border-white"
                              >
                                {member.avatar ? (
                                  <AvatarImage
                                    src={member.avatar}
                                    alt={member.name}
                                  />
                                ) : null}
                                <AvatarFallback
                                  style={{
                                    backgroundColor:
                                      config.primaryColor,
                                    color: "white",
                                  }}
                                >
                                  {member.name[0]}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                        </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">
                            Our usual reply time
                          </p>
                          <p className="text-sm font-medium flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {config.responseTime}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        style={{
                          ...getButtonStyle(),
                          transition: `all ${transitionSpeed} ease`,
                        }}
                        onClick={() => setPreviewScreen("chat")}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {config.messengerButtonText}
                      </Button>
                    </div>

                    {/* Search Help */}
                    {config.showRecentArticles && (
                      <div className="space-y-2">
                        <p className="font-medium">
                          Find an answer quickly
                        </p>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder={
                              config.messengerSearchPlaceholder
                            }
                            className="pl-10 pr-10"
                            onClick={() =>
                              setPreviewScreen("search")
                            }
                          />
                          <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    )}

                    {config.showRecentArticles && (() => {
                      const activePairsForDisplay = qaPairs.filter((q: any) => q.isActive !== false);
                      const displayFaqs = activePairsForDisplay.slice(0, config.articlesCount);
                      return (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                            Popular FAQs
                          </p>
                          <div className="space-y-2">
                            {displayFaqs.map((qa: any) => {
                              const isExpanded = expandedFaqId === qa.id;
                              return (
                                <div
                                  key={qa.id}
                                  className="border border-slate-200 rounded-xl overflow-hidden transition-all"
                                  style={{ transition: `all ${transitionSpeed} ease` }}
                                >
                                  <button
                                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                                    onClick={() => setExpandedFaqId(isExpanded ? null : qa.id)}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-800">
                                        {qa.question}
                                      </p>
                                      <p className="text-xs text-slate-400 mt-0.5">
                                        {qa.category}
                                      </p>
                                    </div>
                                    <ChevronDown
                                      className="h-4 w-4 text-slate-400 flex-shrink-0 transition-transform"
                                      style={{
                                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                        transition: `transform ${transitionSpeed} ease`,
                                      }}
                                    />
                                  </button>
                                  <div
                                    className="overflow-hidden"
                                    style={{
                                      maxHeight: isExpanded ? "200px" : "0px",
                                      opacity: isExpanded ? 1 : 0,
                                      transition: `max-height ${transitionSpeed} ease, opacity ${transitionSpeed} ease`,
                                    }}
                                  >
                                    <div className="px-3 pb-3 pt-0">
                                      <div
                                        className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3"
                                        style={{ borderLeft: `3px solid ${config.primaryColor}` }}
                                      >
                                        {qa.answer || "No answer provided yet."}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

              </div>
            )}

            {/* Chat Screen */}
            {previewScreen === "chat" && (
              <div className="flex flex-col h-[500px]">
                <div className="flex-1 p-4 space-y-3">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 ${
                        msg.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {msg.role === "bot" && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback
                            style={{
                              backgroundColor: config.primaryColor,
                              color: "white",
                            }}
                          >
                            AI
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`rounded-xl px-3 py-2 max-w-[80%] ${
                          msg.role === "user"
                            ? "text-white"
                            : "bg-slate-100"
                        }`}
                        style={
                          msg.role === "user"
                            ? {
                                backgroundColor:
                                  config.primaryColor,
                              }
                            : {}
                        }
                      >
                        <p className="text-sm">{msg.text}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && sendChatMessage()
                      }
                    />
                    <Button
                      size="icon"
                      onClick={sendChatMessage}
                      style={{
                        backgroundColor: config.primaryColor,
                      }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    {/* {config.enableVoiceCall && (
                      <Button size="icon" variant="outline">
                        <Phone className="h-4 w-4" />
                      </Button>
                    )} */}
                  </div>
                </div>
              </div>
            )}

            {/* Search/Help Screen */}
            {previewScreen === "search" && (
              <div className="p-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search FAQs..."
                    className="pl-10"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery ? "Search results" : "Popular FAQs"}
                  </p>
                  {(() => {
                    const activePairs = qaPairs.filter((q: any) => q.isActive !== false);
                    const pairsToUse = activePairs;
                    const filtered = searchQuery
                      ? pairsToUse.filter((qa: any) =>
                          qa.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          qa.answer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          qa.category?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                      : pairsToUse.slice(0, config.articlesCount);
                    return filtered.length > 0 ? (
                      <div className="space-y-2">
                        {filtered.map((qa: any) => {
                          const isExpanded = expandedFaqId === qa.id;
                          return (
                            <div
                              key={qa.id}
                              className="border rounded-lg overflow-hidden"
                              style={{ transition: `all ${transitionSpeed} ease` }}
                            >
                              <button
                                className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-start gap-3"
                                onClick={() => setExpandedFaqId(isExpanded ? null : qa.id)}
                              >
                                <HelpCircle
                                  className="h-4 w-4 mt-0.5 flex-shrink-0"
                                  style={{ color: config.primaryColor }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">
                                    {qa.question}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {qa.category}
                                  </p>
                                </div>
                                <ChevronDown
                                  className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5"
                                  style={{
                                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                    transition: `transform ${transitionSpeed} ease`,
                                  }}
                                />
                              </button>
                              <div
                                className="overflow-hidden"
                                style={{
                                  maxHeight: isExpanded ? "200px" : "0px",
                                  opacity: isExpanded ? 1 : 0,
                                  transition: `max-height ${transitionSpeed} ease, opacity ${transitionSpeed} ease`,
                                }}
                              >
                                <div className="px-3 pb-3 pt-0 pl-10">
                                  <div
                                    className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3"
                                    style={{ borderLeft: `3px solid ${config.primaryColor}` }}
                                  >
                                    {qa.answer || "No answer provided yet."}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {searchQuery ? "No FAQs match your search" : "No FAQs available"}
                      </p>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Article View */}
            {previewScreen === "article" && (
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">
                    Getting Started Guide
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Last updated 2 days ago
                  </p>
                </div>
                <div className="prose prose-sm">
                  <p>
                    Welcome to our platform! This guide will help
                    you get started quickly.
                  </p>
                  <h4 className="font-medium mt-3">
                    Step 1: Create your account
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Sign up with your email and verify your
                    account...
                  </p>
                  <h4 className="font-medium mt-3">
                    Step 2: Configure your settings
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Navigate to settings and customize your
                    preferences...
                  </p>
                </div>
                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm font-medium">
                    Was this helpful?
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      👍 Yes
                    </Button>
                    <Button variant="outline" size="sm">
                      👎 No
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Powered By Footer */}
          {config.showPoweredBy && previewScreen === "home" && (
            <div className="p-3 border-t text-center">
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                Powered by {config.appName}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Widget Button (when closed) */}
      {!isPreviewOpen && (
        <button
          onClick={() => {
            setIsPreviewOpen(true);
            setPreviewScreen("home");
          }}
          className={`absolute ${
            config.position.includes("right") ? "right-6" : "left-6"
          } ${
            config.position.includes("top") ? "top-6" : "bottom-6"
          } p-4 rounded-full hover:scale-105`}
          style={{
            background: config.buttonStyle === "gradient"
              ? `linear-gradient(135deg, ${config.primaryColor}, ${config.accentColor})`
              : config.buttonStyle === "outline"
              ? "white"
              : config.primaryColor,
            border: config.buttonStyle === "outline" ? `3px solid ${config.primaryColor}` : "none",
            boxShadow: shadowMap[config.shadowIntensity] || shadowMap.medium,
            transition: `all ${transitionSpeed} ease`,
          }}
        >
          <MessageSquare className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
    </>
  );
}
