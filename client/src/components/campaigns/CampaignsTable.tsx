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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Play,
  Pause,
  Trash2,
  Calendar,
  Users,
  Send,
  CheckCircle,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { isDemoUser, maskName } from "@/utils/maskUtils";

interface Campaign {
  id: string;
  name: string;
  status: string;
  templateName?: string;
  recipientCount?: number;
  sentCount?: number;
  deliveredCount?: number;
  readCount?: number;
  repliedCount?: number;
  failedCount?: number;
  createdAt: string;
  completedAt?: string;
  scheduledAt?: string;
  createdBy: string;
}

interface CampaignsTableProps {
  campaigns: Campaign[];
  onViewCampaign: (campaign: Campaign) => void;
  onUpdateStatus: (id: string, status: string) => void;
  onDeleteCampaign: (id: string) => void;
}

export function CampaignsTable({
  campaigns,
  onViewCampaign,
  onUpdateStatus,
  onDeleteCampaign,
}: CampaignsTableProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const safeFormat = (dateString?: string) => {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return format(d, "MMM d, h:mm a");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      completed: { variant: "default", label: "Completed" },
      scheduled: { variant: "secondary", label: "Scheduled" },
      active: { variant: "secondary", label: "Active" },
      paused: { variant: "outline", label: "Paused" },
      failed: { variant: "destructive", label: "Failed" },
    };

    const config = statusConfig[status] || {
      variant: "outline",
      label: status,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const calculateDeliveryRate = (sent?: number, delivered?: number) => {
    if (!sent || sent === 0) return 0;
    return Math.round(((delivered || 0) / sent) * 100);
  };

  const calculateReadRate = (recipients?: number, read?: number) => {
    if (!recipients || recipients === 0) return 0;
    return Math.round(((read || 0) / recipients) * 100);
  };

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No campaigns found. Create your first campaign to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("campaigns.title")}</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>{t("campaigns.status")}</TableHead>
              <TableHead>{t("campaigns.template")}</TableHead>
              <TableHead>{t("campaigns.recipients")}</TableHead>
              <TableHead>{t("campaigns.sent")}</TableHead>
              <TableHead>{t("campaigns.delivered")}</TableHead>
              <TableHead>{t("campaigns.read")}</TableHead>
              <TableHead>{t("campaigns.deliveryRate")}</TableHead>
              <TableHead>{t("campaigns.created")}</TableHead>
              <TableHead className="text-right">
                {t("campaigns.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign) => {
              const recipients = Number(campaign.recipientCount) || 0;
              const delivered = Number(campaign.deliveredCount) || 0;
              const read = Number(campaign.readCount) || 0;

              let deliveryRate =
                recipients > 0 ? Math.round((delivered / recipients) * 100) : 0;
              deliveryRate = Math.max(0, Math.min(deliveryRate, 100));

              // readRate bhi fix karo
              const readRate =
                recipients > 0 ? Math.round((read / recipients) * 100) : 0;
              return (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    {isDemoUser(user?.username)
                      ? maskName(campaign.createdByName)
                      : campaign.createdByName}
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell>{campaign.templateName || "-"}</TableCell>
                  <TableCell>{campaign.recipientCount || 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{campaign.sentCount || 0}</span>
                      {campaign.failedCount ? (
                        <span className="text-xs text-destructive">
                          ({campaign.failedCount} failed)
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{campaign.deliveredCount || 0}</span>
                      {deliveryRate > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({deliveryRate}%)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{campaign.readCount || 0}</span>
                      {readRate > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({readRate}%)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 justify-center">
                      {/* <Progress value={deliveryRate} className="w-20" /> */}
                      <span className="text-sm font-medium">
                        {deliveryRate}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{safeFormat(campaign.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onViewCampaign(campaign)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {t("campaigns.viewDetails")}
                        </DropdownMenuItem>
                        {campaign.status === "sending" && (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(campaign.id, "paused")
                            }
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            {t("campaigns.pause")}
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "paused" && (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(campaign.id, "sending")
                            }
                          >
                            <Play className="mr-2 h-4 w-4" />
                            {t("campaigns.resume")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDeleteCampaign(campaign.id)}
                          className="text-destructive"
                          disabled={isDemoUser(user?.username)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("campaigns.delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className="lg:hidden space-y-4">
        {campaigns.map((campaign) => {
          const sent = Number(campaign.sentCount) || 0;
          const delivered = Number(campaign.deliveredCount) || 0;

          let deliveryRate =
            sent > 0 ? Math.round((delivered / sent) * 100) : 0;

          deliveryRate = Math.max(0, Math.min(deliveryRate, 100));

          const readRate = calculateReadRate(
            campaign.recipientCount,
            campaign.readCount,
          );

          return (
            <Card key={campaign.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-semibold mb-2">
                      {campaign.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {safeFormat(campaign.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(campaign.status)}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => onViewCampaign(campaign)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {campaign.status === "sending" && (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(campaign.id, "paused")
                            }
                          >
                            <Pause className="mr-2 h-4 w-4" />
                            Pause
                          </DropdownMenuItem>
                        )}
                        {campaign.status === "paused" && (
                          <DropdownMenuItem
                            onClick={() =>
                              onUpdateStatus(campaign.id, "sending")
                            }
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Resume
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => onDeleteCampaign(campaign.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campaign Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Created By
                      </div>
                      <div className="font-medium">
                        {isDemoUser(user?.username)
                          ? maskName(campaign.createdByName)
                          : campaign.createdByName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">
                        Template
                      </div>
                      <div className="font-medium">
                        {campaign.templateName || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      Recipients
                    </div>
                    <div className="text-lg font-semibold">
                      {campaign.recipientCount || 0}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Send className="h-3 w-3" />
                      Sent
                    </div>
                    <div className="text-lg font-semibold">
                      {campaign.sentCount || 0}
                      {campaign.failedCount ? (
                        <span className="text-xs text-destructive ml-1">
                          ({campaign.failedCount} failed)
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CheckCircle className="h-3 w-3" />
                      Delivered
                    </div>
                    <div className="text-lg font-semibold">
                      {campaign.deliveredCount || 0}
                      {deliveryRate > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({deliveryRate}%)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" />
                      Read
                    </div>
                    <div className="text-lg font-semibold">
                      {campaign.readCount || 0}
                      {readRate > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({readRate}%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delivery Rate Progress */}
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Rate</span>
                    <span className="font-semibold">{deliveryRate}%</span>
                  </div>
                  <Progress value={deliveryRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
