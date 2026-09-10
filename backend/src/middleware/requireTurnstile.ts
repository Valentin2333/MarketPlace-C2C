import type { Request, Response, NextFunction } from "express";
import { verifyTurnstileToken } from "../turnstile/verify.js";

export async function requireTurnstile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!process.env.TURNSTILE_SECRET_KEY) {
    next();
    return;
  }

  const { turnstileToken } = req.body ?? {};
  if (typeof turnstileToken !== "string" || turnstileToken.length === 0) {
    res.status(400).json({ error: "Please complete the human verification." });
    return;
  }

  let passed: boolean;
  try {
    passed = await verifyTurnstileToken(turnstileToken, req.ip);
  } catch {
    res.status(502).json({
      error: "Couldn't reach the verification service. Please try again.",
    });
    return;
  }

  if (!passed) {
    res
      .status(400)
      .json({ error: "Human verification failed. Please try again." });
    return;
  }

  next();
}
