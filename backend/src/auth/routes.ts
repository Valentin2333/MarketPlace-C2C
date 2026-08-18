import { Router } from "express";
import {
  findUserByEmail,
  findUserById,
  findUserByGoogleId,
  createUser,
  createGoogleUser,
  linkGoogleId,
  updateUserPassword,
  markEmailVerified,
  type User,
} from "../db/users.js";
import { hashPassword, comparePassword } from "./password.js";
import { verifyGoogleIdToken } from "./google.js";
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
import {
  issueEmailVerificationToken,
  consumeEmailVerificationToken,
} from "./emailVerificationTokens.js";
import { sendEmail } from "../email/gmail.js";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/requireAuth.js";
import {
  loginLimiter,
  registerLimiter,
  emailActionLimiter,
} from "../middleware/rateLimit.js";

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
    emailVerified: user.email_verified,
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

function verificationEmailHtml(verifyUrl: string): string {
  return `<p>Welcome to MarketPlace C2C! Click the link below to verify your email address. This link expires in 24 hours.</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>If you didn't create this account, you can safely ignore this email.</p>`;
}

async function sendVerificationEmail(user: User): Promise<void> {
  const token = await issueEmailVerificationToken(user.id);
  const verifyUrl = `${process.env.FRONTEND_ORIGIN}/verify-email?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Verify your MarketPlace C2C email",
    html: verificationEmailHtml(verifyUrl),
  });
}

router.post("/register", registerLimiter, async (req, res) => {
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

  await sendVerificationEmail(user);

  res.status(201).json({ user: toPublicUser(user) });
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await findUserByEmail(email.trim().toLowerCase());
  const passwordMatches =
    user && user.password_hash
      ? await comparePassword(password, user.password_hash)
      : false;

  if (!user || !passwordMatches) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.email_verified) {
    res.status(403).json({
      error: "Please verify your email before logging in.",
      code: "EMAIL_NOT_VERIFIED",
    });
    return;
  }

  const tokens = await issueTokenPair(user);
  res.json({ user: toPublicUser(user), ...tokens });
});

router.post("/google", loginLimiter, async (req, res) => {
  const { credential } = req.body ?? {};

  if (typeof credential !== "string" || credential.length === 0) {
    res.status(400).json({ error: "credential is required" });
    return;
  }

  let identity;
  try {
    identity = await verifyGoogleIdToken(credential);
  } catch {
    res.status(401).json({ error: "Invalid Google credential" });
    return;
  }

  if (!identity.emailVerified) {
    res.status(403).json({ error: "Your Google email is not verified" });
    return;
  }

  const normalizedEmail = identity.email.trim().toLowerCase();

  let user = await findUserByGoogleId(identity.googleId);

  if (!user) {
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      user = (await linkGoogleId(existing.id, identity.googleId)) ?? existing;
    }
  }

  if (!user) {
    user = await createGoogleUser({
      email: normalizedEmail,
      googleId: identity.googleId,
      name: identity.name,
      avatarUrl: identity.picture,
    });
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

router.post(
  "/password-reset/request",
  emailActionLimiter,
  async (req, res) => {
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
  },
);

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

router.post("/verify-email/confirm", async (req, res) => {
  const { token } = req.body ?? {};

  if (typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }

  const userId = await consumeEmailVerificationToken(token);
  if (!userId) {
    res
      .status(400)
      .json({ error: "This verification link is invalid or has expired." });
    return;
  }

  await markEmailVerified(userId);

  const user = await findUserById(userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const tokens = await issueTokenPair(user);
  res.json({ user: toPublicUser(user), ...tokens });
});

router.post(
  "/verify-email/resend",
  emailActionLimiter,
  async (req, res) => {
    const { email } = req.body ?? {};

    if (typeof email !== "string" || !isValidEmail(email)) {
      res.status(400).json({ error: "A valid email is required" });
      return;
    }

    const user = await findUserByEmail(email.trim().toLowerCase());
    if (user && !user.email_verified) {
      await sendVerificationEmail(user);
    }

    res.status(204).send();
  },
);

export default router;
