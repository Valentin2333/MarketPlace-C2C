import { randomBytes, createHash } from "node:crypto";
import { pool } from "../db/pool.js";

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issuePasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt],
  );

  return token;
}

export async function consumePasswordResetToken(
  token: string,
): Promise<string | null> {
  const tokenHash = hashToken(token);

  const result = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash],
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  await pool.query(
    "UPDATE password_reset_tokens SET used_at = now() WHERE token_hash = $1",
    [tokenHash],
  );

  return row.user_id;
}
