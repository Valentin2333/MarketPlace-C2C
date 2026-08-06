const API_URL = import.meta.env.VITE_API_URL as string;

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  city: string | null;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error ?? "Something went wrong") as Error & {
      code?: string;
    };
    if (body?.code) error.code = body.code;
    throw error;
  }
  return body as T;
}

export async function registerRequest(params: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ user: PublicUser }> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJsonOrThrow(response);
}

export async function loginRequest(params: {
  email: string;
  password: string;
}): Promise<{ user: PublicUser } & TokenPair> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return parseJsonOrThrow(response);
}

export async function refreshRequest(
  refreshToken: string,
): Promise<TokenPair> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  return parseJsonOrThrow(response);
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}

export async function meRequest(
  accessToken: string,
): Promise<{ user: PublicUser }> {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseJsonOrThrow(response);
}

export async function requestPasswordResetRequest(
  email: string,
): Promise<void> {
  const response = await fetch(`${API_URL}/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong");
  }
}

export async function confirmPasswordResetRequest(params: {
  token: string;
  password: string;
}): Promise<void> {
  const response = await fetch(`${API_URL}/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong");
  }
}

export async function confirmEmailVerificationRequest(
  token: string,
): Promise<{ user: PublicUser } & TokenPair> {
  const response = await fetch(`${API_URL}/auth/verify-email/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return parseJsonOrThrow(response);
}

export async function resendVerificationRequest(email: string): Promise<void> {
  const response = await fetch(`${API_URL}/auth/verify-email/resend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Something went wrong");
  }
}
