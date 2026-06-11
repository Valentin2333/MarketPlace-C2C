import { createContext } from "react";

export type FavoritesApi = {
  favoriteIds: string[];
  isFavorite: (listingId: string) => boolean;
  toggleFavorite: (listingId: string) => Promise<void>;
  isLoggedIn: boolean;
  ready: boolean;
};

export const FavoritesContext = createContext<FavoritesApi | null>(null);
