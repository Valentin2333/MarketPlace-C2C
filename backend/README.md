# backend

Custom backend for MarketPlace C2C, living alongside `src/` (the frontend)
in this same repo. Replaces Supabase piece by piece — starts with just the
database layer.

## Setup

From this `backend/` folder:

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` from your Neon project.
2. `npm install`
3. `npm run migrate` — applies any migration in `migrations/` that hasn't run yet, tracked in the `schema_migrations` table.
4. `npm run dev` — starts the API on `http://localhost:4000` and restarts on file changes. Visit `http://localhost:4000/health` — you should see `{"status":"ok"}`.

Note: `backend/` has its own `package.json` and `node_modules`, separate from the frontend's. Always `cd backend` before running its npm scripts.

## Scripts

- `npm run dev` — local development server (auto-restart via `tsx watch`)
- `npm run build` — type-checks and compiles to `dist/`
- `npm start` — runs the compiled output (`dist/index.js`) — used in production
- `npm run migrate` — applies pending SQL migrations

## Deploying to Render

1. Push this repo to GitHub (frontend and backend both included).
2. On render.com, **New > Web Service**, connect the repo.
3. **Root Directory**: `backend`
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`
6. **Environment variables**: add `DATABASE_URL` (your Neon connection string) and `FRONTEND_ORIGIN` (your Netlify site URL, e.g. `https://your-site.netlify.app`). Don't set `PORT` — Render provides it automatically and `index.ts` already reads `process.env.PORT`.
7. Free tier spins the service down after ~15 minutes idle and takes a few seconds to wake on the next request. Nothing is deleted — just a cold start, same trade-off as Neon.

## Adding a migration

Add a new numbered file to `migrations/` (e.g. `0002_add_something.sql`) and run `npm run migrate` again. Never edit a migration that has already been applied — add a new one instead.
