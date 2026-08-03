import { useAuth } from "./auth/useAuth";

export function useCurrentUser() {
  const { user, ready } = useAuth();

  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    role: user?.role ?? null,
    isAdmin: user?.role === "admin",
    isBanned: user?.role === "banned",
    ready,
  };
}
