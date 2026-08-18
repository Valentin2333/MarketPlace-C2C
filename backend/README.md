# MarketPlace C2C - backend

Custom Express + TypeScript API for MarketPlace C2C, living alongside
[`../frontend`](../frontend) in this monorepo. Replaced Supabase (auth,
database, storage, realtime, email) piece by piece — see the
[root README](../README.md) for the live demo link, full feature list, and
overall project overview.

## Setup

1. Copy `.env.example` to `.env` and fill in every value — see below for where each one comes from.
2. `npm install`
3. `npm run migrate` — applies any pending SQL migration in `migrations/`, tracked in a `schema_migrations` table so it's safe to re-run.
4. `npm run dev` — starts the API on `http://localhost:4000` (both REST and the `/ws` WebSocket endpoint), restarting on file changes.

### Environment variables

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Neon project connection string |
| `PORT` | `4000` locally; Render sets this itself in production, don't override it there |
| `FRONTEND_ORIGIN` | Your frontend's URL — used for CORS and to validate WebSocket connection origins |
| `JWT_SECRET` | Any long random string, e.g. `openssl rand -hex 32` |
| `GMAIL_USER` | The Gmail address you'll send from |
| `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` | An OAuth 2.0 Client ID (type "Web application") from [Google Cloud Console](https://console.cloud.google.com/apis/credentials), with the Gmail API enabled for that project and `http://localhost:3000/oauth2callback` added as an authorized redirect URI |
| `GMAIL_REFRESH_TOKEN` | Run `npm run get-gmail-token` after setting the two values above — it opens a browser consent screen and prints the refresh token to save here |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID (type "Web application") used for **Sign in with Google** — the same value the frontend uses as `VITE_GOOGLE_CLIENT_ID`. Add your frontend origin (e.g. `http://localhost:5173`, and your production URL) under **Authorized JavaScript origins**. No client secret is needed — the backend only verifies the Google ID token's signature. This is a *separate* concern from the `GMAIL_*` credentials above, though both can live in the same Google Cloud project |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | Cloudflare R2 bucket + an API token scoped to it |
| `R2_STORAGE_LIMIT_GB` | Optional, defaults to `9.5` — total storage cap before uploads start getting rejected |

> Email goes out over the **Gmail API via HTTPS** (OAuth2), not SMTP — Render's free tier blocks outbound SMTP ports (25/465/587) entirely, but HTTPS is never blocked. That's why the setup is an OAuth Client ID + refresh token instead of the simpler Gmail app-password/SMTP approach you may have seen elsewhere.

## Scripts

- `npm run dev` — local development server (auto-restart via `tsx watch`)
- `npm run build` — type-checks and compiles to `dist/`
- `npm start` — runs the compiled output (`dist/index.js`) — used in production
- `npm run migrate` — applies pending SQL migrations to the database in `.env` (your dev database)
- `npm run migrate:test` — applies pending SQL migrations to the database in `.env.test` instead — see [Testing](#testing)
- `npm run get-gmail-token` — one-time OAuth flow that prints the `GMAIL_REFRESH_TOKEN` value for `.env` (see the env var table above)
- `npm test` — runs the integration test suite once (see below)
- `npm run test:watch` — reruns the integration test suite as you edit

## Adding a migration

Add a new numbered file to `migrations/` (e.g. `0006_something.sql`) and run `npm run migrate`. This only applies it to the database in `.env` — **also run `npm run migrate:test`**, or your own and everyone else's test suite will start failing with 500s on whatever the new migration touches (this is exactly what happened with `0005_email_verification.sql` — see below). Never edit a migration that's already been applied — add a new one instead.

## Testing

Tests use [Vitest](https://vitest.dev) + [Supertest](https://github.com/ladjs/supertest) to hit your real Express app over HTTP, backed by a real Postgres database — not mocks. This catches the kind of bug a pure unit test can't: a route that's missing its auth middleware, a broken merge that dropped a router, a wrong status code.

**They must run against a separate database from your real one.** The easiest way to get one: in Neon, create a **branch** off your main project (Neon dashboard → your project → Branches → Create branch). It's instant and free, and it inherits whatever schema your main branch has *at the moment you create it* — but a Neon branch is a one-time snapshot, not a live mirror. Any migration you apply to your main database *after* the branch already exists does **not** automatically show up on the branch. You have to run it there yourself.

Setup:
1. Copy `.env.test.example` to `.env.test`.
2. Set `DATABASE_URL` to the branch's connection string.
3. Leave the other values as the placeholders in the example file — they're intentionally dummy values. `app.ts` imports every router at startup (including uploads, which validates R2 config exists at import time), so something has to be there even though no test actually calls R2. Outbound email is mocked in `tests/env.setup.ts`, so `GMAIL_*` never gets used for real either.
4. Run `npm run migrate:test` once to bring the branch's schema up to date. Do this again any time a new migration file is added to `migrations/` (see [Adding a migration](#adding-a-migration)) — it's the same idempotent runner as `npm run migrate`, just pointed at `.env.test` instead of `.env`.

If you skip step 4 (or forget to rerun it after a new migration lands), tests will fail with `500`s on anything that touches the missing table/column — `registerTestUser` failing with `"Internal server error"` almost always means this.

Each developer's test branch is separate, so this is a per-person, one-time-per-migration step — running it on your own branch doesn't cover anyone else's.

Run with:
```bash
npm test        # runs once
npm run test:watch  # reruns as you edit
```

Test files live in `tests/`, one per resource (`auth.test.ts`, `listings.test.ts`, …). `tests/helpers.ts` has shared setup: `resetDatabase()` (truncates every table between test cases), `registerTestUser()` (registers a real user through `/auth/register`, then completes the email-verification handshake so it comes back with a ready-to-use access token), `ensureTestCategory()`, and `makeAdmin()`.

**Current coverage:** full auth flow, listings CRUD + ownership. Not yet covered: favorites, messages, uploads, admin/reports, WebSocket broadcasts.

## Deploying to Render

1. Push this repo to GitHub (frontend and backend both included).
2. On render.com, **New > Web Service**, connect the repo.
3. **Root Directory**: `backend`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`
6. **Environment variables**: everything from the table above. Don't set `PORT` — Render provides it automatically and `index.ts` already reads `process.env.PORT`.
7. Free tier spins the service down after ~15 minutes idle and takes a few seconds to wake on the next request — nothing is deleted, just a cold start, same trade-off as Neon's free tier.
8. WebSockets work over the same HTTP service Render already gives you — no separate service or extra config needed.
