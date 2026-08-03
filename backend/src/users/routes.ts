import { Router, type Request } from "express";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import {
  findPublicUserById,
  updateOwnProfile,
  updateUserRole,
  deleteUser,
} from "../db/users.js";
import { createUserReport } from "../db/userReports.js";
import { broadcastToAdmins } from "../ws/server.js";
import { listUserFileKeys, removeUploadedFiles } from "../db/uploadedFiles.js";
import { r2Client, R2_BUCKET_NAME } from "../storage/r2.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/requireAuth.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

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

router.delete("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const keys = await listUserFileKeys(userId);

  if (keys.length > 0) {
    await r2Client.send(
      new DeleteObjectsCommand({
        Bucket: R2_BUCKET_NAME,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
    await removeUploadedFiles(keys);
  }

  await deleteUser(userId);

  res.status(204).send();
});

router.patch(
  "/:id/role",
  requireAuth,
  requireAdmin,
  async (req: AuthenticatedRequest, res) => {
    const targetId = paramId(req);
    const { role } = req.body ?? {};

    if (role !== "banned" && role !== "user") {
      res.status(400).json({ error: "role must be 'banned' or 'user'" });
      return;
    }
    if (targetId === req.user!.id) {
      res.status(400).json({ error: "You can't change your own role" });
      return;
    }

    const target = await findPublicUserById(targetId);
    if (!target) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (target.role === "admin") {
      res
        .status(403)
        .json({ error: "Admins can't be banned through this action" });
      return;
    }

    const updated = await updateUserRole(targetId, role);
    res.json({ user: updated });
  },
);

router.get("/:id", async (req, res) => {
  const user = await findPublicUserById(paramId(req));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});

router.post(
  "/:id/reports",
  requireAuth,
  async (req: AuthenticatedRequest, res) => {
    const { reason } = req.body ?? {};
    if (typeof reason !== "string" || !reason.trim()) {
      res.status(400).json({ error: "A reason is required" });
      return;
    }

    const { duplicate } = await createUserReport(
      paramId(req),
      req.user!.id,
      reason,
    );
    if (duplicate) {
      res.status(409).json({ error: "You've already reported this user." });
      return;
    }

    broadcastToAdmins("report:new", { kind: "user", reportedId: paramId(req) });

    res.status(201).send();
  },
);

export default router;
