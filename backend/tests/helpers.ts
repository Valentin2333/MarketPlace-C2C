import { vi } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { pool } from "../src/db/pool.js";
import { sendEmail } from "../src/email/gmail.js";

export async function resetDatabase(): Promise<void> {
  await pool.query(`
    TRUNCATE TABLE
      chat_deletes, user_reports, reports, favorites, messages,
      listing_images, listings, uploaded_files, password_reset_tokens,
      refresh_tokens, users
    RESTART IDENTITY CASCADE
  `);
}

export async function ensureTestCategory(): Promise<number> {
  const existing = await pool.query<{ id: number }>(
    "SELECT id FROM categories WHERE slug = $1",
    ["test-category"],
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await pool.query<{ id: number }>(
    "INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id",
    ["Test Category", "test-category"],
  );
  return inserted.rows[0].id;
}

export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

let counter = 0;

function extractVerificationToken(html: string): string {
  const match = html.match(/href="([^"]+)"/);
  if (!match) throw new Error("No link found in verification email HTML");
  const url = new URL(match[1]);
  const token = url.searchParams.get("token");
  if (!token) throw new Error("No token found in verification link");
  return token;
}

export async function registerTestUser(
  overrides: { email?: string; password?: string; name?: string } = {},
): Promise<TestUser> {
  counter += 1;
  const email =
    overrides.email ?? `test.user.${Date.now()}.${counter}@example.com`;
  const password = overrides.password ?? "testpassword123";

  const response = await request(app)
    .post("/auth/register")
    .send({ email, password, name: overrides.name });

  if (response.status !== 201) {
    throw new Error(
      `Failed to register test user: ${JSON.stringify(response.body)}`,
    );
  }

  const verificationCall = vi
    .mocked(sendEmail)
    .mock.calls.find((call) => call[0].to === email);
  if (!verificationCall) {
    throw new Error(`No verification email was sent to ${email}`);
  }
  const token = extractVerificationToken(verificationCall[0].html);

  const verifyResponse = await request(app)
    .post("/auth/verify-email/confirm")
    .send({ token });

  if (verifyResponse.status !== 200) {
    throw new Error(
      `Failed to verify test user email: ${JSON.stringify(verifyResponse.body)}`,
    );
  }

  vi.mocked(sendEmail).mockClear();

  return {
    id: verifyResponse.body.user.id,
    email,
    accessToken: verifyResponse.body.accessToken,
    refreshToken: verifyResponse.body.refreshToken,
  };
}

export async function makeAdmin(userId: string): Promise<void> {
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [
    userId,
  ]);
}
