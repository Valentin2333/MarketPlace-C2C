import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  registerRequest,
  loginRequest,
  refreshRequest,
  logoutRequest,
  meRequest,
  type PublicUser,
} from "./authApi";
import { getRefreshToken, setTokens, clearTokens } from "./tokenStorage";
import { AuthContext } from "./authContext";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        if (active) setReady(true);
        return;
      }

      try {
        const tokens = await refreshRequest(refreshToken);
        setTokens(tokens.accessToken, tokens.refreshToken);
        const { user: currentUser } = await meRequest(tokens.accessToken);
        if (active) setUser(currentUser);
      } catch {
        clearTokens();
      } finally {
        if (active) setReady(true);
      }
    };

    restore();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest({ email, password });
    setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      const result = await registerRequest({ email, password, name });
      setTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    clearTokens();
    setUser(null);
    if (refreshToken) {
      await logoutRequest(refreshToken).catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, register, logout }),
    [user, ready, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
