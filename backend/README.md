# backend

Custom backend for MarketPlace C2C, living alongside `src/` (the frontend)
in this same repo. Replaces Supabase piece by piece — starts with just the
database layer.

## Setup

From this `backend/` folder:

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL` from your Neon project.
2. `npm install`
3. `npm run migrate` — applies any migration in `migrations/` that hasn't run yet, tracked in the `schema_migrations` table.

Note: `backend/` has its own `package.json` and `node_modules`, separate from the frontend's. Always `cd backend` before running its npm scripts.

## Adding a migration

Add a new numbered file to `migrations/` (e.g. `0002_add_something.sql`) and run `npm run migrate` again. Never edit a migration that has already been applied — add a new one instead.
