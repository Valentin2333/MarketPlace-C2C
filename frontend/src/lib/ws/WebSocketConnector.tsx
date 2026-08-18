import { useEffect } from "react";
import { useAuth } from "../auth/useAuth";
import { connectWebSocket, disconnectWebSocket } from "./wsClient";

export default function WebSocketConnector() {
  const { ready, user } = useAuth();

  useEffect(() => {
    if (!ready) return;

    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [ready, user?.id]);

  return null;
}
