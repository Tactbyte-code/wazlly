/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 * ============================================================
 */

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    MessageSquare,
    Send,
    X,
    Search,
    ArrowLeft,
    HelpCircle,
    ChevronDown,
    Clock,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// We get siteId and channelId from URL params or window.aiChatConfig if embedded
const getQueryParam = (name: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
};

export default function WidgetChat() {
    const siteId = getQueryParam("siteId") || (window as any).aiChatConfig?.siteId;
    const channelId = getQueryParam("channelId") || (window as any).aiChatConfig?.channelId;

    const [screen, setScreen] = useState<"home" | "chat" | "search">("home");
    const [chatInput, setChatInput] = useState("");
    const [sessionId] = useState(() => Math.random().toString(36).substring(7));
    const [conversationId, setConversationId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { data: configData } = useQuery({
        queryKey: ["/api/widget/config", siteId],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/widget/config/${siteId}`);
            return res.json();
        },
        enabled: !!siteId,
    });

    const config = configData?.config || {};
    const primaryColor = config.primaryColor || "#3b82f6";

    const { data: messages = [], refetch: refetchMessages } = useQuery({
        queryKey: ["/api/widget/messages", conversationId],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/widget/conversation/${conversationId}`);
            const data = await res.json();
            return data.messages || [];
        },
        enabled: !!conversationId,
        refetchInterval: 5000,
    });

    const sendMessageMutation = useMutation({
        mutationFn: async (text: string) => {
            const res = await apiRequest("POST", "/api/widget/chat", {
                siteId,
                channelId,
                sessionId,
                conversationId,
                message: text,
            });
            return res.json();
        },
        onSuccess: (data) => {
            if (data.conversationId) setConversationId(data.conversationId);
            refetchMessages();
        },
    });

    const handleSendMessage = () => {
        if (!chatInput.trim()) return;
        const text = chatInput;
        setChatInput("");
        sendMessageMutation.mutate(text);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    if (!siteId) {
        return <div className="p-10 text-center">Invalid Widget Configuration (Missing siteId)</div>;
    }

    return (
        <div className="flex flex-col h-screen bg-white max-w-md mx-auto border-x shadow-xl overflow-hidden">
            {/* Header */}
            <div
                className="p-4 text-white"
                style={{ backgroundColor: primaryColor }}
            >
                <div className="flex items-center gap-3">
                    {screen !== "home" && (
                        <button onClick={() => setScreen("home")} className="p-1 hover:bg-white/20 rounded">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                    )}
                    <div className="flex-1">
                        <h3 className="font-semibold">{config.title || "Chat Support"}</h3>
                        <p className="text-xs opacity-90">{config.subtitle || "We're online"}</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 bg-slate-50">
                {screen === "home" && (
                    <div className="p-6 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 border">
                            <h2 className="text-xl font-bold">Hello! 👋</h2>
                            <p className="text-slate-600">{config.greeting || "How can we help you today?"}</p>
                            <Button
                                onClick={() => setScreen("chat")}
                                className="w-full h-12 text-lg"
                                style={{ backgroundColor: primaryColor }}
                            >
                                Send us a message
                            </Button>
                        </div>

                        <div className="space-y-3">
                            <p className="text-sm font-semibold text-slate-500 uppercase">Usual response time</p>
                            <div className="flex items-center gap-2 text-slate-700">
                                <Clock className="h-4 w-4" />
                                <span>{config.responseTime || "Under a few minutes"}</span>
                            </div>
                        </div>
                    </div>
                )}

                {screen === "chat" && (
                    <div className="p-4 space-y-4">
                        {messages.map((msg: any) => (
                            <div key={msg.id} className={`flex ${msg.fromType === "user" ? "justify-end" : "justify-start"}`}>
                                <div
                                    className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${msg.fromType === "user" ? "bg-primary text-white" : "bg-white text-slate-800 border"
                                        }`}
                                    style={msg.fromType === "user" ? { backgroundColor: primaryColor } : {}}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        <div ref={scrollRef} />
                    </div>
                )}
            </ScrollArea>

            {/* Footer / Input */}
            {screen === "chat" && (
                <div className="p-4 bg-white border-t">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Type a message..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                            disabled={sendMessageMutation.isPending}
                        />
                        <Button
                            size="icon"
                            onClick={handleSendMessage}
                            style={{ backgroundColor: primaryColor }}
                            disabled={sendMessageMutation.isPending || !chatInput.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
