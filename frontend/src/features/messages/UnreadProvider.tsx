import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { fetchUnread } from "../../lib/messages/messagesApi";
import { UnreadContext } from "./unread-context";
import type { UnreadApi } from "./unread-context";

export default function UnreadProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { userId, ready: authReady } = useCurrentUser();
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setUnreadMap({});
      setReady(true);
      return;
    }

    try {
      const rows = await fetchUnread();
      const map: Record<string, number> = {};
      for (const r of rows) {
        const key = `${r.listing_id}::${r.sender_id}`;
        map[key] = (map[key] ?? 0) + 1;
      }
      setUnreadMap(map);
    } finally {
      setReady(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!authReady) return;
    let active = true;
    (async () => {
      if (active) await refresh();
    })();
    return () => {
      active = false;
    };
  }, [authReady, refresh, location.pathname]);

  const markConversationRead = useCallback(
    (listingId: string, otherId: string) => {
      const key = `${listingId}::${otherId}`;
      setUnreadMap((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const unreadCount = useMemo(() => Object.keys(unreadMap).length, [unreadMap]);

  const api = useMemo<UnreadApi>(
    () => ({
      unreadCount,
      unreadByConversation: unreadMap,
      isLoggedIn: !!userId,
      ready,
      refresh,
      markConversationRead,
    }),
    [unreadCount, unreadMap, userId, ready, refresh, markConversationRead],
  );

  return (
    <UnreadContext.Provider value={api}>{children}</UnreadContext.Provider>
  );
}
