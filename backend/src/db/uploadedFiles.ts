import { pool } from "./pool.js";

export async function getTotalStorageBytes(): Promise<number> {
  const result = await pool.query<{ total: string | null }>(
    "SELECT SUM(size_bytes) AS total FROM uploaded_files",
  );
  return Number(result.rows[0]?.total ?? 0);
}

export async function recordUploadedFile(
  key: string,
  userId: string,
  sizeBytes: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO uploaded_files (key, user_id, size_bytes)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO NOTHING`,
    [key, userId, sizeBytes],
  );
}

export async function removeUploadedFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await pool.query("DELETE FROM uploaded_files WHERE key = ANY($1)", [keys]);
}

export async function listUserFileKeys(userId: string): Promise<string[]> {
  const result = await pool.query<{ key: string }>(
    "SELECT key FROM uploaded_files WHERE user_id = $1",
    [userId],
  );
  return result.rows.map((r) => r.key);
}
