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

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";

interface Props {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  existingData?: any;
  onSuccess: () => void;
}

export default function StorageSettingsModal({
  open,
  onOpenChange,
  existingData,
  onSuccess,
}: Props) {
  const [form, setForm] = useState({
    id: existingData?.id || "",
    spaceName: existingData?.spaceName || "",
    endpoint: existingData?.endpoint || "",
    region: existingData?.region || "",
    accessKey: existingData?.accessKey || "",
    secretKey: existingData?.secretKey || "",
    isActive: existingData?.isActive || false,
  });

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/storage-settings/update", form);
      if (!res.ok) throw new Error("Failed to update");
      toast({ title: "Updated", description: "Storage configuration saved." });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update storage.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Storage Configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Label>Space Name</Label>
          <Input
            value={form.spaceName}
            onChange={(e) => handleChange("spaceName", e.target.value)}
          />

          <Label>Endpoint</Label>
          <Input
            value={form.endpoint}
            onChange={(e) => handleChange("endpoint", e.target.value)}
          />

          <Label>Region</Label>
          <Input
            value={form.region}
            onChange={(e) => handleChange("region", e.target.value)}
          />

          <Label>Access Key</Label>
          <Input
            value={form.accessKey}
            onChange={(e) => handleChange("accessKey", e.target.value)}
          />

          <Label>Secret Key</Label>
          <Input
            type="password"
            value={form.secretKey}
            onChange={(e) => handleChange("secretKey", e.target.value)}
          />

          <div className="flex items-center justify-between mt-3">
            <Label>Active Storage</Label>
            <Switch
              checked={form.isActive}
              onCheckedChange={(val) => handleChange("isActive", val)}
            />
          </div>
        </div>

        <div className="flex justify-end mt-6 space-x-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || user?.username === "demoadmin" || user?.username === "demouser"}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
