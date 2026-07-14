import { pool } from "./pool.js";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  city: string | null;
  avatar_url: string | null;
  role: string;
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
  avatarUrl: string | null;
}

export async function findPublicUserById(
  id: string,
): Promise<PublicUserProfile | null> {
  const result = await pool.query<PublicUserProfile>(
    `SELECT id, name, avatar_url AS "avatarUrl" FROM users WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function createUser(params: {
  email: string;
  passwordHash: string;
  name?: string;
}): Promise<User> {
  const result = await pool.query<User>(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [params.email, params.passwordHash, params.name ?? null],
  );
  return result.rows[0];
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
