import { createContext } from "react";
import type { PublicUser } from "./authApi";

export type AuthContextValue = {
  user: PublicUser | null;
  ready: boolean;
  login: (
    email: string,
    password: string,
    turnstileToken?: string,
  ) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name?: string,
    turnstileToken?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  completeEmailVerification: (token: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
