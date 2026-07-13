import { pool } from "./pool.js";

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export async function listCategories(): Promise<Category[]> {
  const result = await pool.query<Category>(
    "SELECT id, name, slug FROM categories ORDER BY name",
  );
  return result.rows;
}
