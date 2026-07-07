import { createContext } from "react";

export type UnreadApi = {
  unreadCount: number;
  unreadByConversation: Record<string, number>;
  isLoggedIn: boolean;
  ready: boolean;
  refresh: () => Promise<void>;
  markConversationRead: (listingId: string, otherId: string) => void;
};

export const UnreadContext = createContext<UnreadApi | null>(null);
