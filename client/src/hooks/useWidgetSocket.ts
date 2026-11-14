
import { useEffect, useRef, useState } from "react";
import { getWidgetSocket } from "@/lib/widgetSocket";

type IncomingMessage = {
  conversationId: string;
  message: {
    id: string;
    content: string;
    fromUser: boolean;
    fromType: string;
    createdAt: string;
    status?: string;
  };
};

type UseWidgetSocketParams = {
  siteId: string;
  sessionId: string;
  onMessage: (payload: IncomingMessage) => void;
};

export function useWidgetSocket({
  siteId,
  sessionId,
  onMessage,
}: UseWidgetSocketParams) {
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!siteId || !sessionId) return;

    const socket = getWidgetSocket();

    const joinWidget = () => {
      setConnected(true);
      setJoined(false);

      socket.emit(
        "widget:join",
        { siteId, sessionId },
        (result: { ok: boolean; error?: string }) => {
          if (!result?.ok) {
            console.error(
              "[Widget Socket] Unable to join:",
              result?.error,
            );
            setJoined(false);
            return;
          }

          setJoined(true);
          console.log("[Widget Socket] Session joined");
        },
      );
    };

    const handleDisconnect = () => {
      setConnected(false);
      setJoined(false);
    };

    const handleNewMessage = (payload: IncomingMessage) => {
      if (!payload?.message?.id) return;

      onMessageRef.current(payload);
    };

    socket.on("connect", joinWidget);
    socket.on("disconnect", handleDisconnect);
    socket.on("new_message", handleNewMessage);

    if (!socket.connected) {
      socket.connect();
    } else {
      joinWidget();
    }

    return () => {
      socket.off("connect", joinWidget);
      socket.off("disconnect", handleDisconnect);
      socket.off("new_message", handleNewMessage);

      if (socket.connected) {
        socket.emit("widget:leave");
      }
    };
  }, [siteId, sessionId]);

  return {
    connected,
    joined,
  };
}
