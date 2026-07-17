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
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Workflow,
  Clock,
  Users,
  MessageCircle,
  Zap,
  ArrowRight,
  Settings,
  BarChart3,
} from "lucide-react";

const Workflows = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedWorkflows, setSelectedWorkflows] = useState<number[]>([]);

  const workflows = [
    {
      id: 1,
      name: "Welcome Series",
      description: "Automated welcome sequence for new subscribers",
      status: "active",
      trigger: "New Contact",
      steps: 5,
      contacts: 1247,
      completionRate: 85,
      created: "2024-01-15",
      lastRun: "2 hours ago",
    },
    {
      id: 2,
      name: "Cart Abandonment",
      description: "Recover abandoned shopping carts with follow-up messages",
      status: "active",
      trigger: "Cart Abandoned",
      steps: 3,
      contacts: 892,
      completionRate: 72,
      created: "2024-01-12",
      lastRun: "1 hour ago",
    },
    {
      id: 3,
      name: "Birthday Campaign",
      description: "Send birthday wishes and special offers",
      status: "paused",
      trigger: "Birthday Date",
      steps: 2,
      contacts: 234,
      completionRate: 95,
      created: "2024-01-10",
      lastRun: "1 day ago",
    },
    {
      id: 4,
      name: "Lead Nurturing",
      description: "Nurture leads with educational content",
      status: "draft",
      trigger: "Lead Score",
      steps: 7,
      contacts: 0,
      completionRate: 0,
      created: "2024-01-16",
      lastRun: "Never",
    },
  ];

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesSearch = workflow.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesFilter =
      filterStatus === "all" || workflow.status === filterStatus;
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

  const handleSelectWorkflow = (id: number) => {
    setSelectedWorkflows((prev) =>
      prev.includes(id)
        ? prev.filter((workflowId) => workflowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedWorkflows.length === filteredWorkflows.length) {
      setSelectedWorkflows([]);
    } else {
      setSelectedWorkflows(filteredWorkflows.map((w) => w.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:gap-0 sm:flex-row sm:justify-between sm:items-center py-3 sm:py-0">
            {/* Left: brand + copy */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="bg-purple-100 p-2 rounded-lg shrink-0">
                <Workflow className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>

              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                  Workflows
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Automate your WhatsApp marketing
                </p>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="sm:ml-6">
              <button
                type="button"
                aria-label="Create Workflow"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                     bg-green-500 text-white px-4 py-2 rounded-lg
                     hover:bg-green-600 transition-colors
                     text-sm sm:text-base"
              >
                <Plus className="w-4 h-4" />
                <span>Create Workflow</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedWorkflows.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedWorkflows.length} workflow
                {selectedWorkflows.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center space-x-3">
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Activate Selected
                </button>
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Pause Selected
                </button>
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedWorkflows([])}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Workflows Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <input
                    type="checkbox"
                    checked={selectedWorkflows.includes(workflow.id)}
                    onChange={() => handleSelectWorkflow(workflow.id)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                  />
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        workflow.status
                      )}`}
                    >
                      {workflow.status}
                    </span>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {workflow.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {workflow.description}
                  </p>

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Zap className="w-4 h-4 mr-1" />
                      <span>{workflow.trigger}</span>
                    </div>
                    <div className="flex items-center">
                      <Settings className="w-4 h-4 mr-1" />
                      <span>{workflow.steps} steps</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Contacts Enrolled
                    </span>
                    <span className="font-semibold text-gray-900">
                      {workflow.contacts.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Completion Rate
                    </span>
                    <span className="font-semibold text-gray-900">
                      {workflow.completionRate}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${workflow.completionRate}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  <div>Created: {workflow.created}</div>
                  <div>Last run: {workflow.lastRun}</div>
                </div>

                <div className="flex space-x-2">
                  {workflow.status === "active" ? (
                    <button className="flex-1 bg-orange-100 text-orange-700 py-2 px-3 rounded-lg hover:bg-orange-200 transition-colors flex items-center justify-center text-sm">
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </button>
                  ) : workflow.status === "paused" ? (
                    <button className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded-lg hover:bg-green-200 transition-colors flex items-center justify-center text-sm">
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </button>
                  ) : (
                    <button className="flex-1 bg-green-100 text-green-700 py-2 px-3 rounded-lg hover:bg-green-200 transition-colors flex items-center justify-center text-sm">
                      <Play className="w-4 h-4 mr-1" />
                      Activate
                    </button>
                  )}

                  <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm">
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </button>

                  <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredWorkflows.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Workflow className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No workflows found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterStatus !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Get started by creating your first automated workflow"}
            </p>
            <button className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center mx-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Workflow
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Workflows;
