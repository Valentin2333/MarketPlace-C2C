import { apiJson } from "../api/client";

export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const result = await apiJson<{ success: boolean }>("/turnstile/verify", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  return result.success === true;
}
