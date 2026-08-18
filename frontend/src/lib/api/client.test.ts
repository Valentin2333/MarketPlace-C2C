import { describe, it, expect, beforeEach, vi } from "vitest";
import { refreshAccessToken, apiFetch, apiJson } from "./client";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "../auth/tokenStorage";
import { refreshRequest } from "../auth/authApi";

vi.mock("../auth/tokenStorage", () => ({
  getAccessToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
}));

vi.mock("../auth/authApi", () => ({
  refreshRequest: vi.fn(),
}));

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

describe("refreshAccessToken", () => {
  it("returns null and never calls refreshRequest when there's no refresh token", async () => {
    vi.mocked(getRefreshToken).mockReturnValue(null);

    const result = await refreshAccessToken();

    expect(result).toBeNull();
    expect(refreshRequest).not.toHaveBeenCalled();
  });

  it("stores and returns the new tokens on success", async () => {
    vi.mocked(getRefreshToken).mockReturnValue("old-refresh");
    vi.mocked(refreshRequest).mockResolvedValue({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });

    const result = await refreshAccessToken();

    expect(result).toBe("new-access");
    expect(setTokens).toHaveBeenCalledWith("new-access", "new-refresh");
  });

  it("clears tokens and returns null when the refresh request fails", async () => {
    vi.mocked(getRefreshToken).mockReturnValue("old-refresh");
    vi.mocked(refreshRequest).mockRejectedValue(new Error("expired"));

    const result = await refreshAccessToken();

    expect(result).toBeNull();
    expect(clearTokens).toHaveBeenCalledOnce();
  });

  it("shares a single in-flight request across concurrent callers", async () => {
    vi.mocked(getRefreshToken).mockReturnValue("old-refresh");
    let resolveRefresh!: (tokens: {
      accessToken: string;
      refreshToken: string;
    }) => void;
    vi.mocked(refreshRequest).mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const first = refreshAccessToken();
    const second = refreshAccessToken();

    resolveRefresh({ accessToken: "new-access", refreshToken: "new-refresh" });
    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(refreshRequest).toHaveBeenCalledOnce();
    expect(firstResult).toBe("new-access");
    expect(secondResult).toBe("new-access");
  });

  it("allows a fresh refresh after the previous one has settled", async () => {
    vi.mocked(getRefreshToken).mockReturnValue("refresh-1");
    vi.mocked(refreshRequest).mockResolvedValueOnce({
      accessToken: "access-1",
      refreshToken: "refresh-2",
    });
    await refreshAccessToken();

    vi.mocked(refreshRequest).mockResolvedValueOnce({
      accessToken: "access-2",
      refreshToken: "refresh-3",
    });
    const result = await refreshAccessToken();

    expect(refreshRequest).toHaveBeenCalledTimes(2);
    expect(result).toBe("access-2");
  });
});

describe("apiFetch", () => {
  it("attaches the access token as a Bearer header when present", async () => {
    vi.mocked(getAccessToken).mockReturnValue("access-123");
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, {}));

    await apiFetch("/listings");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.get("Authorization")).toBe("Bearer access-123");
  });

  it("sends no Authorization header when there's no access token", async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, {}));

    await apiFetch("/listings");

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(headers.has("Authorization")).toBe(false);
  });

  it("retries once with a refreshed token after a 401", async () => {
    vi.mocked(getAccessToken).mockReturnValue("stale-access");
    vi.mocked(getRefreshToken).mockReturnValue("still-valid-refresh");
    vi.mocked(refreshRequest).mockResolvedValue({
      accessToken: "fresh-access",
      refreshToken: "fresh-refresh",
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(401, { error: "expired" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));

    const response = await apiFetch("/listings");

    expect(fetch).toHaveBeenCalledTimes(2);
    const [, secondInit] = vi.mocked(fetch).mock.calls[1];
    const headers = new Headers(secondInit?.headers);
    expect(headers.get("Authorization")).toBe("Bearer fresh-access");
    expect(response.status).toBe(200);
  });

  it("does not retry a 401 when there was no access token to begin with", async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { error: "no auth" }));

    await apiFetch("/listings");

    expect(fetch).toHaveBeenCalledOnce();
    expect(refreshRequest).not.toHaveBeenCalled();
  });

  it("returns the original 401 response when the refresh itself fails", async () => {
    vi.mocked(getAccessToken).mockReturnValue("stale-access");
    vi.mocked(getRefreshToken).mockReturnValue("also-expired");
    vi.mocked(refreshRequest).mockRejectedValue(new Error("expired"));
    vi.mocked(fetch).mockResolvedValue(jsonResponse(401, { error: "expired" }));

    const response = await apiFetch("/listings");

    expect(fetch).toHaveBeenCalledOnce();
    expect(response.status).toBe(401);
  });
});

describe("apiJson", () => {
  it("returns the parsed body on success", async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { id: "abc" }));

    const result = await apiJson<{ id: string }>("/listings/abc");

    expect(result).toEqual({ id: "abc" });
  });

  it("throws the server's error message on failure", async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse(400, { error: "Title is required" }),
    );

    await expect(apiJson("/listings")).rejects.toThrow("Title is required");
  });

  it("falls back to a generic message when the body isn't JSON", async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    vi.mocked(fetch).mockResolvedValue(
      new Response("not json", { status: 500 }),
    );

    await expect(apiJson("/listings")).rejects.toThrow(
      "Something went wrong",
    );
  });
});
