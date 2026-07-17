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

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Bot } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { useLocation } from "wouter";

interface Chatbot {
  data: ChatbotItem[];
}

interface ChatbotItem {
  id: string;
  uuid: string;
  title: string;
  bubbleMessage: string;
  welcomeMessage: string;
  connectMessage: string;
  language: string;
  interactionType: string;
  avatarId?: string | null;
  avatarEmoji?: string | null;
  avatarColor?: string | null;
  primaryColor?: string;
  logoUrl?: string | null;
  embedWidth?: number;
  embedHeight?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ✅ Fetch all chatbots
const fetchChatbots = async (): Promise<Chatbot[]> => {
  const res = await apiRequest("GET", "/api/chatbots");
  const newRes = res.json();
  return newRes;
};

export default function ChatbotList() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();
  const [location , setLocation] = useLocation();
  // Use react-query for caching and fetching
  const {
    data: resNewData,
    isLoading,
    isError,
  } = useQuery<Chatbot[]>({
    queryKey: ["/api/chatbots"],
    queryFn: fetchChatbots,
  });

  const chatbots = resNewData || [];
  console.log(chatbots);
  // Simple search filter
  const filteredChatbots = chatbots?.data?.filter((bot) =>
    bot.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  console.log(filteredChatbots);

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header title={t("chatbot.title")} subtitle={t("chatbot.subtitle")}     
      action={{
          label: `${t('chatbot.addContact.title')}`,
          onClick: () => setLocation("/add/chatbot-builder"),
        }}/>

      <main className="p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Chatbots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search chatbots..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Primary Color</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          Loading chatbots...
                        </TableCell>
                      </TableRow>
                    ) : isError ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-destructive"
                        >
                          Failed to load chatbots
                        </TableCell>
                      </TableRow>
                    ) : filteredChatbots.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No chatbots found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredChatbots.map((bot) => (
                        <TableRow key={bot.id}>
                          <TableCell className="font-medium">
                            {bot.title}
                          </TableCell>
                          <TableCell className="capitalize">
                            {bot.language}
                          </TableCell>
                          <TableCell>{bot.interactionType}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-4 h-4 rounded-full border"
                                style={{
                                  backgroundColor: bot.primaryColor || "#ddd",
                                }}
                              ></div>
                              <span className="font-mono text-xs">
                                {bot.primaryColor || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                bot.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-200 text-gray-600"
                              }`}
                            >
                              {bot.isActive ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {new Date(bot.createdAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
      </main>
    </div>
  );
}
