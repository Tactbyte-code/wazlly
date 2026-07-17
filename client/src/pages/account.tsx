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
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  Search,
} from "lucide-react";
import { format } from "date-fns";
import { Loading } from "@/components/ui/loading";
import { AccountSettings } from "@/components/settings/AccountSettings";

interface MessageLog {
  id: string;
  channelId: string;
  phoneNumber: string;
  contactName?: string;
  messageType: string;
  content: string;
  templateName?: string;
  status: "sent" | "delivered" | "read" | "failed" | "pending";
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: {
    code: string;
    title: string;
    message?: string;
    errorData?: any;
  };
  deliveredAt?: string;
  readAt?: string;
  whatsappMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export default function Account() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("7d");

  // Get active channel
  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  // Fetch message logs
  const {
    data: logs = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery<MessageLog[]>({
    queryKey: [
      "/api/messages/logs",
      activeChannel?.id,
      statusFilter,
      dateFilter,
      searchQuery,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeChannel?.id) params.append("channelId", activeChannel.id);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (dateFilter !== "all") params.append("dateRange", dateFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await fetch(`/api/messages/logs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch logs");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!activeChannel,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

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

  const getStatusColor = (status: string, messageType: string) => {
    // For received messages (inbound), use black/white
    if (messageType === "received") {
      return "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 border-gray-300";
    }

    // For sent messages (outbound), use status-specific colors
    switch (status) {
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300";
      case "delivered":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300";
      case "read":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300";
      case "sent":
      case "pending":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border-gray-300";
    }
  };

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header
        title="Account"
        subtitle="Track all sent messages and their delivery status"
      />

      <main className="p-6">
        <AccountSettings />
      </main>
    </div>
  );
}
