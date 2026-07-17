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
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Smartphone,
  BotIcon,
  Key,
  SettingsIcon,
  Database,
  LayoutTemplate,
} from "lucide-react";
import TeamMembers from "@/components/user-details/TeamMembers";
import Channels from "@/components/user-details/Channel";
import Contacts from "@/components/user-details/Contacts";
import { useRoute } from "wouter";
import Templates from "@/components/user-details/Templates";
import Campaigns from "@/components/user-details/Campaigns";
import Subscriptions from "@/components/user-details/Subscriptions";

interface UserType {
  id: string;
  username: string;
  email: string;
  role: string;
  phone?: string;
  groups?: string[];
}

export default function UserDetails() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("channels");
  const [match, params] = useRoute("/users/:id");
  const userId = params?.id;
  if (!userId) return <p>{t("users.userDetails.userIdNotFound")}</p>;
  // Static user data for now
  const user: UserType = {
    id: "1",
    username: "JohnDoe",
    email: "john.doe@example.com",
    role: "admin",
    phone: "+123456789",
    groups: ["Team A", "Project X"],
  };

  return (
    <div className="flex-1 min-h-screen dots-bg">
      <Header title={t("users.userDetails.title")} subtitle={t("users.userDetails.subtitle")} />

      <main className="p-6">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger
              value="channels"
              className="flex items-center space-x-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>{t("users.userDetails.channels")}</span>
            </TabsTrigger>

            <TabsTrigger value="team" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span>{t("users.userDetails.teamMembers")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="Contact"
              className="flex items-center space-x-2"
            >
              <BotIcon className="w-4 h-4" />
              <span>{t("users.userDetails.contacts")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="templates"
              className="flex items-center space-x-2"
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>{t("users.userDetails.templates")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="campaigns"
              className="flex items-center space-x-2"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>{t("users.userDetails.campaigns")}</span>
            </TabsTrigger>

            <TabsTrigger
              value="subscriptions"
              className="flex items-center space-x-2"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>{t("users.userDetails.subscriptions")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Channels Tab */}
          <TabsContent value="channels">
            <Channels userId={userId} />
          </TabsContent>

          {/* Team Members Tab */}
          <TabsContent value="team">
            {/* <h2 className="text-lg font-semibold mb-2">Team Members</h2>
            <p>Team members for {user.username} will be listed here.</p> */}
            <TeamMembers userId={userId} />
          </TabsContent>

          <TabsContent value="Contact">
            <Contacts userId={userId} />
          </TabsContent>

          <TabsContent value="templates">
            <Templates userId={userId} />
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns">
            <Campaigns userId={userId} />
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Subscriptions userId={userId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
