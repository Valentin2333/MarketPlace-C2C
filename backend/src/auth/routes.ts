import { Router } from "express";
import { findUserByEmail, findUserById, createUser, type User } from "../db/users.js";
import { hashPassword, comparePassword } from "./password.js";
import { signAuthToken } from "./jwt.js";
import {
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
} from "./refreshTokens.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/requireAuth.js";

const router = Router();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    city: user.city,
    avatarUrl: user.avatar_url,
    role: user.role,
  };
}

async function issueTokenPair(user: User) {
  const accessToken = signAuthToken({ sub: user.id, role: user.role });
  const refreshToken = await issueRefreshToken(user.id);
  return { accessToken, refreshToken };
}

router.post("/register", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || !isValidEmail(email)) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: "Email is already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email: normalizedEmail, passwordHash });
  const tokens = await issueTokenPair(user);

  res.status(201).json({ user: toPublicUser(user), ...tokens });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await findUserByEmail(email.trim().toLowerCase());
  const passwordMatches = user
    ? await comparePassword(password, user.password_hash)
    : false;

  if (!user || !passwordMatches) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const tokens = await issueTokenPair(user);
  res.json({ user: toPublicUser(user), ...tokens });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body ?? {};

  if (typeof refreshToken !== "string") {
    res.status(400).json({ error: "refreshToken is required" });
    return;
  }

  const userId = await consumeRefreshToken(refreshToken);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  const user = await findUserById(userId);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  const tokens = await issueTokenPair(user);
  res.json(tokens);
});

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body ?? {};

  if (typeof refreshToken === "string") {
    await revokeRefreshToken(refreshToken);
  }

  res.status(204).send();
});

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const user = await findUserById(req.user!.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: toPublicUser(user) });
});

export default router;
