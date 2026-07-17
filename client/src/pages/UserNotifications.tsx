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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useChannelContext } from "@/contexts/channel-context";
import { useLocation } from "wouter";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  MessageSquare,
  FileCheck,
  FileX,
  BarChart3,
  AlertTriangle,
  LifeBuoy,
  Trash2,
  ExternalLink,
  Loader2,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  channelId?: string | null;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "new_message":
      return <MessageSquare className="w-5 h-5 text-blue-500" />;
    case "template_approved":
      return <FileCheck className="w-5 h-5 text-green-500" />;
    case "template_rejected":
      return <FileX className="w-5 h-5 text-red-500" />;
    case "campaign_completed":
      return <BarChart3 className="w-5 h-5 text-green-500" />;
    case "campaign_failed":
      return <BarChart3 className="w-5 h-5 text-red-500" />;
    case "channel_health_warning":
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case "ticket_reply":
      return <LifeBuoy className="w-5 h-5 text-indigo-500" />;
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
  }
}

function getNotificationBg(type: string) {
  switch (type) {
    case "new_message":
      return "bg-blue-50";
    case "template_approved":
      return "bg-green-50";
    case "template_rejected":
      return "bg-red-50";
    case "campaign_completed":
      return "bg-green-50";
    case "campaign_failed":
      return "bg-red-50";
    case "channel_health_warning":
      return "bg-yellow-50";
    case "ticket_reply":
      return "bg-indigo-50";
    default:
      return "bg-gray-50";
  }
}

function getNotificationLink(type: string): string {
  switch (type) {
    case "new_message":
      return "/inbox";
    case "template_approved":
    case "template_rejected":
      return "/templates";
    case "campaign_completed":
    case "campaign_failed":
      return "/campaigns";
    case "channel_health_warning":
      return "/settings";
    case "ticket_reply":
      return "/support";
    default:
      return "";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "new_message":
      return "New Message";
    case "template_approved":
      return "Template Approved";
    case "template_rejected":
      return "Template Rejected";
    case "campaign_completed":
      return "Campaign Completed";
    case "campaign_failed":
      return "Campaign Failed";
    case "channel_health_warning":
      return "Channel Health";
    case "ticket_reply":
      return "Ticket Reply";
    default:
      return "General";
  }
}

export default function UserNotifications() {
  const queryClient = useQueryClient();
  const { selectedChannel } = useChannelContext();
  const [, navigate] = useLocation();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRead, setFilterRead] = useState<string>("all");

  const channelId = selectedChannel?.id;

  const { data: rawNotifications = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications/users", channelId],
    queryFn: async () => {
      const url = channelId
        ? `/api/notifications/users?channelId=${channelId}`
        : "/api/notifications/users";
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const notifications: NotificationItem[] = rawNotifications.map((n: any) => ({
    id: n.id,
    title: n.notification?.title || n.title || "Notification",
    message: n.notification?.message || n.message || "",
    type: n.notification?.type || n.type || "default",
    isRead: n.isRead,
    createdAt: n.notification?.createdAt || n.sentAt || n.createdAt,
    channelId: n.notification?.channelId || n.channelId || null,
  }));

  const filtered = notifications.filter((n) => {
    if (filterType !== "all" && n.type !== filterType) return false;
    if (filterRead === "unread" && n.isRead) return false;
    if (filterRead === "read" && !n.isRead) return false;
    return true;
  });

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/mark-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
  });

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.isRead) {
      markOneRead.mutate(n.id);
    }
    const link = getNotificationLink(n.type);
    if (link) {
      navigate(link);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const groupedByDate = filtered.reduce<Record<string, NotificationItem[]>>((acc, n) => {
    const date = new Date(n.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = "Yesterday";
    } else {
      key = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }

    if (!acc[key]) acc[key] = [];
    acc[key].push(n);
    return acc;
  }, {});

  return (
    <div className="flex-1 min-h-screen dots-bg">
      <Header
        title="Notifications"
        subtitle={selectedChannel ? `Channel: ${selectedChannel.name}` : "All channels"}
      />
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="new_message">Messages</SelectItem>
                  <SelectItem value="template_approved">Template Approved</SelectItem>
                  <SelectItem value="template_rejected">Template Rejected</SelectItem>
                  <SelectItem value="campaign_completed">Campaign Completed</SelectItem>
                  <SelectItem value="campaign_failed">Campaign Failed</SelectItem>
                  <SelectItem value="channel_health_warning">Channel Health</SelectItem>
                  <SelectItem value="ticket_reply">Ticket Reply</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={filterRead} onValueChange={setFilterRead}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="Read status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-4 h-4 mr-1.5" />
              Mark all as read ({unreadCount})
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Loading notifications...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <BellOff className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-base font-medium text-gray-700 mb-1">No notifications</p>
            <p className="text-sm text-gray-500">
              {filterType !== "all" || filterRead !== "all"
                ? "Try adjusting your filters"
                : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDate).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
                  {dateLabel}
                </h3>
                <Card className="overflow-hidden divide-y divide-gray-100">
                  {items.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-4 p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                        !n.isRead ? "bg-blue-50/40" : ""
                      }`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className={`mt-0.5 flex-shrink-0 w-10 h-10 rounded-full ${getNotificationBg(n.type)} flex items-center justify-center`}>
                        {getNotificationIcon(n.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                                {n.title}
                              </p>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed mb-1.5">
                              {n.message}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">{formatTime(n.createdAt)}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getNotificationBg(n.type)} font-medium text-gray-600`}>
                                {getTypeLabel(n.type)}
                              </span>
                              {getNotificationLink(n.type) && (
                                <span className="flex items-center gap-1 text-xs text-blue-500">
                                  <ExternalLink className="w-3 h-3" />
                                  View
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!n.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                title="Mark as read"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markOneRead.mutate(n.id);
                                }}
                              >
                                <Check className="w-4 h-4 text-gray-400" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification.mutate(n.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
