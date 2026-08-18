import { pool } from "./pool.js";

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  name: string | null;
  city: string | null;
  avatar_url: string | null;
  role: string;
  email_verified: boolean;
  google_id: string | null;
  created_at: Date;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE email = $1",
    [email],
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE id = $1",
    [id],
  );
  return result.rows[0] ?? null;
}

export interface PublicUserProfile {
  id: string;
  name: string | null;
  city: string | null;
  avatarUrl: string | null;
  role: string;
}

export async function findPublicUserById(
  id: string,
): Promise<PublicUserProfile | null> {
  const result = await pool.query<PublicUserProfile>(
    `SELECT id, name, city, avatar_url AS "avatarUrl", role FROM users WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export interface UpdateOwnProfileInput {
  name?: string;
  city?: string | null;
  avatarUrl?: string;
}

export async function updateOwnProfile(
  userId: string,
  input: UpdateOwnProfileInput,
): Promise<PublicUserProfile | null> {
  const result = await pool.query<PublicUserProfile>(
    `UPDATE users
     SET name = COALESCE($1, name),
         city = CASE WHEN $2 THEN $3 ELSE city END,
         avatar_url = COALESCE($4, avatar_url)
     WHERE id = $5
     RETURNING id, name, city, avatar_url AS "avatarUrl", role`,
    [
      input.name ?? null,
      input.city !== undefined,
      input.city ?? null,
      input.avatarUrl ?? null,
      userId,
    ],
  );
  return result.rows[0] ?? null;
}

export async function updateUserRole(
  userId: string,
  role: "user" | "banned",
): Promise<PublicUserProfile | null> {
  const result = await pool.query<PublicUserProfile>(
    `UPDATE users SET role = $1 WHERE id = $2
     RETURNING id, name, city, avatar_url AS "avatarUrl", role`,
    [role, userId],
  );
  return result.rows[0] ?? null;
}

export async function deleteUser(userId: string): Promise<void> {
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  name?: string;
}): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (email, password_hash, name, email_verified)
     VALUES ($1, $2, $3, false)
     RETURNING *`,
    [params.email, params.passwordHash, params.name ?? null],
  );
  return result.rows[0];
}

export async function findUserByGoogleId(
  googleId: string,
): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE google_id = $1",
    [googleId],
  );
  return result.rows[0] ?? null;
}

export async function createGoogleUser(params: {
  email: string;
  googleId: string;
  name?: string;
  avatarUrl?: string;
}): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (email, google_id, name, avatar_url, email_verified)
     VALUES ($1, $2, $3, $4, true)
     RETURNING *`,
    [
      params.email,
      params.googleId,
      params.name ?? null,
      params.avatarUrl ?? null,
    ],
  );
  return result.rows[0];
}

export async function linkGoogleId(
  userId: string,
  googleId: string,
): Promise<User | null> {
  const result = await pool.query<User>(
    `UPDATE users
     SET google_id = $1, email_verified = true
     WHERE id = $2
     RETURNING *`,
    [googleId, userId],
  );
  return result.rows[0] ?? null;
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [
    passwordHash,
    userId,
  ]);
}

export async function markEmailVerified(userId: string): Promise<void> {
  await pool.query("UPDATE users SET email_verified = true WHERE id = $1", [
    userId,
  ]);
}
