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
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | A Gmail account + an [app password](https://myaccount.google.com/apppasswords) (not your real Gmail password) |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_PUBLIC_URL` | Cloudflare R2 bucket + an API token scoped to it |
| `R2_STORAGE_LIMIT_GB` | Optional, defaults to `9.5` — total storage cap before uploads start getting rejected |

## Scripts

- `npm run dev` — local development server (auto-restart via `tsx watch`)
- `npm run build` — type-checks and compiles to `dist/`
- `npm start` — runs the compiled output (`dist/index.js`) — used in production
- `npm run migrate` — applies pending SQL migrations
- `npm test` — runs the integration test suite (see below)

## Adding a migration

Add a new numbered file to `migrations/` (e.g. `0005_something.sql`) and run `npm run migrate` again. Never edit a migration that's already been applied — add a new one instead.

## Testing

Tests use [Vitest](https://vitest.dev) + [Supertest](https://github.com/ladjs/supertest) to hit your real Express app over HTTP, backed by a real Postgres database — not mocks. This catches the kind of bug a pure unit test can't: a route that's missing its auth middleware, a broken merge that dropped a router, a wrong status code.

**They must run against a separate database from your real one.** The easiest way to get one: in Neon, create a **branch** off your main project (Neon dashboard → your project → Branches → Create branch). It's instant, free, and inherits your current schema automatically — no need to run migrations again on it.

Setup:
1. Copy `.env.test.example` to `.env.test`.
2. Set `DATABASE_URL` to the branch's connection string.
3. Leave the other values as the placeholders in the example file — they're intentionally dummy values. `app.ts` imports every router at startup (including uploads, which validates R2 config exists at import time), so something has to be there even though no test actually calls R2. Outbound email is mocked in `tests/env.setup.ts`, so `GMAIL_*` never gets used for real either.

Run with:
```bash
npm test        # runs once
npm run test:watch  # reruns as you edit
```

Test files live in `tests/`, one per resource (`auth.test.ts`, `listings.test.ts`, …). `tests/helpers.ts` has shared setup: `resetDatabase()` (truncates every table between test cases), `registerTestUser()` (registers a real user through the actual `/auth/register` endpoint), `ensureTestCategory()`, and `makeAdmin()`.

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
