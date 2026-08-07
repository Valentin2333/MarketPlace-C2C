# MarketPlace C2C

A consumer-to-consumer (C2C) listings platform where anyone can post ads to sell secondhand items - electronics, furniture, clothing, and more. Buyers browse listings by category, location and price, message sellers directly in real time, and manage their own account, listings and conversations.

**Live demo:** https://marketplacec2c.netlify.app/
**Test email:** test@test.com
**Test password:** 12345678

This is a monorepo: the frontend lives in [`frontend/`](./frontend), the backend lives in [`backend/`](./backend). Both were originally built against Supabase, then migrated step by step to a fully custom Node/Express/Postgres backend — nothing in the running app talks to Supabase anymore.

---

## Features

- **Authentication** - Email/password registration and login with JWT access tokens and rotating refresh tokens, logout, and a full forgot-password/reset-password flow via email.
- **User profiles** - Public profile pages and an editable own-profile view: display name, city, avatar upload, password reset, and permanent account deletion (cascades to everything owned).
- **Browse listings** - Full-text search, filtering (category/city/price), sorting, and infinite scroll with scroll-position restoration.
- **Live new-listing notice** - A small banner appears for anyone browsing (logged in or not) the moment someone else publishes a new listing, via WebSocket.
- **Listing detail page** - Full description, price, location, image gallery and a seller card.
- **Create, edit and delete listings** - Server-side ownership enforcement (owner or admin only).
- **Image upload** - Up to 5 images per listing, client-side compression before upload to Cloudflare R2, with a server-side total-storage cap.
- **Favorites / wishlist** - Heart any listing to save it, with a dedicated page and a navbar badge.
- **Messaging** - Real-time, per-listing conversations over a custom WebSocket server, with live unread counts and live read receipts.
- **Reporting listings and users** - Duplicate reports are blocked; reports show up live in the admin panel.
- **Admin panel** - User management (search, ban/unban) and live-updating reported-listings/reported-users review.
- **Ban gate** - Banned users see a dedicated suspended-account page instead of the app.
- **404 page and error boundaries** - Unmatched routes get a proper not-found page instead of silently redirecting; a render error in one page shows a contained "something went wrong" card (with a retry) instead of blanking the whole app.
- **Dark / light theme toggle**, **toast notifications**, and info pages (FAQ, Terms, Privacy).

## Tech stack

| Area | Frontend | Backend |
| --- | --- | --- |
| Language | TypeScript | TypeScript |
| Framework | React 19 | Express 5 |
| Build/run | Vite | tsx (dev), tsc (build) |
| Auth | Custom JWT-based context/hooks | bcrypt password hashing, JWT + rotating refresh tokens |
| Database | - | Postgres via `pg`, hosted on Neon |
| File storage | - | Cloudflare R2 (S3-compatible) |
| Email | - | Gmail API over HTTPS (OAuth2) — not SMTP, since Render's free tier blocks outbound SMTP ports |
| Realtime | Native `WebSocket` API, hand-rolled reconnect | `ws` (raw WebSocket server, no Socket.IO) |
| Testing | Vitest (unit tests for pure logic) | Vitest + Supertest (API integration tests) |
| Hosting | Netlify | Render |

## Getting started

Setup, environment variables, available scripts, testing instructions, and deployment steps live in each folder's own README, since the two halves of this project have very different setups:

- **[`frontend/README.md`](./frontend/README.md)** - Vite dev server, `VITE_API_URL`, frontend unit tests, Netlify deployment.
- **[`backend/README.md`](./backend/README.md)** - Neon/R2/Gmail account setup, all backend env vars, migrations, backend integration tests, Render deployment.

If you're setting this up from scratch, do the backend first (the frontend needs `VITE_API_URL` pointing at a running backend to do anything useful).

## Project structure

```
frontend/     React + Vite app - see frontend/README.md
backend/      Express + Postgres API, WebSocket server - see backend/README.md
```

## Deployment

- **Frontend** on Netlify - base directory `frontend`, build command `npm run build`, publish directory `frontend/dist`.
- **Backend** on Render - root directory `backend`, build command `npm install && npm run build`, start command `npm start`.

Full details, including every environment variable each side needs, are in the respective READMEs above.

## Roadmap

- **Broader test coverage** - favorites, messages, uploads (needs R2 mocking), admin/reports routes, and the WebSocket broadcast layer.
- **CI** - no automated test run on push/PR yet; worth wiring up once test coverage is broader.
- **Frontend component tests** - current frontend tests only cover pure logic, not rendered components or user interactions.
- **Realtime coverage gaps** - ban/unban doesn't push live to the banned user's own open session (they're blocked on their next auth check, not kicked out mid-session); ordinary listing edits (price changes, etc.) aren't pushed live to anyone already viewing that listing.
