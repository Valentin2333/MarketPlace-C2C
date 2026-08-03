# MarketPlace C2C

A consumer-to-consumer (C2C) listings platform where anyone can post ads to sell secondhand items - electronics, furniture, clothing, and more. Buyers browse listings by category, location and price, message sellers directly in real time, and manage their own account, listings and conversations.

This is a monorepo: the frontend lives at the repo root, the backend lives in `backend/`. Both were originally built against Supabase, then migrated step by step to a fully custom Node/Express/Postgres backend — nothing in the running app talks to Supabase anymore.

---

## Features

- **Authentication** - Email/password registration and login with JWT access tokens (15 min) and rotating refresh tokens (30 days, single-use), logout, and a full forgot-password/reset-password flow via email.
- **User profiles** - Public profile pages and an editable own-profile view. Users can update their display name and city, upload an avatar, trigger a password reset, and permanently delete their own account (cascades to their listings, images, messages, favorites and every other owned row via database foreign keys).
- **Browse listings** - A responsive listings grid with full-text search across titles and descriptions.
- **Filtering and sorting** - Filter by category, city and price range; sort by newest, oldest, price ascending or price descending. Active filters are reflected in the URL so any view is shareable and bookmarkable.
- **Infinite scroll** - Listings load in pages via an `IntersectionObserver`, with in-memory result caching and scroll-position restoration so returning to the grid (for example via the browser back button) lands the user exactly where they left off.
- **Live new-listing notice** - A small banner appears for anyone browsing (logged in or not) the moment someone else publishes a new listing, via WebSocket - no page refresh needed to notice it, though refreshing the query is still opt-in rather than silently reshuffling the grid.
- **Listing detail page** - Full description, price, location, image gallery and a seller card that links through to the seller's public profile.
- **Create, edit and delete listings** - Authenticated users can create listings (title, description, price, category, city) and edit or delete their own; edits and deletes are enforced server-side (owner or admin only).
- **Image upload** - Up to 5 images per listing, with client-side compression and resizing (max 1280px, JPEG at 0.72 quality) before upload to Cloudflare R2, drag-and-drop support, and selection of a main image. A server-side storage cap blocks new uploads once total usage approaches the R2 free-tier limit.
- **Favorites / wishlist** - Heart any listing to save it; a dedicated favorites page and a navbar badge track saved listings per user.
- **Messaging** - Real-time, per-listing conversations between buyers and sellers over a custom WebSocket server, with unread indicators, a live navbar unread counter, and live read receipts ("Seen"). Either side can delete a chat: it disappears from just their inbox without affecting the other participant's copy.
- **Reporting listings and users** - Users can report a listing or another user with a reason; duplicate reports from the same reporter are blocked. Reports show up live in the admin panel via WebSocket, with an unseen-count badge, and can be dismissed.
- **Admin panel** - Available to users with the `admin` role: a Users tab (infinite scroll, search by email, ban/unban) and tabs for reported listings and reported users, both updating live as new reports come in. Ban/unban is also available directly from a user's public profile.
- **Ban gate** - Banned users are shown a dedicated banned-account page instead of the app.
- **Dark / light theme toggle** - Persisted theme switch in the navbar.
- **Toast notifications** - Success, error and info toasts with auto-dismiss.
- **Footer and info pages** - FAQ, Terms & Conditions, and a Privacy Policy.

## Tech stack

| Area | Frontend | Backend |
| --- | --- | --- |
| Language | TypeScript | TypeScript |
| Framework | React 19 | Express 5 |
| Build/run | Vite | tsx (dev), tsc (build) |
| Routing | React Router 7 | Express routers |
| Forms | React Hook Form | - |
| Styling | CSS Modules + global stylesheet | - |
| Auth | Custom JWT-based context/hooks | bcrypt password hashing, JWT + rotating refresh tokens |
| Database | - | Postgres via `pg`, hosted on Neon |
| File storage | - | Cloudflare R2 (S3-compatible) |
| Email | - | Gmail SMTP via Nodemailer |
| Realtime | Native `WebSocket` API, hand-rolled reconnect | `ws` (raw WebSocket server, no Socket.IO) |
| Testing | Vitest (unit tests for pure logic) | Vitest + Supertest (API integration tests against a real test database) |
| Hosting | Netlify | Render |

## Project structure

```
(repo root - frontend)
src/
  components/
    BanGate/          Gate that shows a banned-account page instead of the app
    Favorites/          FavoritesProvider/useFavorites + the heart button
    Messages/           UnreadProvider/useUnread (live navbar unread counter)
    Navbar/             Top navigation
    Reports/            ReportsProvider/useReports (live admin report badge)
    UserReports/        UserReportsProvider/useUserReports
    Theme/              ThemeProvider/useTheme + the dark/light toggle
    Toast/              ToastProvider/useToast + toast UI
  features/
    admin/             Admin panel (users/reports tabs), report detail pages
    auth/              Register, Login, Forgot/Reset password
    favorites/         Favorites page
    info/              FAQ, Terms, Privacy pages
    listings/          Listings page/grid/filters/detail page, create/edit
                        modals, useListings hook, image compression helpers
    messages/          Inbox (MessagesPage) and chat thread (ChatThreadPage)
    profile/           Public and own profile page (incl. account deletion)
  lib/
    api/client.ts       Shared authenticated fetch wrapper (401 refresh-and-retry)
    auth/               AuthContext/useAuth, token storage, auth API calls
    admin/adminApi.ts   Admin-only API calls
    favorites/          Favorites API calls
    listings/           Listings/categories API calls
    messages/           Messages API calls
    users/              Profile/user API calls
    uploads/            R2 upload/delete API calls
    ws/                 WebSocket client (auto-reconnect) + connector component
    format.ts           Price and date formatting helpers
    authErrors.ts       Auth error message mapping
    useCurrentUser.ts   Shared hook for the signed-in user's id/email/role
  styles/global.css     Global styles and design tokens
  App.tsx / main.tsx    Routes / entry point

backend/
  src/
    admin/routes.ts     Admin-only: user list/search, report review, dismiss
    auth/               JWT signing, password hashing, refresh/reset tokens, routes
    categories/routes.ts
    db/                 One file per table/domain: raw `pg` queries, no ORM
    email/gmail.ts      Nodemailer over Gmail SMTP
    favorites/routes.ts
    listings/routes.ts
    messages/routes.ts  Conversations, threads, send, read receipts, soft-delete
    middleware/         requireAuth, requireAdmin
    storage/r2.ts        Cloudflare R2 (S3-compatible) client
    uploads/routes.ts    Upload/delete, enforces a total storage cap
    users/routes.ts      Own profile, account deletion, ban/unban, user reports
    ws/server.ts         WebSocket server: per-user, admin-only, and broadcast-to-all
    app.ts / index.ts    Express app / HTTP + WebSocket server bootstrap
    migrate.ts           Tiny migration runner (tracks applied files in a table)
  migrations/            Numbered plain-SQL migration files
  tests/                 Vitest + Supertest integration tests, against a real test DB
```

The frontend is organised by feature; data fetching, filtering, pagination, caching and scroll restoration for the listings grid all live in a single `useListings` hook, keeping page components focused on presentation. Cross-cutting concerns (favorites, unread messages, reports, theme, toasts, current-user identity, the WebSocket connection) each follow a Context + Provider + Hook pattern.

The backend is organised by resource, each with its own `routes.ts` and a matching file under `db/` for the actual SQL. There's no ORM — queries are plain parameterized SQL via `pg`, which keeps the schema and the code that touches it in the same mental model.

## Data model

Postgres tables, one migration file per addition (see `backend/migrations/`):

- `users` - `id` (uuid), `email` (unique), `password_hash`, `name`, `city`, `avatar_url`, `role` (`user`/`admin`/`banned`), `created_at`
- `categories` - `id`, `name`, `slug`
- `listings` - `id`, `user_id` → `users`, `title`, `description`, `price`, `category_id` → `categories`, `city`, `status`, `created_at`
- `listing_images` - `id`, `listing_id` → `listings`, `url`, `position`
- `favorites` - `user_id`, `listing_id`, `created_at` (composite PK)
- `messages` - `id`, `listing_id`, `sender_id`, `receiver_id`, `body`, `created_at`, `read_at`
- `chat_deletes` - `listing_id`, `user_id`, `other_id`, `deleted_at` - per-user "I hid this chat" marker
- `reports` - `id`, `listing_id`, `reporter_id`, `reason`, `created_at`, `seen`, `dismissed`, unique per (listing, reporter)
- `user_reports` - same shape as `reports`, for reporting a user instead of a listing
- `refresh_tokens` - `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at` - hashed, single-use, rotated on every refresh
- `password_reset_tokens` - `id`, `user_id`, `token_hash`, `expires_at`, `used_at` - hashed, single-use, 1 hour expiry
- `uploaded_files` - `key`, `user_id`, `size_bytes` - tracks every R2 upload so total storage usage can be checked before accepting a new one

Every foreign key that should cascade on delete does (`ON DELETE CASCADE`) - deleting a user's row is enough to clean up everything they own, including their `refresh_tokens` and `uploaded_files` rows.

## Getting started

### Prerequisites

- Node.js 18 or newer
- A [Neon](https://neon.tech) Postgres project (free tier)
- A [Cloudflare](https://cloudflare.com) account with an R2 bucket (free tier)
- A Gmail account with an [app password](https://myaccount.google.com/apppasswords) for outbound email

### 1. Clone and install

```bash
git clone https://github.com/Valentin2333/MarketPlace-C2C.git
cd MarketPlace-C2C
npm install

cd backend
npm install
```

### 2. Configure the backend

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
DATABASE_URL=            # from Neon
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
JWT_SECRET=              # openssl rand -hex 32
GMAIL_USER=
GMAIL_APP_PASSWORD=
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
R2_STORAGE_LIMIT_GB=9.5  # optional, defaults to 9.5
```

Then apply the schema:

```bash
cd backend
npm run migrate
```

### 3. Configure the frontend

In the repo root, add to `.env`:

```env
VITE_API_URL=http://localhost:4000
```

### 4. Run both dev servers

```bash
# terminal 1
cd backend
npm run dev

# terminal 2, from the repo root
npm run dev
```

The frontend starts on the URL Vite prints (by default `http://localhost:5173`); the backend listens on `http://localhost:4000` (REST and the `/ws` WebSocket endpoint on the same port).

## Available scripts

**Frontend (repo root):**

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint over the project |
| `npm test` | Run frontend unit tests (Vitest) |

**Backend (`backend/`):**

| Script | Description |
| --- | --- |
| `npm run dev` | Start the API with auto-restart on save |
| `npm run build` | Type-check and compile to `dist/` |
| `npm start` | Run the compiled build (used in production) |
| `npm run migrate` | Apply any pending SQL migrations |
| `npm test` | Run backend integration tests (Vitest + Supertest, needs a test database - see below) |

## Testing

- **Frontend unit tests** cover pure logic only (formatting, error-message mapping, URL parsing) - no component or browser tests yet. Run with `npm test` from the repo root.
- **Backend integration tests** exercise real HTTP routes against your actual Express app (via Supertest) and a real Postgres database, so they catch wiring bugs a pure unit test wouldn't (missing auth checks, wrong status codes, broken route registration).
  - They need a **separate database from your real one** - a [Neon branch](https://neon.tech/docs/introduction/branching) off your main project is the recommended way to get one (instant, free, isolated, and it inherits your schema automatically).
  - Copy `backend/.env.test.example` to `backend/.env.test` and set `DATABASE_URL` to that branch's connection string.
  - Outbound email is mocked during tests - nothing is ever actually sent.
  - Run with `npm test` from `backend/`.
  - Current coverage: full auth flow (register/login/refresh/logout/password reset) and listings CRUD with ownership checks. Favorites, messages, uploads, admin/reports, and the WebSocket layer aren't covered yet.

## Deployment

- **Frontend** on Netlify: connect the repo, build command `npm run build`, publish directory `dist`, set `VITE_API_URL` to your deployed backend's URL. `public/_redirects` sends all paths to `/index.html` so client-side routes resolve on direct navigation and refresh.
- **Backend** on Render: connect the repo, root directory `backend`, build command `npm install && npm run build`, start command `npm start`. Set all the env vars from step 2 above (Render provides `PORT` automatically - don't set it yourself). WebSockets work over the same HTTP service without extra configuration.

## Roadmap

- **Broader test coverage** - favorites, messages, uploads (needs R2 mocking), admin/reports routes, and the WebSocket broadcast layer.
- **CI** - no automated test run on push/PR yet; worth wiring up once test coverage is broader.
- **Frontend component tests** - current frontend tests only cover pure logic, not rendered components or user interactions.
- **Realtime coverage gaps** - ban/unban doesn't push live to the banned user's own open session (they're blocked on their next auth check, not kicked out mid-session); ordinary listing edits (price changes, etc.) aren't pushed live to anyone already viewing that listing.
