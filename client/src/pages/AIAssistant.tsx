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
  Bot,
  MessageCircle,
  Settings,
  Play,
  Pause,
  Edit,
  Plus,
  Search,
  Filter,
  MoreVertical,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Brain,
  Lightbulb,
  Target,
} from "lucide-react";

const AIAssistant = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssistant, setSelectedAssistant] = useState<any>(null);

  const assistants = [
    {
      id: 1,
      name: "Customer Support AI",
      description:
        "Handles customer inquiries and support tickets automatically",
      status: "active",
      conversations: 1247,
      accuracy: 94,
      responseTime: "2.3s",
      created: "2024-01-15",
      lastActive: "2 minutes ago",
      category: "Support",
    },
    {
      id: 2,
      name: "Sales Assistant",
      description: "Qualifies leads and provides product information",
      status: "active",
      conversations: 892,
      accuracy: 89,
      responseTime: "1.8s",
      created: "2024-01-12",
      lastActive: "5 minutes ago",
      category: "Sales",
    },
    {
      id: 3,
      name: "Appointment Scheduler",
      description: "Books and manages appointments automatically",
      status: "paused",
      conversations: 456,
      accuracy: 96,
      responseTime: "3.1s",
      created: "2024-01-10",
      lastActive: "1 hour ago",
      category: "Scheduling",
    },
    {
      id: 4,
      name: "FAQ Bot",
      description: "Answers frequently asked questions instantly",
      status: "training",
      conversations: 234,
      accuracy: 87,
      responseTime: "1.5s",
      created: "2024-01-16",
      lastActive: "10 minutes ago",
      category: "Information",
    },
  ];

  const suggestions = [
    {
      title: "Improve Response Accuracy",
      description: "Add more training data to improve AI responses",
      priority: "high",
      impact: "+12% accuracy",
    },
    {
      title: "Optimize Response Time",
      description: "Fine-tune model parameters for faster responses",
      priority: "medium",
      impact: "-0.5s response time",
    },
    {
      title: "Expand Knowledge Base",
      description: "Add new topics and scenarios to training data",
      priority: "low",
      impact: "+15% coverage",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "training":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 sm:py-4">
            {/* Left: brand + title */}
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="rounded-lg bg-purple-100 p-2 sm:p-2.5">
                <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-lg font-bold leading-tight text-gray-900 sm:text-xl lg:text-2xl">
                  AI Assistant
                </h1>
                {/* Hide subtitle on small screens */}
                <p className="hidden text-sm text-gray-600 md:block">
                  Manage your AI-powered chat assistants
                </p>
              </div>
            </div>

            {/* Right: CTA */}
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40"
              aria-label="Create Assistant"
            >
              <Plus className="h-4 w-4" />
              {/* Show text on >= sm; icon-only below */}
              <span className="hidden sm:inline">Create Assistant</span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Active Assistants",
              value: "3",
              change: "+1",
              icon: Bot,
              color: "blue",
            },
            {
              title: "Total Conversations",
              value: "2,829",
              change: "+12%",
              icon: MessageCircle,
              color: "green",
            },
            {
              title: "Average Accuracy",
              value: "91.5%",
              change: "+2.3%",
              icon: Target,
              color: "purple",
            },
            {
              title: "Avg Response Time",
              value: "2.2s",
              change: "-0.3s",
              icon: Clock,
              color: "orange",
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
                  <div className="flex items-center mt-2">
                    <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-sm font-medium text-green-600">
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      vs last week
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Assistants List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    AI Assistants
                  </h2>
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search assistants..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>
                    <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Filter className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-3 sm:space-y-4">
                  {assistants.map((assistant) => (
                    <div
                      key={assistant.id}
                      className="rounded-lg border border-gray-200 p-3 transition-all hover:shadow-md sm:p-4"
                    >
                      {/* Mobile Layout - Buttons at Bottom */}
                      <div className="flex flex-col gap-3">
                        {/* Main Content Section */}
                        <div className="flex gap-3 sm:gap-4">
                          <div className="shrink-0 rounded-lg bg-purple-100 p-2">
                            <Bot className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {/* Title and Badges */}
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <h3 className="text-sm font-semibold text-gray-900 sm:text-base">
                                {assistant.name}
                              </h3>
                              <span
                                className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                                  assistant.status
                                )}`}
                              >
                                {assistant.status}
                              </span>
                              <span className="whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                {assistant.category}
                              </span>
                            </div>
                            <p className="mb-3 text-xs text-gray-600 sm:text-sm">
                              {assistant.description}
                            </p>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-2 text-xs sm:gap-4 sm:text-sm">
                              <div>
                                <span className="block text-gray-500">
                                  Conversations
                                </span>
                                <div className="font-semibold text-gray-900">
                                  {assistant.conversations.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="block text-gray-500">
                                  Accuracy
                                </span>
                                <div className="font-semibold text-gray-900">
                                  {assistant.accuracy}%
                                </div>
                              </div>
                              <div>
                                <span className="block text-gray-500">
                                  Response
                                </span>
                                <div className="font-semibold text-gray-900">
                                  {assistant.responseTime}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons - Fully Responsive */}
                        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3 sm:border-t-0 sm:pt-0">
                          {assistant.status === "active" ? (
                            <button
                              className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-100 sm:gap-0 sm:bg-transparent sm:p-2"
                              aria-label="Pause"
                            >
                              <Pause className="h-4 w-4" />
                              <span className="sm:hidden">Pause</span>
                            </button>
                          ) : (
                            <button
                              className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-600 transition-colors hover:bg-green-100 sm:gap-0 sm:bg-transparent sm:p-2"
                              aria-label="Play"
                            >
                              <Play className="h-4 w-4" />
                              <span className="sm:hidden">Play</span>
                            </button>
                          )}
                          <button
                            className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 sm:gap-0 sm:bg-transparent sm:p-2 sm:text-gray-400"
                            aria-label="Edit"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sm:hidden">Edit</span>
                          </button>
                          <button
                            className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 sm:gap-0 sm:bg-transparent sm:p-2 sm:text-gray-400"
                            aria-label="Settings"
                          >
                            <Settings className="h-4 w-4" />
                            <span className="sm:hidden">Settings</span>
                          </button>
                          <button
                            className="rounded-lg bg-gray-50 p-2 text-gray-600 transition-colors hover:bg-gray-100 sm:bg-transparent sm:text-gray-400"
                            aria-label="More"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Suggestions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  AI Suggestions
                </h3>
              </div>

              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 text-sm">
                        {suggestion.title}
                      </h4>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(
                          suggestion.priority
                        )}`}
                      >
                        {suggestion.priority}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs mb-2">
                      {suggestion.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-green-600 font-medium text-xs">
                        {suggestion.impact}
                      </span>
                      <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">
                        Apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Training Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Brain className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Training Status
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Model Training</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-green-600 font-medium text-sm">
                      Complete
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Data Processing</span>
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-blue-600 font-medium text-sm">
                      In Progress
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Quality Check</span>
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-yellow-600 font-medium text-sm">
                      Pending
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-white/20 backdrop-blur-sm py-2 rounded-lg hover:bg-white/30 transition-colors text-sm">
                  Train New Model
                </button>
                <button className="w-full bg-white/20 backdrop-blur-sm py-2 rounded-lg hover:bg-white/30 transition-colors text-sm">
                  Import Training Data
                </button>
                <button className="w-full bg-white/20 backdrop-blur-sm py-2 rounded-lg hover:bg-white/30 transition-colors text-sm">
                  View Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
