import { Router } from "express";
import {
  findUserByEmail,
  findUserById,
  createUser,
  updateUserPassword,
  type User,
} from "../db/users.js";
import { hashPassword, comparePassword } from "./password.js";
import { signAuthToken } from "./jwt.js";
import {
  issueRefreshToken,
  consumeRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokensForUser,
} from "./refreshTokens.js";
import {
  issuePasswordResetToken,
  consumePasswordResetToken,
} from "./passwordResetTokens.js";
import { sendEmail } from "../email/gmail.js";
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

function passwordResetEmailHtml(resetUrl: string): string {
  return `<p>Click the link below to reset your MarketPlace C2C password. This link expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`;
}

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body ?? {};

  if (typeof email !== "string" || !isValidEmail(email)) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  if (name !== undefined && typeof name !== "string") {
    res.status(400).json({ error: "Name must be a string" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: "Email is already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({
    email: normalizedEmail,
    passwordHash,
    name: name?.trim() || undefined,
  });
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

router.post("/password-reset/request", async (req, res) => {
  const { email } = req.body ?? {};

  if (typeof email !== "string" || !isValidEmail(email)) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }

  const user = await findUserByEmail(email.trim().toLowerCase());
  if (user) {
    const token = await issuePasswordResetToken(user.id);
    const resetUrl = `${process.env.FRONTEND_ORIGIN}/reset-password?token=${token}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your MarketPlace C2C password",
      html: passwordResetEmailHtml(resetUrl),
    });
  }

  res.status(204).send();
});

router.post("/password-reset/confirm", async (req, res) => {
  const { token, password } = req.body ?? {};

  if (typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    res.status(400).json({ error: "Invalid or expired reset token" });
    return;
  }

  const passwordHash = await hashPassword(password);
  await updateUserPassword(userId, passwordHash);
  await revokeAllRefreshTokensForUser(userId);

  res.status(204).send();
});

export default router;
