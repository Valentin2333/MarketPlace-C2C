import { describe, it, expect } from "vitest";
import { friendlyAuthError } from "./authErrors";

describe("friendlyAuthError", () => {
  it("explains an already-registered email", () => {
    expect(friendlyAuthError("Email is already registered")).toBe(
      "An account with this email already exists. Try signing in instead.",
    );
  });

  it("explains a short/weak password", () => {
    expect(friendlyAuthError("Password must be at least 8 characters")).toBe(
      "Your password doesn't meet the requirements. Use at least 8 characters.",
    );
  });

  it("is case-insensitive", () => {
    expect(friendlyAuthError("EMAIL IS ALREADY REGISTERED")).toBe(
      "An account with this email already exists. Try signing in instead.",
    );
  });

  it("falls back to the original message when nothing matches", () => {
    const message = "Some unrecognized server error";
    expect(friendlyAuthError(message)).toBe(message);
  });
});
