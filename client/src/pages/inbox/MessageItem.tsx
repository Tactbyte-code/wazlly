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

import { useState, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Volume2,
  Download,
  X,
  Maximize2,
  RotateCw,
  MapPin,
  User,
  Phone,
  Mail,
  Building,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { normalizeDate } from "./utils";
import type { Message } from "./types";
import { useAuth } from "@/contexts/auth-context";
import { isDemoUser, maskContent, maskName, maskPhone, maskEmail } from "@/utils/maskUtils";
import { formatErrorForDisplay } from "@shared/whatsapp-error-codes";

function MediaLightbox({
  src,
  type,
  mimeType,
  downloadUrl,
  onClose,
}: {
  src: string;
  type: "image" | "video";
  mimeType?: string;
  downloadUrl: string;
  onClose: () => void;
}) {
  const [rotation, setRotation] = useState(0);

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {type === "image" && (
          <button
            onClick={handleRotate}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-5 h-5 text-white" />
          </button>
        )}
        <a
          href={downloadUrl}
          download
          onClick={(e) => e.stopPropagation()}
          className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          title="Download"
        >
          <Download className="w-5 h-5 text-white" />
        </a>
        <button
          onClick={onClose}
          className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          title="Close"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
      <div
        className="max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {type === "image" ? (
          <img
            src={src}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-lg transition-transform duration-300"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        ) : (
          <video
            controls
            autoPlay
            className="max-w-full max-h-[90vh] rounded-lg"
          >
            <source src={src} type={mimeType} />
          </video>
        )}
      </div>
    </div>
  );
}

function resolveMediaUrls(message: Message) {
  const hasMedia = message.mediaId || message.mediaUrl;
  if (!hasMedia) return { mediaUrl: null, downloadUrl: null };

  const cloudUrl = (message?.metadata as any)?.cloudUrl;
  const isAbsolute = (url?: string) => !!url && /^https?:\/\//i.test(url);

  if (message.mediaId) {
    const proxyUrl = `/api/messages/media-proxy?messageId=${message.id}`;
    const dlUrl = `/api/messages/media-proxy?messageId=${message.id}&download=true`;

    if (
      cloudUrl &&
      isAbsolute(cloudUrl) &&
      !cloudUrl.includes("fbsbx.com") &&
      !cloudUrl.includes("facebook.com") &&
      !cloudUrl.includes("whatsapp.com")
    ) {
      return { mediaUrl: cloudUrl, downloadUrl: dlUrl };
    }
    return { mediaUrl: proxyUrl, downloadUrl: dlUrl };
  }

  if (cloudUrl) {
    if (isAbsolute(cloudUrl)) {
      return { mediaUrl: cloudUrl, downloadUrl: cloudUrl };
    }
    return {
      mediaUrl: `/api/messages/media-proxy?messageId=${message.id}`,
      downloadUrl: `/api/messages/media-proxy?messageId=${message.id}&download=true`,
    };
  }

  if (message.mediaUrl) {
    return { mediaUrl: message.mediaUrl, downloadUrl: message.mediaUrl };
  }

  return { mediaUrl: null, downloadUrl: null };
}

const MessageItem = ({
  message,
  showDate,
}: {
  message: Message;
  showDate: boolean;
}) => {
  const { user } = useAuth();
  const demo = isDemoUser(user?.username);
  const isOutbound = message.direction === "outbound";
  const messageType = message.messageType || message.type;
  const [lightbox, setLightbox] = useState<{
    src: string;
    type: "image" | "video";
    mimeType?: string;
    downloadUrl: string;
  } | null>(null);

  const openLightbox = useCallback(
    (src: string, type: "image" | "video", downloadUrl: string, mimeType?: string) => {
      setLightbox({ src, type, mimeType, downloadUrl });
    },
    []
  );

  if (messageType === "reaction" || message.content === "[reaction message]") {
    return null;
  }

  const reactions = (message.metadata as any)?.reactions as Array<{ emoji: string; from: string }> | undefined;

  const renderMediaContent = () => {
    const hasMedia = message.mediaId || message.mediaUrl;
    const { mediaUrl, downloadUrl } = resolveMediaUrls(message);

    const renderTextContent = () => {
      if (
        !message.content ||
        message.content === "[image]" ||
        message.content === "[Image]" ||
        message.content === "[video]" ||
        message.content === "[Video]" ||
        message.content === "[audio]" ||
        message.content === "[Audio]" ||
        message.content === "[document]" ||
        message.content === "[Sticker]" ||
        message.content === "[Location]" ||
        message.content === "[Contact]" ||
        message.content === "[reaction message]" ||
        message.content === "[Audio message]" ||
        message.content === "[Order received]" ||
        message.content === "[Flow reply]" ||
        message.content === "[Location request]" ||
        message.content === "[Address message]" ||
        message.content === "[Template message]" ||
        message.content === "[Button reply]" ||
        message.content?.startsWith("[Unsupported:") ||
        message.content === "[This message type is not yet supported]"
      ) {
        return null;
      }
      return <p className="text-sm whitespace-pre-wrap break-words">{demo ? maskContent(message.content) : message.content}</p>;
    };

    const renderDownloadButton = (url: string | null, small = false) => {
      if (!url) return null;
      return (
        <a
          href={url}
          download
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "rounded-full transition-colors flex items-center justify-center",
            small ? "p-1" : "p-1.5",
            isOutbound
              ? "bg-black/40 hover:bg-black/60"
              : "bg-black/40 hover:bg-black/60"
          )}
          title="Download"
        >
          <Download className={cn("text-white", small ? "w-3 h-3" : "w-3.5 h-3.5")} />
        </a>
      );
    };

    const renderImageBlock = (mUrl: string | null, dlUrl: string | null) => (
      <div className="space-y-2">
        {hasMedia && mUrl && (
          <div className="relative group">
            <button
              onClick={() => openLightbox(mUrl, "image", dlUrl || mUrl)}
              className="block rounded-lg overflow-hidden cursor-pointer"
              style={{ background: "none", border: "none", padding: 0 }}
            >
              <img
                src={mUrl}
                alt=""
                className="max-w-[250px] max-h-[300px] rounded-lg object-cover"
                onError={(e) => {
                  e.currentTarget.src =
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+";
                }}
              />
            </button>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openLightbox(mUrl, "image", dlUrl || mUrl)}
                className="p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                title="View full size"
              >
                <Maximize2 className="w-3.5 h-3.5 text-white" />
              </button>
              {renderDownloadButton(dlUrl, true)}
            </div>
          </div>
        )}
        {renderTextContent()}
      </div>
    );

    const renderVideoBlock = (mUrl: string | null, dlUrl: string | null, mime?: string) => (
      <div className="space-y-2">
        {hasMedia && mUrl && (
          <div className="relative group">
            <video
              controls
              className="max-w-[250px] max-h-[300px] rounded-lg"
              preload="metadata"
            >
              <source src={`${mUrl}#t=0.1`} type={mime || message.mediaMimeType} />
            </video>
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openLightbox(mUrl, "video", dlUrl || mUrl, mime || message.mediaMimeType)}
                className="p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                title="View full screen"
              >
                <Maximize2 className="w-3.5 h-3.5 text-white" />
              </button>
              {renderDownloadButton(dlUrl, true)}
            </div>
          </div>
        )}
        {renderTextContent()}
      </div>
    );

    const renderAudioBlock = (mUrl: string | null, dlUrl: string | null, mime?: string) => (
      <div className="space-y-2">
        {hasMedia && mUrl && (
          <div
            className={cn(
              "flex items-center space-x-3 p-3 rounded-lg min-w-[200px]",
              isOutbound ? "bg-[#c5e8b0]" : "bg-gray-100"
            )}
          >
            <div
              className={cn(
                "p-2 rounded-full",
                isOutbound ? "bg-[#a8d98a]" : "bg-gray-200"
              )}
            >
              <Volume2
                className={cn(
                  "w-4 h-4",
                  isOutbound ? "text-gray-700" : "text-gray-600"
                )}
              />
            </div>
            <div className="flex-1">
              <audio
                controls
                className="w-full h-8"
              >
                <source src={mUrl} type={mime || message.mediaMimeType} />
              </audio>
            </div>
            {dlUrl && (
              <a
                href={dlUrl}
                download
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "p-1.5 rounded-full transition-colors",
                  isOutbound ? "hover:bg-[#a8d98a]" : "hover:bg-gray-200"
                )}
                title="Download audio"
              >
                <Download
                  className={cn(
                    "w-4 h-4",
                    isOutbound ? "text-gray-700" : "text-gray-600"
                  )}
                />
              </a>
            )}
          </div>
        )}
        {renderTextContent()}
      </div>
    );

    const renderDocumentBlock = (dlUrl: string | null, overrideName?: string, overrideMime?: string) => {
      const fileName =
        overrideName ||
        message.metadata?.originalName ||
        (message.metadata as any)?.fileName ||
        "Document";
      const fileSize = message.metadata?.fileSize
        ? `${Math.round(message.metadata.fileSize / 1024)} KB`
        : "";
      const mimeType = overrideMime || message.mediaMimeType || message.metadata?.mimeType || "";

      return (
        <div className="space-y-2">
          {hasMedia && (
            <div
              className={cn(
                "flex items-center space-x-3 p-3 rounded-lg border",
                isOutbound
                  ? "bg-[#c5e8b0] border-[#a8d98a]"
                  : "bg-white border-gray-200"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-full",
                  isOutbound ? "bg-[#a8d98a]" : "bg-blue-100"
                )}
              >
                <FileText
                  className={cn(
                    "w-5 h-5",
                    isOutbound ? "text-gray-700" : "text-blue-600"
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    isOutbound ? "text-gray-900" : "text-gray-900"
                  )}
                >
                  {fileName}
                </p>
                <div className="flex items-center space-x-2">
                  {fileSize && (
                    <p
                      className={cn(
                        "text-xs",
                        isOutbound ? "text-gray-600" : "text-gray-500"
                      )}
                    >
                      {fileSize}
                    </p>
                  )}
                  {mimeType && (
                    <p
                      className={cn(
                        "text-xs",
                        isOutbound ? "text-gray-600" : "text-gray-500"
                      )}
                    >
                      {mimeType.split("/")[1]?.toUpperCase() || "FILE"}
                    </p>
                  )}
                </div>
              </div>
              {dlUrl && (
                <a
                  href={dlUrl}
                  download={fileName}
                  className={cn(
                    "p-1.5 rounded-full hover:bg-opacity-80 transition-colors",
                    isOutbound ? "hover:bg-[#a8d98a]" : "hover:bg-gray-100"
                  )}
                  onClick={(e) => e.stopPropagation()}
                  title="Download file"
                >
                  <Download
                    className={cn(
                      "w-4 h-4",
                      isOutbound ? "text-gray-700" : "text-gray-600"
                    )}
                  />
                </a>
              )}
            </div>
          )}
          {renderTextContent()}
        </div>
      );
    };

    switch (messageType) {
      case "image":
        return renderImageBlock(mediaUrl, downloadUrl);

      case "video":
        return renderVideoBlock(mediaUrl, downloadUrl);

      case "audio":
      case "voice":
        return renderAudioBlock(mediaUrl, downloadUrl);

      case "document":
        return renderDocumentBlock(downloadUrl);

      case "interactive":
        const buttons = (message.metadata as any)?.buttons;
        return (
          <div className="space-y-3">
            {renderTextContent()}
            {buttons && buttons.length > 0 && (
              <div className="space-y-2">
                {buttons.map(
                  (button: { id?: string; text: string }, index: number) => (
                    <button
                      key={button.id || index}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors",
                        isOutbound
                          ? "border-[#a8d98a] text-gray-700 hover:bg-[#c5e8b0]"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      )}
                      onClick={() => {
                        console.log("Button clicked:", button);
                      }}
                    >
                      {button.text}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        );

      case "template": {
        const rawContent = message.content || "";
        const isLegacyName = rawContent.startsWith("Template:");
        const isLegacyBracketed = /^\[template:\s*.+\]$/i.test(rawContent);
        const isInboundPlaceholder = rawContent === "[Template message]";
        let bodyText: string | null = null;
        let templateLabel: string | null = null;
        if (!isLegacyName && !isLegacyBracketed && !isInboundPlaceholder && rawContent) {
          bodyText = rawContent;
        } else if (isLegacyName) {
          templateLabel = rawContent.replace(/^Template:\s*/, "").trim();
        } else if (isLegacyBracketed) {
          templateLabel = rawContent.replace(/^\[template:\s*/i, "").replace(/\]$/, "").trim();
        }
        return (
          <div
            className={cn(
              "flex items-start space-x-2 p-3 rounded border-l-4",
              isOutbound
                ? "border-[#a8d98a] bg-[#c5e8b0]"
                : "border-blue-400 bg-blue-50"
            )}
          >
            <div className="text-lg mt-1 flex-shrink-0">📧</div>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  "text-xs font-medium mb-1",
                  isOutbound ? "text-gray-600" : "text-blue-700"
                )}
              >
                Template Message
              </p>
              {bodyText && (
                <p className="text-sm whitespace-pre-wrap break-words">
                  {demo ? maskContent(bodyText) : bodyText}
                </p>
              )}
              {templateLabel && (
                <p className={cn("text-xs mt-0.5", isOutbound ? "text-gray-500" : "text-blue-500")}>
                  📋 {templateLabel}
                </p>
              )}
              {!bodyText && !templateLabel && (
                <p className={cn("text-xs italic", isOutbound ? "text-gray-500" : "text-blue-500")}>
                  Received template message
                </p>
              )}
            </div>
          </div>
        );
      }

      case "sticker": {
        const { mediaUrl: stickerUrl } = resolveMediaUrls(message);
        if (stickerUrl) {
          return (
            <div className="space-y-1">
              <img
                src={stickerUrl}
                alt="Sticker"
                className="max-w-[150px] max-h-[150px] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
              <div className="hidden items-center gap-2 text-sm text-gray-500">
                <span>🏷️</span>
                <span>Sticker</span>
              </div>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="text-xl">🏷️</span>
            <span>Sticker</span>
          </div>
        );
      }

      case "location": {
        const lat = (message.metadata as any)?.latitude;
        const lng = (message.metadata as any)?.longitude;
        const locName = (message.metadata as any)?.locationName;
        const locAddress = (message.metadata as any)?.locationAddress;
        const locUrl = (message.metadata as any)?.locationUrl;
        const mapLink = locUrl || (lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null);

        return (
          <div className="space-y-1 min-w-[200px]">
            {mapLink ? (
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "block rounded-lg border p-3",
                  isOutbound ? "bg-[#c5e8b0] border-[#a8d98a]" : "bg-white border-gray-200"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className={cn(
                    "p-1.5 rounded-full mt-0.5",
                    isOutbound ? "bg-[#a8d98a]" : "bg-red-100"
                  )}>
                    <MapPin className={cn("w-4 h-4", isOutbound ? "text-gray-700" : "text-red-500")} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {locName && <p className="text-sm font-medium truncate">{locName}</p>}
                    {locAddress && <p className="text-xs text-gray-500 truncate">{locAddress}</p>}
                    {lat && lng && (
                      <p className="text-xs text-gray-400 mt-0.5">{Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}</p>
                    )}
                    <p className="text-xs text-blue-600 mt-1">Open in Google Maps</p>
                  </div>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-red-500" />
                <span>{locName || locAddress || message.content || "Location shared"}</span>
              </div>
            )}
          </div>
        );
      }

      case "contacts": {
        const sharedContacts = (message.metadata as any)?.sharedContacts as Array<{
          name: { formatted_name: string };
          phones?: Array<{ phone: string; type?: string }>;
          emails?: Array<{ email: string; type?: string }>;
          org?: { company?: string; title?: string };
        }> | undefined;

        if (!sharedContacts || sharedContacts.length === 0) {
          return (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500" />
              <span>{demo ? maskContent(message.content || "") : (message.content || "Contact shared")}</span>
            </div>
          );
        }

        return (
          <div className="space-y-2 min-w-[200px]">
            {sharedContacts.map((contact, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-lg border p-3",
                  isOutbound ? "bg-[#c5e8b0] border-[#a8d98a]" : "bg-white border-gray-200"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "p-1.5 rounded-full",
                    isOutbound ? "bg-[#a8d98a]" : "bg-blue-100"
                  )}>
                    <User className={cn("w-4 h-4", isOutbound ? "text-gray-700" : "text-blue-600")} />
                  </div>
                  <p className="text-sm font-medium">{demo ? maskName(contact.name.formatted_name) : contact.name.formatted_name}</p>
                </div>
                {contact.org?.company && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                    <Building className="w-3 h-3" />
                    <span>{demo ? maskName(contact.org.company) : contact.org.company}{contact.org.title ? ` - ${demo ? maskName(contact.org.title) : contact.org.title}` : ""}</span>
                  </div>
                )}
                {contact.phones?.map((p, pidx) => (
                  <div key={pidx} className="flex items-center gap-1.5 text-xs text-gray-600 mb-0.5">
                    <Phone className="w-3 h-3" />
                    {demo ? (
                      <span>{maskPhone(p.phone)}</span>
                    ) : (
                      <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a>
                    )}
                    {p.type && <span className="text-gray-400">({p.type})</span>}
                  </div>
                ))}
                {contact.emails?.map((e, eidx) => (
                  <div key={eidx} className="flex items-center gap-1.5 text-xs text-gray-600 mb-0.5">
                    <Mail className="w-3 h-3" />
                    {demo ? (
                      <span>{maskEmail(e.email)}</span>
                    ) : (
                      <a href={`mailto:${e.email}`} className="hover:underline">{e.email}</a>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      }

      case "button": {
        const buttonText = message.content || "[Button reply]";
        return (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            isOutbound ? "bg-[#c5e8b0]" : "bg-gray-50 border border-gray-200"
          )}>
            <span className="text-base">🔘</span>
            <span>{demo ? maskContent(buttonText) : buttonText}</span>
          </div>
        );
      }

      case "order": {
        const orderData = (message.metadata as any)?.order;
        return (
          <div className={cn(
            "rounded-lg border p-3 min-w-[200px]",
            isOutbound ? "bg-[#c5e8b0] border-[#a8d98a]" : "bg-white border-gray-200"
          )}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🛒</span>
              <p className="text-sm font-medium">Order Received</p>
            </div>
            {orderData?.product_items && (
              <p className="text-xs text-gray-500">
                {orderData.product_items.length} item(s)
              </p>
            )}
          </div>
        );
      }

      case "system": {
        return (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            "bg-gray-50 border border-gray-200"
          )}>
            <span className="text-base">⚙️</span>
            <span className="text-gray-600 italic">
              {demo ? maskContent(message.content || "") : (message.content || "System message")}
            </span>
          </div>
        );
      }

      case "referral": {
        return (
          <div className="space-y-1">
            <div className={cn(
              "flex items-center gap-1.5 text-xs",
              isOutbound ? "text-gray-600" : "text-green-700"
            )}>
              <span>📢</span>
              <span className="font-medium">Via Referral</span>
            </div>
            {renderTextContent() || (
              <p className="text-sm whitespace-pre-wrap break-words">
                {demo ? maskContent(message.content || "") : (message.content || "")}
              </p>
            )}
          </div>
        );
      }

      case "address": {
        return (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            isOutbound ? "bg-[#c5e8b0]" : "bg-gray-50 border border-gray-200"
          )}>
            <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span>{demo ? maskContent(message.content || "") : (message.content || "Address shared")}</span>
          </div>
        );
      }

      case "location_request": {
        return (
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg text-sm",
            isOutbound ? "bg-[#c5e8b0]" : "bg-gray-50 border border-gray-200"
          )}>
            <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-gray-600">Location requested</span>
          </div>
        );
      }

      case "unsupported": {
        const meta = message.metadata as any;
        const errorTitle = meta?.errorTitle;
        const originalType = meta?.originalType;
        const errorCode = meta?.errorCode;
        const errorDetails = meta?.errorDetails;
        const rawWebhook = meta?.rawWebhook;
        return (
          <div className={cn(
            "flex flex-col gap-1 p-2 rounded-lg text-sm",
            isOutbound ? "bg-[#c5e8b0]" : "bg-gray-50"
          )}>
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-gray-500">
                {errorTitle || "This message type is not supported by WhatsApp API"}
              </span>
            </div>
            {(originalType || errorCode || errorDetails) && (
              <div className="text-xs text-gray-400 pl-6 space-y-0.5">
                {originalType && originalType !== "unsupported" && (
                  <p>Type: <span className="font-medium text-gray-500">{originalType}</span></p>
                )}
                {errorCode && (
                  <p>Error code: <span className="font-medium text-gray-500">{errorCode}</span></p>
                )}
                {errorDetails && (
                  <p>Details: <span className="font-medium text-gray-500">{errorDetails}</span></p>
                )}
              </div>
            )}
            {rawWebhook && (
              <details className="text-xs text-gray-400 pl-6 mt-1">
                <summary className="cursor-pointer hover:text-gray-600">View raw webhook data</summary>
                <pre className="mt-1 bg-white/60 p-2 rounded text-[10px] overflow-x-auto max-h-32 border">
                  {JSON.stringify(rawWebhook, null, 2)}
                </pre>
              </details>
            )}
          </div>
        );
      }

      case "text":
      default:
        if (hasMedia) {
          const mimeType =
            message.mediaMimeType || message.metadata?.mimeType || "";
          const isImage =
            mimeType.startsWith("image/") ||
            mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
          const isVideo =
            mimeType.startsWith("video/") ||
            mediaUrl?.match(/\.(mp4|webm|ogg|mov)$/i);
          const isAudio =
            mimeType.startsWith("audio/") ||
            mediaUrl?.match(/\.(mp3|wav|ogg|m4a)$/i);

          if (isImage) return renderImageBlock(mediaUrl, downloadUrl);
          if (isVideo) return renderVideoBlock(mediaUrl, downloadUrl, mimeType);
          if (isAudio) return renderAudioBlock(mediaUrl, downloadUrl, mimeType);
          return renderDocumentBlock(downloadUrl, undefined, mimeType);
        }

        return (
          renderTextContent() || (
            <p className="text-sm whitespace-pre-wrap break-words">
              {demo ? maskContent(message.content || "") : (message.content || "")}
            </p>
          )
        );
    }
  };

  const formatMessageDateLocal = (date: any) => {
    const messageDate = normalizeDate(date);
    if (!messageDate) return "";

    if (isToday(messageDate)) return "Today";
    if (isYesterday(messageDate)) return "Yesterday";
    return format(messageDate, "MMMM d, yyyy");
  };

  const getMessageStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Check className="w-3 h-3 text-gray-400" />;
      case "delivered":
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case "read":
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
      case "failed":
        return <AlertCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400" />;
    }
  };

  return (
    <>
      {lightbox && (
        <MediaLightbox
          src={lightbox.src}
          type={lightbox.type}
          mimeType={lightbox.mimeType}
          downloadUrl={lightbox.downloadUrl}
          onClose={() => setLightbox(null)}
        />
      )}

      {showDate && (
        <div className="flex items-center justify-center my-4">
          <div className="bg-gray-100 px-3 py-1 rounded-full text-xs text-gray-600">
            {formatMessageDateLocal(message.createdAt)}
          </div>
        </div>
      )}

      <div
        className={cn(
          "flex items-end gap-2 mb-4",
          isOutbound ? "justify-end" : "justify-start"
        )}
      >
        {!isOutbound && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gray-200 text-xs">C</AvatarFallback>
          </Avatar>
        )}

        <div className="relative max-w-[70%]">
        <div
          className={cn(
            "rounded-2xl px-4 py-2 overflow-hidden",
            isOutbound
              ? message.status === "failed"
                ? "bg-red-50 text-red-900 border border-red-200 rounded-br-sm"
                : "bg-[#dcf8c6] text-gray-900 rounded-br-sm"
              : "bg-white text-gray-900 border border-gray-100 shadow-sm rounded-bl-sm"
          )}
        >
          {renderMediaContent()}

          {message.status === "failed" && (() => {
            const errInfo = formatErrorForDisplay(message.errorDetails);
            return (
              <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200 space-y-1">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-red-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {errInfo.code != null && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-mono font-semibold">
                          {errInfo.code}
                        </span>
                      )}
                      <span className="text-xs font-medium text-red-800">{errInfo.title}</span>
                    </div>
                    <p className="text-[11px] text-red-700 mt-0.5 leading-snug">{errInfo.description}</p>
                  </div>
                </div>
                {errInfo.suggestion && (
                  <div className="flex items-start gap-1.5 pt-1 border-t border-red-100">
                    <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-500" />
                    <p className="text-[10px] text-red-600 leading-snug">{errInfo.suggestion}</p>
                  </div>
                )}
              </div>
            );
          })()}

          <div
            className={cn(
              "flex items-center gap-1 mt-1",
              isOutbound ? "justify-end" : "justify-start"
            )}
          >
            {(message.metadata as any)?.edited && (
              <span className="text-[10px] text-gray-400 italic">edited</span>
            )}
            <span
              className={cn(
                "text-[10px]",
                isOutbound
                  ? message.status === "failed"
                    ? "text-red-400"
                    : "text-gray-500"
                  : "text-gray-400"
              )}
            >
              {message.createdAt
                ? format(normalizeDate(message.createdAt) || new Date(), "h:mm a")
                : ""}
            </span>
            {isOutbound && getMessageStatusIcon(message.status || "pending")}
          </div>
        </div>

        {reactions && reactions.length > 0 && (
          <div className={cn(
            "flex gap-0.5 -mt-2 mb-1",
            isOutbound ? "justify-end mr-1" : "justify-start ml-1"
          )}>
            {Object.entries(
              reactions.reduce((acc: Record<string, number>, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {})
            ).map(([emoji, count]) => (
              <span
                key={emoji}
                className="inline-flex items-center bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-sm shadow-sm"
              >
                {emoji}
                {(count as number) > 1 && (
                  <span className="text-[10px] text-gray-500 ml-0.5">{count as number}</span>
                )}
              </span>
            ))}
          </div>
        )}
        </div>
      </div>
    </>
  );
};

export default MessageItem;
