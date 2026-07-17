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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Building, Shield, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "../../lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface UserFormData {
  firstName: string;
  lastName: string;
  email?: string;
}

export function AccountSettings() {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const { user , logout } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const isSuperadmin = user?.role === "superadmin";
  const { t } = useTranslation();

  // state for password modal
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- update profile mutation
  const handleSaveChanges = useMutation({
    mutationFn: async (data: UserFormData) => {
      if (!user?.id) throw new Error("User ID is missing");
      if (!data.firstName.trim() || !data.lastName.trim()) {
        throw new Error("First name and last name are required");
      }
      return apiRequest("PUT", `/api/team/members/${user.id}`, data).then((r) => r.json());
    },
    onSuccess: (data) => {
      toast({
        title: t("settings.account.toast.accountUpdated"),
        description: t("settings.account.toast.accountUpdatedDesc"),
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: t("settings.account.toast.errorAccount"),
        description: error.message || t("settings.account.toast.unexpectedError"),
        variant: "destructive",
      });
    },
  });

  // --- update password mutation
  const handlePasswordUpdate = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User ID is missing");
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("All fields are required");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match");
      }

      return apiRequest("PATCH", `/api/team/members/${user.id}/password`, {
        currentPassword,
        newPassword,
      }).then((r) => r.json());
    },
    onSuccess: () => {
      toast({
        title: t("settings.account.toast.passwordUpdated"),
        description: t("settings.account.toast.passwordUpdatedDesc"),
      });
      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: t("settings.account.toast.errorPassword"),
        description: error.message || t("settings.account.toast.unexpectedError"),
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const data: UserFormData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };
    if (isSuperadmin && email.trim()) {
      data.email = email.trim();
    }
    handleSaveChanges.mutate(data);
  };


  const deleteAccount = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User ID missing");
      return apiRequest("DELETE", `/api/team/members/${user.id}`);
    },
    onSuccess: () => {
      toast({
        title: t("settings.account.toast.accountDeleted"),
        description: t("settings.account.toast.accountDeletedDesc"),
      });
      logout(); // log out user after delete
    },
    onError: (error: Error) => {
      toast({
        title: t("settings.account.toast.errorDelete"),
        description: error.message || t("settings.account.toast.unknownError"),
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-5 h-5 mr-2" />
            {t("settings.account.title")}
          </CardTitle>
          <CardDescription>{t("settings.account.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={!isEditing}
            />
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={!isEditing}
            />
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center">
                <Building className="w-4 h-4 mr-2" />
                {t("settings.account.labels.username")}
              </Label>
              <Input id="username" defaultValue={user?.username} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center">
                <Building className="w-4 h-4 mr-2" />
                {t("settings.account.labels.email")}
              </Label>
              <Input
                id="email"
                value={isSuperadmin ? email : user?.email || ""}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing || !isSuperadmin}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center">
                <Shield className="w-4 h-4 mr-2" />
                {t("settings.account.labels.role")}
              </Label>
              <Input value={user?.role} disabled className="bg-gray-50" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              {t("settings.account.labels.memberSince", { date: user?.createdAt ? new Date(user.createdAt).toLocaleString() : "N/A" })}
            </div>
            <div className="space-x-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFirstName(user?.firstName || "");
                      setLastName(user?.lastName || "");
                      setEmail(user?.email || "");
                      setIsEditing(false);
                    }}
                    disabled={handleSaveChanges.isPending}
                  >
                    {t("settings.account.buttons.cancel")}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={
                      handleSaveChanges.isPending || !firstName.trim() || !lastName.trim() ||  user?.username === "demoadmin"
                    }
                  >
                    {handleSaveChanges.isPending ? t("settings.account.buttons.saving") : t("settings.account.buttons.saveChanges")}
                  </Button>
                </>
              ) : (
                <Button
  onClick={() => setIsEditing(true)}
  disabled={user?.username === "demoadmin"}   // <-- Disable for demo admin
>
  {t("settings.account.buttons.editAccount")}
</Button>

              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account.security.title")}</CardTitle>
          <CardDescription>{t("settings.account.security.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">{t("settings.account.security.changePassword")}</h4>
              <p className="text-sm text-gray-500">{t("settings.account.security.changePasswordDesc")}</p>
            </div>
            <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)}>
              {t("settings.account.buttons.change")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.account.security.modalTitle")}</DialogTitle>
            <DialogDescription>
              {t("settings.account.security.modalDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">{t("settings.account.security.currentPassword")}</Label>
              <Input
                id="currentPassword"
                type="password"
                className="mt-3"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="newPassword">{t("settings.account.security.newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                className="mt-3"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">{t("settings.account.security.confirmPassword")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                className="mt-3"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={handlePasswordUpdate.isPending}
            >
              {t("settings.account.buttons.cancel")}
            </Button>
            <Button
              onClick={() => handlePasswordUpdate.mutate()}
              disabled={user?.username === 'demouser'? true : handlePasswordUpdate.isPending}
            >
              {handlePasswordUpdate.isPending ? t("settings.account.buttons.updating") : t("settings.account.buttons.updatePassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-red-600">{t("settings.account.dangerZone.title")}</CardTitle>
        <CardDescription>
          {t("settings.account.dangerZone.subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium">{t("settings.account.dangerZone.deleteAccount")}</h4>
            <p className="text-sm text-gray-500">
              {t("settings.account.dangerZone.deleteDesc")}
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">{t("settings.account.buttons.deleteAccount")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("settings.account.dangerZone.confirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("settings.account.dangerZone.confirmDesc")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("settings.account.buttons.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteAccount.mutate()}
                  disabled={user?.username === 'demouser' || user?.username === 'demoadmin'? true :deleteAccount.isPending}
                >
                  {deleteAccount.isPending ? t("settings.account.buttons.deleting") : t("settings.account.buttons.yesDelete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
    </div>
  );
}
