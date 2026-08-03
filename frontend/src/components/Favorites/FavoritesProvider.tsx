import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../../lib/auth/useAuth";
import {
  fetchFavoriteIds,
  addFavoriteRequest,
  removeFavoriteRequest,
} from "../../lib/favorites/favoritesApi";
import { FavoritesContext } from "./favorites-context";
import type { FavoritesApi } from "./favorites-context";

export default function FavoritesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, ready: authReady } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let active = true;

    const load = async () => {
      if (!user) {
        if (active) {
          setFavoriteIds([]);
          setReady(true);
        }
        return;
      }

      if (active) setReady(false);

      try {
        const ids = await fetchFavoriteIds();
        if (active) {
          setFavoriteIds(ids);
          setReady(true);
        }
      } catch {
        if (active) setReady(true);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [authReady, user?.id]);

  const api = useMemo<FavoritesApi>(() => {
    const set = new Set(favoriteIds);
    return {
      favoriteIds,
      isFavorite: (listingId: string) => set.has(listingId),
      isLoggedIn: !!user,
      ready,
      toggleFavorite: async (listingId: string) => {
        if (!user) return;
        const wasFav = set.has(listingId);
        setFavoriteIds((prev) =>
          wasFav ? prev.filter((x) => x !== listingId) : [listingId, ...prev],
        );

        try {
          if (wasFav) {
            await removeFavoriteRequest(listingId);
          } else {
            await addFavoriteRequest(listingId);
          }
        } catch (err) {
          setFavoriteIds((prev) =>
            wasFav
              ? [listingId, ...prev]
              : prev.filter((x) => x !== listingId),
          );
          throw err;
        }
      },
    };
  }, [favoriteIds, user, ready]);

  return (
    <FavoritesContext.Provider value={api}>
      {children}
    </FavoritesContext.Provider>
  );
}
