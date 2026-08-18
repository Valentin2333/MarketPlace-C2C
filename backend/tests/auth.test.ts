import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { sendEmail } from "../src/email/gmail.js";
import { verifyGoogleIdToken } from "../src/auth/google.js";
import { pool } from "../src/db/pool.js";
import { resetDatabase, registerTestUser } from "./helpers.js";

vi.mock("../src/auth/google.js", () => ({
  verifyGoogleIdToken: vi.fn(),
}));

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

describe("POST /auth/google", () => {
  beforeEach(() => {
    vi.mocked(verifyGoogleIdToken).mockReset();
    return resetDatabase();
  });

  it("creates a new, verified user on first Google sign-in", async () => {
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      googleId: "google-sub-1",
      email: "New.Google@example.com",
      emailVerified: true,
      name: "Google User",
      picture: "https://example.com/avatar.png",
    });

    const response = await request(app)
      .post("/auth/google")
      .send({ credential: "fake-id-token" });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("new.google@example.com");
    expect(response.body.user.name).toBe("Google User");
    expect(response.body.user.emailVerified).toBe(true);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
    expect(response.body.user).not.toHaveProperty("password_hash");
  });

  it("returns the same user on a second Google sign-in", async () => {
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      googleId: "google-sub-2",
      email: "repeat@example.com",
      emailVerified: true,
    });

    const first = await request(app)
      .post("/auth/google")
      .send({ credential: "fake-id-token" });
    const second = await request(app)
      .post("/auth/google")
      .send({ credential: "fake-id-token" });

    expect(second.status).toBe(200);
    expect(second.body.user.id).toBe(first.body.user.id);

    const { rows } = await pool.query("SELECT COUNT(*)::int AS n FROM users");
    expect(rows[0].n).toBe(1);
  });

  it("links Google to an existing password account with the same email", async () => {
    const existing = await registerTestUser({ email: "linkme@example.com" });

    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      googleId: "google-sub-3",
      email: "linkme@example.com",
      emailVerified: true,
    });

    const response = await request(app)
      .post("/auth/google")
      .send({ credential: "fake-id-token" });

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(existing.id);

    const { rows } = await pool.query(
      "SELECT google_id FROM users WHERE id = $1",
      [existing.id],
    );
    expect(rows[0].google_id).toBe("google-sub-3");
  });

  it("rejects a missing credential", async () => {
    const response = await request(app).post("/auth/google").send({});
    expect(response.status).toBe(400);
  });

  it("rejects an invalid Google credential", async () => {
    vi.mocked(verifyGoogleIdToken).mockRejectedValue(new Error("bad token"));

    const response = await request(app)
      .post("/auth/google")
      .send({ credential: "bad-token" });

    expect(response.status).toBe(401);
  });

  it("rejects a Google account whose email is not verified", async () => {
    vi.mocked(verifyGoogleIdToken).mockResolvedValue({
      googleId: "google-sub-4",
      email: "unverified@example.com",
      emailVerified: false,
    });

    const response = await request(app)
      .post("/auth/google")
      .send({ credential: "fake-id-token" });

    expect(response.status).toBe(403);
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
