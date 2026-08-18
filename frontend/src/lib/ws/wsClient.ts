import { getAccessToken } from "../auth/tokenStorage";
import { refreshAccessToken } from "../api/client";

const WS_URL = (import.meta.env.VITE_API_URL as string).replace(
  /^http/,
  "ws",
);

type Listener = (payload: unknown) => void;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 15000;
let active = false;

const listeners = new Map<string, Set<Listener>>();

function dispatch(event: string, payload: unknown): void {
  listeners.get(event)?.forEach((fn) => fn(payload));
}

function openSocket(): void {
  const token = getAccessToken();
  const url = token ? `${WS_URL}/ws?token=${token}` : `${WS_URL}/ws`;

  socket = new WebSocket(url);

  socket.onopen = () => {
    reconnectDelay = 1000;
  };

  socket.onmessage = (event) => {
    try {
      const { event: name, payload } = JSON.parse(event.data);
      dispatch(name, payload);
    } catch {
    }
  };

  socket.onclose = () => {
    socket = null;
    if (active) scheduleReconnect();
  };

  socket.onerror = () => {
    socket?.close();
  };
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (!active) return;

    if (getAccessToken()) {
      await refreshAccessToken().catch(() => {});
    }
    openSocket();
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
  }, reconnectDelay);
}

export function connectWebSocket(): void {
  active = true;
  reconnectDelay = 1000;
  socket?.close();
  openSocket();
}

export function disconnectWebSocket(): void {
  active = false;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.close();
  socket = null;
}

export function onWsEvent(event: string, handler: Listener): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler);
  return () => {
    listeners.get(event)?.delete(handler);
  };
}
