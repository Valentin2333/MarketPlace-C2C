import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { verifyAuthToken } from "../auth/jwt.js";

const connections = new Map<string, Set<WebSocket>>();

function registerConnection(ws: WebSocket, userId: string): void {
  if (!connections.has(userId)) {
    connections.set(userId, new Set());
  }
  connections.get(userId)!.add(ws);

  ws.on("close", () => {
    connections.get(userId)?.delete(ws);
    if (connections.get(userId)?.size === 0) {
      connections.delete(userId);
    }
  });

  ws.on("error", () => {
    connections.get(userId)?.delete(ws);
  });
}

export function initWebSocketServer(httpServer: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    if (!req.url?.startsWith("/ws")) {
      socket.destroy();
      return;
    }

    const origin = req.headers.origin;
    if (origin && origin !== process.env.FRONTEND_ORIGIN) {
      socket.destroy();
      return;
    }

    const url = new URL(req.url, "http://localhost");
    const token = url.searchParams.get("token");

    if (!token) {
      socket.destroy();
      return;
    }

    let userId: string;
    try {
      userId = verifyAuthToken(token).sub;
    } catch {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      registerConnection(ws, userId);
    });
  });
}

export function sendToUser(
  userId: string,
  event: string,
  payload: unknown,
): void {
  const sockets = connections.get(userId);
  if (!sockets) return;

  const message = JSON.stringify({ event, payload });
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}
