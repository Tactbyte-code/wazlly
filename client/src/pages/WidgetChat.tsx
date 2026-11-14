import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, Clock } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useWidgetSocket } from "@/hooks/useWidgetSocket";

type WidgetMessage = {
  id: string;
  content: string;
  fromUser?: boolean;
  fromType: string;
  createdAt: string | Date;
  status?: string | null;
  optimistic?: boolean;
};

type IncomingMessagePayload = {
  conversationId: string;
  message: WidgetMessage;
};

// We get siteId and channelId from URL params or window.aiChatConfig if embedded.
const getQueryParam = (name: string) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

const getMessagesQueryKey = (conversationId: string) => [
  "/api/widget/messages",
  conversationId,
];

export default function WidgetChat() {
  const siteId =
    getQueryParam("siteId") || (window as any).aiChatConfig?.siteId;

  const channelId =
    getQueryParam("channelId") || (window as any).aiChatConfig?.channelId;

  const [screen, setScreen] = useState<"home" | "chat" | "search">("home");
  const [chatInput, setChatInput] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const lastMessageSentAt = useRef(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const configQuery = useQuery({
    queryKey: ["/api/widget/config", siteId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/widget/config/${siteId}`);
      return res.json();
    },
    enabled: !!siteId,
  });

  const config = configQuery.data?.config || {};
  const primaryColor = config.primaryColor || "#3b82f6";

  const welcomeMessage = {
    id: "welcome-message",
    content:
      config.greeting || "Hi there! 👋 Welcome! How can I help you today?",
    fromType: "bot",
    createdAt: new Date().toISOString(),
  };

  const { data: messages = [], refetch: refetchMessages } = useQuery<
    WidgetMessage[]
  >({
    queryKey: getMessagesQueryKey(conversationId || ""),
    queryFn: async () => {
      if (!conversationId) return [];

      const res = await apiRequest(
        "GET",
        `/api/widget/conversation/${conversationId}`,
      );

      const data = await res.json();
      return data.messages || [];
    },
    enabled: !!conversationId,
    refetchInterval: 30000,
  });

  // Add an incoming message to the correct conversation cache.
  // Message IDs are used to avoid duplicates between Socket.IO and REST.
  const handleIncomingMessage = useCallback(
    (payload: IncomingMessagePayload) => {
      const { conversationId: incomingConversationId, message } = payload;

      if (!incomingConversationId || !message?.id) return;

      if (message.fromType !== "user") {
        setIsBotTyping(false);
      }

      setConversationId((currentId) => {
        if (currentId !== incomingConversationId) {
          return incomingConversationId;
        }

        return currentId;
      });

      queryClient.setQueryData<WidgetMessage[]>(
        getMessagesQueryKey(incomingConversationId),
        (oldMessages = []) => {
          const exists = oldMessages.some((item) => item.id === message.id);

          if (exists) return oldMessages;

          return [...oldMessages, message];
        },
      );
    },
    [],
  );

  const { connected, joined } = useWidgetSocket({
    siteId,
    sessionId,
    onMessage: handleIncomingMessage,
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

    onMutate: async (text: string) => {
      const queryKey = getMessagesQueryKey(conversationId || "");

      await queryClient.cancelQueries({
        queryKey,
      });

      const previousMessages =
        queryClient.getQueryData<WidgetMessage[]>(queryKey) || [];

      const optimisticMessage: WidgetMessage = {
        id: `optimistic-${crypto.randomUUID()}`,
        content: text,
        fromUser: true,
        fromType: "user",
        createdAt: new Date().toISOString(),
        optimistic: true,
      };

      queryClient.setQueryData<WidgetMessage[]>(queryKey, [
        ...previousMessages,
        optimisticMessage,
      ]);

      return {
        queryKey,
        previousMessages,
      };
    },
    
    onError: (_error, _text, context) => {
      setIsBotTyping(false);

      if (context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousMessages);
      }
    },

    onSuccess: async (data) => {
      if (data.conversationId) {
        setConversationId(data.conversationId);

        await queryClient.invalidateQueries({
          queryKey: getMessagesQueryKey(data.conversationId),
        });
      }
    },

    onSettled: async () => {
      if (conversationId) {
        await queryClient.invalidateQueries({
          queryKey: getMessagesQueryKey(conversationId),
        });
      }
    },
  });

  const handleSendMessage = () => {
    const text = chatInput.trim();

    if (!text || sendMessageMutation.isPending) return;

    setChatInput("");

    lastMessageSentAt.current = Date.now();
    setIsBotTyping(true);

    sendMessageMutation.mutate(text);
  };

  // Recover missed messages after Socket.IO reconnects.
  const previousConnectionState = useRef(false);

  useEffect(() => {
    if (
      connected &&
      joined &&
      !previousConnectionState.current &&
      conversationId
    ) {
      refetchMessages();
    }

    previousConnectionState.current = connected && joined;
  }, [connected, joined, conversationId, refetchMessages]);

  useEffect(() => {
    if (!isBotTyping || !lastMessageSentAt.current) return;

    const hasBotResponded = messages.some((message) => {
      if (message.fromType === "user") return false;

      const messageTime = new Date(message.createdAt).getTime();

      return messageTime >= lastMessageSentAt.current;
    });

    if (hasBotResponded) {
      setIsBotTyping(false);
    }
  }, [messages, isBotTyping]);

  // Scroll to the latest message when messages change.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({
        behavior: "smooth",
      });
    }
  }, [messages]);

  if (!siteId) {
    return (
      <div className="p-10 text-center">
        Invalid Widget Configuration (Missing siteId)
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white max-w-md mx-auto border-x shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 text-white" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center gap-3">
          {screen !== "home" && (
            <button
              onClick={() => setScreen("home")}
              className="p-1 hover:bg-white/20 rounded"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}

          <div className="flex-1">
            <h3 className="font-semibold">{config.title || "Chat Support"}</h3>

            <p className="text-xs opacity-90">
              {config.subtitle || "We're online"}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 bg-slate-50">
        {screen === "home" && (
          <div className="p-6 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4 border">
              <h2 className="text-xl font-bold">Hello! 👋</h2>

              <p className="text-slate-600">
                {config.greeting || "How can we help you today?"}
              </p>

              <Button
                onClick={() => setScreen("chat")}
                className="w-full h-12 text-lg"
                style={{ backgroundColor: primaryColor }}
              >
                Send us a message
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-500 uppercase">
                Usual response time
              </p>

              <div className="flex items-center gap-2 text-slate-700">
                <Clock className="h-4 w-4" />

                <span>{config.responseTime || "Under a few minutes"}</span>
              </div>
            </div>
          </div>
        )}

        {screen === "chat" && (
          <div className="p-4 space-y-4">
            {[welcomeMessage, ...messages].map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.fromType === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${
                    msg.fromType === "user"
                      ? "bg-primary text-white"
                      : "bg-white text-slate-800 border"
                  }`}
                  style={
                    msg.fromType === "user"
                      ? { backgroundColor: primaryColor }
                      : {}
                  }
                >
                  {msg.fromType === "user" ? (
                    <div className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="chat-markdown break-words">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || ""}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isBotTyping && (
              <div className="flex justify-start">
                <div className="bg-white border shadow-sm rounded-2xl px-4 py-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" />
                </div>
              </div>
            )}

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
