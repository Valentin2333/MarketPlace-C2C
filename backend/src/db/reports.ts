import { pool } from "./pool.js";

export interface GroupedListingReport {
  listingId: string;
  listingTitle: string | null;
  count: number;
  unseenCount: number;
  reasons: string[];
  lastReportedAt: string | null;
}

export interface ListingReportRow {
  id: string;
  reason: string;
  created_at: string;
  reporter_id: string;
  reporter_email: string;
  reporter_name: string | null;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

export async function createListingReport(
  listingId: string,
  reporterId: string,
  reason: string,
): Promise<{ duplicate: boolean }> {
  try {
    await pool.query(
      `INSERT INTO reports (listing_id, reporter_id, reason) VALUES ($1, $2, $3)`,
      [listingId, reporterId, reason],
    );
    return { duplicate: false };
  } catch (err) {
    if (isUniqueViolation(err)) return { duplicate: true };
    throw err;
  }
}

export async function listGroupedListingReports(): Promise<
  GroupedListingReport[]
> {
  const result = await pool.query<GroupedListingReport>(
    `SELECT l.id AS "listingId", l.title AS "listingTitle",
            COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE r.seen = false)::int AS "unseenCount",
            array_agg(DISTINCT r.reason) AS reasons,
            MAX(r.created_at) AS "lastReportedAt"
     FROM reports r
     JOIN listings l ON l.id = r.listing_id
     WHERE r.dismissed = false
     GROUP BY l.id, l.title
     ORDER BY MAX(r.created_at) DESC`,
  );
  return result.rows;
}

export async function getListingReportDetail(listingId: string): Promise<{
  listing: { id: string; title: string | null } | null;
  reports: ListingReportRow[];
}> {
  const listingResult = await pool.query<{ id: string; title: string | null }>(
    "SELECT id, title FROM listings WHERE id = $1",
    [listingId],
  );

  const reportsResult = await pool.query<ListingReportRow>(
    `SELECT r.id, r.reason, r.created_at, r.reporter_id,
            u.email AS reporter_email, u.name AS reporter_name
     FROM reports r
     JOIN users u ON u.id = r.reporter_id
     WHERE r.listing_id = $1 AND r.dismissed = false
     ORDER BY r.created_at DESC`,
    [listingId],
  );

  return {
    listing: listingResult.rows[0] ?? null,
    reports: reportsResult.rows,
  };
}

export async function markListingReportsSeen(listingId: string): Promise<void> {
  await pool.query(
    "UPDATE reports SET seen = true WHERE listing_id = $1 AND seen = false",
    [listingId],
  );
}

export async function dismissListingReports(listingId: string): Promise<void> {
  await pool.query(
    "UPDATE reports SET dismissed = true WHERE listing_id = $1 AND dismissed = false",
    [listingId],
  );
}
