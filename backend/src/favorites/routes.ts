import { Router, type Request } from "express";
import {
  listFavoriteIds,
  addFavorite,
  removeFavorite,
} from "../db/favorites.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/requireAuth.js";

const router = Router();

function paramListingId(req: Request): string {
  const { listingId } = req.params;
  return Array.isArray(listingId) ? listingId[0] : listingId;
}

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const listingIds = await listFavoriteIds(req.user!.id);
  res.json({ listingIds });
});

router.post(
  "/:listingId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    await addFavorite(req.user!.id, paramListingId(req));
    res.status(204).send();
  },
);

router.delete(
  "/:listingId",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    await removeFavorite(req.user!.id, paramListingId(req));
    res.status(204).send();
  },
);

export default router;
