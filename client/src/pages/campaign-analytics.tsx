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

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import Header from "@/components/layout/header";
import { Loading } from "@/components/ui/loading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageChart } from "@/components/charts/message-chart";
import { 
  ArrowLeft,
  Eye, 
  XCircle,
  Download,
  CheckCircle,
  Send,
  AlertCircle,
  Users
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

// Simple fallback chart component
const SimpleDailyChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No chart data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        Daily Performance Overview
      </div>
      {data.map((item, index) => (
        <div key={index} className="border rounded-lg p-4 bg-white">
          <div className="flex justify-between items-center mb-3">
            <span className="font-medium text-gray-900">{item.date}</span>
            <div className="text-sm text-gray-500">
              Total: {(item.sent || 0) + (item.delivered || 0) + (item.read || 0) + (item.failed || 0)}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="text-blue-600 font-bold text-lg">{item.sent || 0}</div>
              <div className="text-gray-600 text-xs">Sent</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-green-600 font-bold text-lg">{item.delivered || 0}</div>
              <div className="text-gray-600 text-xs">Delivered</div>
            </div>
            <div className="text-center p-2 bg-orange-50 rounded">
              <div className="text-orange-600 font-bold text-lg">{item.read || 0}</div>
              <div className="text-gray-600 text-xs">Read</div>
            </div>
            <div className="text-center p-2 bg-red-50 rounded">
              <div className="text-red-600 font-bold text-lg">{item.failed || 0}</div>
              <div className="text-gray-600 text-xs">Failed</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Safe chart wrapper component
const SafeMessageChart = ({ data }: { data: any[] }) => {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    setHasError(false);
  }, [data]);

  if (hasError) {
    return <SimpleDailyChart data={data} />;
  }

  try {
    // Validate data before passing to chart
    if (!data || !Array.isArray(data) || data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No chart data available</p>
          </div>
        </div>
      );
    }

    // Check if we have valid data for the chart
    const hasValidData = data.some(item => 
      item && 
      typeof item === 'object' && 
      item.date && 
      item.date !== "Unknown" &&
      (item.sent > 0 || item.delivered > 0 || item.read > 0 || item.failed > 0)
    );

    if (!hasValidData) {
      return <SimpleDailyChart data={data} />;
    }

    // Try to render the MessageChart with error handling
    return (
      <div>
        <MessageChart data={data} />
      </div>
    );
  } catch (error) {
    console.error("Chart error:", error);
    setHasError(true);
    return <SimpleDailyChart data={data} />;
  }
};

export default function CampaignAnalytics() {
  const { user } = useAuth();
  const { campaignId } = useParams<{ campaignId: string }>();
  const [exportLoading, setExportLoading] = useState(false);

  const { data: campaignData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ["campaign-analytics", campaignId],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/campaigns/${campaignId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch campaign analytics: ${response.status} ${response.statusText}`);
      }
      return response.json();
    },
    enabled: !!campaignId,
    refetchInterval: 5000,
  });

  const error = queryError?.message || null;

  const campaign = campaignData?.campaign || {};
  const dailyStats = Array.isArray(campaignData?.dailyStats) ? campaignData.dailyStats : [];
  const recipientStats = Array.isArray(campaignData?.recipientStats) ? campaignData.recipientStats : [];
  const errorAnalysis = Array.isArray(campaignData?.errorAnalysis) ? campaignData.errorAnalysis : [];

  const safeNumber = (value: any): number => {
    const num = Number(value);
    return isNaN(num) || num < 0 ? 0 : num;
  };

  const sentCount = safeNumber(campaign.sentCount);
  const deliveredCount = safeNumber(campaign.deliveredCount);
  const recipientCount = safeNumber(campaign.recipientCount);
  const readCount = safeNumber(campaign.readCount);
  const repliedCount = safeNumber(campaign.repliedCount);
  const failedCount = safeNumber(campaign.failedCount);

  const deliveryRate = sentCount > 0 ? Math.round((deliveredCount / sentCount) * 100) : 0;
  const readRate = deliveredCount > 0 ? (readCount / deliveredCount) * 100 : 0;
  const replyRate = readCount > 0 ? (repliedCount / readCount) * 100 : 0;
  const failureRate = recipientCount > 0 
  ? Math.min(Math.round((failedCount / recipientCount) * 100), 100) 
  : 0;


  // Process chart data with robust error handling
  const chartData = dailyStats.map((stat: any, index: number) => {
    // Helper function to safely convert to number
    const toNumber = (value: any): number => {
      if (value === null || value === undefined) return 0;
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    };

    // Helper function to safely format date
    const formatDate = (dateValue: any): string => {
      try {
        if (!dateValue) return `Day ${index + 1}`;
        
        let date: Date;
        if (typeof dateValue === 'string') {
          // Handle date strings like "2025-09-08"
          if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            date = new Date(dateValue + 'T00:00:00.000Z');
          } else {
            date = new Date(dateValue);
          }
        } else if (dateValue instanceof Date) {
          date = dateValue;
        } else {
          return `Day ${index + 1}`;
        }
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
          console.warn("Invalid date:", dateValue);
          return `Day ${index + 1}`;
        }
        
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      } catch (error) {
        console.error("Error formatting date:", error, dateValue);
        return `Day ${index + 1}`;
      }
    };

    // Ensure we have a valid stat object
    if (!stat || typeof stat !== 'object') {
      console.warn("Invalid stat object:", stat);
      return {
        date: `Day ${index + 1}`,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      };
    }

    const processedStat = {
      date: formatDate(stat.date),
      sent: toNumber(stat.sent),
      delivered: toNumber(stat.delivered),
      read: toNumber(stat.read),
      failed: toNumber(stat.failed),
    };
    
    return processedStat;
  });

  // Handle export
  const handleExport = async (format: "pdf" | "excel" | "csv") => {
    if (!campaignId) {
      toast({
        title: "Export failed",
        description: "Campaign ID is missing",
        variant: "destructive",
      });
      return;
    }

    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        format,
        type: "campaigns",
        campaignId: campaignId,
      });

      const response = await fetch(`/api/analytics/export?${params}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const contentType = response.headers.get("content-type") || "";
      let ext = "pdf";
      if (format === "excel") ext = "xlsx";
      else if (format === "csv") ext = contentType.includes("zip") ? "zip" : "csv";

      const safeName = (campaign?.name || "unnamed")
        .replace(/[^a-z0-9_\-]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "unnamed";

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign-${safeName}-${
        new Date().toISOString().split("T")[0]
      }.${ext}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: `Campaign report exported as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "Failed to export campaign report",
        variant: "destructive",
      });
    } finally {
      setExportLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 dots-bg">
        <Header title="Campaign Analytics" subtitle="Loading..." />
        <div className="p-6">
          <Loading size="lg" text="Loading campaign analytics..." />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 dots-bg">
        <Header title="Campaign Analytics" subtitle="Error loading campaign" />
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Error Loading Campaign
              </h3>
              <p className="text-gray-500 mb-4">{error}</p>
              <div className="flex justify-center space-x-2">
                <Link href="/analytics">
                  <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Analytics
                  </Button>
                </Link>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="default"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Campaign not found state
  if (!campaign?.id) {
    return (
      <div className="flex-1 dots-bg">
        <Header title="Campaign Analytics" subtitle="Campaign not found" />
        <div className="p-6">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Campaign Not Found
              </h3>
              <p className="text-gray-500 mb-4">
                The requested campaign could not be found or you don't have access to it.
              </p>
              <Link href="/analytics">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header
        title={`Campaign: ${campaign.name || 'Unnamed Campaign'}`}
        subtitle="Detailed campaign performance analytics"
      />

      <main className="p-6 space-y-6">
        {/* Navigation and Actions */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Link href="/analytics">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Analytics
                </Button>
              </Link>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("pdf")}
                  disabled={exportLoading || user?.username === "demoadmin" || user?.username === "demouser"}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exportLoading ? "Exporting..." : "Export PDF"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("excel")}
                  disabled={exportLoading || user?.username === "demoadmin" || user?.username === "demouser"}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exportLoading ? "Exporting..." : "Export Excel"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport("csv")}
                  disabled={exportLoading || user?.username === "demoadmin" || user?.username === "demouser"}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exportLoading ? "Exporting..." : "Export CSV"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Info */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Type</p>
                <p className="font-medium">{campaign.type || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full
                  ${
                    campaign.status === "active"
                      ? "bg-green-100 text-green-800"
                      : campaign.status === "completed"
                      ? "bg-blue-100 text-blue-800"
                      : campaign.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {campaign.status || 'Unknown'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600">API Type</p>
                <p className="font-medium">{campaign.apiType || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Campaign Type</p>
                <p className="font-medium capitalize">{campaign.campaignType || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Template</p>
                <p className="font-medium">{campaign.templateName || 'No template'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Language</p>
                <p className="font-medium">{campaign.templateLanguage || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium">
                  {campaign.createdAt 
                    ? new Date(campaign.createdAt).toLocaleString()
                    : 'Unknown'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="font-medium">
                  {campaign.scheduledAt
                    ? new Date(campaign.scheduledAt).toLocaleString()
                    : "Immediate"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="font-medium">
                  {campaign.completedAt
                    ? new Date(campaign.completedAt).toLocaleString()
                    : "In Progress"}
                </p>
              </div>
            </div>
            
            {/* Description */}
            {campaign.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">Description</p>
                <p className="font-medium">{campaign.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <Card className="hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Recipients</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {safeNumber(campaign.recipientCount).toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Messages Sent</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sentCount.toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Send className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Delivery Rate</p>
                  <p className="text-2xl font-bold text-green-600">
                    {deliveryRate}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(deliveryRate, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Read Rate</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {readRate.toFixed(1)}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(readRate, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Eye className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failure Rate</p>
                  <p className="text-2xl font-bold text-red-600">
                    {failureRate.toFixed(1)}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(failureRate, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="p-2 bg-red-50 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart and Status Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Daily Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <SafeMessageChart data={chartData} />
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No daily performance data available</p>
                    <p className="text-sm text-gray-400 mt-1">
                      This campaign may not have detailed daily tracking data.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {recipientStats.length > 0 ? (
                <div className="space-y-4">
                  {recipientStats.map((stat: any, index: number) => {
                    const total = recipientStats.reduce(
                      (sum: number, s: any) => sum + safeNumber(s.count),
                      0
                    );
                    const count = safeNumber(stat.count);
                    const percentage = total > 0 ? (count / total) * 100 : 0;

                    return (
                      <div
                        key={`${stat.status}-${index}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              stat.status === "delivered"
                                ? "bg-green-500"
                                : stat.status === "read"
                                ? "bg-blue-500"
                                : stat.status === "failed"
                                ? "bg-red-500"
                                : stat.status === "pending"
                                ? "bg-yellow-500"
                                : stat.status === "sent"
                                ? "bg-purple-500"
                                : "bg-gray-500"
                            }`}
                          />
                          <span className="text-sm capitalize font-medium">
                            {stat.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold">
                            {count}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <AlertCircle className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                    <p className="text-sm">No status data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Error Analysis */}
        {errorAnalysis.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Error Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Error Code
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Error Message
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Occurrences
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {errorAnalysis.map((error: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {error.errorCode || "N/A"}
                          </code>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {error.errorMessage || "No error message provided"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {safeNumber(error.count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Campaign Stats */}
        {(campaign.contactGroups?.length > 0 || campaign.csvData?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Target Audience</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaign.contactGroups?.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Contact Groups</p>
                    <p className="font-medium">{campaign.contactGroups.length} group(s) selected</p>
                  </div>
                )}
                {campaign.csvData?.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">CSV Data</p>
                    <p className="font-medium">{campaign.csvData.length} records imported</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}