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
  Layers,
  Plus,
  Search,
  Filter,
  Users,
  Tag,
  Calendar,
  DollarSign,
  Globe,
  MessageSquare,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Play,
  Eye,
  Settings,
} from "lucide-react";

const Segmentation = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedSegments, setSelectedSegments] = useState<number[]>([]);

  const segments = [
    {
      id: 1,
      name: "Active Customers",
      type: "behavioral",
      description: "Customers who made a purchase in the last 30 days",
      contacts: 1247,
      criteria: [
        { field: "Last Purchase", operator: "less than", value: "30 days ago" },
        { field: "Status", operator: "equals", value: "customer" },
      ],
      lastUpdated: "2 hours ago",
      createdAt: "2024-01-15",
    },
    {
      id: 2,
      name: "High-Value Leads",
      type: "demographic",
      description: "Leads with potential value over $10,000",
      contacts: 892,
      criteria: [
        { field: "Lead Score", operator: "greater than", value: "80" },
        {
          field: "Potential Value",
          operator: "greater than",
          value: "$10,000",
        },
      ],
      lastUpdated: "1 day ago",
      createdAt: "2024-01-12",
    },
    {
      id: 3,
      name: "Cart Abandoners",
      type: "behavioral",
      description: "Users who abandoned their shopping cart",
      contacts: 634,
      criteria: [
        { field: "Cart Status", operator: "equals", value: "abandoned" },
        { field: "Last Activity", operator: "less than", value: "7 days ago" },
      ],
      lastUpdated: "5 hours ago",
      createdAt: "2024-01-10",
    },
    {
      id: 4,
      name: "US Customers",
      type: "geographic",
      description: "All customers located in the United States",
      contacts: 2341,
      criteria: [
        { field: "Country", operator: "equals", value: "United States" },
      ],
      lastUpdated: "3 days ago",
      createdAt: "2024-01-08",
    },
    {
      id: 5,
      name: "Newsletter Subscribers",
      type: "engagement",
      description: "Contacts who subscribed to the newsletter",
      contacts: 3456,
      criteria: [
        { field: "Subscribed", operator: "equals", value: "true" },
        { field: "Subscription Date", operator: "not empty", value: "" },
      ],
      lastUpdated: "1 week ago",
      createdAt: "2024-01-05",
    },
  ];

  const filteredSegments = segments.filter((segment) => {
    const matchesSearch =
      segment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      segment.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || segment.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "behavioral":
        return "bg-blue-100 text-blue-800";
      case "demographic":
        return "bg-purple-100 text-purple-800";
      case "geographic":
        return "bg-green-100 text-green-800";
      case "engagement":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "behavioral":
        return <Calendar className="w-4 h-4" />;
      case "demographic":
        return <Users className="w-4 h-4" />;
      case "geographic":
        return <Globe className="w-4 h-4" />;
      case "engagement":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Tag className="w-4 h-4" />;
    }
  };

  const handleSelectSegment = (id: number) => {
    setSelectedSegments((prev) =>
      prev.includes(id)
        ? prev.filter((segmentId) => segmentId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedSegments.length === filteredSegments.length) {
      setSelectedSegments([]);
    } else {
      setSelectedSegments(filteredSegments.map((s) => s.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 py-3 sm:py-4">
            {/* Left: Icon + titles */}
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
              <div className="bg-indigo-100 p-2 sm:p-2.5 rounded-lg shrink-0">
                <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                  Segmentation
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  Create and manage audience segments
                </p>
              </div>
            </div>

            {/* Right: CTA */}
            <div className="w-full sm:w-auto">
              <button
                className="w-full sm:w-auto inline-flex items-center justify-center bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 text-sm sm:text-base"
                aria-label="Create segment"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="max-[360px]:sr-only">Create Segment</span>
                <span className="max-[360px]:hidden">Create Segment</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            {
              title: "Total Segments",
              value: segments.length.toString(),
              icon: Layers,
              color: "blue",
            },
            {
              title: "Total Contacts",
              value: segments
                .reduce((sum, segment) => sum + segment.contacts, 0)
                .toLocaleString(),
              icon: Users,
              color: "green",
            },
            {
              title: "Behavioral Segments",
              value: segments
                .filter((s) => s.type === "behavioral")
                .length.toString(),
              icon: Calendar,
              color: "purple",
            },
            {
              title: "Geographic Segments",
              value: segments
                .filter((s) => s.type === "geographic")
                .length.toString(),
              icon: Globe,
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
                </div>
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters and Search */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search segments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="behavioral">Behavioral</option>
              <option value="demographic">Demographic</option>
              <option value="geographic">Geographic</option>
              <option value="engagement">Engagement</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedSegments.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <span className="text-blue-800 font-medium">
                {selectedSegments.length} segment
                {selectedSegments.length > 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center space-x-3">
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Export Selected
                </button>
                <button className="text-blue-600 hover:text-blue-700 font-medium">
                  Merge Segments
                </button>
                <button className="text-red-600 hover:text-red-700 font-medium">
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedSegments([])}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Segments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSegments.map((segment) => (
            <div
              key={segment.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <input
                    type="checkbox"
                    checked={selectedSegments.includes(segment.id)}
                    onChange={() => handleSelectSegment(segment.id)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 mt-1"
                  />
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(
                        segment.type
                      )}`}
                    >
                      {getTypeIcon(segment.type)}
                      <span className="ml-1">{segment.type}</span>
                    </span>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {segment.name}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {segment.description}
                </p>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Segment Criteria:
                  </h4>
                  <div className="space-y-2">
                    {segment.criteria.map((criterion, index) => (
                      <div
                        key={index}
                        className="text-sm text-gray-600 flex items-center space-x-2"
                      >
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span>
                          {criterion.field} {criterion.operator}{" "}
                          {criterion.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {segment.contacts.toLocaleString()} contacts
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Updated {segment.lastUpdated}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-sm">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </button>
                  <button className="flex-1 bg-indigo-100 text-indigo-700 py-2 px-3 rounded-lg hover:bg-indigo-200 transition-colors flex items-center justify-center text-sm">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Message
                  </button>
                  <button className="bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredSegments.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layers className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No segments found
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || filterType !== "all"
                ? "Try adjusting your search or filter criteria"
                : "Get started by creating your first audience segment"}
            </p>
            <button className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center mx-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Segment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Segmentation;
