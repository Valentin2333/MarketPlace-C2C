import rateLimit from "express-rate-limit";

// The integration test suite reuses a single supertest "IP" across dozens
// of requests in the same run, so these limits would otherwise start
// rejecting registrations/logins partway through the suite regardless of
// what the tests are actually exercising. Vitest sets NODE_ENV=test by
// default, so this only relaxes limits for the test run, not dev/prod.
const skipInTests = (): boolean => process.env.NODE_ENV === "test";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: "Too many login attempts. Please try again later." },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: {
    error: "Too many accounts created from this network. Please try again later.",
  },
});

export const emailActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { error: "Too many requests. Please try again later." },
});
