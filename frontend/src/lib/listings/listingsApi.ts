import { apiJson, apiFetch } from "../api/client";

export type ListingImage = { id?: string; url: string; position: number };

export type ListingSummary = {
  id: string;
  title: string;
  price: number | null;
  city: string | null;
  listing_images: ListingImage[];
};

export type ListingDetail = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  city: string | null;
  created_at: string | null;
  categoryId: number | null;
  categories: { name: string } | null;
  listing_images: ListingImage[];
  profiles: { id: string; name: string | null; avatar_url: string | null } | null;
};

export type Category = { id: number; name: string; slug: string };

export type ListingFilters = {
  q?: string;
  category?: string;
  city?: string;
  min?: string;
  max?: string;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc";
  userId?: string;
  limit?: number;
  offset?: number;
};

function buildQuery(filters: ListingFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.city) params.set("city", filters.city);
  if (filters.min) params.set("min", filters.min);
  if (filters.max) params.set("max", filters.max);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.limit !== undefined) params.set("limit", String(filters.limit));
  if (filters.offset !== undefined)
    params.set("offset", String(filters.offset));
  return params.toString();
}

type ListingsApiResponse = {
  listings: {
    id: string;
    title: string;
    price: number | null;
    city: string | null;
    images: { url: string; position: number }[];
  }[];
  total: number | null;
};

export async function fetchListings(
  filters: ListingFilters,
): Promise<{ listings: ListingSummary[]; total: number | null }> {
  const qs = buildQuery(filters);
  const response = await apiJson<ListingsApiResponse>(
    `/listings${qs ? `?${qs}` : ""}`,
  );

  return {
    listings: response.listings.map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      city: l.city,
      listing_images: l.images,
    })),
    total: response.total,
  };
}

export async function fetchListingCities(): Promise<string[]> {
  const response = await apiJson<{ cities: string[] }>("/listings/cities");
  return response.cities;
}

type ListingDetailApiResponse = {
  listing: {
    id: string;
    title: string;
    description: string | null;
    price: number | null;
    city: string | null;
    created_at: string;
    categoryId: number | null;
    category: { name: string } | null;
    seller: { id: string; name: string | null; avatarUrl: string | null } | null;
    images: { id: string; url: string; position: number }[];
  };
};

export async function fetchListing(id: string): Promise<ListingDetail> {
  const response = await apiJson<ListingDetailApiResponse>(`/listings/${id}`);
  const l = response.listing;

  return {
    id: l.id,
    title: l.title,
    description: l.description,
    price: l.price,
    city: l.city,
    created_at: l.created_at,
    categoryId: l.categoryId,
    categories: l.category,
    listing_images: l.images,
    profiles: l.seller
      ? { id: l.seller.id, name: l.seller.name, avatar_url: l.seller.avatarUrl }
      : null,
  };
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await apiJson<{ categories: Category[] }>("/categories");
  return response.categories;
}

export async function fetchPublicUser(
  id: string,
): Promise<{ id: string; name: string | null; avatarUrl: string | null } | null> {
  try {
    const response = await apiJson<{
      user: { id: string; name: string | null; avatarUrl: string | null };
    }>(`/users/${id}`);
    return response.user;
  } catch {
    return null;
  }
}

export type ListingInput = {
  title: string;
  description: string;
  price: number;
  city: string;
  categoryId: number;
  images?: { url: string; position: number }[];
};

export async function createListingRequest(
  input: ListingInput,
): Promise<{ id: string }> {
  return apiJson<{ id: string }>("/listings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

async function throwIfNotOk(response: Response): Promise<void> {
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong");
  }
}

export async function updateListingRequest(
  id: string,
  input: ListingInput,
): Promise<void> {
  const response = await apiFetch(`/listings/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  await throwIfNotOk(response);
}

export async function deleteListingRequest(id: string): Promise<void> {
  const response = await apiFetch(`/listings/${id}`, { method: "DELETE" });
  await throwIfNotOk(response);
}
