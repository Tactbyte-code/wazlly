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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";


interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddUserModal({
  open,
  onOpenChange,
  onSuccess,
}: AddUserModalProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    firstName: "",
    lastName: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const updateField = (key: string, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  // Required fields filled?
  const isValid =
    form.username.trim() !== "" &&
    form.password.trim() !== "" &&
    form.email.trim() !== "";

  const handleSubmit = async () => {
    if (!form.username || !form.password || !form.email) {
      toast({
        title: "Missing Fields",
        description: "Username, Password & Email are required.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest(
        "POST",
        "/api/admin/users/create",
        form
      );

      const data = await res.json();

      if (!data.success) throw new Error(data.message || "Failed");

      toast({
        title: "Success",
        description: "User created successfully!",
      });

      onSuccess();
      onOpenChange(false);

      setForm({
        username: "",
        password: "",
        email: "",
        firstName: "",
        lastName: "",
      });

    } catch (error: any) {
      let msg = "Something went wrong";

      if (error?.message) {
        const index = error.message.indexOf("{");
        if (index !== -1) {
          try {
            const jsonString = error.message.slice(index);
            const parsed = JSON.parse(jsonString);
            msg = parsed.message || msg;
          } catch {
            msg = error.message;
          }
        } else {
          msg = error.message;
        }
      }

      toast({
        title: "Error",
        description: msg, // <-- only "Username already exists."
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
          <DialogTitle> {t("users.newUser.adduser")} </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Username */}
          <div>
            <Label> {t("users.newUser.username")} *</Label>
            <Input
              value={form.username}
              onChange={(e) => updateField("username", e.target.value)}
              placeholder="john_doe"
            />
          </div>

          {/* Password with toggle */}
          <div className="relative">
            <Label> {t("users.newUser.password")} *</Label>

            <Input
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              placeholder="••••••••"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-9 text-gray-500"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Email */}
          <div>
            <Label> {t("users.newUser.email")} *</Label>
            <Input
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          {/* First Name */}
          <div>
            <Label> {t("users.newUser.firstName")} *</Label>
            <Input
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              placeholder="John"
            />
          </div>

          {/* Last Name */}
          <div>
            <Label> {t("users.newUser.lastName")} *</Label>
            <Input
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              placeholder="Doe"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("users.newUser.cancel")}
          </Button>

          <Button onClick={handleSubmit} disabled={loading || !isValid}>
            {loading ? t("users.newUser.creating") : t("users.newUser.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
