import { useEffect } from "react";
import { useAuth } from "../auth/useAuth";
import { connectWebSocket, disconnectWebSocket } from "./wsClient";

export default function WebSocketConnector() {
  const { ready, user } = useAuth();

  useEffect(() => {
    if (!ready) return;

    // Always connect, even when logged out — anonymous visitors still
    // receive public events (e.g. new listings). Reconnecting here on
    // user?.id change ensures the socket picks up the new auth state
    // (or drops it) right away on login/logout, rather than waiting for
    // whatever token happened to be embedded in the old connection.
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, [ready, user?.id]);

  return null;
}
