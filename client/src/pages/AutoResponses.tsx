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

import React, { useState } from "react";
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  Clock,
  TrendingUp,
  Settings,
  Bot,
  Zap,
  Target,
  MoreVertical,
} from "lucide-react";

const AutoResponses = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  const autoResponses = [
    {
      id: 1,
      name: "Welcome Message",
      trigger: "hi, hello, hey",
      type: "greeting",
      status: "active",
      responses: 1247,
      engagement: 89,
      lastUsed: "2 minutes ago",
      message:
        "Hi there! 👋 Welcome to our WhatsApp support. How can I help you today?",
    },
    {
      id: 2,
      name: "Business Hours",
      trigger: "hours, timing, open",
      type: "info",
      status: "active",
      responses: 892,
      engagement: 76,
      lastUsed: "15 minutes ago",
      message:
        "Our business hours are Monday-Friday 9AM-6PM EST. We'll respond to your message during business hours!",
    },
    {
      id: 3,
      name: "Pricing Inquiry",
      trigger: "price, cost, pricing",
      type: "sales",
      status: "paused",
      responses: 634,
      engagement: 92,
      lastUsed: "1 hour ago",
      message:
        "Thanks for your interest in our pricing! Let me connect you with our sales team for detailed information.",
    },
    {
      id: 4,
      name: "Support Request",
      trigger: "help, support, issue",
      type: "support",
      status: "active",
      responses: 1456,
      engagement: 84,
      lastUsed: "5 minutes ago",
      message:
        "I understand you need support. Please describe your issue and I'll route you to the right team member.",
    },
    {
      id: 5,
      name: "Product Demo",
      trigger: "demo, trial, test",
      type: "sales",
      status: "active",
      responses: 423,
      engagement: 88,
      lastUsed: "30 minutes ago",
      message:
        "Interested in a demo? Great! Click here to schedule a personalized product demonstration: [DEMO_LINK]",
    },
  ];

  const stats = [
    {
      label: "Total Responses",
      value: "4,652",
      change: "+12%",
      icon: MessageSquare,
      color: "text-blue-600",
    },
    {
      label: "Active Rules",
      value: "24",
      change: "+3",
      icon: Bot,
      color: "text-green-600",
    },
    {
      label: "Avg Response Time",
      value: "0.3s",
      change: "-0.1s",
      icon: Zap,
      color: "text-yellow-600",
    },
    {
      label: "Engagement Rate",
      value: "87%",
      change: "+5%",
      icon: Target,
      color: "text-purple-600",
    },
  ];

  const filteredResponses = autoResponses.filter((response) => {
    const matchesSearch =
      response.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      response.trigger.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      selectedFilter === "all" ||
      response.type === selectedFilter ||
      response.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "greeting":
        return "bg-blue-100 text-blue-800";
      case "sales":
        return "bg-purple-100 text-purple-800";
      case "support":
        return "bg-orange-100 text-orange-800";
      case "info":
        return "bg-teal-100 text-teal-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const toggleDropdown = (id: number) => {
    setOpenDropdown(openDropdown === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-xl sm:text-2xl font-bold text-gray-900">
                Auto Responses
              </h1>
              <p className="hidden sm:block text-sm text-gray-600 mt-1">
                Manage automated message responses and triggers
              </p>
            </div>

            <button
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 sm:px-4 sm:py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
              aria-label="Create Response"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">
                Create Response
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.label}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                    {stat.value}
                  </p>
                  <p className="text-sm text-green-600 mt-1">{stat.change}</p>
                </div>
                <div className="p-2 sm:p-3 rounded-lg bg-gray-50">
                  <stat.icon
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.color}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search auto responses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="greeting">Greeting</option>
                <option value="sales">Sales</option>
                <option value="support">Support</option>
                <option value="info">Information</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
              <button className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm sm:text-base">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Auto Responses List */}
        <div className="space-y-3 sm:space-y-4">
          {filteredResponses.map((response) => (
            <div
              key={response.id}
              className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {response.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        response.status
                      )}`}
                    >
                      {response.status}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(
                        response.type
                      )}`}
                    >
                      {response.type}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs sm:text-sm text-gray-600 mb-1">
                      <strong>Triggers:</strong> {response.trigger}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-800 bg-gray-50 p-2 sm:p-3 rounded-lg break-words">
                      {response.message}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        {response.responses} responses
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        {response.engagement}% engagement
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="whitespace-nowrap">
                        Last used {response.lastUsed}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Desktop Actions - Hidden on mobile */}
                <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
                  {response.status === "active" ? (
                    <button
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                      title="Pause"
                      aria-label="Pause"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Activate"
                      aria-label="Activate"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                    aria-label="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    title="Copy"
                    aria-label="Copy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    title="Settings"
                    aria-label="Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Dropdown Menu */}
                <div className="relative lg:hidden flex-shrink-0">
                  <button
                    onClick={() => toggleDropdown(response.id)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="More actions"
                    aria-expanded={openDropdown === response.id}
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {openDropdown === response.id && (
                    <>
                      {/* Backdrop */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenDropdown(null)}
                      />

                      {/* Dropdown Menu */}
                      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        {response.status === "active" ? (
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-yellow-600 hover:bg-yellow-50 transition-colors"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <Pause className="w-4 h-4" />
                            Pause
                          </button>
                        ) : (
                          <button
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition-colors"
                            onClick={() => setOpenDropdown(null)}
                          >
                            <Play className="w-4 h-4" />
                            Activate
                          </button>
                        )}
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors"
                          onClick={() => setOpenDropdown(null)}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setOpenDropdown(null)}
                        >
                          <Copy className="w-4 h-4" />
                          Copy
                        </button>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setOpenDropdown(null)}
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </button>
                        <div className="border-t border-gray-200 my-1"></div>
                        <button
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => setOpenDropdown(null)}
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredResponses.length === 0 && (
          <div className="bg-white p-8 sm:p-12 rounded-lg shadow-sm border border-gray-200 text-center">
            <Bot className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
              No auto responses found
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4">
              {searchTerm || selectedFilter !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Create your first auto response to get started"}
            </p>
            <button className="bg-blue-600 text-white px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto transition-colors">
              <Plus className="w-4 h-4" />
              Create Auto Response
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoResponses;
