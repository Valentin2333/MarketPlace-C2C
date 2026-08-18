import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { verifyAuthToken } from "../auth/jwt.js";

const connections = new Map<string, Set<WebSocket>>();
const adminSockets = new Set<WebSocket>();
const allSockets = new Set<WebSocket>();

function registerConnection(
  ws: WebSocket,
  userId: string | null,
  role: string | null,
): void {
  allSockets.add(ws);

  if (userId) {
    if (!connections.has(userId)) {
      connections.set(userId, new Set());
    }
    connections.get(userId)!.add(ws);
  }

  if (role === "admin") {
    adminSockets.add(ws);
  }

  const cleanup = () => {
    allSockets.delete(ws);
    adminSockets.delete(ws);
    if (userId) {
      connections.get(userId)?.delete(ws);
      if (connections.get(userId)?.size === 0) {
        connections.delete(userId);
      }
    }
  };

  ws.on("close", cleanup);
  ws.on("error", cleanup);
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

    let userId: string | null = null;
    let role: string | null = null;

    if (token) {
      try {
        const payload = verifyAuthToken(token);
        userId = payload.sub;
        role = payload.role;
      } catch {
      }
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      registerConnection(ws, userId, role);
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

export function broadcastToAdmins(event: string, payload: unknown): void {
  const message = JSON.stringify({ event, payload });
  for (const ws of adminSockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

export function broadcastToAll(event: string, payload: unknown): void {
  const message = JSON.stringify({ event, payload });
  for (const ws of allSockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}
