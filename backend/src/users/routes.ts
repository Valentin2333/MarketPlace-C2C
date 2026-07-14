import { Router, type Request } from "express";
import { findPublicUserById } from "../db/users.js";

const router = Router();

function paramId(req: Request): string {
  const { id } = req.params;
  return Array.isArray(id) ? id[0] : id;
}

router.get("/:id", async (req, res) => {
  const user = await findPublicUserById(paramId(req));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
});

export default router;
