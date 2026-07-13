import { Router, type Request } from "express";
import {
  listListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  replaceListingImages,
  getListingOwnerId,
  listActiveCities,
} from "../db/listings.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/requireAuth.js";

const router = Router();

function paramId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

const SORT_VALUES = ["newest", "oldest", "price_asc", "price_desc"] as const;
type SortValue = (typeof SORT_VALUES)[number];

function parseSort(value: unknown): SortValue | undefined {
  return typeof value === "string" &&
    (SORT_VALUES as readonly string[]).includes(value)
    ? (value as SortValue)
    : undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

router.get("/cities", async (_req, res) => {
  const cities = await listActiveCities();
  res.json({ cities });
});

router.get("/", async (req, res) => {
  const { q, category, city, min, max, sort, userId, limit, offset } =
    req.query;

  const { rows, total } = await listListings({
    q: typeof q === "string" ? q : undefined,
    categoryId: parseNumber(category),
    city: typeof city === "string" ? city : undefined,
    minPrice: parseNumber(min),
    maxPrice: parseNumber(max),
    sort: parseSort(sort),
    userId: typeof userId === "string" ? userId : undefined,
    limit: parseNumber(limit),
    offset: parseNumber(offset) ?? 0,
  });

  res.json({ listings: rows, total });
});

router.get("/:id", async (req, res) => {
  const listing = await getListingById(paramId(req));
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  res.json({ listing });
});

function validateListingBody(body: unknown):
  | {
      title: string;
      description: string;
      price: number;
      city: string;
      categoryId: number;
    }
  | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  if (typeof b.title !== "string" || b.title.trim().length === 0) return null;
  if (typeof b.description !== "string") return null;
  if (typeof b.price !== "number" || Number.isNaN(b.price)) return null;
  if (typeof b.city !== "string" || b.city.trim().length === 0) return null;
  if (typeof b.categoryId !== "number") return null;

  return {
    title: b.title.trim(),
    description: b.description.trim(),
    price: b.price,
    city: b.city.trim(),
    categoryId: b.categoryId,
  };
}

function validateImages(
  body: unknown,
): { url: string; position: number }[] | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const images = (body as Record<string, unknown>).images;
  if (images === undefined) return undefined;
  if (!Array.isArray(images)) return undefined;

  return images
    .filter(
      (img): img is { url: string; position: number } =>
        typeof img === "object" &&
        img !== null &&
        typeof (img as Record<string, unknown>).url === "string" &&
        typeof (img as Record<string, unknown>).position === "number",
    )
    .map((img) => ({ url: img.url, position: img.position }));
}

router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const fields = validateListingBody(req.body);
  if (!fields) {
    res.status(400).json({ error: "Invalid listing data" });
    return;
  }

  const { id } = await createListing({ userId: req.user!.id, ...fields });

  const images = validateImages(req.body);
  if (images && images.length > 0) {
    await replaceListingImages(id, images);
  }

  res.status(201).json({ id });
});

router.put("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const ownerId = await getListingOwnerId(paramId(req));
  if (!ownerId) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (ownerId !== req.user!.id && req.user!.role !== "admin") {
    res
      .status(403)
      .json({ error: "You don't have permission to edit this listing" });
    return;
  }

  const fields = validateListingBody(req.body);
  if (!fields) {
    res.status(400).json({ error: "Invalid listing data" });
    return;
  }

  const bodyStatus = (req.body as Record<string, unknown>)?.status;
  const status = typeof bodyStatus === "string" ? bodyStatus : undefined;

  await updateListing(paramId(req), { ...fields, status });

  const images = validateImages(req.body);
  if (images !== undefined) {
    await replaceListingImages(paramId(req), images);
  }

  res.status(204).send();
});

router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const ownerId = await getListingOwnerId(paramId(req));
  if (!ownerId) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  if (ownerId !== req.user!.id && req.user!.role !== "admin") {
    res
      .status(403)
      .json({ error: "You don't have permission to delete this listing" });
    return;
  }

  await deleteListing(paramId(req));
  res.status(204).send();
});

export default router;
