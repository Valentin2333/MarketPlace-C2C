import { Router } from "express";
import { verifyTurnstileToken } from "./verify.js";
import { turnstileLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/verify", turnstileLimiter, async (req, res) => {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    res.json({ success: true });
    return;
  }

  const { token } = req.body ?? {};
  if (typeof token !== "string" || token.length === 0) {
    res.status(400).json({ error: "token is required" });
    return;
  }

  let passed: boolean;
  try {
    passed = await verifyTurnstileToken(token, req.ip);
  } catch {
    res.status(502).json({ error: "Couldn't reach the verification service" });
    return;
  }

  if (!passed) {
    res.status(400).json({ error: "Verification failed. Please try again." });
    return;
  }

  res.json({ success: true });
});

export default router;
