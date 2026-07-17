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

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Upload, X } from "lucide-react";
import { apiRequest, apiRequestFormData } from "@/lib/queryClient";

interface SMTPSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingData: any;
  onSuccess: () => void;
}

export default function SMTPSettingsModal({
  open,
  onOpenChange,
  existingData,
  onSuccess,
}: SMTPSettingsModalProps) {
  const { toast } = useToast();

  const [form, setForm] = useState({
    host: existingData.host || "",
    port: existingData.port || "",
    secure: existingData.secure === "true",
    user: existingData.user || "",
    password: "",
    fromName: existingData.fromName || "",
    fromEmail: existingData.fromEmail || "",
    logo: existingData.logo || "",
  });

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, GIF, or WebP).",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await apiRequestFormData("POST", "/api/admin/smtp/upload-logo", formData);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Upload failed");
      }

      updateField("logo", data.url);
      toast({
        title: "Logo uploaded",
        description: "Logo has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload logo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const updateField = (key: string, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async () => {
    if (!form.host || !form.port || !form.user) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest("POST", "/api/admin/smtpConfig", form);

      if (!res.ok) throw new Error("Failed to save SMTP config");

      toast({
        title: "Success",
        description: "SMTP configuration updated successfully!",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update SMTP config",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update SMTP Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Host */}
          <div>
            <Label>SMTP Host *</Label>
            <Input
              value={form.host}
              onChange={(e) => updateField("host", e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </div>

          {/* Port */}
          <div>
            <Label>Port *</Label>
            <Input
              value={form.port}
              onChange={(e) => updateField("port", e.target.value)}
              placeholder="587"
              type="number"
            />
          </div>

          {/* Secure */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={form.secure}
              onChange={(e) => updateField("secure", e.target.checked)}
            />
            <Label>Use TLS (Secure)</Label>
          </div>

          {/* User */}
          <div>
            <Label>SMTP Username *</Label>
            <Input
              value={form.user}
              onChange={(e) => updateField("user", e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <Label>Password (leave blank to keep existing)</Label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {/* From Name */}
          <div>
            <Label>From Name *</Label>
            <Input
              value={form.fromName}
              onChange={(e) => updateField("fromName", e.target.value)}
              placeholder="Your Company"
            />
          </div>

          {/* From Email */}
          <div>
            <Label>From Email *</Label>
            <Input
              value={form.fromEmail}
              onChange={(e) => updateField("fromEmail", e.target.value)}
              placeholder="no-reply@company.com"
            />
          </div>

          {/* Logo */}
          <div>
            <Label>Logo</Label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
            />
            <div className="mt-2 space-y-3">
              {form.logo && (
                <div className="relative inline-block">
                  <img
                    src={form.logo}
                    alt="Logo preview"
                    className="h-16 max-w-[200px] object-contain rounded border p-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => updateField("logo", "")}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : form.logo ? "Change Logo" : "Upload Logo"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
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
