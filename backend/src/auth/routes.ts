import { Router } from "express";
import { findUserByEmail, createUser, type User } from "../db/users.js";
import { hashPassword, comparePassword } from "./password.js";
import { signAuthToken } from "./jwt.js";

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
  const token = signAuthToken({ sub: user.id, role: user.role });

  res.status(201).json({ user: toPublicUser(user), token });
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

  const token = signAuthToken({ sub: user.id, role: user.role });
  res.json({ user: toPublicUser(user), token });
});

export default router;
