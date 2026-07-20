import { apiJson, apiFetch } from "../api/client";

export type PublicUser = {
  id: string;
  name: string | null;
  city: string | null;
  avatar_url: string | null;
  role: string | null;
};

type UserApiResponse = {
  id: string;
  name: string | null;
  city: string | null;
  avatarUrl: string | null;
  role: string;
};

function mapUser(u: UserApiResponse): PublicUser {
  return {
    id: u.id,
    name: u.name,
    city: u.city,
    avatar_url: u.avatarUrl,
    role: u.role,
  };
}

export async function fetchPublicUser(id: string): Promise<PublicUser | null> {
  try {
    const response = await apiJson<{ user: UserApiResponse }>(`/users/${id}`);
    return mapUser(response.user);
  } catch {
    return null;
  }
}

export type UpdateOwnProfileInput = {
  name?: string;
  city?: string | null;
  avatarUrl?: string;
};

export async function updateOwnProfile(
  input: UpdateOwnProfileInput,
): Promise<PublicUser> {
  const response = await apiFetch("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "Could not update profile");
  }
  return mapUser((body as { user: UserApiResponse }).user);
}

export async function deleteOwnAccount(): Promise<void> {
  const response = await apiFetch("/users/me", { method: "DELETE" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Could not delete account");
  }
}

export async function updateUserRole(
  userId: string,
  role: "user" | "banned",
): Promise<PublicUser> {
  const response = await apiFetch(`/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? "Could not update user role");
  }
  return mapUser((body as { user: UserApiResponse }).user);
}
