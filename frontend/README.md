# MarketPlace C2C

A consumer-to-consumer (C2C) listings platform where anyone can post ads to sell secondhand items - electronics, furniture, clothing, and more. Buyers browse listings by category, location and price, message sellers directly, and manage their own account, listings and conversations.

**Live demo:** https://marketplacec2c.netlify.app/

**Test Email:** test@test.com

**Test Password:** 12345678

---

## Features

- **Authentication** - Email and password registration and login, logout, plus a full forgot-password and reset-password flow via email.
- **User profiles** - Public profile pages and an editable own-profile view. Users can update their display name and city, upload an avatar, trigger a password reset, and permanently delete their own account (which cascades to their listings, images, messages and favorites).
- **Browse listings** - A responsive listings grid with full-text search across titles and descriptions.
- **Filtering and sorting** - Filter by category, city and price range; sort by newest, oldest, price ascending or price descending. Active filters are reflected in the URL so any view is shareable and bookmarkable.
- **Infinite scroll** - Listings load in pages via an `IntersectionObserver`, with in-memory result caching and scroll-position restoration so returning to the grid (for example via the browser back button) lands the user exactly where they left off.
- **Listing detail page** - Full description, price, location, image gallery and a seller card that links through to the seller's public profile.
- **Create, edit and delete listings** - Authenticated users can create listings (title, description, price, category, city) and edit or delete their own.
- **Image upload** - Up to 5 images per listing, with client-side compression and resizing (max 1600px, JPEG at 0.8 quality) before upload, drag-and-drop support, and selection of a main image.
- **Favorites / wishlist** - Heart any listing to save it; a dedicated favorites page and a navbar badge track saved listings per user.
- **Messaging** - Real-time, per-listing conversations between buyers and sellers (Supabase Realtime), with unread indicators, a navbar unread counter, and read receipts. Either side can delete a chat: it disappears from just their inbox unless the other participant deletes it too, at which point it's permanently removed for both. A chat that reappears due to a new message can be deleted again independently.
- **Reporting listings** - Users can report a listing with a reason; reports are visible to admins with an unseen-count badge, and can be dismissed (soft-deleted, which blocks the same user from re-reporting the same listing).
- **Admin panel** - Available to users with the `admin` role: a Users tab (infinite scroll, search by email, ban/unban) and a Reported Listings tab (view, dismiss reports, remove listings). Ban/unban is also available directly from a user's public profile.
- **Ban gate** - Banned users are shown a dedicated banned-account page instead of the app.
- **Dark / light theme toggle** - Persisted theme switch in the navbar.
- **Toast notifications** - Success, error and info toasts with auto-dismiss.
- **Footer and info pages** - FAQ, Terms & Conditions, and a GDPR-aligned Privacy Policy (Bulgaria jurisdiction).

## Tech stack

| Area           | Choice                                       |
| -------------- | --------------------------------------------- |
| Framework      | React 19                                      |
| Language       | TypeScript                                    |
| Build tool     | Vite                                          |
| Routing        | React Router 7                                |
| Forms          | React Hook Form                               |
| Styling        | CSS Modules + a global stylesheet             |
| Icons          | Emoji and inline SVG (no icon library)        |
| Backend (BaaS) | Supabase - Postgres, Auth, Storage, Realtime  |
| Hosting        | Netlify                                       |

## Project structure

```
src/
  components/
    BanGate/          Gate that shows a banned-account page instead of the app
    BrandMark/         Logo SVG
    Favorites/          FavoritesProvider/useFavorites + the heart button
    Footer/             Site footer
    ListingCard/        Shared listing preview card
    Messages/           UnreadProvider/useUnread (navbar unread counter)
    Navbar/             Top navigation
    Reports/            ReportsProvider/useReports (admin report badge)
    ScrollToTop/        Scroll-to-top-on-navigate behaviour
    Theme/              ThemeProvider/useTheme + the dark/light toggle
    Toast/              ToastProvider/useToast + toast UI
  features/
    admin/             Admin panel (users/reports tabs), report details, make-admin
    auth/              Register, Login, Forgot/Reset password, AuthHeader
    favorites/         Favorites page
    info/              FAQ, Terms, Privacy pages
    listings/          Listings page, grid, toolbar, filters drawer, detail
                        page, create/edit modals, useListings hook,
                        listingImages helpers
    messages/          Inbox (MessagesPage) and chat thread (ChatThreadPage)
    profile/           Public and own profile page (incl. account deletion)
  lib/
    supabase.ts         Supabase client
    format.ts           Price and date formatting helpers
    authErrors.ts        Auth error message mapping
    useCurrentUser.ts   Shared hook for the signed-in user's id/email/role
  styles/
    global.css          Global styles and design tokens
  App.tsx               Routes
  main.tsx              Entry point
```

The codebase is organised by feature. Data fetching, filtering, pagination, caching and scroll restoration for the listings grid all live in a single `useListings` hook, keeping page components focused on presentation. Cross-cutting concerns (favorites, unread messages, reports, theme, toasts, current-user identity) each follow a Context + Provider + Hook pattern.

> `features/admin/MakeAdmin.tsx` exists but isn't wired into any route - it's a ready-to-use "promote a user to admin by email" form kept on the shelf for a future admin-management screen.

## Data model

The app expects the following Supabase tables, storage buckets and RPC functions. This reflects the schema the current code reads and writes; it isn't included in this repo as SQL migrations, aside from the two account/chat-deletion functions noted below.

**Tables**

- `profiles` - `id` (uuid, references `auth.users`), `name`, `city`, `avatar_url`, `role` (`null`, `admin`, or `banned`)
- `listings` - `id` (uuid), `title`, `description`, `price` (nullable), `city`, `category_id` (references `categories`), `user_id` (references the owner), `status` (for example `active`), `created_at`
- `listing_images` - `id`, `listing_id` (references `listings`), `url`, `position`
- `categories` - `id`, `name`, `slug`
- `favorites` - `user_id`, `listing_id`, `created_at`
- `messages` - `id`, `listing_id`, `sender_id`, `receiver_id`, `body`, `created_at`, `read_at`
- `reports` - `id`, `listing_id`, `reporter_id`, `reason`, `created_at`, `seen`, `dismissed`
- `chat_deletes` - `listing_id`, `user_id`, `other_id`, `deleted_at` - per-user "I deleted this chat" markers used to implement two-sided chat deletion (see below)

**Storage buckets**

- `listing-images` - listing photos
- `avatars` - profile avatars

**RPC functions**

A few actions run through Postgres functions instead of plain table queries, either because they need elevated privileges or because they must run atomically:

- `admin_list_users`, `search_users_by_email` - paginated/searchable user lists for the admin panel, reading `auth.users` safely via `SECURITY DEFINER`
- `admin_list_reports`, `admin_list_listing_reports` - grouped/detailed report views for admins
- `delete_own_account` - lets a signed-in user permanently delete their own account: their messages, favorites, reports, listing images, listings, profile row and Auth user are all removed
- `delete_chat` - lets a user delete a chat from just their side; if the other participant's own delete marker is still current (no messages have arrived since they deleted), all of that chat's messages are permanently removed for both sides

> `delete_own_account` and `delete_chat` are provided as ready-to-run SQL files alongside this codebase rather than as part of the app's source tree, since they need to be executed directly in the Supabase SQL editor.

> Note: the schema above is the shape the application relies on. You will need the matching tables, foreign keys, Row Level Security policies and public storage buckets configured in your own Supabase project for a local copy to function.

## Getting started

### Prerequisites

- Node.js 18 or newer
- A Supabase project with the tables, buckets and RPC functions described above

### 1. Clone and install

```bash
git clone https://github.com/Valentin2333/MarketPlace-C2C.git
cd MarketPlace-C2C
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

These come from your Supabase project under Project Settings > API.

### 3. Run the dev server

```bash
npm run dev
```

The app starts on the URL Vite prints (by default http://localhost:5173).

## Available scripts

| Script            | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Type-check and build for production  |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run ESLint over the project          |

## Deployment

The app is deployed on Netlify. Connect the repository, set the build command to `npm run build`, the publish directory to `dist`, and add the two `VITE_SUPABASE_*` environment variables in the Netlify dashboard. `public/_redirects` sends all paths to `/index.html` so client-side routes resolve on direct navigation and refresh.

## Roadmap

- **Admin-management screen** - Wire up `MakeAdmin` (already built) so existing admins can promote other users without touching the database directly.
- **Custom backend** - Longer term, replacing Supabase with a self-hosted backend.
