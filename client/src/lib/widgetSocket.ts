
import { io, type Socket } from "socket.io-client";

let widgetSocket: Socket | null = null;

function getSocketUrl() {
  return (
    (window as any).aiChatConfig?.apiUrl ||
    window.location.origin
  );
}

export function getWidgetSocket(): Socket {
  if (!widgetSocket) {
    widgetSocket = io(getSocketUrl(), {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }

  return widgetSocket;
}

export function disconnectWidgetSocket() {
  if (widgetSocket) {
    widgetSocket.disconnect();
    widgetSocket = null;
  }
}
