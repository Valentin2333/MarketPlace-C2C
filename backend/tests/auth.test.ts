import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { sendEmail } from "../src/email/gmail.js";
import { resetDatabase, registerTestUser } from "./helpers.js";

function extractResetToken(html: string): string {
  const match = html.match(/href="([^"]+)"/);
  if (!match) throw new Error("No link found in email HTML");
  const url = new URL(match[1]);
  const token = url.searchParams.get("token");
  if (!token) throw new Error("No token found in reset link");
  return token;
}

describe("POST /auth/register", () => {
  beforeEach(resetDatabase);

  it("creates a new unverified user and sends a verification email", async () => {
    const response = await request(app).post("/auth/register").send({
      email: "new@example.com",
      password: "testpassword123",
      name: "New User",
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe("new@example.com");
    expect(response.body.user.name).toBe("New User");
    expect(response.body.user.role).toBe("user");
    expect(response.body.user.emailVerified).toBe(false);
    expect(response.body.user).not.toHaveProperty("password_hash");
    // Tokens aren't issued until the email is verified.
    expect(response.body).not.toHaveProperty("accessToken");
    expect(response.body).not.toHaveProperty("refreshToken");
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("rejects a duplicate email", async () => {
    await registerTestUser({ email: "dupe@example.com" });

    const response = await request(app)
      .post("/auth/register")
      .send({ email: "dupe@example.com", password: "testpassword123" });

    expect(response.status).toBe(409);
  });

  it("rejects an invalid email", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({ email: "not-an-email", password: "testpassword123" });

    expect(response.status).toBe(400);
  });

  it("rejects a password under 8 characters", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({ email: "short@example.com", password: "short" });

    expect(response.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  beforeEach(resetDatabase);

  it("logs in with correct credentials", async () => {
    await registerTestUser({
      email: "login@example.com",
      password: "testpassword123",
    });

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: "testpassword123" });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("login@example.com");
  });

  it("rejects a wrong password", async () => {
    await registerTestUser({
      email: "wrongpw@example.com",
      password: "testpassword123",
    });

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "wrongpw@example.com", password: "wrongpassword" });

    expect(response.status).toBe(401);
  });

  it("rejects an email that was never registered", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({ email: "ghost@example.com", password: "testpassword123" });

    expect(response.status).toBe(401);
  });
});

describe("Email verification flow", () => {
  beforeEach(() => {
    vi.mocked(sendEmail).mockClear();
    return resetDatabase();
  });

  it("blocks login until the email is verified", async () => {
    await request(app).post("/auth/register").send({
      email: "unverified@example.com",
      password: "testpassword123",
    });

    const response = await request(app)
      .post("/auth/login")
      .send({ email: "unverified@example.com", password: "testpassword123" });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("verifies the email and returns tokens that then allow login", async () => {
    await request(app).post("/auth/register").send({
      email: "toverify@example.com",
      password: "testpassword123",
    });

    const html = vi.mocked(sendEmail).mock.calls[0][0].html;
    const token = extractResetToken(html);

    const confirmResponse = await request(app)
      .post("/auth/verify-email/confirm")
      .send({ token });

    expect(confirmResponse.status).toBe(200);
    expect(confirmResponse.body.user.emailVerified).toBe(true);
    expect(confirmResponse.body).toHaveProperty("accessToken");
    expect(confirmResponse.body).toHaveProperty("refreshToken");

    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: "toverify@example.com", password: "testpassword123" });
    expect(loginResponse.status).toBe(200);
  });

  it("rejects an invalid or already-used verification token", async () => {
    const response = await request(app)
      .post("/auth/verify-email/confirm")
      .send({ token: "not-a-real-token" });

    expect(response.status).toBe(400);
  });

  it("resend always returns 204, even for an unknown email", async () => {
    const response = await request(app)
      .post("/auth/verify-email/resend")
      .send({ email: "ghost@example.com" });

    expect(response.status).toBe(204);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("GET /auth/me", () => {
  beforeEach(resetDatabase);

  it("returns the current user when authenticated", async () => {
    const user = await registerTestUser();

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${user.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(user.id);
  });

  it("rejects a missing token", async () => {
    const response = await request(app).get("/auth/me");
    expect(response.status).toBe(401);
  });

  it("rejects a garbage token", async () => {
    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", "Bearer garbage");
    expect(response.status).toBe(401);
  });
});

describe("POST /auth/refresh", () => {
  beforeEach(resetDatabase);

  it("issues a fresh token pair", async () => {
    const user = await registerTestUser();

    const response = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: user.refreshToken });

    expect(response.status).toBe(200);
    expect(typeof response.body.accessToken).toBe("string");
    // Refresh tokens are random and must always differ. Access tokens are
    // JWTs signed from the same {sub, role} claims with the same expiry —
    // if issued within the same second, they're legitimately byte-identical
    // (JWTs are deterministic), so we don't assert uniqueness on those.
    expect(response.body.refreshToken).not.toBe(user.refreshToken);
  });

  it("rejects reusing an already-rotated refresh token", async () => {
    const user = await registerTestUser();

    await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: user.refreshToken });

    const reused = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: user.refreshToken });

    expect(reused.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  beforeEach(resetDatabase);

  it("revokes the refresh token so it can no longer be used", async () => {
    const user = await registerTestUser();

    await request(app)
      .post("/auth/logout")
      .send({ refreshToken: user.refreshToken });

    const response = await request(app)
      .post("/auth/refresh")
      .send({ refreshToken: user.refreshToken });

    expect(response.status).toBe(401);
  });
});

describe("Password reset flow", () => {
  beforeEach(() => {
    vi.mocked(sendEmail).mockClear();
    return resetDatabase();
  });

  it("always returns 204, even for an email that isn't registered", async () => {
    const response = await request(app)
      .post("/auth/password-reset/request")
      .send({ email: "ghost@example.com" });

    expect(response.status).toBe(204);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("completes a full reset and invalidates the old password", async () => {
    await registerTestUser({
      email: "reset@example.com",
      password: "oldpassword123",
    });

    await request(app)
      .post("/auth/password-reset/request")
      .send({ email: "reset@example.com" });

    expect(sendEmail).toHaveBeenCalledOnce();
    const html = vi.mocked(sendEmail).mock.calls[0][0].html;
    const token = extractResetToken(html);

    const confirmResponse = await request(app)
      .post("/auth/password-reset/confirm")
      .send({ token, password: "newpassword123" });
    expect(confirmResponse.status).toBe(204);

    const loginWithOld = await request(app)
      .post("/auth/login")
      .send({ email: "reset@example.com", password: "oldpassword123" });
    expect(loginWithOld.status).toBe(401);

    const loginWithNew = await request(app)
      .post("/auth/login")
      .send({ email: "reset@example.com", password: "newpassword123" });
    expect(loginWithNew.status).toBe(200);
  });

  it("rejects reusing the same reset token twice", async () => {
    await registerTestUser({
      email: "onceonly@example.com",
      password: "oldpassword123",
    });

    await request(app)
      .post("/auth/password-reset/request")
      .send({ email: "onceonly@example.com" });

    const html = vi.mocked(sendEmail).mock.calls[0][0].html;
    const token = extractResetToken(html);

    await request(app)
      .post("/auth/password-reset/confirm")
      .send({ token, password: "firstchange123" });

    const secondAttempt = await request(app)
      .post("/auth/password-reset/confirm")
      .send({ token, password: "secondchange123" });

    expect(secondAttempt.status).toBe(400);
  });
});
