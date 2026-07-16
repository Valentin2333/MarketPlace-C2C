import { pool } from "./pool.js";

export async function listFavoriteIds(userId: string): Promise<string[]> {
  const result = await pool.query<{ listing_id: string }>(
    `SELECT listing_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows.map((r) => r.listing_id);
}

export async function addFavorite(
  userId: string,
  listingId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO favorites (user_id, listing_id) VALUES ($1, $2)
     ON CONFLICT (user_id, listing_id) DO NOTHING`,
    [userId, listingId],
  );
}

export async function removeFavorite(
  userId: string,
  listingId: string,
): Promise<void> {
  await pool.query(
    `DELETE FROM favorites WHERE user_id = $1 AND listing_id = $2`,
    [userId, listingId],
  );
}
