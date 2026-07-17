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

import {
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
  useState,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageNumbers } from "@/components/ui/page-numbers";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreVertical,
  Plus,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Send,
  Headphones,
  Edit,
  Calendar,
  Tag,
  Mail,
  Phone,
  ArrowRight,
  AlertTriangle,
  Delete,
  Trash,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { isDemoUser, maskEmail, maskContent, maskName } from "@/utils/maskUtils";

interface AdminUser {
  id: string;
  username: string;
  role: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  creatorId: string;
  creatorType: "user" | "listener" | "admin";
  creatorName: string;
  creatorEmail: string;
  assignedToId?: string | null;
  assignedToName?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
}

interface Message {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: "user" | "listener" | "admin";
  senderName: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

interface TicketDetailsResponse {
  ticket: Ticket;
  messages: Message[];
}

export default function SupportTicketsNew() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { t } = useTranslation();

  const [createFormData, setCreateFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
  });

  const itemsPerPage = 25;

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const _demo = isDemoUser(user?.username);

  // Fetch tickets
  const buildQueryKey = () => {
    const params: any = { page: currentPage, limit: itemsPerPage };
    if (searchQuery) params.search = searchQuery;
    if (statusFilter !== "all") params.status = statusFilter;
    if (priorityFilter !== "all") params.priority = priorityFilter;
    return ["/api/tickets", params];
  };

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: buildQueryKey(),
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (priorityFilter !== "all") params.append("priority", priorityFilter);

      const res1 = await apiRequest("GET", `/api/tickets?${params.toString()}`);
      return res1.json();
    },
  });

  const tickets: Ticket[] = ticketsData?.tickets || [];
  const totalPages = Math.ceil(
    (ticketsData?.pagination?.total || 0) / itemsPerPage
  );

  // Fetch single ticket with messages
  const { data: ticketDetails, refetch: refetchTicketDetails } = useQuery<any>({
    queryKey: ["/api/tickets", selectedTicketId],
    queryFn: async () => {
      if (!selectedTicketId) return null;
      const resNew = await apiRequest(
        "GET",
        `/api/tickets/${selectedTicketId}`
      );
      return resNew.json();
    },
    enabled: !!selectedTicketId,
  });

  console.log(ticketDetails);

  // Fetch all admins for assignment (admin only)
  const { data: adminsData } = useQuery({
    queryKey: ["/api/admin/admins"],
    queryFn: async () => await apiRequest("GET", "/api/admins?limit=100"),
    enabled: isAdmin,
  });

  const adminUsers: AdminUser[] = adminsData?.admins || [];

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof createFormData) => {
      return await apiRequest("POST", "/api/tickets", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({
        title: "Success",
        description: "Ticket created successfully",
      });
      setShowCreateDialog(false);
      setCreateFormData({ title: "", description: "", priority: "medium" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  // Update ticket mutation (admin only)
  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiRequest("PUT", `/api/tickets/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      refetchTicketDetails();
      toast({
        title: "Success",
        description: "Ticket updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ticket",
        variant: "destructive",
      });
    },
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: async ({
      ticketId,
      message,
      isInternal,
    }: {
      ticketId: string;
      message: string;
      isInternal: boolean;
    }) => {
      return await apiRequest("POST", `/api/tickets/${ticketId}/messages`, {
        message,
        isInternal,
      });
    },
    onSuccess: () => {
      refetchTicketDetails();
      setNewMessage("");
      setIsInternalNote(false);
      toast({
        title: "Success",
        description: "Message sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Delete ticket mutation (admin only)
  const deleteTicketMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tickets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setSelectedTicketId(null);
      toast({
        title: "Success",
        description: "Ticket deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ticket",
        variant: "destructive",
      });
    },
  });

  const handleCreateTicket = () => {
    if (!createFormData.title || !createFormData.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createTicketMutation.mutate(createFormData);
  };

  const handleUpdateStatus = (status: string) => {
    if (!selectedTicketId) return;
    updateTicketMutation.mutate({
      id: selectedTicketId,
      data: { status },
    });
  };

  const handleUpdatePriority = (priority: string) => {
    if (!selectedTicketId) return;
    updateTicketMutation.mutate({
      id: selectedTicketId,
      data: { priority },
    });
  };

  const handleAssignTicket = (value: string) => {
    if (!selectedTicketId) return;

    const selectedAdmin = adminUsers.find((admin) => admin.id === value);

    updateTicketMutation.mutate({
      id: selectedTicketId,
      data: {
        assignedToId: value === "unassigned" ? null : value,
        assignedToName: value === "unassigned" ? null : selectedAdmin?.username,
      },
    });
  };

  const handleSendMessage = () => {
    if (!selectedTicketId || !newMessage.trim()) return;

    addMessageMutation.mutate({
      ticketId: selectedTicketId,
      message: newMessage.trim(),
      isInternal: isInternalNote,
    });
  };

  const handleDeleteTicket = (ticketId: string, ticketTitle: string) => {
    if (confirm(`Are you sure you want to delete ticket "${ticketTitle}"?`)) {
      deleteTicketMutation.mutate(ticketId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertTriangle className="w-4 h-4 text-blue-500" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "resolved":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "closed":
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "urgent":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case "user":
        return "bg-blue-100 text-blue-800";
      case "listener":
        return "bg-green-100 text-green-800";
      case "admin":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getCreatorTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  return (
    <div className="min-h-screen bg-gray-50 dots-bg">
      <Header
        title={t("support_tickets.headTitle")}
        subtitle={
          isAdmin
            ? t("support_tickets.headTitleAdmin")
            : t("support_tickets.headTitleuser")
        }
       action={
    user?.role === "superadmin"
      ? undefined // superadmin ke liye button hide
      : {
          label: t("support.createTicket"),
          onClick: () => setShowCreateDialog(true),
        }
  }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: t("support.stats.totalTickets"),
              value: tickets.length.toString(),
              color: "blue",
            },
            {
              title: t("support.stats.openTickets"),
              value: tickets
                .filter((t) => t.status === "open")
                .length.toString(),
              color: "yellow",
            },
            {
              title: t("support.stats.inProgress"),
              value: tickets
                .filter((t) => t.status === "in_progress")
                .length.toString(),
              color: "green",
            },
            {
              title: t("support.stats.resolved"),
              value: tickets
                .filter((t) => t.status === "resolved")
                .length.toString(),
              color: "green",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <Headphones className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tickets List */}
          <div className="lg:col-span-1">
            {/* Filters and Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-2 mt-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Tickets */}
            {isLoading ? (
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
                <div className="text-gray-500">Loading tickets...</div>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`bg-white p-4 rounded-xl shadow-sm border ${
                      selectedTicketId === ticket.id
                        ? "border-green-500 ring-2 ring-green-200"
                        : "border-gray-200"
                    } hover:border-green-500 transition-all cursor-pointer`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2 flex-wrap">
                        {getStatusIcon(ticket.status)}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                            ticket.status
                          )}`}
                        >
                          {ticket.status.replace("_", " ")}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="font-medium text-gray-900 mb-2">
                      {ticket.title}
                    </h3>

                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-semibold">
                        {_demo ? "*" : ticket.creatorName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-600">
                        {_demo ? maskName(ticket.creatorName) : ticket.creatorName}
                      </span>
                      {isAdmin && (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(
                            ticket.creatorType
                          )}`}
                        >
                          {getCreatorTypeLabel(ticket.creatorType)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Updated{" "}
                        {new Date(ticket.updatedAt).toLocaleTimeString()}
                      </span>
                      {isAdmin && ticket.assignedToName && (
                        <span className="text-green-600 font-medium">
                          → {ticket.assignedToName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {tickets.length === 0 && (
                  <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
                    <Headphones className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No tickets found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {searchQuery ||
                      statusFilter !== "all" ||
                      priorityFilter !== "all"
                        ? "Try adjusting your search or filter criteria"
                        : "All support tickets have been resolved!"}
                    </p>
                  </div>
                )}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <PageNumbers
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Ticket Details */}
          <div className="lg:col-span-2">
            {selectedTicketId && selectedTicket ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Ticket Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedTicket.title}
                      </h2>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          selectedTicket.status
                        )}`}
                      >
                        {selectedTicket.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          refetchTicketDetails();
                          queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
                        }}
                        className="flex items-center space-x-2 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-100 transition"
                        title="Refresh"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 4v5h.582M20 20v-5h-.581M4.582 9A8 8 0 0119.5 12.18M19.5 15a8 8 0 01-14.918 1.818"
                          />
                        </svg>
                        <span className="text-gray-700 font-medium">
                          Refresh
                        </span>
                      </button>
                      {isAdmin && !_demo && (
                        <button
                          onClick={() =>
                            handleDeleteTicket(
                              selectedTicket.id,
                              selectedTicket.title
                            )
                          }
                          className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        >
                          <Trash className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Creator:</span>
                      <div className="flex items-center mt-1">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs font-semibold mr-2">
                          {_demo ? "*" : selectedTicket.creatorName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">
                          {_demo ? maskName(selectedTicket.creatorName) : selectedTicket.creatorName}
                        </span>
                      </div>
                      <div className="mt-1 text-gray-600">
                        {getCreatorTypeLabel(selectedTicket.creatorType)}
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">Contact:</span>
                      <div className="flex items-center mt-1">
                        <Mail className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-gray-900 text-xs">
                          {_demo ? maskEmail(ticketDetails?.ticket?.creatorEmail || selectedTicket.creatorEmail) : (ticketDetails?.ticket?.creatorEmail || selectedTicket.creatorEmail)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500">Details:</span>
                      <div className="flex items-center mt-1">
                        <Calendar className="w-4 h-4 text-gray-400 mr-1" />
                        <span className="text-gray-900">
                          {new Date(
                            selectedTicket.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center mt-1">
                        <Tag className="w-4 h-4 text-gray-400 mr-1" />
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(
                            selectedTicket.priority
                          )}`}
                        >
                          {selectedTicket.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Admin Controls */}
                  {isAdmin && (
                    <div className="flex gap-4 mt-4 flex-wrap">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          Status
                        </label>
                        <select
                          value={
                            ticketDetails?.ticket?.status ||
                            selectedTicket.status
                          }
                          onChange={(e) => handleUpdateStatus(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          Priority
                        </label>
                        <select
                          value={
                            ticketDetails?.ticket?.priority ||
                            selectedTicket.priority
                          }
                          onChange={(e) => handleUpdatePriority(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">
                          Assign To
                        </label>
                        <select
                          value={
                            ticketDetails?.ticket?.assignedToId || "unassigned"
                          }
                          onChange={(e) => handleAssignTicket(e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="unassigned">Unassigned</option>
                          {adminUsers.map((admin) => (
                            <option key={admin.id} value={admin.id}>
                              {admin.username}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  <div className="mt-4">
                    <span className="text-xs text-gray-500">Description:</span>
                    <p className="mt-2 text-sm text-gray-900 whitespace-pre-wrap">
                      {_demo ? maskContent(selectedTicket.description) : selectedTicket.description}
                    </p>
                  </div>
                </div>

                {/* Conversation */}
                <div className="p-6 bg-gray-50 max-h-[300px] overflow-y-auto">
                  <h3 className="font-medium text-gray-900 mb-4">
                    Conversation
                  </h3>
                  <div className="space-y-4">
                    {!ticketDetails?.messages ||
                    ticketDetails.messages.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No messages yet
                      </p>
                    ) : (
                      ticketDetails.messages.map((msg: Message) => (
                        <div
                          key={msg.id}
                          className={`flex ${
                            msg.senderType === user?.role
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-md ${
                              msg.isInternal
                                ? "bg-amber-50 border border-amber-200"
                                : msg.senderType === user?.role
                                ? "bg-green-500 text-white"
                                : "bg-white border border-gray-200"
                            } px-4 py-3 rounded-lg shadow-sm`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-xs font-semibold ${
                                  msg.senderType === user?.role &&
                                  !msg.isInternal
                                    ? "text-green-100"
                                    : "text-gray-700"
                                }`}
                              >
                                {_demo ? maskName(msg.senderName) : msg.senderName}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  msg.senderType === user?.role &&
                                  !msg.isInternal
                                    ? "bg-green-600 text-green-100"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {getCreatorTypeLabel(msg.senderType)}
                              </span>
                              {msg.isInternal && (
                                <span className="text-xs px-2 py-0.5 rounded bg-amber-200 text-amber-800">
                                  Internal
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-sm whitespace-pre-wrap ${
                                msg.senderType === user?.role && !msg.isInternal
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              {_demo ? maskContent(msg.message) : msg.message}
                            </p>
                            <div
                              className={`text-xs mt-1 ${
                                msg.senderType === user?.role && !msg.isInternal
                                  ? "text-green-100"
                                  : "text-gray-500"
                              }`}
                            >
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Reply Box */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex items-start space-x-2">
                    <textarea
                      placeholder="Type your reply..."
                      value={newMessage}
                      disabled={selectedTicket.status !== "open"}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={
                        selectedTicket.status !== "open" ||
                        !newMessage.trim() ||
                        addMessageMutation.isPending
                      }
                      className="bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="internal"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded border-gray-300 text-green-500 focus:ring-green-500"
                        />
                        <label
                          htmlFor="internal"
                          className="text-sm text-gray-600 cursor-pointer"
                        >
                          Internal note
                        </label>
                      </div>
                    )}
                    <div className="flex space-x-2 ml-auto">
                      {selectedTicket.status !== "resolved" && (
                        <button
                          onClick={() => handleUpdateStatus("resolved")}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Resolve Ticket
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
                <Headphones className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("support.empty.noSelection")}
                </h3>
                <p className="text-gray-500 mb-4">
                  {t("support.empty.selectTicket")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Ticket</DialogTitle>
            <DialogDescription>
              Submit a new support ticket. We'll get back to you as soon as
              possible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">
                Title *
              </Label>
              <Input
                id="title"
                value={createFormData.title}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    title: e.target.value,
                  })
                }
                placeholder="Brief description of the issue"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Description *
              </Label>
              <textarea
                id="description"
                value={createFormData.description}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    description: e.target.value,
                  })
                }
                placeholder="Detailed description of the issue"
                rows={5}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <Label htmlFor="priority" className="text-sm font-medium">
                Priority
              </Label>
              <select
                id="priority"
                value={createFormData.priority}
                onChange={(e) =>
                  setCreateFormData({
                    ...createFormData,
                    priority: e.target.value as any,
                  })
                }
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <button
              onClick={() => setShowCreateDialog(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateTicket}
              disabled={createTicketMutation.isPending}
              className="px-4 py-2 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createTicketMutation.isPending ? "Creating..." : "Create Ticket"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
