import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "./tokenStorage";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryStorage());
});

describe("tokenStorage", () => {
  it("returns null for both tokens when nothing has been stored", () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("round-trips both tokens through setTokens", () => {
    setTokens("access-123", "refresh-456");

    expect(getAccessToken()).toBe("access-123");
    expect(getRefreshToken()).toBe("refresh-456");
  });

  it("overwrites previously stored tokens", () => {
    setTokens("first-access", "first-refresh");
    setTokens("second-access", "second-refresh");

    expect(getAccessToken()).toBe("second-access");
    expect(getRefreshToken()).toBe("second-refresh");
  });

  it("clearTokens removes both tokens", () => {
    setTokens("access-123", "refresh-456");

    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("clearTokens is a no-op when nothing was stored", () => {
    expect(() => clearTokens()).not.toThrow();
    expect(getAccessToken()).toBeNull();
  });
});
