import { pool } from "./pool.js";

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  reported: boolean;
}

export async function listUsers(
  filter: "all" | "banned",
  limit: number,
  offset: number,
): Promise<AdminUserRow[]> {
  const whereClause = filter === "banned" ? "WHERE u.role = 'banned'" : "";

  const result = await pool.query<AdminUserRow>(
    `SELECT u.id, u.email, u.role,
            EXISTS (
              SELECT 1 FROM user_reports ur
              WHERE ur.reported_id = u.id AND ur.dismissed = false
            ) AS reported
     FROM users u
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );
  return result.rows;
}

export async function searchUsers(
  q: string,
  filter: "all" | "banned",
): Promise<AdminUserRow[]> {
  const conditions = ["u.email ILIKE $1"];
  if (filter === "banned") {
    conditions.push("u.role = 'banned'");
  }

  const result = await pool.query<AdminUserRow>(
    `SELECT u.id, u.email, u.role,
            EXISTS (
              SELECT 1 FROM user_reports ur
              WHERE ur.reported_id = u.id AND ur.dismissed = false
            ) AS reported
     FROM users u
     WHERE ${conditions.join(" AND ")}
     ORDER BY u.email ASC
     LIMIT 20`,
    [`%${q}%`],
  );
  return result.rows;
}
