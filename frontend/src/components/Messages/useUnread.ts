import { useContext } from "react";
import { UnreadContext } from "../../components/Messages/unread-context";

export function useUnread() {
  const ctx = useContext(UnreadContext);
  if (!ctx) {
    throw new Error("useUnread must be used within an UnreadProvider");
  }
  return ctx;
}
