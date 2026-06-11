import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { FavoritesContext } from "./favorites-context";
import type { FavoritesApi } from "./favorites-context";

export default function FavoritesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const loadFor = async (uid: string | null) => {
      if (!uid) {
        if (active) {
          setFavoriteIds([]);
          setReady(true);
        }
        return;
      }
      const { data } = await supabase
        .from("favorites")
        .select("listing_id, created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (!active) return;
      setFavoriteIds(
        ((data ?? []) as { listing_id: string }[]).map((r) => r.listing_id),
      );
      setReady(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      loadFor(uid);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      setReady(false);
      loadFor(uid);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const api = useMemo<FavoritesApi>(() => {
    const set = new Set(favoriteIds);
    return {
      favoriteIds,
      isFavorite: (listingId: string) => set.has(listingId),
      isLoggedIn: !!userId,
      ready,
      toggleFavorite: async (listingId: string) => {
        if (!userId) return;
        const wasFav = set.has(listingId);
        setFavoriteIds((prev) =>
          wasFav ? prev.filter((x) => x !== listingId) : [listingId, ...prev],
        );

        const { error } = wasFav
          ? await supabase
              .from("favorites")
              .delete()
              .eq("user_id", userId)
              .eq("listing_id", listingId)
          : await supabase
              .from("favorites")
              .insert({ user_id: userId, listing_id: listingId });

        if (error) {
          setFavoriteIds((prev) =>
            wasFav ? [listingId, ...prev] : prev.filter((x) => x !== listingId),
          );
          throw error;
        }
      },
    };
  }, [favoriteIds, userId, ready]);

  return (
    <FavoritesContext.Provider value={api}>
      {children}
    </FavoritesContext.Provider>
  );
}
