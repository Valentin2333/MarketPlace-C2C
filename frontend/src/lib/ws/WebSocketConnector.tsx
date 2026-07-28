import { useEffect } from "react";
import { useAuth } from "../auth/useAuth";
import { connectWebSocket, disconnectWebSocket } from "./wsClient";

export default function WebSocketConnector() {
  const { user, ready } = useAuth();

  useEffect(() => {
    if (!ready) return;

    if (user) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [ready, user?.id]);

  return null;
}
