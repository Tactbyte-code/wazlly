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
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  Search,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Image,
  FileText,
  Mic,
  Video,
  MapPin,
  Contact,
  Sticker,
  LayoutTemplate,
  MousePointerClick,
  Type,
  FileIcon,
  Eye,
  ChevronDown,
  Megaphone,
} from "lucide-react";
import { format } from "date-fns";
import { Loading } from "@/components/ui/loading";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { isDemoUser, maskPhone, maskContent, maskName } from "@/utils/maskUtils";

interface Channel {
  id: string;
  name: string;
  phoneNumber: string;
}

interface MessageLog {
  id: string;
  channelId: string;
  channelName?: string;
  phoneNumber: string;
  contactName?: string;
  messageType: string;
  contentType: string;
  direction?: string;
  type?: string;
  content: string;
  mediaUrl?: string;
  mediaId?: string;
  mediaMimeType?: string;
  metadata?: any;
  templateName?: string;
  fromType?: string;
  campaignId?: string;
  campaignName?: string;
  status: "sent" | "delivered" | "read" | "failed" | "pending";
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: {
    code: string;
    title: string;
    message?: string;
    description?: string;
    suggestion?: string;
    errorData?: any;
  };
  deliveredAt?: string;
  readAt?: string;
  whatsappMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse {
  data: MessageLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const getContentTypeIcon = (contentType: string) => {
  switch (contentType?.toLowerCase()) {
    case "image":
      return <Image className="w-4 h-4 text-blue-500" />;
    case "video":
      return <Video className="w-4 h-4 text-purple-500" />;
    case "audio":
      return <Mic className="w-4 h-4 text-orange-500" />;
    case "document":
      return <FileText className="w-4 h-4 text-yellow-600" />;
    case "sticker":
      return <Sticker className="w-4 h-4 text-pink-500" />;
    case "location":
      return <MapPin className="w-4 h-4 text-red-500" />;
    case "contacts":
    case "contact":
      return <Contact className="w-4 h-4 text-green-600" />;
    case "template":
      return <LayoutTemplate className="w-4 h-4 text-indigo-500" />;
    case "interactive":
    case "button":
    case "button_reply":
    case "list_reply":
      return <MousePointerClick className="w-4 h-4 text-cyan-500" />;
    case "reaction":
      return <span className="text-sm">😀</span>;
    case "order":
      return <FileIcon className="w-4 h-4 text-emerald-500" />;
    default:
      return <Type className="w-4 h-4 text-gray-500" />;
  }
};

const getContentTypeLabel = (contentType: string) => {
  switch (contentType?.toLowerCase()) {
    case "image": return "Image";
    case "video": return "Video";
    case "audio": return "Audio";
    case "document": return "Document";
    case "sticker": return "Sticker";
    case "location": return "Location";
    case "contacts":
    case "contact": return "Contact";
    case "template": return "Template";
    case "interactive": return "Interactive";
    case "button":
    case "button_reply": return "Button Reply";
    case "list_reply": return "List Reply";
    case "reaction": return "Reaction";
    case "order": return "Order";
    case "text": return "Text";
    default: return contentType || "Text";
  }
};

const getContentTypeBadgeColor = (contentType: string) => {
  switch (contentType?.toLowerCase()) {
    case "image": return "bg-blue-50 text-blue-700 border-blue-200";
    case "video": return "bg-purple-50 text-purple-700 border-purple-200";
    case "audio": return "bg-orange-50 text-orange-700 border-orange-200";
    case "document": return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "sticker": return "bg-pink-50 text-pink-700 border-pink-200";
    case "location": return "bg-red-50 text-red-700 border-red-200";
    case "contacts":
    case "contact": return "bg-green-50 text-green-700 border-green-200";
    case "template": return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "interactive":
    case "button":
    case "button_reply":
    case "list_reply": return "bg-cyan-50 text-cyan-700 border-cyan-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

function DebugInfoSection({ log }: { log: MessageLog }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Debug Info
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="p-3 space-y-2 text-xs bg-white">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-500">Stored type:</span>{" "}
              <span className="font-mono font-medium">{log.contentType || "(empty)"}</span>
            </div>
            <div>
              <span className="text-gray-500">WA type field:</span>{" "}
              <span className="font-mono font-medium">{log.type || "(empty)"}</span>
            </div>
            <div>
              <span className="text-gray-500">Direction:</span>{" "}
              <span className="font-mono font-medium">{log.direction || "(empty)"}</span>
            </div>
            <div>
              <span className="text-gray-500">Message ID:</span>{" "}
              <span className="font-mono font-medium break-all">{log.id}</span>
            </div>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Full metadata JSON:</p>
            <pre className="bg-gray-50 border rounded p-2 text-xs overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
              {JSON.stringify(log.metadata ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageDetailDialog({ log, open, onClose, isDemo }: { log: MessageLog | null; open: boolean; onClose: () => void; isDemo: boolean }) {
  if (!log) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case "read": return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "failed": return <XCircle className="w-4 h-4 text-red-600" />;
      case "sent": return <Clock className="w-4 h-4 text-gray-600" />;
      case "pending": return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <MessageSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  const renderMediaPreview = () => {
    const ct = log.contentType?.toLowerCase();

    if (!log.mediaId && !log.mediaUrl) return null;

    // Always route through the server proxy so WhatsApp tokens are applied
    // and expired URLs are automatically re-fetched. Fall back to the stored
    // mediaUrl only for locally-uploaded files (paths starting with /uploads/).
    const proxyUrl = log.mediaId
      ? `/api/messages/media-proxy?messageId=${log.id}`
      : log.mediaUrl;

    if (ct === "image") {
      return (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Media Preview</p>
          <img
            src={proxyUrl!}
            alt="Message image"
            className="max-w-full max-h-64 rounded-lg border object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      );
    }

    if (ct === "video") {
      return (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Media Preview</p>
          <video controls className="max-w-full max-h-64 rounded-lg border">
            <source src={proxyUrl!} type={log.mediaMimeType || "video/mp4"} />
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    if (ct === "audio") {
      return (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Media Preview</p>
          <audio controls className="w-full">
            <source src={proxyUrl!} type={log.mediaMimeType || "audio/ogg"} />
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    if (ct === "document") {
      return (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Document</p>
          <div className="flex items-center gap-2 text-sm bg-gray-50 p-3 rounded-lg border">
            <FileText className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <span className="text-gray-700">{log.content || "Document"}</span>
              {log.mediaMimeType && (
                <span className="text-xs text-gray-400 ml-2">({log.mediaMimeType})</span>
              )}
            </div>
            {proxyUrl && (
              <a
                href={`${proxyUrl}&download=true`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 text-xs font-medium"
              >
                Download
              </a>
            )}
          </div>
        </div>
      );
    }

    if (ct === "sticker") {
      return (
        <div className="mt-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Sticker</p>
          <img
            src={proxyUrl!}
            alt="Sticker"
            className="w-32 h-32 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getContentTypeIcon(log.contentType)}
            Message Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500">Contact</p>
              <p className="text-sm font-medium">{isDemo ? maskName(log.contactName || "") || "-" : log.contactName || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Phone</p>
              <p className="text-sm font-mono">{isDemo ? maskPhone(log.phoneNumber) : log.phoneNumber}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Channel</p>
              <p className="text-sm">{log.channelName || log.channelId?.slice(0, 8) || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Direction</p>
              <div className="flex items-center gap-1 text-sm">
                {log.direction === "outbound" ? (
                  <><ArrowUp className="w-3 h-3 text-blue-500" /> Sent</>
                ) : (
                  <><ArrowDown className="w-3 h-3 text-green-500" /> Received</>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Type</p>
              <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getContentTypeBadgeColor(log.contentType)}`}>
                {getContentTypeIcon(log.contentType)}
                {getContentTypeLabel(log.contentType)}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500">Status</p>
              <div className="flex items-center gap-1 text-sm">
                {getStatusIcon(log.status)}
                <span className="capitalize">{log.status}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Content</p>
            <div className="bg-gray-50 p-3 rounded-lg text-sm whitespace-pre-wrap break-words border">
              {isDemo ? maskContent(log.content) : (log.content || "-")}
            </div>
          </div>

          {renderMediaPreview()}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500">Created</p>
              <p>{format(new Date(log.createdAt), "MMM d, yyyy h:mm:ss a")}</p>
            </div>
            {log.deliveredAt && (
              <div>
                <p className="text-xs font-medium text-gray-500">Delivered</p>
                <p>{format(new Date(log.deliveredAt), "MMM d, yyyy h:mm:ss a")}</p>
              </div>
            )}
            {log.readAt && (
              <div>
                <p className="text-xs font-medium text-gray-500">Read</p>
                <p>{format(new Date(log.readAt), "MMM d, yyyy h:mm:ss a")}</p>
              </div>
            )}
          </div>

          {log.whatsappMessageId && (
            <div>
              <p className="text-xs font-medium text-gray-500">WhatsApp Message ID</p>
              <p className="text-xs font-mono text-gray-600 break-all bg-gray-50 p-2 rounded">{log.whatsappMessageId}</p>
            </div>
          )}

          {log.templateName && (
            <div>
              <p className="text-xs font-medium text-gray-500">Template</p>
              <p className="text-sm">{log.templateName}</p>
            </div>
          )}

          {log.campaignName && (
            <div>
              <p className="text-xs font-medium text-gray-500">Campaign Source</p>
              <div className="flex items-center gap-1.5 mt-0.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                <Megaphone className="w-3 h-3" />
                {log.campaignName}
              </div>
            </div>
          )}

          {(log.errorCode || log.errorMessage || log.errorDetails) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs font-medium text-red-600 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Error Details
              </p>
              {log.errorCode && <p className="text-sm text-red-700">Code: {log.errorCode}</p>}
              {log.errorDetails?.title && (
                <p className="text-sm text-red-700 font-medium mt-0.5">{log.errorDetails.title}</p>
              )}
              {log.errorDetails?.message && (
                <p className="text-xs text-red-700 mt-0.5">{log.errorDetails.message}</p>
              )}
              {!log.errorDetails?.message && log.errorMessage && (
                <p className="text-xs text-red-700 mt-0.5">{log.errorMessage}</p>
              )}
              {log.errorDetails?.suggestion && (
                <p className="text-xs text-amber-700 mt-1 italic">{log.errorDetails.suggestion}</p>
              )}
              {log.errorDetails?.errorData && (
                <pre className="mt-1 bg-red-100 p-2 rounded text-xs overflow-x-auto">
                  {JSON.stringify(log.errorDetails.errorData, null, 2)}
                </pre>
              )}
            </div>
          )}

          {log.metadata?.rawWebhook && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Raw WhatsApp Webhook Payload
              </p>
              {log.metadata.originalType && (
                <p className="text-sm text-amber-800 mb-1">Original Type: <span className="font-medium">{log.metadata.originalType}</span></p>
              )}
              {log.metadata.errorCode && (
                <p className="text-sm text-amber-800 mb-1">Error Code: <span className="font-medium">{log.metadata.errorCode}</span></p>
              )}
              {log.metadata.errorTitle && (
                <p className="text-sm text-amber-800 mb-1">Error: <span className="font-medium">{log.metadata.errorTitle}</span></p>
              )}
              <pre className="bg-amber-100 p-2 rounded text-xs overflow-x-auto max-h-60">
                {JSON.stringify(log.metadata.rawWebhook, null, 2)}
              </pre>
            </div>
          )}

          {log.metadata && Object.keys(log.metadata).length > 0 && !log.metadata.rawWebhook && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Metadata</p>
              <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto border max-h-40">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}

          <DebugInfoSection log={log} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function SuperadminMessageLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("7d");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<MessageLog | null>(null);
  const pageSize = 25;

  const { t } = useTranslation();
  const { user } = useAuth();
  const isDemo = isDemoUser(user?.username);

  const { data: channelsData } = useQuery<{ success: boolean; data: Channel[] }>({
    queryKey: ["/api/channels/all"],
    queryFn: async () => {
      const response = await fetch("/api/channels/all");
      if (!response.ok) throw new Error("Failed to fetch channels");
      return response.json();
    },
  });

  const channels = channelsData?.data || [];

  const {
    data: paginatedData,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<PaginatedResponse>({
    queryKey: [
      "/api/messages/logs/superadmin",
      channelFilter,
      statusFilter,
      dateFilter,
      searchQuery,
      currentPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (channelFilter !== "all") params.append("channelId", channelFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFilter !== "all") params.append("dateRange", dateFilter);
      if (searchQuery) params.append("search", searchQuery);
      params.append("page", String(currentPage));
      params.append("pageSize", String(pageSize));

      const response = await fetch(`/api/messages/logs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch logs");
      return response.json();
    },
    refetchInterval: 10000,
  });

  const logs = paginatedData?.data || [];
  const total = paginatedData?.total || 0;
  const totalPages = paginatedData?.totalPages || 1;

  const handleFilterChange = (setter: (val: string) => void) => (val: string) => {
    setter(val);
    setCurrentPage(1);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="w-4 h-4 text-blue-600" />;
      case "read":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "sent":
        return <Clock className="w-4 h-4 text-gray-600" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "failed":
        return "bg-red-100 text-red-800 border-red-300";
      case "delivered":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "read":
        return "bg-green-100 text-green-800 border-green-300";
      case "sent":
      case "pending":
        return "bg-gray-100 text-gray-800 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const startItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, total);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const renderContentCell = (log: MessageLog) => {
    const ct = log.contentType?.toLowerCase();
    const content = isDemo ? maskContent(log.content) : log.content;

    return (
      <div className="max-w-xs">
        <div className="flex items-center gap-1.5">
          {getContentTypeIcon(ct)}
          <span className="truncate text-sm">
            {content?.slice(0, 80) || "-"}
          </span>
        </div>
        {log.campaignName && (
          <div className="flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 w-fit">
            <Megaphone className="w-3 h-3" />
            {log.campaignName}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header
        title={t("navigation.message_logs")}
        subtitle={t("messageLogs.subtitle") !== "messageLogs.subtitle" ? t("messageLogs.subtitle") : "View all messages across all channels"}
      />

      <main className="p-3 sm:p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <MessageSquare className="w-5 h-5" />
                  {t("messageLogs.title")}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t("messageLogs.allMessages") !== "messageLogs.allMessages"
                    ? `${t("messageLogs.allMessages")} (${total} ${t("messageLogs.totalLabel") || "total"})`
                    : `All messages across all channels (${total} total)`}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
                />
                {t("common.refresh") !== "common.refresh" ? t("common.refresh") : "Refresh"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 mb-4 sm:mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t("messageLogs.searchPlaceholder") !== "messageLogs.searchPlaceholder" ? t("messageLogs.searchPlaceholder") : "Search phone, contact or content..."}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 text-sm"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={channelFilter} onValueChange={handleFilterChange(setChannelFilter)}>
                  <SelectTrigger className="w-full sm:w-[220px] text-sm">
                    <SelectValue placeholder="Filter by channel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("messageLogs.allChannels") !== "messageLogs.allChannels" ? t("messageLogs.allChannels") : "All Channels"}</SelectItem>
                    {channels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        {ch.name} ({ch.phoneNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                  <SelectTrigger className="w-full sm:w-[180px] text-sm">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("messageLogs.allStatus") !== "messageLogs.allStatus" ? t("messageLogs.allStatus") : "All Status"}</SelectItem>
                    <SelectItem value="sent">{t("messageLogs.statusSent") !== "messageLogs.statusSent" ? t("messageLogs.statusSent") : "Sent"}</SelectItem>
                    <SelectItem value="delivered">{t("messageLogs.statusDelivered") !== "messageLogs.statusDelivered" ? t("messageLogs.statusDelivered") : "Delivered"}</SelectItem>
                    <SelectItem value="read">{t("messageLogs.statusRead") !== "messageLogs.statusRead" ? t("messageLogs.statusRead") : "Read"}</SelectItem>
                    <SelectItem value="failed">{t("messageLogs.statusFailed") !== "messageLogs.statusFailed" ? t("messageLogs.statusFailed") : "Failed"}</SelectItem>
                    <SelectItem value="pending">{t("messageLogs.statusPending") !== "messageLogs.statusPending" ? t("messageLogs.statusPending") : "Pending"}</SelectItem>
                    <SelectItem value="received">{t("messageLogs.statusReceived") !== "messageLogs.statusReceived" ? t("messageLogs.statusReceived") : "Received"}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateFilter} onValueChange={handleFilterChange(setDateFilter)}>
                  <SelectTrigger className="w-full sm:w-[180px] text-sm">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">{t("messageLogs.last24h") !== "messageLogs.last24h" ? t("messageLogs.last24h") : "Last 24 hours"}</SelectItem>
                    <SelectItem value="7d">{t("messageLogs.last7d") !== "messageLogs.last7d" ? t("messageLogs.last7d") : "Last 7 days"}</SelectItem>
                    <SelectItem value="30d">{t("messageLogs.last30d") !== "messageLogs.last30d" ? t("messageLogs.last30d") : "Last 30 days"}</SelectItem>
                    <SelectItem value="all">{t("messageLogs.allTime") !== "messageLogs.allTime" ? t("messageLogs.allTime") : "All time"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <Loading />
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 mb-2">{t("messageLogs.noLogs") !== "messageLogs.noLogs" ? t("messageLogs.noLogs") : "No message logs found"}</p>
                <p className="text-sm text-gray-400">
                  {searchQuery || statusFilter !== "all" || channelFilter !== "all"
                    ? (t("messageLogs.adjustFilters") !== "messageLogs.adjustFilters" ? t("messageLogs.adjustFilters") : "Try adjusting your filters")
                    : (t("messageLogs.noMessagesSent") !== "messageLogs.noMessagesSent" ? t("messageLogs.noMessagesSent") : "No messages have been sent yet")}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("messageLogs.channel") !== "messageLogs.channel" ? t("messageLogs.channel") : "Channel"}</TableHead>
                        <TableHead>{t("messageLogs.contact") !== "messageLogs.contact" ? t("messageLogs.contact") : "Contact"}</TableHead>
                        <TableHead>{t("messageLogs.phone") !== "messageLogs.phone" ? t("messageLogs.phone") : "Phone"}</TableHead>
                        <TableHead>{t("messageLogs.direction") !== "messageLogs.direction" ? t("messageLogs.direction") : "Direction"}</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>{t("messageLogs.contentHeader") !== "messageLogs.contentHeader" ? t("messageLogs.contentHeader") : "Content"}</TableHead>
                        <TableHead>{t("messageLogs.statusHeader") !== "messageLogs.statusHeader" ? t("messageLogs.statusHeader") : "Status"}</TableHead>
                        <TableHead>{t("messageLogs.date") !== "messageLogs.date" ? t("messageLogs.date") : "Date"}</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow
                          key={log.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedLog(log)}
                        >
                          <TableCell className="text-sm font-medium">
                            {log.channelName || log.channelId?.slice(0, 8) || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {isDemo ? maskName(log.contactName || "") || "-" : log.contactName || "-"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {isDemo ? maskPhone(log.phoneNumber) : log.phoneNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {log.direction === "outbound" ? (
                                <span className="flex items-center gap-1">
                                  <ArrowUp className="w-3 h-3 text-blue-500" /> {t("messageLogs.sent") !== "messageLogs.sent" ? t("messageLogs.sent") : "Sent"}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <ArrowDown className="w-3 h-3 text-green-500" /> {t("messageLogs.received") !== "messageLogs.received" ? t("messageLogs.received") : "Received"}
                                </span>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getContentTypeBadgeColor(log.contentType)}`}>
                              {getContentTypeIcon(log.contentType)}
                              {getContentTypeLabel(log.contentType)}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {renderContentCell(log)}
                          </TableCell>
                          <TableCell>
                            <div
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(log.status)}`}
                            >
                              {getStatusIcon(log.status)}
                              {log.status}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 whitespace-nowrap">
                            {format(new Date(log.createdAt), "MMM d, h:mm a")}
                          </TableCell>
                          <TableCell className="text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
                  <div className="text-gray-500">
                    Showing {startItem}-{endItem} of {total} messages
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {getPageNumbers().map((p, i) =>
                      p === "..." ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
                      ) : (
                        <Button
                          key={p}
                          variant={currentPage === p ? "default" : "outline"}
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setCurrentPage(p as number)}
                        >
                          {p}
                        </Button>
                      )
                    )}

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>

      <MessageDetailDialog
        log={selectedLog}
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        isDemo={isDemo}
      />
    </div>
  );
}
