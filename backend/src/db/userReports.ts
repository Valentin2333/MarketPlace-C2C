import { pool } from "./pool.js";

export interface GroupedUserReport {
  reportedId: string;
  reportedEmail: string;
  reportedName: string | null;
  count: number;
  unseenCount: number;
  reasons: string[];
  lastReportedAt: string | null;
}

export interface UserReportRow {
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

export async function createUserReport(
  reportedId: string,
  reporterId: string,
  reason: string,
): Promise<{ duplicate: boolean }> {
  try {
    await pool.query(
      `INSERT INTO user_reports (reported_id, reporter_id, reason) VALUES ($1, $2, $3)`,
      [reportedId, reporterId, reason],
    );
    return { duplicate: false };
  } catch (err) {
    if (isUniqueViolation(err)) return { duplicate: true };
    throw err;
  }
}

export async function listGroupedUserReports(): Promise<GroupedUserReport[]> {
  const result = await pool.query<GroupedUserReport>(
    `SELECT u.id AS "reportedId", u.email AS "reportedEmail", u.name AS "reportedName",
            COUNT(*)::int AS count,
            COUNT(*) FILTER (WHERE ur.seen = false)::int AS "unseenCount",
            array_agg(DISTINCT ur.reason) AS reasons,
            MAX(ur.created_at) AS "lastReportedAt"
     FROM user_reports ur
     JOIN users u ON u.id = ur.reported_id
     WHERE ur.dismissed = false
     GROUP BY u.id, u.email, u.name
     ORDER BY MAX(ur.created_at) DESC`,
  );
  return result.rows;
}

export async function getUserReportDetail(reportedId: string): Promise<{
  user: { id: string; name: string | null } | null;
  reports: UserReportRow[];
}> {
  const userResult = await pool.query<{ id: string; name: string | null }>(
    "SELECT id, name FROM users WHERE id = $1",
    [reportedId],
  );

  const reportsResult = await pool.query<UserReportRow>(
    `SELECT ur.id, ur.reason, ur.created_at, ur.reporter_id,
            u.email AS reporter_email, u.name AS reporter_name
     FROM user_reports ur
     JOIN users u ON u.id = ur.reporter_id
     WHERE ur.reported_id = $1 AND ur.dismissed = false
     ORDER BY ur.created_at DESC`,
    [reportedId],
  );

  return {
    user: userResult.rows[0] ?? null,
    reports: reportsResult.rows,
  };
}

export async function markUserReportsSeen(reportedId: string): Promise<void> {
  await pool.query(
    "UPDATE user_reports SET seen = true WHERE reported_id = $1 AND seen = false",
    [reportedId],
  );
}

export async function dismissUserReports(reportedId: string): Promise<void> {
  await pool.query(
    "UPDATE user_reports SET dismissed = true WHERE reported_id = $1 AND dismissed = false",
    [reportedId],
  );
}
