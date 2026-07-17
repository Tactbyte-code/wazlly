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
  Shield,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Smartphone,
  Server,
  Globe,
  MessageSquare,
  Users,
  Calendar,
  Download,
  FileText,
} from "lucide-react";

const HealthMonitor = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("24h");

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const systemStatus = {
    overall: "healthy",
    lastUpdated: "2 minutes ago",
    components: [
      {
        name: "WhatsApp API Connection",
        status: "healthy",
        uptime: "99.98%",
        responseTime: "145ms",
        lastIncident: "5 days ago",
        trend: "stable",
      },
      {
        name: "Message Delivery",
        status: "healthy",
        uptime: "99.95%",
        responseTime: "210ms",
        lastIncident: "2 days ago",
        trend: "improving",
      },
      {
        name: "Template Processing",
        status: "degraded",
        uptime: "98.75%",
        responseTime: "450ms",
        lastIncident: "6 hours ago",
        trend: "degrading",
      },
      {
        name: "Contact Management",
        status: "healthy",
        uptime: "99.99%",
        responseTime: "180ms",
        lastIncident: "10 days ago",
        trend: "stable",
      },
      {
        name: "Analytics Engine",
        status: "healthy",
        uptime: "99.90%",
        responseTime: "320ms",
        lastIncident: "3 days ago",
        trend: "stable",
      },
      {
        name: "Webhook Delivery",
        status: "incident",
        uptime: "95.20%",
        responseTime: "780ms",
        lastIncident: "Ongoing",
        trend: "degrading",
      },
    ],
  };

  const metrics = [
    {
      name: "Message Delivery Rate",
      value: "98.7%",
      change: "+0.5%",
      trend: "up",
      icon: MessageSquare,
      color: "green",
    },
    {
      name: "API Response Time",
      value: "215ms",
      change: "-12ms",
      trend: "up",
      icon: Zap,
      color: "green",
    },
    {
      name: "Error Rate",
      value: "0.8%",
      change: "+0.2%",
      trend: "down",
      icon: AlertCircle,
      color: "red",
    },
    {
      name: "Webhook Success",
      value: "95.2%",
      change: "-3.1%",
      trend: "down",
      icon: Globe,
      color: "red",
    },
  ];

  const incidents = [
    {
      id: 1,
      title: "Webhook Delivery Delays",
      status: "investigating",
      component: "Webhook Delivery",
      started: "2024-01-20 10:15:00",
      lastUpdate: "2024-01-20 14:30:00",
      description:
        "We are investigating delays in webhook delivery. Some webhooks may be delayed by up to 5 minutes.",
      updates: [
        {
          time: "2024-01-20 14:30:00",
          message: "We have identified the issue and are working on a fix.",
        },
        {
          time: "2024-01-20 12:45:00",
          message:
            "The issue is affecting approximately 15% of webhook deliveries.",
        },
        {
          time: "2024-01-20 10:15:00",
          message: "We are investigating reports of webhook delivery delays.",
        },
      ],
    },
    {
      id: 2,
      title: "Template Processing Slowdown",
      status: "identified",
      component: "Template Processing",
      started: "2024-01-20 08:30:00",
      lastUpdate: "2024-01-20 13:45:00",
      description:
        "Template processing is experiencing increased latency. Some templates may take longer to process.",
      updates: [
        {
          time: "2024-01-20 13:45:00",
          message:
            "We have identified the root cause as increased load on our template processing servers.",
        },
        {
          time: "2024-01-20 11:20:00",
          message: "We are seeing intermittent delays in template processing.",
        },
        {
          time: "2024-01-20 08:30:00",
          message: "We are investigating reports of slow template processing.",
        },
      ],
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />;
      case "degraded":
        return (
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
        );
      case "incident":
        return <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800";
      case "degraded":
        return "bg-yellow-100 text-yellow-800";
      case "incident":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />;
      case "degrading":
        return <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />;
      case "stable":
        return <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />;
      default:
        return <Activity className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />;
    }
  };

  const getIncidentStatusColor = (status: string) => {
    switch (status) {
      case "investigating":
        return "bg-yellow-100 text-yellow-800";
      case "identified":
        return "bg-blue-100 text-blue-800";
      case "monitoring":
        return "bg-purple-100 text-purple-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getComponentIcon = (name: string) => {
    if (name.includes("WhatsApp"))
      return <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
    if (name.includes("Message"))
      return <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
    if (name.includes("Template"))
      return <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
    if (name.includes("Contact"))
      return <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
    if (name.includes("Analytics"))
      return <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
    if (name.includes("Webhook"))
      return <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
    return <Server className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-3">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  Health Monitor
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                  Monitor your WhatsApp API and system health
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex-1 sm:flex-none bg-green-500 text-white px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 sm:mr-2 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                <span className="hidden sm:inline">
                  {refreshing ? "Refreshing..." : "Refresh"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* System Status Overview */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <div className="flex items-start space-x-3 sm:space-x-4">
              {systemStatus.overall === "healthy" ? (
                <div className="bg-green-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              ) : systemStatus.overall === "degraded" ? (
                <div className="bg-yellow-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                </div>
              ) : (
                <div className="bg-red-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  {systemStatus.overall === "healthy"
                    ? "All Systems Operational"
                    : systemStatus.overall === "degraded"
                    ? "Partial System Degradation"
                    : "System Incidents Detected"}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600">
                  Last updated: {systemStatus.lastUpdated}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-3">
              <button className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
                <Calendar className="w-4 h-4 mr-2" />
                View History
              </button>
              <button className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>

          {/* Component Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {systemStatus.components.map((component, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    {getComponentIcon(component.name)}
                    <h3 className="font-medium text-sm sm:text-base text-gray-900 truncate">
                      {component.name}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      component.status
                    )} whitespace-nowrap ml-2`}
                  >
                    {component.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500">Uptime:</span>
                    <span className="ml-1 sm:ml-2 font-medium text-gray-900">
                      {component.uptime}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Response:</span>
                    <span className="ml-1 sm:ml-2 font-medium text-gray-900">
                      {component.responseTime}
                    </span>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-gray-500">Last Incident:</span>
                    <span className="ml-1 sm:ml-2 font-medium text-gray-900">
                      {component.lastIncident}
                    </span>
                  </div>
                  <div className="flex items-center col-span-2 sm:col-span-1">
                    <span className="text-gray-500">Trend:</span>
                    <span className="ml-1 sm:ml-2 flex items-center">
                      {getTrendIcon(component.trend)}
                      <span className="ml-1 font-medium text-gray-900">
                        {component.trend}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {metrics.map((metric, index) => (
            <div
              key={index}
              className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200"
            >
              <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                <div
                  className={`p-2 rounded-lg bg-${metric.color}-100 flex-shrink-0`}
                >
                  <metric.icon
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-${metric.color}-600`}
                  />
                </div>
                <h3 className="font-medium text-sm sm:text-base text-gray-900 truncate">
                  {metric.name}
                </h3>
              </div>
              <div className="flex items-end justify-between">
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {metric.value}
                </div>
                <div
                  className={`flex items-center text-xs sm:text-sm ${
                    (metric.trend === "up" && metric.color === "green") ||
                    (metric.trend === "down" && metric.color === "red")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {metric.trend === "up" ? (
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                  )}
                  {metric.change}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Active Incidents */}
        {incidents.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 sm:mb-8">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Active Incidents
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {incidents.map((incident) => (
                <div key={incident.id} className="p-4 sm:p-6">
                  <div className="flex flex-col gap-3 mb-3 sm:mb-4">
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                          {incident.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {incident.component} • Started {incident.started}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium ${getIncidentStatusColor(
                          incident.status
                        )} whitespace-nowrap`}
                      >
                        {incident.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    {incident.description}
                  </p>

                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <h5 className="font-medium text-sm sm:text-base text-gray-900 mb-2">
                      Updates
                    </h5>
                    <div className="space-y-2 sm:space-y-3">
                      {incident.updates.map((update, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-2 sm:space-x-3"
                        >
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm text-gray-700">
                              {update.message}
                            </p>
                            <p className="text-xs text-gray-500">
                              {update.time}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* API Performance */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              API Performance
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {[
                { name: "Send Message", success: 99.8, latency: 145 },
                { name: "Get Templates", success: 99.9, latency: 120 },
                { name: "Get Contacts", success: 100, latency: 180 },
                { name: "Create Campaign", success: 99.5, latency: 210 },
              ].map((api, index) => (
                <div key={index} className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm sm:text-base text-gray-900">
                      {api.name}
                    </h4>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex items-center">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1" />
                        <span className="text-xs sm:text-sm font-medium text-gray-900">
                          {api.success}%
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 mr-1" />
                        <span className="text-xs sm:text-sm font-medium text-gray-900">
                          {api.latency}ms
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div
                      className={`h-1.5 sm:h-2 rounded-full ${
                        api.success > 99.5
                          ? "bg-green-500"
                          : api.success > 98
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${api.success}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Resources */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              System Resources
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {[
                {
                  name: "CPU Usage",
                  value: 35,
                  max: 100,
                  unit: "%",
                  status: "healthy",
                },
                {
                  name: "Memory Usage",
                  value: 62,
                  max: 100,
                  unit: "%",
                  status: "healthy",
                },
                {
                  name: "Database Connections",
                  value: 45,
                  max: 100,
                  unit: "%",
                  status: "healthy",
                },
                {
                  name: "Storage Usage",
                  value: 78,
                  max: 100,
                  unit: "%",
                  status: "degraded",
                },
              ].map((resource, index) => (
                <div key={index} className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm sm:text-base text-gray-900">
                      {resource.name}
                    </h4>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(resource.status)}
                      <span className="text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
                        {resource.value}
                        {resource.unit} / {resource.max}
                        {resource.unit}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                    <div
                      className={`h-1.5 sm:h-2 rounded-full ${
                        resource.value < 50
                          ? "bg-green-500"
                          : resource.value < 80
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${(resource.value / resource.max) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthMonitor;
