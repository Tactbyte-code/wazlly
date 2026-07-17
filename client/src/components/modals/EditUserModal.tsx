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
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; username: string; email: string } | null;
  onSuccess: () => void;
}

export default function EditUserModal({ open, onOpenChange, user, onSuccess }: EditUserModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [form, setForm] = useState({ username: "", email: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ username: user.username || "", email: user.email || "" });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!form.username || !form.email) {
      toast({ title: t("users.toast.error"), description: t("users.toast.usernameEmailRequired"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest("PUT", `/api/users/${user?.id}`, { username: form.username, email: form.email });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: "User updated successfully!" });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data.message || "Failed to update user");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("users.edituser.edit")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>{t("users.edituser.username")}</Label>
            <Input value={form.username} onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))} placeholder="Username" />
          </div>
          <div>
            <Label>{t("u  sers.edituser.email")}</Label>
            <Input value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="email@example.com" type="email" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("users.edituser.cancel")}</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? t("users.edituser.saving") : t("users.edituser.savechanges")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
