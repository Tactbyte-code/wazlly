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

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, CheckCircle, Clock, XCircle, AlertTriangle, Type } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useSocket } from "@/contexts/socket-context";

interface DisplayNameEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string | null;
  channelName?: string;
}

function getNameStatusBadge(status: string | null | undefined) {
  if (!status) return null;
  switch (status) {
    case "APPROVED":
      return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
    case "AVAILABLE_WITHOUT_REVIEW":
      return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Available</Badge>;
    case "PENDING_REVIEW":
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
    case "DECLINED":
      return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Declined</Badge>;
    case "EXPIRED":
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200"><AlertTriangle className="w-3 h-3 mr-1" />Expired</Badge>;
    case "NONE":
      return <Badge className="bg-gray-100 text-gray-500 border-gray-200">None</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function DisplayNameEditor({ open, onOpenChange, channelId, channelName }: DisplayNameEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [newDisplayName, setNewDisplayName] = useState("");

  const { data: displayNameData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["/api/channels", channelId, "display-name"],
    queryFn: async () => {
      if (!channelId) return null;
      const res = await apiRequest("GET", `/api/channels/${channelId}/display-name`);
      return await res.json();
    },
    enabled: !!channelId && open,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!socket || !channelId) return;

    const handleDisplayNameUpdate = (data: any) => {
      if (data.channelId === channelId) {
        queryClient.invalidateQueries({ queryKey: ["/api/channels", channelId, "display-name"] });
        queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
        toast({
          title: "Display Name Updated",
          description: `Name status changed to: ${data.name_status}${data.verified_name ? ` (${data.verified_name})` : ""}`,
        });
      }
    };

    socket.on("display_name_update", handleDisplayNameUpdate);
    return () => {
      socket.off("display_name_update", handleDisplayNameUpdate);
    };
  }, [socket, channelId, queryClient, toast]);

  const updateMutation = useMutation({
    mutationFn: async (displayName: string) => {
      const res = await apiRequest("POST", `/api/channels/${channelId}/display-name`, {
        display_name: displayName,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update display name");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Request Submitted",
        description: data.message || "Display name change request sent to Meta for review.",
      });
      setNewDisplayName("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/channels"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    const trimmed = newDisplayName.trim();
    if (!trimmed) return;
    if (trimmed.length < 3 || trimmed.length > 512) {
      toast({
        title: "Invalid Name",
        description: "Display name must be between 3 and 512 characters.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(trimmed);
  };

  const isPending = displayNameData?.name_status === "PENDING_REVIEW" || displayNameData?.new_name_status === "PENDING_REVIEW";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Type className="w-5 h-5 text-blue-600" />
            Display Name
          </DialogTitle>
          <DialogDescription>
            Manage the WhatsApp display name for {channelName || "this channel"}. Changes require Meta review (usually 24-48 hours).
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-muted-foreground">Current Display Name</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="h-7 px-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
                </Button>
              </div>
              <p className="text-lg font-semibold">
                {displayNameData?.verified_name || <span className="text-muted-foreground italic">Not set</span>}
              </p>

              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  {getNameStatusBadge(displayNameData?.name_status)}
                </div>
                {displayNameData?.new_name_status && displayNameData.new_name_status !== "NONE" && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">New Name:</span>
                    {getNameStatusBadge(displayNameData.new_name_status)}
                  </div>
                )}
              </div>

              {displayNameData?.display_phone_number && (
                <p className="text-xs text-muted-foreground">
                  Phone: {displayNameData.display_phone_number}
                </p>
              )}
            </div>

            {isPending && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 flex items-start gap-2">
                <Clock className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Name change pending review</p>
                  <p className="text-xs mt-0.5">Meta is reviewing your display name change. This usually takes 24-48 hours. The status will update automatically once Meta completes the review.</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="new-display-name">Request New Display Name</Label>
              <Input
                id="new-display-name"
                placeholder="Enter new display name..."
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                maxLength={512}
                disabled={updateMutation.isPending}
              />
              <p className="text-xs text-muted-foreground">
                Must match your business branding and legal documents. No emojis or special characters. 3-512 characters. Up to 10 changes per 30 days.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newDisplayName.trim() || updateMutation.isPending || isLoading}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit for Review"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
