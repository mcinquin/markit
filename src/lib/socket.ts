import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Singleton Socket.io client, always same-origin.
 * Avoid NEXT_PUBLIC_APP_URL: it is baked at build time and may point
 * at the wrong host, breaking cookies / auth on the handshake.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/api/socketio",
      addTrailingSlash: false,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      // Prefer websocket; fall back to polling if the proxy blocks upgrades
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
