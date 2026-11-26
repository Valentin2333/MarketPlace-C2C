import { pool } from "./pool.js";

export type ReviewRole = "buyer" | "seller";

export interface ReviewRow {
  id: string;
  role: ReviewRole;
  rating: number;
  comment: string | null;
  listingId: string | null;
  listingTitle: string;
  createdAt: string;
  updatedAt: string;
  reviewer: { id: string; name: string | null; avatarUrl: string | null };
}

export interface OwnReviewRow {
  id: string;
  reviewedUserId: string;
  role: ReviewRole;
  rating: number;
  comment: string | null;
  windowEndsAt: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
}

export interface RatingSummary {
  count: number;
  average: number | null;
}

export interface UserRatingStats {
  asSeller: RatingSummary;
  asBuyer: RatingSummary;
  soldCount: number;
}

export interface ReviewableListing {
  id: string;
  title: string;
  sellerId: string;
  status: string;
}

// A review becomes public once the other side has reviewed back for the same
// listing, or once the 30-day review window has closed. Until then it is
// hidden and can still be edited or deleted by its author.
const COUNTERPART_EXISTS = `EXISTS (
  SELECT 1 FROM reviews c
  WHERE c.listing_id = r.listing_id
    AND c.reviewer_id = r.reviewed_user_id
    AND c.reviewed_user_id = r.reviewer_id
)`;

const IS_PUBLIC = `(r.window_ends_at <= now() OR ${COUNTERPART_EXISTS})`;

const OWN_REVIEW_COLUMNS = `r.id, r.reviewed_user_id AS "reviewedUserId", r.role, r.rating, r.comment,
  r.window_ends_at AS "windowEndsAt",
  r.created_at AS "createdAt", r.updated_at AS "updatedAt",
  ${IS_PUBLIC} AS "isPublic"`;

export async function getListingForReview(
  listingId: string,
): Promise<ReviewableListing | null> {
  const result = await pool.query<ReviewableListing>(
    `SELECT id, title, user_id AS "sellerId", status
     FROM listings WHERE id = $1`,
    [listingId],
  );
  return result.rows[0] ?? null;
}

export async function hasTwoWayConversation(
  listingId: string,
  userA: string,
  userB: string,
): Promise<boolean> {
  const result = await pool.query<{ ok: boolean }>(
    `SELECT
       EXISTS (SELECT 1 FROM messages
               WHERE listing_id = $1 AND sender_id = $2 AND receiver_id = $3)
       AND
       EXISTS (SELECT 1 FROM messages
               WHERE listing_id = $1 AND sender_id = $3 AND receiver_id = $2)
       AS ok`,
    [listingId, userA, userB],
  );
  return result.rows[0]?.ok ?? false;
}

export async function upsertReview(input: {
  listingId: string;
  reviewerId: string;
  reviewedUserId: string;
  role: ReviewRole;
  listingTitle: string;
  rating: number;
  comment: string | null;
  windowEndsAt: Date;
}): Promise<OwnReviewRow | null> {
  const result = await pool.query<OwnReviewRow>(
    `INSERT INTO reviews AS r
       (listing_id, reviewer_id, reviewed_user_id, role, listing_title, rating, comment, window_ends_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (listing_id, reviewer_id, reviewed_user_id)
     DO UPDATE SET rating = EXCLUDED.rating,
                   comment = EXCLUDED.comment,
                   updated_at = now()
     WHERE NOT ${IS_PUBLIC}
     RETURNING ${OWN_REVIEW_COLUMNS}`,
    [
      input.listingId,
      input.reviewerId,
      input.reviewedUserId,
      input.role,
      input.listingTitle,
      input.rating,
      input.comment,
      input.windowEndsAt,
    ],
  );
  return result.rows[0] ?? null;
}

export async function findOwnReview(
  reviewerId: string,
  listingId: string,
): Promise<OwnReviewRow | null> {
  const result = await pool.query<OwnReviewRow>(
    `SELECT ${OWN_REVIEW_COLUMNS}
     FROM reviews r WHERE r.reviewer_id = $1 AND r.listing_id = $2`,
    [reviewerId, listingId],
  );
  return result.rows[0] ?? null;
}

export async function deleteOwnReview(
  reviewerId: string,
  listingId: string,
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM reviews r
     WHERE r.reviewer_id = $1 AND r.listing_id = $2 AND NOT ${IS_PUBLIC}`,
    [reviewerId, listingId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listUserReviews(
  userId: string,
  limit: number,
  offset: number,
  role?: ReviewRole,
): Promise<{ reviews: ReviewRow[]; total: number }> {
  const roleFilter = role ? "AND r.role = $4" : "";
  const params: unknown[] = [userId, limit, offset];
  if (role) params.push(role);

  const [rows, count] = await Promise.all([
    pool.query<ReviewRow>(
      `SELECT r.id, r.role, r.rating, r.comment,
              r.listing_id AS "listingId", r.listing_title AS "listingTitle",
              r.created_at AS "createdAt", r.updated_at AS "updatedAt",
              json_build_object(
                'id', u.id, 'name', u.name, 'avatarUrl', u.avatar_url
              ) AS reviewer
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewed_user_id = $1 AND ${IS_PUBLIC} ${roleFilter}
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      params,
    ),
    pool.query<{ total: number }>(
      `SELECT COUNT(*)::int AS total FROM reviews r
       WHERE r.reviewed_user_id = $1 AND ${IS_PUBLIC}
         ${role ? "AND r.role = $2" : ""}`,
      role ? [userId, role] : [userId],
    ),
  ]);
  return { reviews: rows.rows, total: count.rows[0]?.total ?? 0 };
}

export async function getUserRatingStats(
  userId: string,
): Promise<UserRatingStats> {
  const result = await pool.query<{
    sellerCount: number;
    sellerAverage: number | null;
    buyerCount: number;
    buyerAverage: number | null;
    soldCount: number;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE role = 'seller')::int AS "sellerCount",
       ROUND(AVG(rating) FILTER (WHERE role = 'seller'), 1)::float AS "sellerAverage",
       COUNT(*) FILTER (WHERE role = 'buyer')::int AS "buyerCount",
       ROUND(AVG(rating) FILTER (WHERE role = 'buyer'), 1)::float AS "buyerAverage",
       (SELECT COUNT(*)::int FROM listings WHERE user_id = $1 AND status = 'sold') AS "soldCount"
     FROM reviews r WHERE r.reviewed_user_id = $1 AND ${IS_PUBLIC}`,
    [userId],
  );
  const row = result.rows[0];
  return {
    asSeller: { count: row.sellerCount, average: row.sellerAverage },
    asBuyer: { count: row.buyerCount, average: row.buyerAverage },
    soldCount: row.soldCount,
  };
}
