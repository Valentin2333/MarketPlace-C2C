import { apiJson, apiFetch } from "../api/client";

export async function fetchFavoriteIds(): Promise<string[]> {
  const response = await apiJson<{ listingIds: string[] }>("/favorites");
  return response.listingIds;
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Could not update favorites");
  }
}

export async function addFavoriteRequest(listingId: string): Promise<void> {
  const response = await apiFetch(`/favorites/${listingId}`, {
    method: "POST",
  });
  await throwIfNotOk(response);
}

export async function removeFavoriteRequest(listingId: string): Promise<void> {
  const response = await apiFetch(`/favorites/${listingId}`, {
    method: "DELETE",
  });
  await throwIfNotOk(response);
}
