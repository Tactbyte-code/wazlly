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
  FileText,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  RefreshCw,
  Share2,
  Mail,
  Smartphone,
  Zap,
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Edit,
} from "lucide-react";

const Reports = () => {
  const [dateRange, setDateRange] = useState("7d");
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedReport, setExpandedReport] = useState<number | null>(null);

  const reports = [
    {
      id: 1,
      name: "Monthly Performance Report",
      description: "Complete overview of messaging performance and engagement",
      type: "scheduled",
      frequency: "Monthly",
      lastGenerated: "2024-01-15",
      nextGeneration: "2024-02-15",
      recipients: ["marketing@example.com", "analytics@example.com"],
      metrics: [
        "Delivery Rate",
        "Open Rate",
        "Response Rate",
        "Conversion Rate",
      ],
    },
    {
      id: 2,
      name: "Campaign Effectiveness",
      description: "Analysis of campaign performance and ROI",
      type: "scheduled",
      frequency: "Weekly",
      lastGenerated: "2024-01-18",
      nextGeneration: "2024-01-25",
      recipients: ["marketing@example.com"],
      metrics: [
        "Engagement Rate",
        "Click-through Rate",
        "Conversion Rate",
        "ROI",
      ],
    },
    {
      id: 3,
      name: "Contact Growth Analysis",
      description: "Trends in contact list growth and engagement",
      type: "on-demand",
      frequency: "On-demand",
      lastGenerated: "2024-01-20",
      nextGeneration: "N/A",
      recipients: [],
      metrics: [
        "List Growth Rate",
        "Opt-out Rate",
        "Engagement by Segment",
        "Acquisition Source",
      ],
    },
    {
      id: 4,
      name: "Delivery Performance",
      description: "Detailed analysis of message delivery and timing",
      type: "scheduled",
      frequency: "Daily",
      lastGenerated: "2024-01-20",
      nextGeneration: "2024-01-21",
      recipients: ["operations@example.com", "tech@example.com"],
      metrics: [
        "Delivery Rate",
        "Delivery Time",
        "Failure Rate",
        "Retry Success",
      ],
    },
  ];

  const metrics = {
    overview: [
      {
        name: "Total Messages",
        value: "12,847",
        change: "+12%",
        icon: MessageSquare,
        color: "blue",
      },
      {
        name: "Delivery Rate",
        value: "98.7%",
        change: "+0.5%",
        icon: TrendingUp,
        color: "green",
      },
      {
        name: "Read Rate",
        value: "76.2%",
        change: "+3.1%",
        icon: Eye,
        color: "purple",
      },
      {
        name: "Response Rate",
        value: "24.5%",
        change: "+2.8%",
        icon: MessageSquare,
        color: "orange",
      },
    ],
    campaigns: [
      {
        name: "Active Campaigns",
        value: "24",
        change: "+3",
        icon: BarChart3,
        color: "blue",
      },
      {
        name: "Avg. Open Rate",
        value: "82.4%",
        change: "+5.2%",
        icon: Eye,
        color: "green",
      },
      {
        name: "Avg. Click Rate",
        value: "34.7%",
        change: "+1.9%",
        icon: TrendingUp,
        color: "purple",
      },
      {
        name: "Conversion Rate",
        value: "12.3%",
        change: "+0.8%",
        icon: Zap,
        color: "orange",
      },
    ],
    contacts: [
      {
        name: "Total Contacts",
        value: "8,432",
        change: "+342",
        icon: Users,
        color: "blue",
      },
      {
        name: "Active Contacts",
        value: "6,215",
        change: "+215",
        icon: Users,
        color: "green",
      },
      {
        name: "Growth Rate",
        value: "4.2%",
        change: "+0.3%",
        icon: TrendingUp,
        color: "purple",
      },
      {
        name: "Opt-out Rate",
        value: "0.7%",
        change: "-0.2%",
        icon: Users,
        color: "orange",
      },
    ],
    delivery: [
      {
        name: "Delivery Rate",
        value: "98.7%",
        change: "+0.5%",
        icon: TrendingUp,
        color: "blue",
      },
      {
        name: "Avg. Delivery Time",
        value: "1.2s",
        change: "-0.3s",
        icon: Clock,
        color: "green",
      },
      {
        name: "Failure Rate",
        value: "1.3%",
        change: "-0.5%",
        icon: TrendingUp,
        color: "purple",
      },
      {
        name: "Retry Success",
        value: "87.5%",
        change: "+2.1%",
        icon: RefreshCw,
        color: "orange",
      },
    ],
  };

  const toggleReportExpand = (id: number) => {
    setExpandedReport(expandedReport === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-purple-100 p-2 rounded-lg flex-shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  Reports
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Analyze your WhatsApp marketing performance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="custom">Custom Range</option>
              </select>
              <button className="flex-1 sm:flex-none bg-purple-500 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center">
                <Download className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Export Data</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="flex space-x-4 sm:space-x-8 px-4 sm:px-6 min-w-max">
              {[
                { id: "overview", name: "Overview", icon: BarChart3 },
                { id: "campaigns", name: "Campaigns", icon: MessageSquare },
                { id: "contacts", name: "Contacts", icon: Users },
                { id: "delivery", name: "Delivery", icon: TrendingUp },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-3 sm:py-4 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Metrics */}
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {metrics[activeTab as keyof typeof metrics].map(
                (metric, index) => (
                  <div
                    key={index}
                    className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">
                          {metric.name}
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 sm:mt-2">
                          {metric.value}
                        </p>
                        <div className="flex items-center mt-1 sm:mt-2">
                          <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
                          <span className="text-xs sm:text-sm font-medium text-green-600">
                            {metric.change}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-500 ml-1 hidden sm:inline">
                            vs last period
                          </span>
                        </div>
                      </div>
                      <div
                        className={`p-2 sm:p-3 rounded-lg bg-${metric.color}-100 flex-shrink-0 ml-2`}
                      >
                        <metric.icon
                          className={`w-5 h-5 sm:w-6 sm:h-6 text-${metric.color}-600`}
                        />
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Message Volume Chart */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Message Volume
              </h3>
              <select className="px-3 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm">
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div className="h-48 sm:h-56 lg:h-64 flex items-end space-x-1 sm:space-x-2">
              {[40, 65, 50, 80, 120, 90, 70].map((height, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-purple-100 rounded-t"
                    style={{ height: `${height}px` }}
                  ></div>
                  <span className="text-[10px] sm:text-xs text-gray-500 mt-1 sm:mt-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Engagement Metrics
              </h3>
              <select className="px-3 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm">
                <option>All Campaigns</option>
                <option>Welcome Series</option>
                <option>Promotional</option>
              </select>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {[
                { name: "Delivery Rate", value: 98.7, color: "blue" },
                { name: "Open Rate", value: 76.2, color: "green" },
                { name: "Response Rate", value: 24.5, color: "purple" },
                { name: "Click Rate", value: 12.3, color: "orange" },
              ].map((metric, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs sm:text-sm font-medium text-gray-700">
                      {metric.name}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-gray-900">
                      {metric.value}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div
                      className={`bg-${metric.color}-500 h-1.5 sm:h-2 rounded-full`}
                      style={{ width: `${metric.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Saved Reports */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 sm:mb-8">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
              Saved Reports
            </h3>
            <button className="w-full sm:w-auto bg-purple-500 text-white px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center">
              <Plus className="w-4 h-4 mr-2" />
              Create Report
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {reports.map((report) => (
              <div key={report.id} className="p-4 sm:p-6">
                <div className="flex flex-col gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                        {report.name}
                      </h4>
                      <span
                        className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.type === "scheduled"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {report.type}
                      </span>
                    </div>
                    <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4">
                      {report.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                      {report.metrics.map((metric, index) => (
                        <span
                          key={index}
                          className="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs"
                        >
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button className="flex-1 sm:flex-none px-3 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center">
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Download
                    </button>
                    <button className="flex-1 sm:flex-none px-3 py-1.5 sm:py-1 border border-gray-300 rounded text-xs sm:text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center">
                      <Share2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Share
                    </button>
                    <button
                      onClick={() => toggleReportExpand(report.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-300 rounded"
                    >
                      {expandedReport === report.id ? (
                        <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {expandedReport === report.id && (
                  <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <div>
                        <h5 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">
                          Schedule
                        </h5>
                        <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Frequency:</span>
                            <span className="text-gray-900">
                              {report.frequency}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Last Generated:
                            </span>
                            <span className="text-gray-900">
                              {report.lastGenerated}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Next Generation:
                            </span>
                            <span className="text-gray-900">
                              {report.nextGeneration}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h5 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">
                          Recipients
                        </h5>
                        {report.recipients.length > 0 ? (
                          <div className="space-y-1.5 sm:space-y-2">
                            {report.recipients.map((recipient, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-2"
                              >
                                <Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                                <span className="text-xs sm:text-sm text-gray-600 truncate">
                                  {recipient}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-500">
                            No recipients configured
                          </p>
                        )}
                      </div>

                      <div className="sm:col-span-2 lg:col-span-1">
                        <h5 className="text-xs sm:text-sm font-medium text-gray-900 mb-2">
                          Actions
                        </h5>
                        <div className="space-y-2">
                          <button className="w-full px-3 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors text-xs sm:text-sm flex items-center justify-center">
                            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            Generate Now
                          </button>
                          <button className="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-xs sm:text-sm flex items-center justify-center">
                            <Edit className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                            Edit Report
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Channel Comparison - Desktop Table */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">
            Channel Comparison
          </h3>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Open Rate
                  </th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Response Rate
                  </th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conversion Rate
                  </th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost per Message
                  </th>
                  <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ROI
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[
                  {
                    channel: "WhatsApp",
                    icon: Smartphone,
                    color: "green",
                    openRate: 98.7,
                    responseRate: 45.2,
                    conversionRate: 12.3,
                    costPerMessage: 0.03,
                    roi: 450,
                  },
                  {
                    channel: "Email",
                    icon: Mail,
                    color: "blue",
                    openRate: 21.5,
                    responseRate: 3.2,
                    conversionRate: 2.1,
                    costPerMessage: 0.01,
                    roi: 120,
                  },
                  {
                    channel: "SMS",
                    icon: Smartphone,
                    color: "purple",
                    openRate: 94.2,
                    responseRate: 7.8,
                    conversionRate: 4.5,
                    costPerMessage: 0.05,
                    roi: 180,
                  },
                ].map((channel, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`p-2 rounded-lg bg-${channel.color}-100`}
                        >
                          <channel.icon
                            className={`w-5 h-5 text-${channel.color}-600`}
                          />
                        </div>
                        <span className="font-medium text-gray-900">
                          {channel.channel}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-12 xl:w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${channel.openRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {channel.openRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-12 xl:w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${channel.responseRate * 2}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {channel.responseRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-12 xl:w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-purple-500 h-2 rounded-full"
                            style={{ width: `${channel.conversionRate * 5}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {channel.conversionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${channel.costPerMessage.toFixed(2)}
                    </td>
                    <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-12 xl:w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-orange-500 h-2 rounded-full"
                            style={{ width: `${(channel.roi / 500) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {channel.roi}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {[
              {
                channel: "WhatsApp",
                icon: Smartphone,
                color: "green",
                openRate: 98.7,
                responseRate: 45.2,
                conversionRate: 12.3,
                costPerMessage: 0.03,
                roi: 450,
              },
              {
                channel: "Email",
                icon: Mail,
                color: "blue",
                openRate: 21.5,
                responseRate: 3.2,
                conversionRate: 2.1,
                costPerMessage: 0.01,
                roi: 120,
              },
              {
                channel: "SMS",
                icon: Smartphone,
                color: "purple",
                openRate: 94.2,
                responseRate: 7.8,
                conversionRate: 4.5,
                costPerMessage: 0.05,
                roi: 180,
              },
            ].map((channel, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-2 rounded-lg bg-${channel.color}-100`}>
                    <channel.icon
                      className={`w-5 h-5 text-${channel.color}-600`}
                    />
                  </div>
                  <span className="font-semibold text-gray-900">
                    {channel.channel}
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    { label: "Open Rate", value: channel.openRate },
                    { label: "Response Rate", value: channel.responseRate },
                    { label: "Conversion Rate", value: channel.conversionRate },
                    {
                      label: "Cost/Message",
                      value: `$${channel.costPerMessage.toFixed(2)}`,
                      isPrice: true,
                    },
                    { label: "ROI", value: channel.roi },
                  ].map((metric, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs sm:text-sm text-gray-600">
                          {metric.label}
                        </span>
                        <span className="text-xs sm:text-sm font-medium text-gray-900">
                          {metric.isPrice ? metric.value : `${metric.value}%`}
                        </span>
                      </div>
                      {!metric.isPrice && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-purple-500 h-1.5 rounded-full"
                            style={{
                              width: `${
                                metric.value > 100 ? 100 : metric.value
                              }%`,
                            }}
                          ></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
