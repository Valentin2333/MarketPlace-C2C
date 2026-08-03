import { randomBytes, createHash } from "node:crypto";
import { pool } from "../db/pool.js";

const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );

  return token;
}

export async function consumeRefreshToken(
  token: string,
): Promise<string | null> {
  const tokenHash = hashToken(token);

  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  await pool.query(
    "UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1",
    [tokenHash],
  );

  return row.user_id;
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await pool.query(
    "UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1",
    [tokenHash],
  );
}

export async function revokeAllRefreshTokensForUser(
  userId: string,
): Promise<void> {
  await pool.query(
    "UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL",
    [userId],
  );
}
