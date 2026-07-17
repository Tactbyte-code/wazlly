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

import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Smartphone, 
  Image, 
  Video, 
  CheckCircle, 
  Clock, 
  XCircle,
  X,
  Copy,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Phone as PhoneIcon,
  Clipboard,
} from "lucide-react";
import { format } from "date-fns";
import type { Template } from "@shared/schema";

interface TemplatePreviewProps {
  template: Template;
  onClose: () => void;
}

interface CardData {
  mediaType: string;
  mediaUrl: string;
  body: string;
  buttons: TemplateButton[];
}

interface TemplateButton {
  type: string;
  text?: string;
  url?: string;
  phone_number?: string;
  phoneNumber?: string;
  couponCode?: string;
  example?: string;
}

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: TemplateButton[];
  cards?: Array<{ components?: TemplateComponent[] } & Record<string, unknown>>;
  example?: { header_handle?: string[]; body_text?: string[][] };
}

function isRenderableUrl(url: string | undefined | null): boolean {
  return !!url && (url.startsWith("http") || url.startsWith("/"));
}

function formatWhatsAppText(text: string): React.ReactNode {
  if (!text) return null;

  type Token = { type: "text" | "bold" | "italic" | "strike" | "code"; content: string };

  const tokens: Token[] = [];
  const combinedPattern = /(\*([^*]+)\*)|(_([^_]+)_)|(~([^~]+)~)|(```([^`]+)```)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combinedPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    if (match[1]) tokens.push({ type: "bold", content: match[2] });
    else if (match[3]) tokens.push({ type: "italic", content: match[4] });
    else if (match[5]) tokens.push({ type: "strike", content: match[6] });
    else if (match[7]) tokens.push({ type: "code", content: match[8] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", content: text.slice(lastIndex) });
  }

  if (tokens.length === 0) {
    return <span>{text}</span>;
  }

  return (
    <span>
      {tokens.map((token, i) => {
        switch (token.type) {
          case "bold": return <strong key={i}>{token.content}</strong>;
          case "italic": return <em key={i}>{token.content}</em>;
          case "strike": return <del key={i}>{token.content}</del>;
          case "code": return <code key={i}>{token.content}</code>;
          default: return <span key={i}>{token.content}</span>;
        }
      })}
    </span>
  );
}

function nonEmptyArray<T>(arr: T[] | undefined | null): T[] | null {
  return Array.isArray(arr) && arr.length > 0 ? arr : null;
}

function resolveCardData(card: Record<string, unknown>): CardData {
  const components = card.components as TemplateComponent[] | undefined;
  if (components && Array.isArray(components)) {
    const cardHeader = components.find(c => c.type === "HEADER");
    const cardBody = components.find(c => c.type === "BODY");
    const cardButtons = components.find(c => c.type === "BUTTONS");

    const rawCardUrl = cardHeader?.example?.header_handle?.[0] || "";
    const directMediaUrl = (card as Record<string, unknown>).mediaUrl as string || "";

    return {
      mediaType: cardHeader?.format?.toLowerCase() || (card.mediaType as string) || "image",
      mediaUrl: isRenderableUrl(rawCardUrl) ? rawCardUrl : (isRenderableUrl(directMediaUrl) ? directMediaUrl : ""),
      body: cardBody?.text || (card.body as string) || "",
      buttons: nonEmptyArray(cardButtons?.buttons) || nonEmptyArray(card.buttons as TemplateButton[]) || [],
    };
  }
  return {
    mediaType: (card.mediaType as string) || "image",
    mediaUrl: (card.mediaUrl as string) || "",
    body: (card.body as string) || "",
    buttons: nonEmptyArray(card.buttons as TemplateButton[]) || [],
  };
}

export function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  const carouselRef = useRef<HTMLDivElement>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "PENDING":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "REJECTED":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const components = (template.components || []) as TemplateComponent[];
  const headerComponent = components.find(c => c.type === "HEADER");
  const bodyComponent = components.find(c => c.type === "BODY");
  const footerComponent = components.find(c => c.type === "FOOTER");
  const buttonComponent = components.find(c => c.type === "BUTTONS");
  const carouselComponent = components.find(c => c.type === "CAROUSEL");

  const headerText = headerComponent?.format === "TEXT"
    ? (headerComponent.text || template.header || "")
    : (template.header || "");

  const headerFormat = headerComponent?.format
    || (template.mediaType === "image" ? "IMAGE"
      : template.mediaType === "video" ? "VIDEO"
        : template.mediaType === "document" ? "DOCUMENT"
          : null);

  const hasMediaHeader = !!headerFormat && headerFormat !== "TEXT" && headerFormat !== "text";

  const rawHeaderHandle = headerComponent?.example?.header_handle?.[0] || "";
  const headerMediaUrl = isRenderableUrl(rawHeaderHandle)
    ? rawHeaderHandle
    : (isRenderableUrl(template.mediaUrl)
      ? template.mediaUrl
      : null);

  const bodyText = bodyComponent?.text || template.body || "";
  const footerText = footerComponent?.text || template.footer || "";

  const buttons: TemplateButton[] =
    nonEmptyArray(buttonComponent?.buttons) ||
    nonEmptyArray(template.buttons as TemplateButton[]) ||
    [];

  const carouselCards: Record<string, unknown>[] =
    nonEmptyArray(carouselComponent?.cards as Record<string, unknown>[]) ||
    nonEmptyArray(template.carouselCards as Record<string, unknown>[]) ||
    [];

  const isCarousel = carouselCards.length > 0;

  const ctaButtons = buttons.filter(b => b.type === "URL" || b.type === "PHONE_NUMBER" || b.type === "COPY_CODE" || b.type === "OTP");
  const quickReplyButtons = buttons.filter(b => b.type === "QUICK_REPLY");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderButtonIcon = (btn: TemplateButton) => {
    if (btn.type === "URL") return <ExternalLink className="w-3.5 h-3.5" />;
    if (btn.type === "PHONE_NUMBER") return <PhoneIcon className="w-3.5 h-3.5" />;
    if (btn.type === "COPY_CODE" || btn.type === "OTP") return <Clipboard className="w-3.5 h-3.5" />;
    return null;
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = 220;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Template Preview</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{template.name}</h2>
              <div className="flex items-center gap-2">
                {getStatusIcon(template.status)}
                <Badge variant={template.status === "APPROVED" ? "default" : "secondary"}>
                  {template.status}
                </Badge>
              </div>
            </div>

            {template.status === "REJECTED" && template.rejectionReason && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">
                  <strong>Rejection Reason:</strong> {template.rejectionReason}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Category:</span>
                <span className="ml-2 font-medium">{template.category}</span>
              </div>
              <div>
                <span className="text-gray-500">Language:</span>
                <span className="ml-2 font-medium">{template.language || "en_US"}</span>
              </div>
              <div>
                <span className="text-gray-500">Created:</span>
                <span className="ml-2 font-medium">
                  {format(new Date(template.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              {template.lastUsed && (
                <div>
                  <span className="text-gray-500">Last Used:</span>
                  <span className="ml-2 font-medium">
                    {format(new Date(template.lastUsed), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#e5ddd5] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="w-5 h-5" />
              <span className="font-medium">WhatsApp Preview</span>
              {isCarousel && (
                <Badge variant="outline" className="text-xs">Carousel</Badge>
              )}
            </div>

            <div className="max-w-sm mx-auto space-y-2">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                {hasMediaHeader && !isCarousel && (
                  <div className="bg-gray-200 h-48 rounded-t-lg flex items-center justify-center overflow-hidden">
                    {headerMediaUrl && isRenderableUrl(headerMediaUrl) && headerFormat === "IMAGE" ? (
                      <img
                        src={headerMediaUrl}
                        alt="Header"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = "none";
                        }}
                      />
                    ) : (
                      <>
                        {headerFormat === "IMAGE" && <Image className="w-16 h-16 text-gray-400" />}
                        {headerFormat === "VIDEO" && <Video className="w-16 h-16 text-gray-400" />}
                        {headerFormat === "DOCUMENT" && <FileText className="w-16 h-16 text-gray-400" />}
                      </>
                    )}
                  </div>
                )}

                <div className="p-3 space-y-1">
                  {headerText && !hasMediaHeader && (
                    <h3 className="font-semibold text-sm">
                      {formatWhatsAppText(headerText)}
                    </h3>
                  )}

                  {bodyText && (
                    <div className="text-sm whitespace-pre-wrap">
                      {formatWhatsAppText(bodyText)}
                    </div>
                  )}

                  {footerText && (
                    <div className="text-xs text-gray-500 pt-1">
                      {formatWhatsAppText(footerText)}
                    </div>
                  )}
                </div>

                {ctaButtons.length > 0 && (
                  <div className="border-t">
                    {ctaButtons.map((btn, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-center gap-2 py-2 text-[#00a5f4] text-sm font-medium border-b last:border-b-0 cursor-pointer hover:bg-gray-50"
                      >
                        {renderButtonIcon(btn)}
                        <span>{btn.text || btn.type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {quickReplyButtons.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {quickReplyButtons.map((btn, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-lg shadow-sm px-4 py-2 text-[#00a5f4] text-sm font-medium flex-1 text-center min-w-[80px] cursor-pointer hover:bg-gray-50"
                    >
                      {btn.text}
                    </div>
                  ))}
                </div>
              )}

              {isCarousel && (
                <div className="mt-2 relative">
                  {carouselCards.length > 1 && (
                    <>
                      <button
                        onClick={() => scrollCarousel("left")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 rounded-full p-1 shadow-md hover:bg-white"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => scrollCarousel("right")}
                        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 rounded-full p-1 shadow-md hover:bg-white"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <div
                    ref={carouselRef}
                    className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {carouselCards.map((card, cardIdx) => {
                      const cardData = resolveCardData(card);
                      const cardCtaButtons = cardData.buttons.filter(
                        b => b.type === "URL" || b.type === "PHONE_NUMBER" || b.type === "COPY_CODE" || b.type === "OTP"
                      );
                      const cardQuickReplies = cardData.buttons.filter(
                        b => b.type === "QUICK_REPLY"
                      );

                      return (
                        <div key={cardIdx} className="snap-start shrink-0 w-[200px] space-y-2">
                          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                            <div className="bg-gray-200 h-32 flex items-center justify-center overflow-hidden">
                              {isRenderableUrl(cardData.mediaUrl) ? (
                                <img
                                  src={cardData.mediaUrl}
                                  alt={`Card ${cardIdx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const el = e.target as HTMLImageElement;
                                    el.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="flex flex-col items-center text-gray-400">
                                  {cardData.mediaType === "video" ? (
                                    <Video className="w-10 h-10" />
                                  ) : (
                                    <Image className="w-10 h-10" />
                                  )}
                                  <span className="text-xs mt-1">Card {cardIdx + 1}</span>
                                </div>
                              )}
                            </div>

                            {cardData.body && (
                              <div className="p-2 text-xs whitespace-pre-wrap leading-relaxed">
                                {formatWhatsAppText(cardData.body)}
                              </div>
                            )}

                            {cardCtaButtons.length > 0 && (
                              <div className="border-t">
                                {cardCtaButtons.map((btn, btnIdx) => (
                                  <div
                                    key={btnIdx}
                                    className="flex items-center justify-center gap-1.5 py-1.5 text-[#00a5f4] text-xs font-medium border-b last:border-b-0"
                                  >
                                    {renderButtonIcon(btn)}
                                    <span>{btn.text}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {cardQuickReplies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {cardQuickReplies.map((btn, btnIdx) => (
                                <div
                                  key={btnIdx}
                                  className="bg-white rounded-lg shadow-sm px-2 py-1 text-[#00a5f4] text-xs font-medium flex-1 text-center"
                                >
                                  {btn.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Template Content</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(template.body)}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Body
              </Button>
            </div>

            <div className="space-y-3">
              {headerText && (
                <div>
                  <SectionLabel>Header</SectionLabel>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {headerText}
                  </div>
                </div>
              )}

              {hasMediaHeader && (
                <div>
                  <SectionLabel>Header Media</SectionLabel>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                    Type: {headerFormat}
                  </div>
                </div>
              )}

              {bodyText && (
                <div>
                  <SectionLabel>Body</SectionLabel>
                  <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                    {bodyText}
                  </div>
                </div>
              )}

              {footerText && (
                <div>
                  <SectionLabel>Footer</SectionLabel>
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    {footerText}
                  </div>
                </div>
              )}

              {buttons.length > 0 && (
                <div>
                  <SectionLabel>Buttons</SectionLabel>
                  <div className="bg-gray-50 p-3 rounded space-y-2">
                    {buttons.map((button, idx) => (
                      <div key={idx} className="text-sm flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">{button.type}</Badge>
                        <span>{button.text}</span>
                        {button.url && <span className="text-gray-400 text-xs truncate">({button.url})</span>}
                        {button.phone_number && <span className="text-gray-400 text-xs">({button.phone_number})</span>}
                        {button.phoneNumber && <span className="text-gray-400 text-xs">({button.phoneNumber})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isCarousel && (
                <div>
                  <SectionLabel>Carousel Cards ({carouselCards.length})</SectionLabel>
                  <div className="space-y-3">
                    {carouselCards.map((card, idx) => {
                      const cardData = resolveCardData(card);
                      return (
                        <div key={idx} className="bg-gray-50 p-3 rounded border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">Card {idx + 1}</Badge>
                            <span className="text-xs text-gray-400 capitalize">{cardData.mediaType} header</span>
                          </div>
                          {cardData.body && (
                            <div className="text-sm whitespace-pre-wrap mb-2">{cardData.body}</div>
                          )}
                          {cardData.buttons.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {cardData.buttons.map((btn, btnIdx) => (
                                <Badge key={btnIdx} variant="secondary" className="text-xs">
                                  {btn.type}: {btn.text}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="font-medium mb-1 text-sm text-gray-500">{children}</div>;
}
