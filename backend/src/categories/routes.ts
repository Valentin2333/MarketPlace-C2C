import { Router } from "express";
import { listCategories } from "../db/categories.js";

const router = Router();

router.get("/", async (_req, res) => {
  const categories = await listCategories();
  res.json({ categories });
});

export default router;
