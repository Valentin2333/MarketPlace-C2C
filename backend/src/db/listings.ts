import { pool } from "./pool.js";

export interface ListingImageRow {
  url: string;
  position: number;
}

export interface ListingSummaryRow {
  id: string;
  title: string;
  price: number | null;
  city: string | null;
  created_at: Date;
  images: ListingImageRow[];
}

export interface ListingDetailRow {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  city: string | null;
  created_at: Date;
  categoryId: number | null;
  category: { name: string } | null;
  seller: { id: string; name: string | null; avatarUrl: string | null } | null;
  images: (ListingImageRow & { id: string })[];
}

export interface ListingFilters {
  status?: string;
  userId?: string;
  ids?: string[];
  q?: string;
  categoryId?: number;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc";
  limit?: number;
  offset?: number;
}

export async function listListings(
  filters: ListingFilters,
): Promise<{ rows: ListingSummaryRow[]; total: number | null }> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  function addParam(value: unknown): string {
    params.push(value);
    return `$${params.length}`;
  }

  if (filters.userId) {
    conditions.push(`l.user_id = ${addParam(filters.userId)}`);
  } else if (!filters.ids) {
    conditions.push(`l.status = ${addParam(filters.status ?? "active")}`);
  }

  if (filters.ids) {
    if (filters.ids.length === 0) {
      return { rows: [], total: 0 };
    }
    conditions.push(`l.id = ANY(${addParam(filters.ids)})`);
  }

  if (filters.q) {
    const p = addParam(`%${filters.q}%`);
    conditions.push(`(l.title ILIKE ${p} OR l.description ILIKE ${p})`);
  }
  if (filters.categoryId !== undefined) {
    conditions.push(`l.category_id = ${addParam(filters.categoryId)}`);
  }
  if (filters.city) {
    conditions.push(`l.city = ${addParam(filters.city)}`);
  }
  if (filters.minPrice !== undefined) {
    conditions.push(`l.price >= ${addParam(filters.minPrice)}`);
  }
  if (filters.maxPrice !== undefined) {
    conditions.push(`l.price <= ${addParam(filters.maxPrice)}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const orderClause =
    filters.sort === "oldest"
      ? "ORDER BY l.created_at ASC"
      : filters.sort === "price_asc"
        ? "ORDER BY l.price ASC NULLS LAST"
        : filters.sort === "price_desc"
          ? "ORDER BY l.price DESC NULLS LAST"
          : "ORDER BY l.created_at DESC";

  const limit = filters.limit ?? 1000;
  const offset = filters.offset ?? 0;
  const limitParam = addParam(limit);
  const offsetParam = addParam(offset);

  const rowsResult = await pool.query(
    `SELECT l.id, l.title, l.price, l.city, l.created_at,
            COALESCE(
              json_agg(
                json_build_object('url', li.url, 'position', li.position)
                ORDER BY li.position
              ) FILTER (WHERE li.id IS NOT NULL),
              '[]'
            ) AS images
     FROM listings l
     LEFT JOIN listing_images li ON li.listing_id = l.id
     ${whereClause}
     GROUP BY l.id
     ${orderClause}
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    params,
  );

  let total: number | null = null;
  if (offset === 0) {
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM listings l ${whereClause}`,
      params.slice(0, params.length - 2),
    );
    total = Number(countResult.rows[0].count);
  }

  return { rows: rowsResult.rows as ListingSummaryRow[], total };
}

export async function getListingById(
  id: string,
): Promise<ListingDetailRow | null> {
  const result = await pool.query(
    `SELECT l.id, l.title, l.description, l.price, l.city, l.created_at,
            l.category_id AS "categoryId",
            CASE WHEN c.id IS NOT NULL
              THEN json_build_object('name', c.name)
            END AS category,
            CASE WHEN u.id IS NOT NULL
              THEN json_build_object('id', u.id, 'name', u.name, 'avatarUrl', u.avatar_url)
            END AS seller,
            COALESCE(
              json_agg(
                json_build_object('id', li.id, 'url', li.url, 'position', li.position)
                ORDER BY li.position
              ) FILTER (WHERE li.id IS NOT NULL),
              '[]'
            ) AS images
     FROM listings l
     LEFT JOIN categories c ON c.id = l.category_id
     LEFT JOIN users u ON u.id = l.user_id
     LEFT JOIN listing_images li ON li.listing_id = l.id
     WHERE l.id = $1
     GROUP BY l.id, c.id, u.id`,
    [id],
  );
  return (result.rows[0] as ListingDetailRow) ?? null;
}

export interface CreateListingInput {
  userId: string;
  title: string;
  description: string;
  price: number;
  city: string;
  categoryId: number;
}

export async function createListing(
  input: CreateListingInput,
): Promise<{ id: string }> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO listings (user_id, title, description, price, city, category_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')
     RETURNING id`,
    [
      input.userId,
      input.title,
      input.description,
      input.price,
      input.city,
      input.categoryId,
    ],
  );
  return result.rows[0];
}

export interface UpdateListingInput {
  title: string;
  description: string;
  price: number;
  city: string;
  categoryId: number;
  status?: string;
}

export async function updateListing(
  id: string,
  input: UpdateListingInput,
): Promise<void> {
  await pool.query(
    `UPDATE listings
     SET title = $1, description = $2, price = $3, city = $4, category_id = $5,
         status = COALESCE($6, status)
     WHERE id = $7`,
    [
      input.title,
      input.description,
      input.price,
      input.city,
      input.categoryId,
      input.status ?? null,
      id,
    ],
  );
}

export async function deleteListing(id: string): Promise<void> {
  await pool.query("DELETE FROM listings WHERE id = $1", [id]);
}

export async function getListingOwnerId(id: string): Promise<string | null> {
  const result = await pool.query<{ user_id: string }>(
    "SELECT user_id FROM listings WHERE id = $1",
    [id],
  );
  return result.rows[0]?.user_id ?? null;
}

export async function replaceListingImages(
  listingId: string,
  images: ListingImageRow[],
): Promise<void> {
  await pool.query("DELETE FROM listing_images WHERE listing_id = $1", [
    listingId,
  ]);
  if (images.length === 0) return;

  const values: string[] = [];
  const params: unknown[] = [];
  images.forEach((img, i) => {
    const base = i * 3;
    values.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
    params.push(listingId, img.url, img.position);
  });

  await pool.query(
    `INSERT INTO listing_images (listing_id, url, position) VALUES ${values.join(", ")}`,
    params,
  );
}

export async function listActiveCities(): Promise<string[]> {
  const result = await pool.query<{ city: string }>(
    "SELECT DISTINCT city FROM listings WHERE status = 'active' AND city IS NOT NULL ORDER BY city",
  );
  return result.rows.map((r) => r.city);
}
