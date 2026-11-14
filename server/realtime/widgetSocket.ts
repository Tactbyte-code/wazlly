import type { Server, Socket } from "socket.io";

type WidgetJoinPayload = {
  siteId: string;
  sessionId: string;
};

type AuthorizeWidgetSession = (params: {
  siteId: string;
  sessionId: string;
  origin: string | undefined;
}) => Promise<boolean>;

export function getWidgetRoom(siteId: string, sessionId: string) {
  return `widget:${siteId}:${sessionId}`;
}

export function registerWidgetSocketHandlers(
  io: Server,
  authorizeWidgetSession: AuthorizeWidgetSession,
) {
  io.on("connection", (socket: Socket) => {
    socket.on(
      "widget:join",
      async (
        payload: WidgetJoinPayload,
        acknowledge?: (result: { ok: boolean; error?: string }) => void,
      ) => {
        try {
          const { siteId, sessionId } = payload || {};

          if (!siteId || !sessionId) {
            acknowledge?.({
              ok: false,
              error: "Missing siteId or sessionId",
            });
            return;
          }

          const authorized = await authorizeWidgetSession({
            siteId,
            sessionId,
            origin: socket.handshake.headers.origin,
          });

          if (!authorized) {
            acknowledge?.({
              ok: false,
              error: "Widget session is not authorized",
            });
            return;
          }

          const room = getWidgetRoom(siteId, sessionId);

          await socket.join(room);

          socket.data.widget = {
            siteId,
            sessionId,
          };

          acknowledge?.({ ok: true });

          console.log(`[Widget Socket] Joined ${room}`);
        } catch (error) {
          console.error("[Widget Socket] Join failed:", error);

          acknowledge?.({
            ok: false,
            error: "Failed to join widget session",
          });
        }
      },
    );

    socket.on("widget:leave", async () => {
      const widget = socket.data.widget;

      if (!widget) return;

      await socket.leave(
        getWidgetRoom(widget.siteId, widget.sessionId),
      );

      delete socket.data.widget;
    });
  });
}
