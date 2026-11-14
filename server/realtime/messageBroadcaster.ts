
import type { Server } from "socket.io";
import { getWidgetRoom } from "./widgetSocket";

type BroadcastMessageParams = {
  siteId: string;
  sessionId: string;
  conversationId: string;
  message: {
    id: string;
    content: string;
    fromUser: boolean;
    fromType: string;
    createdAt: Date | string;
    status?: string | null;
  };
};

export function broadcastNewMessage(
  io: Server,
  {
    siteId,
    sessionId,
    conversationId,
    message,
  }: BroadcastMessageParams,
) {
  const payload = {
    conversationId,
    message: {
      ...message,
      createdAt: new Date(message.createdAt).toISOString(),
    },
  };

  // Deliver to the visitor's widget session.
  io.to(getWidgetRoom(siteId, sessionId)).emit(
    "new_message",
    payload,
  );

  // Deliver to agents and other participants.
  io.to(`conversation:${conversationId}`).emit(
    "new_message",
    payload,
  );
}
