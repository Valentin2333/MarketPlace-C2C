import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { UnreadContext } from "../../components/Messages/unread-context";
import type { UnreadApi } from "../../components/Messages/unread-context";

type UnreadRow = {
  listing_id: string;
  sender_id: string;
};

export default function UnreadProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const uid = user?.id ?? null;
    setUserId(uid);

    if (!uid) {
      setUnreadMap({});
      setReady(true);
      return;
    }

    const { data } = await supabase
      .from("messages")
      .select("listing_id, sender_id")
      .eq("receiver_id", uid)
      .is("read_at", null);

    const map: Record<string, number> = {};
    for (const r of (data ?? []) as UnreadRow[]) {
      const key = `${r.listing_id}::${r.sender_id}`;
      map[key] = (map[key] ?? 0) + 1;
    }
    setUnreadMap(map);
    setReady(true);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) await refresh();
    })();
    return () => {
      active = false;
    };
  }, [refresh, location.pathname]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => subscription.unsubscribe();
  }, [refresh]);

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
