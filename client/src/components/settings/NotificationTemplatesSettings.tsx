import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Bell, Edit, Save, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loading } from "@/components/ui/loading";
import { useTranslation } from "@/lib/i18n";

interface NotificationTemplate {
  id: number;
  eventType: string;
  label: string;
  description: string;
  subject: string;
  htmlBody: string;
  isEmailEnabled: boolean;
  isInAppEnabled: boolean;
  variables: string[];
  updatedAt: string;
}

export default function NotificationTemplatesSettings() {
  const { t } = useTranslation();
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedHtmlBody, setEditedHtmlBody] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notification templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery<NotificationTemplate[]>({
    queryKey: ["/api/notification-templates"],
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      subject: string;
      htmlBody: string;
    }) => {
      return await apiRequest("PUT", `/api/notification-templates/${data.id}`, {
        subject: data.subject,
        htmlBody: data.htmlBody,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-templates"] });
      toast({
        title: t("settings.notifications.toast.updateSuccessTitle"),
        description: t("settings.notifications.toast.updateSuccessDesc"),
      });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error) => {
      toast({
        title: t("settings.notifications.toast.errorTitle"),
        description: error.message || t("settings.notifications.toast.updateErrorDesc"),
        variant: "destructive",
      });
    },
  });

  // Toggle email enabled mutation
  const toggleEmailMutation = useMutation({
    mutationFn: async (data: { id: number; isEmailEnabled: boolean }) => {
      return await apiRequest("PUT", `/api/notification-templates/${data.id}`, {
        isEmailEnabled: data.isEmailEnabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-templates"] });
      toast({
        title: t("settings.notifications.toast.toggleSuccessTitle"),
        description: t("settings.notifications.toast.emailToggleSuccessDesc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("settings.notifications.toast.errorTitle"),
        description: error.message || t("settings.notifications.toast.toggleErrorDesc"),
        variant: "destructive",
      });
    },
  });

  // Toggle in-app enabled mutation
  const toggleInAppMutation = useMutation({
    mutationFn: async (data: { id: number; isInAppEnabled: boolean }) => {
      return await apiRequest("PUT", `/api/notification-templates/${data.id}`, {
        isInAppEnabled: data.isInAppEnabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-templates"] });
      toast({
        title: t("settings.notifications.toast.toggleSuccessTitle"),
        description: t("settings.notifications.toast.inAppToggleSuccessDesc"),
      });
    },
    onError: (error) => {
      toast({
        title: t("settings.notifications.toast.errorTitle"),
        description: error.message || t("settings.notifications.toast.toggleErrorDesc"),
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setEditedSubject(template.subject);
    setEditedHtmlBody(template.htmlBody);
    setIsDialogOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;

    if (!editedSubject.trim()) {
      toast({
        title: t("settings.notifications.toast.validationErrorTitle"),
        description: t("settings.notifications.toast.emptySubject"),
        variant: "destructive",
      });
      return;
    }

    if (!editedHtmlBody.trim()) {
      toast({
        title: t("settings.notifications.toast.validationErrorTitle"),
        description: t("settings.notifications.toast.emptyBody"),
        variant: "destructive",
      });
      return;
    }

    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      subject: editedSubject,
      htmlBody: editedHtmlBody,
    });
  };

  if (templatesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Loading />
              <p className="text-sm text-gray-500 mt-2">{t("settings.notifications.loading")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            {t("settings.notifications.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.notifications.description")}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t("settings.notifications.noTemplates")}</p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.label}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {template.description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="whitespace-nowrap">
                    {template.eventType}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Toggles */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <Label className="text-sm font-medium cursor-pointer">
                        {t("settings.notifications.emailEnabled")}
                      </Label>
                    </div>
                    <Switch
                      checked={template.isEmailEnabled}
                      onCheckedChange={(checked) => {
                        toggleEmailMutation.mutate({
                          id: template.id,
                          isEmailEnabled: checked,
                        });
                      }}
                      disabled={toggleEmailMutation.isPending}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-green-500" />
                      <Label className="text-sm font-medium cursor-pointer">
                        {t("settings.notifications.inAppEnabled")}
                      </Label>
                    </div>
                    <Switch
                      checked={template.isInAppEnabled}
                      onCheckedChange={(checked) => {
                        toggleInAppMutation.mutate({
                          id: template.id,
                          isInAppEnabled: checked,
                        });
                      }}
                      disabled={toggleInAppMutation.isPending}
                    />
                  </div>
                </div>

                {/* Variables */}
                {template.variables.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("settings.notifications.availableVariables")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="secondary" className="font-mono text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Button */}
                <div className="pt-2">
                  <Button
                    onClick={() => handleEditClick(template)}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {t("settings.notifications.editTemplate")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t("settings.notifications.editDialog.title")} - {editingTemplate?.label}
            </DialogTitle>
            <DialogDescription>
              {t("settings.notifications.description")} ({editingTemplate?.eventType})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Subject Field */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-sm font-medium">
                {t("settings.notifications.editDialog.subject")}
              </Label>
              <Input
                id="subject"
                value={editedSubject}
                onChange={(e) => setEditedSubject(e.target.value)}
                placeholder={t("settings.notifications.editDialog.subjectPlaceholder")}
                className="w-full"
              />
            </div>

            {/* HTML Body Field */}
            <div className="space-y-2">
              <Label htmlFor="htmlBody" className="text-sm font-medium">
                {t("settings.notifications.editDialog.htmlBody")}
              </Label>
              <Textarea
                id="htmlBody"
                value={editedHtmlBody}
                onChange={(e) => setEditedHtmlBody(e.target.value)}
                placeholder={t("settings.notifications.editDialog.htmlPlaceholder")}
                className="w-full font-mono text-sm min-h-[300px]"
              />
            </div>

            {/* Variables Info */}
            {editingTemplate && editingTemplate.variables && editingTemplate.variables.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 mb-2">
                  {t("settings.notifications.editDialog.availableVars")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {editingTemplate.variables.map((variable: string) => (
                    <Badge
                      key={variable}
                      variant="secondary"
                      className="font-mono text-xs cursor-pointer"
                      title={`Click to copy variable reference`}
                    >
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={updateTemplateMutation.isPending}
            >
              {t("settings.notifications.editDialog.cancel")}
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={updateTemplateMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateTemplateMutation.isPending 
                ? t("settings.notifications.editDialog.saving") 
                : t("settings.notifications.editDialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
