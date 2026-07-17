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

import { useEffect, useCallback, useRef } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  FileCheck,
  FileX,
  BarChart3,
  AlertTriangle,
  BellOff,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSocket } from "@/contexts/socket-context";
import { useNotificationSound } from "./NotificationSound";
import { useChannelContext } from "@/contexts/channel-context";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  sentAt?: string;
  channelId?: string | null;
  link?: string;
  notification?: {
    title?: string;
    message?: string;
    type?: string;
    createdAt?: string;
    channelId?: string | null;
  };
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
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
    default:
      return <Bell className="w-5 h-5 text-gray-500" />;
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
    default:
      return "/notifications";
  }
}

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const { playSound, unlock } = useNotificationSound();
  const { selectedChannel } = useChannelContext();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const permissionRequested = useRef(false);

  const channelId = selectedChannel?.id;

  useEffect(() => {
    if (permissionRequested.current) return;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      const requestPermission = () => {
        Notification.requestPermission();
        permissionRequested.current = true;
        document.removeEventListener("click", requestPermission);
      };
      document.addEventListener("click", requestPermission);
      return () => document.removeEventListener("click", requestPermission);
    }
  }, []);

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count", channelId],
    queryFn: async () => {
      const url = channelId
        ? `/api/notifications/unread-count?channelId=${channelId}`
        : "/api/notifications/unread-count";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });

  const { data: notificationsData } = useQuery<any[]>({
    queryKey: ["/api/notifications/users", channelId],
    queryFn: async () => {
      const url = channelId
        ? `/api/notifications/users?channelId=${channelId}`
        : "/api/notifications/users";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: !!user?.id,
    staleTime: 20000,
  });

  const unreadCount = unreadCountData?.count ?? 0;

  const notifications: NotificationData[] = (notificationsData || [])
    .slice(0, 20)
    .map((n: any) => ({
      id: n.id,
      title: n.notification?.title || n.title || "Notification",
      message: n.notification?.message || n.message || "",
      type: n.notification?.type || n.type || "default",
      isRead: n.isRead,
      createdAt: n.notification?.createdAt || n.sentAt || n.createdAt,
      channelId: n.notification?.channelId || n.channelId || null,
    }));

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

  useEffect(() => {
    const handleInteraction = () => {
      unlock();
      document.removeEventListener("click", handleInteraction);
    };
    document.addEventListener("click", handleInteraction);
    return () => document.removeEventListener("click", handleInteraction);
  }, [unlock]);

  const handleNewNotification = useCallback(
    (data: any) => {
      if (channelId && data?.channelId && data.channelId !== channelId) {
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["/api/notifications/users", channelId] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count", channelId] });

      const isOnInbox = location.startsWith("/inbox");
      const isNewMessage = data?.type === "new_message";
      const suppressAlerts = isOnInbox && isNewMessage && document.hasFocus();

      if (!suppressAlerts) {
        if (data?.soundEnabled !== false) {
          playSound();
        }

        const notifTitle = data?.title || "New Notification";
        const notifMessage = data?.message || "You have a new notification";
        const notifType = data?.type || "default";

        toast({
          title: notifTitle,
          description: notifMessage,
          duration: 6000,
          action: data?.link ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(getNotificationLink(notifType))}
            >
              View
            </Button>
          ) : undefined,
        });
      }

      if (!document.hasFocus() && typeof Notification !== "undefined" && Notification.permission === "granted") {
        const notifTitle = data?.title || "New Notification";
        const notifMessage = data?.message || "You have a new notification";
        new Notification(notifTitle, {
          body: notifMessage,
          icon: "/logo1924.jpg",
        });
      }
    },
    [playSound, queryClient, channelId, toast, navigate, location]
  );

  useEffect(() => {
    if (!socket) return;

    socket.on("notification:new", handleNewNotification);
    return () => {
      socket.off("notification:new", handleNewNotification);
    };
  }, [socket, handleNewNotification]);

  const handleNotificationClick = (n: NotificationData) => {
    if (!n.isRead) {
      markOneRead.mutate(n.id);
    }
    const link = getNotificationLink(n.type);
    navigate(link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[400px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-blue-600 hover:text-blue-700"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all as read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <BellOff className="w-10 h-10 mb-2" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                    !n.isRead ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className="mt-1 flex-shrink-0 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm leading-snug ${
                          !n.isRead ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                        }`}
                      >
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <p className="text-xs text-gray-400">
                        {formatTimeAgo(n.createdAt)}
                      </p>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </div>
                  </div>
                  {!n.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0 mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        markOneRead.mutate(n.id);
                      }}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="border-t px-4 py-2.5 text-center">
            <button
              onClick={() => navigate("/user-notifications")}
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
            >
              View all notifications
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
