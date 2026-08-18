import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  registerRequest,
  loginRequest,
  googleLoginRequest,
  logoutRequest,
  meRequest,
  confirmEmailVerificationRequest,
  type PublicUser,
} from "./authApi";
import { getRefreshToken, setTokens, clearTokens } from "./tokenStorage";
import { refreshAccessToken } from "../api/client";
import { AuthContext } from "./authContext";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const restore = async () => {
      if (!getRefreshToken()) {
        if (active) setReady(true);
        return;
      }

      const accessToken = await refreshAccessToken();
      if (!accessToken) {
        if (active) setReady(true);
        return;
      }

      try {
        const { user: currentUser } = await meRequest(accessToken);
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

  const loginWithGoogle = useCallback(async (credential: string) => {
    const result = await googleLoginRequest(credential);
    setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      await registerRequest({ email, password, name });
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

  const completeEmailVerification = useCallback(async (token: string) => {
    const result = await confirmEmailVerificationRequest(token);
    setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      login,
      loginWithGoogle,
      register,
      logout,
      completeEmailVerification,
    }),
    [
      user,
      ready,
      login,
      loginWithGoogle,
      register,
      logout,
      completeEmailVerification,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
