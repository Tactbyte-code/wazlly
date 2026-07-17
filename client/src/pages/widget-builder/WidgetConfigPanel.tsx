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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { WidgetConfig } from "./types";
import { Separator } from "@/components/ui/separator";

interface WidgetConfigPanelProps {
  config: WidgetConfig;
  updateConfig: (key: string, value: any) => void;
  userList: Array<any>;
  usersLoading: boolean;
  siteId?: string;
  channelId?: string;
}

export default function WidgetConfigPanel({
  config,
  updateConfig,
  userList,
  usersLoading,
  siteId,
  channelId,
}: WidgetConfigPanelProps) {
  const { t } = useTranslation();

  return (
    <Tabs
      defaultValue="content"
      className="space-y-7 flex flex-col gap-5 "
    >
      <TabsList className=" w-full flex flex-wrap items-center justify-start">
        <TabsTrigger value="content">Content</TabsTrigger>
        <TabsTrigger value="design">Design</TabsTrigger>
        <TabsTrigger value="layouts">Layouts</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="advanced">Advanced</TabsTrigger>
      </TabsList>

      {/* Design Tab */}
      <TabsContent value="design" className="space-y-6  ">
        <Card>
          <CardHeader>
            <CardTitle>{t("widget.Design.Widget.title")}</CardTitle>
            <CardDescription>
              {t("widget.Design.Widget.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Style Preset</Label>
              <RadioGroup
                value={config.widgetStyle}
                onValueChange={(value) =>
                  updateConfig("widgetStyle", value)
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="modern" id="modern" />
                  <Label htmlFor="modern" className="font-normal">
                    Modern (Gradient backgrounds)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="classic" id="classic" />
                  <Label htmlFor="classic" className="font-normal">
                    Classic (Solid colors)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="minimal" id="minimal" />
                  <Label htmlFor="minimal" className="font-normal">
                    Minimal (Clean & simple)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) =>
                      updateConfig("primaryColor", e.target.value)
                    }
                    className="w-16 h-10"
                  />
                  <Input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) =>
                      updateConfig("primaryColor", e.target.value)
                    }
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Accent Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={config.accentColor}
                    onChange={(e) =>
                      updateConfig("accentColor", e.target.value)
                    }
                    className="w-16 h-10"
                  />
                  <Input
                    type="text"
                    value={config.accentColor}
                    onChange={(e) =>
                      updateConfig("accentColor", e.target.value)
                    }
                    className="flex-1 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Company Logo</Label>
              <div className="flex gap-2 items-center">
                {config.logoUrl && (
                  <img
                    src={config.logoUrl}
                    alt="Logo preview"
                    className="h-10 w-10 rounded object-contain border"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      value={config.logoUrl}
                      onChange={(e) => updateConfig("logoUrl", e.target.value)}
                      placeholder="https://example.com/logo.png"
                      className="flex-1"
                    />
                    <label className="inline-flex items-center px-3 py-2 text-sm font-medium border rounded-md cursor-pointer hover:bg-slate-50">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('logo', file);
                          try {
                            const res = await fetch('/api/widget/upload-logo', {
                              method: 'POST',
                              body: formData,
                              credentials: 'include',
                            });
                            if (!res.ok) throw new Error('Upload failed');
                            const data = await res.json();
                            updateConfig('logoUrl', data.url);
                          } catch (err) {
                            console.error('Logo upload failed:', err);
                          }
                          e.target.value = '';
                        }}
                      />
                      Upload
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload an image or enter a URL
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Widget Position</Label>
              <Select
                value={config.position}
                onValueChange={(value) =>
                  updateConfig("position", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">
                    Bottom Right
                  </SelectItem>
                  <SelectItem value="bottom-left">
                    Bottom Left
                  </SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

      </TabsContent>

      {/* Layouts Tab */}
      <TabsContent value="layouts" className="space-y-6">
        {/* Messenger Layout Settings */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("widget.Layout.messenger_layout.title")}
                </CardTitle>
                <CardDescription>
                  {t("widget.Layout.messenger_layout.subtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Button Text</Label>
                  <Input
                    value={config.messengerButtonText}
                    onChange={(e) =>
                      updateConfig(
                        "messengerButtonText",
                        e.target.value
                      )
                    }
                    placeholder="Send us a message"
                    data-testid="input-messenger-button-text"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Search Placeholder</Label>
                  <Input
                    value={config.messengerSearchPlaceholder}
                    onChange={(e) =>
                      updateConfig(
                        "messengerSearchPlaceholder",
                        e.target.value
                      )
                    }
                    placeholder="Search our Help Center"
                    data-testid="input-messenger-search-placeholder"
                  />
                </div>

                <div className="space-y-2">
                  <Label>FAQs to Display</Label>
                  <Select
                    value={config.articlesCount.toString()}
                    onValueChange={(value) =>
                      updateConfig("articlesCount", parseInt(value))
                    }
                  >
                    <SelectTrigger data-testid="select-articles-count">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 FAQs</SelectItem>
                      <SelectItem value="3">3 FAQs</SelectItem>
                      <SelectItem value="4">4 FAQs</SelectItem>
                      <SelectItem value="5">5 FAQs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Team Avatars</Label>
                    <p className="text-sm text-muted-foreground">
                      Display team member photos
                    </p>
                  </div>
                  <Switch
                    checked={config.showTeamAvatars}
                    onCheckedChange={(checked) =>
                      updateConfig("showTeamAvatars", checked)
                    }
                    data-testid="switch-team-avatars"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show Recent FAQs</Label>
                    <p className="text-sm text-muted-foreground">
                      Display popular FAQs
                    </p>
                  </div>
                  <Switch
                    checked={config.showRecentArticles}
                    onCheckedChange={(checked) =>
                      updateConfig("showRecentArticles", checked)
                    }
                    data-testid="switch-recent-articles"
                  />
                </div>
              </CardContent>
            </Card>

      </TabsContent>

      {/* Content Tab */}
      <TabsContent value="content" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("widget.Content.messagetitle")}</CardTitle>
            <CardDescription>
              {t("widget.Content.messageSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={config.title}
                onChange={(e) => updateConfig("title", e.target.value)}
                placeholder="Welcome!"
              />
            </div>

            <div className="space-y-2">
              <Label>Subtitle</Label>
              <Input
                value={config.subtitle}
                onChange={(e) =>
                  updateConfig("subtitle", e.target.value)
                }
                placeholder="How can we help?"
              />
            </div>

            {/* added two new fields (start) */}
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={config.name}
                onChange={(e) => updateConfig("name", e.target.value)}
                placeholder="Name"
              />
            </div>

            <div className="space-y-2">
              <Label>Allowed Domain</Label>
              <Input
                value={config.domain}
                onChange={(e) => updateConfig("domain", e.target.value)}
                placeholder="www.example.com"
              />
              <p className="text-xs text-muted-foreground">
                Widget will only work on this domain. Leave empty to allow all domains.
              </p>
            </div>

            {/* added two new fields (end) */}

            <div className="space-y-2">
              <Label>Chat Greeting</Label>
              <Textarea
                value={config.greeting}
                onChange={(e) =>
                  updateConfig("greeting", e.target.value)
                }
                rows={3}
                placeholder="Hi! How can I help you today?"
              />
            </div>

            {/* <div className="space-y-2">
              <Label>App Name</Label>
              <Input value={config.appName} readOnly />
              <p className="text-xs text-muted-foreground">
                Shows in "Powered by" text when enabled
              </p>
            </div> */}

            <div className="space-y-2">
              <Label>Response Time</Label>
              <Select
                value={config.responseTime}
                onValueChange={(value) =>
                  updateConfig("responseTime", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A few minutes">
                    A few minutes
                  </SelectItem>
                  <SelectItem value="A few hours">
                    A few hours
                  </SelectItem>
                  <SelectItem value="Within a day">
                    Within a day
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Team Tab */}
      <TabsContent value="team" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {" "}
              {t("widget.team.Widget_Features.title")}
            </CardTitle>
            <CardDescription>
              {t("widget.team.Widget_Features.subtitle")}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {config.teamMembers.map((member, index) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-3 border rounded-lg"
              >
                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  {member.avatar ? (
                    <AvatarImage
                      src={member.avatar}
                      alt={member.name}
                    />
                  ) : (
                    <AvatarFallback>
                      {member.name?.[0] ?? "U"}
                    </AvatarFallback>
                  )}
                </Avatar>

                {/* Member Fields */}
                <div className="flex-1 space-y-2">
                  {/* Select User Dropdown */}
                  <select
                    value={member.userId || ""}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedUser = userList.find(
                        (u) => u.id === selectedId
                      );

                      const newMembers = [...config.teamMembers];

                      if (selectedUser) {
                        newMembers[index] = {
                          ...member,
                          userId: selectedUser.id,
                          name: `${selectedUser.firstName} ${selectedUser.lastName}`.trim(),
                          role: selectedUser.role || "Support",
                          avatar: selectedUser.avatar || "",
                          email: selectedUser.email,
                        };
                      } else {
                        newMembers[index].userId = "";
                      }

                      updateConfig("teamMembers", newMembers);
                    }}
                    className="border rounded-md px-2 py-1 w-full"
                  >
                    <option value="">— Select a user —</option>
                    {usersLoading && <option>Loading users...</option>}
                    {userList.map((user) => (
                      <option key={user.id} value={user.id}>
                        {`${user.firstName} ${user.lastName}`} (
                        {user.email})
                      </option>
                    ))}
                  </select>

                  {/* Editable fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={member.name}
                      onChange={(e) => {
                        const newMembers = [...config.teamMembers];
                        newMembers[index].name = e.target.value;
                        updateConfig("teamMembers", newMembers);
                      }}
                      placeholder="Name"
                    />
                    <Input
                      value={member.role}
                      onChange={(e) => {
                        const newMembers = [...config.teamMembers];
                        newMembers[index].role = e.target.value;
                        updateConfig("teamMembers", newMembers);
                      }}
                      placeholder="Role"
                    />
                  </div>

                  {/* <Input
                    type="url"
                    value={member.avatar}
                    onChange={(e) => {
                      const newMembers = [...config.teamMembers];
                      newMembers[index].avatar = e.target.value;
                      updateConfig("teamMembers", newMembers);
                    }}
                    placeholder="Profile photo URL (optional)"
                  /> */}
                </div>

                {/* Remove Member */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    const newMembers = config.teamMembers.filter(
                      (_, i) => i !== index
                    );
                    updateConfig("teamMembers", newMembers);
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}

            {/* Add New Member */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const newMembers = [
                  ...config.teamMembers,
                  {
                    id: Date.now().toString(),
                    name: "",
                    role: "Support",
                    avatar: "",
                    userId: "",
                  },
                ];
                updateConfig("teamMembers", newMembers);
              }}
            >
              Add Team Member
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Advanced Tab */}
      <TabsContent value="advanced" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("widget.advanced.Widget_Features.title")}
            </CardTitle>
            <CardDescription>
              {t("widget.advanced.Widget_Features.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!config.enableChat && !config.enableAiAutoReply && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 font-medium">
                  At least one option must be enabled for the chat to work.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Live Chat</Label>
                <p className="text-sm text-muted-foreground">
                  Enable real-time messaging
                </p>
              </div>
              <Switch
                checked={config.enableChat}
                onCheckedChange={(checked) => {
                  if (!checked && !config.enableAiAutoReply) return;
                  updateConfig("enableChat", checked);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>AI Auto-Reply</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically reply to visitor messages using AI training data
                </p>
              </div>
              <Switch
                checked={config.enableAiAutoReply}
                onCheckedChange={(checked) => {
                  if (!checked && !config.enableChat) return;
                  updateConfig("enableAiAutoReply", checked);
                }}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select
                value={config.fontFamily}
                onValueChange={(value) =>
                  updateConfig("fontFamily", value)
                }
              >
                <SelectTrigger data-testid="select-font-family">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System Default</SelectItem>
                  <SelectItem value="inter">Inter</SelectItem>
                  <SelectItem value="roboto">Roboto</SelectItem>
                  <SelectItem value="open-sans">Open Sans</SelectItem>
                  <SelectItem value="poppins">Poppins</SelectItem>
                  <SelectItem value="lato">Lato</SelectItem>
                  <SelectItem value="montserrat">Montserrat</SelectItem>
                  <SelectItem value="nunito">Nunito</SelectItem>
                  <SelectItem value="raleway">Raleway</SelectItem>
                  <SelectItem value="playfair">Playfair Display</SelectItem>
                  <SelectItem value="source-sans">Source Sans 3</SelectItem>
                  <SelectItem value="pt-sans">PT Sans</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Button Style</Label>
              <Select
                value={config.buttonStyle}
                onValueChange={(value) =>
                  updateConfig("buttonStyle", value)
                }
              >
                <SelectTrigger data-testid="select-button-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="solid">Solid Fill</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Shadow Intensity</Label>
              <Select
                value={config.shadowIntensity}
                onValueChange={(value) =>
                  updateConfig("shadowIntensity", value)
                }
              >
                <SelectTrigger data-testid="select-shadow-intensity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="strong">Strong</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Animation Speed</Label>
              <Select
                value={config.animationSpeed}
                onValueChange={(value) =>
                  updateConfig("animationSpeed", value)
                }
              >
                <SelectTrigger data-testid="select-animation-speed">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Instant)</SelectItem>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Sound Effects</Label>
                <p className="text-sm text-muted-foreground">
                  Play sounds for interactions
                </p>
              </div>
              <Switch
                checked={config.enableSoundEffects}
                onCheckedChange={(checked) =>
                  updateConfig("enableSoundEffects", checked)
                }
                data-testid="switch-sound-effects"
              />
            </div> */}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
