import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loading } from "@/components/ui/loading";
import { Palette, Type, Layout, Save, RefreshCw, RotateCcw } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { apiRequestFormData } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";

interface AppearanceSettings {
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  buttonColor?: string;
  lightModeColor?: string;
  title?: string;
  tagline?: string;
  logo?: string;
  logo2?: string;
  favicon?: string;
  supportEmail?: string;
  currency?: string;
  country?: string;
}

const DEFAULT_SETTINGS = {
  primaryColor: "#1c781f",
  backgroundColor: "#FFFFFF",
  buttonColor: "#1c781f",
  lightModeColor: "#F9FAFB",
  fontFamily: "Inter, sans-serif",
};

export function AppearanceSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<AppearanceSettings>({});

  const { user } = useAuth();
  const isDemo = user?.username === "demoadmin" || user?.username === "demouser";

  const { data: settings, isLoading } = useQuery<AppearanceSettings>({
    queryKey: ["/api/brand-settings"],
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async (newData: AppearanceSettings) => {
      const data = new FormData();
      Object.entries(newData).forEach(([key, value]) => {
        if (value !== undefined) {
          data.append(key, value);
        }
      });

      const res = await apiRequestFormData("PUT", "/api/brand-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brand-settings"] });
      toast({
        title: t("settings.appearance.toast.successTitle"),
        description: t("settings.appearance.toast.successDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("settings.appearance.toast.errorTitle"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    mutation.mutate(formData);
  };

  const handleReset = () => {
    const resetData = {
      ...formData,
      ...DEFAULT_SETTINGS,
    };
    setFormData(resetData);
    mutation.mutate(resetData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loading />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                {t("settings.appearance.title")}
              </CardTitle>
              <CardDescription>
                {t("settings.appearance.description")}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={mutation.isPending}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {t("settings.appearance.resetToDefaults")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={mutation.isPending || isDemo}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                {mutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t("settings.appearance.saveChanges")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor">{t("settings.appearance.primaryColor")}</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="primaryColorPicker"
                  name="primaryColor"
                  value={formData.primaryColor || "#1c781f"}
                  onChange={handleInputChange}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  id="primaryColor"
                  name="primaryColor"
                  value={formData.primaryColor || ""}
                  onChange={handleInputChange}
                  placeholder="#1c781f"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("settings.appearance.primaryColorHelper")}
              </p>
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <Label htmlFor="backgroundColor">{t("settings.appearance.backgroundColor")}</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="backgroundColorPicker"
                  name="backgroundColor"
                  value={formData.backgroundColor || "#FFFFFF"}
                  onChange={handleInputChange}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  id="backgroundColor"
                  name="backgroundColor"
                  value={formData.backgroundColor || ""}
                  onChange={handleInputChange}
                  placeholder="#FFFFFF"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("settings.appearance.backgroundColorHelper")}
              </p>
            </div>

            {/* Button Color */}
            <div className="space-y-2">
              <Label htmlFor="buttonColor">{t("settings.appearance.buttonColor")}</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="buttonColorPicker"
                  name="buttonColor"
                  value={formData.buttonColor || "#1c781f"}
                  onChange={handleInputChange}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  id="buttonColor"
                  name="buttonColor"
                  value={formData.buttonColor || ""}
                  onChange={handleInputChange}
                  placeholder="#1c781f"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("settings.appearance.buttonColorHelper")}
              </p>
            </div>

            {/* Light Mode Color */}
            <div className="space-y-2">
              <Label htmlFor="lightModeColor">{t("settings.appearance.lightModeColor")}</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="lightModeColorPicker"
                  name="lightModeColor"
                  value={formData.lightModeColor || "#F9FAFB"}
                  onChange={handleInputChange}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  type="text"
                  id="lightModeColor"
                  name="lightModeColor"
                  value={formData.lightModeColor || ""}
                  onChange={handleInputChange}
                  placeholder="#F9FAFB"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("settings.appearance.lightModeColorHelper")}
              </p>
            </div>

            {/* Font Family */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="fontFamily" className="flex items-center gap-2">
                <Type className="w-4 h-4" />
                {t("settings.appearance.fontFamily")}
              </Label>
              <Input
                type="text"
                id="fontFamily"
                name="fontFamily"
                value={formData.fontFamily || ""}
                onChange={handleInputChange}
                placeholder="'Inter', sans-serif"
              />
              <p className="text-xs text-muted-foreground">
                {t("settings.appearance.fontFamilyHelper")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary" />
            {t("settings.appearance.preview.title")}
          </CardTitle>
          <CardDescription>
            {t("settings.appearance.preview.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="p-8 rounded-lg border shadow-inner transition-all duration-300"
            style={{
              backgroundColor: formData.backgroundColor || "#FFFFFF",
              fontFamily: formData.fontFamily || "inherit"
            }}
          >
            <div className="space-y-4">
              <h4
                className="text-xl font-bold"
                style={{ color: formData.primaryColor || "#000000" }}
              >
                {t("settings.appearance.preview.sampleHeading")}
              </h4>
              <p className="text-sm opacity-80">
                {t("settings.appearance.preview.sampleText")}
              </p>
              <div className="flex gap-4">
                <Button
                  style={{ backgroundColor: formData.buttonColor || formData.primaryColor || "#3B82F6" }}
                  className="hover:opacity-90"
                >
                  {t("settings.appearance.preview.primaryButton")}
                </Button>
                <Button variant="outline">
                  {t("settings.appearance.preview.secondaryButton")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
