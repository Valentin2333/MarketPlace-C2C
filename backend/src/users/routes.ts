import { Router, type Request } from "express";
import {
  findPublicUserById,
  updateOwnProfile,
} from "../db/users.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/requireAuth.js";

const router = Router();

function paramId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

router.patch("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { name, city, avatarUrl } = req.body ?? {};

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    res.status(400).json({ error: "Name must be a non-empty string" });
    return;
  }
  if (city !== undefined && city !== null && typeof city !== "string") {
    res.status(400).json({ error: "City must be a string or null" });
    return;
  }
  if (avatarUrl !== undefined && typeof avatarUrl !== "string") {
    res.status(400).json({ error: "avatarUrl must be a string" });
    return;
  }

  const user = await updateOwnProfile(req.user!.id, {
    name: typeof name === "string" ? name.trim() : undefined,
    city: city !== undefined ? (city ? String(city).trim() : null) : undefined,
    avatarUrl,
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user });
});

router.get("/:id", async (req, res) => {
  const user = await findPublicUserById(paramId(req));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});

export default router;
