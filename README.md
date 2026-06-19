# MarketPlace C2C

A consumer-to-consumer (C2C) listings platform where anyone can post ads to sell secondhand items - electronics, furniture, clothing, and more. Buyers browse listings by category, location and price, view full details with photo galleries, and reach sellers through their public profiles.

**Live demo:** https://marketplacec2c.netlify.app/

**Test Email:** test@test.com

**Test Password:** 12345678

---

## Features

- **Authentication** - Email and password registration and login, logout, plus a full forgot-password and reset-password flow via email.
- **User profiles** - Public profile pages and an editable own-profile view. Users can update their display name and city, upload an avatar, and trigger a password reset for their own account.
- **Browse listings** - A responsive listings grid with full-text search across titles and descriptions.
- **Filtering and sorting** - Filter by category, city and price range; sort by newest, oldest, price ascending or price descending. Active filters are reflected in the URL so any view is shareable and bookmarkable.
- **Infinite scroll** - Listings load in pages via an `IntersectionObserver`, with in-memory result caching and scroll-position restoration so returning to the grid (for example via the browser back button) lands the user exactly where they left off.
- **Listing detail page** - Full description, price, location, image gallery and a seller card that links through to the seller's public profile.
- **Create, edit and delete listings** - Authenticated users can create listings (title, description, price, category, city) and edit or delete their own.
- **Image upload** - Up to 5 images per listing, with client-side compression and resizing (max 1600px, JPEG at 0.8 quality) before upload, drag-and-drop support, and selection of a main image.
- **Role-based UI** - Profiles carry a `role` field. Users with the `admin` role see an Admin Panel entry in the navigation (the panel itself is on the roadmap).

## Tech stack

| Area           | Choice                             |
| -------------- | ---------------------------------- |
| Framework      | React 19                           |
| Language       | TypeScript                         |
| Build tool     | Vite                               |
| Routing        | React Router 7                     |
| Forms          | React Hook Form                    |
| Styling        | CSS Modules + a global stylesheet  |
| Icons          | MUI Icons                          |
| Backend (BaaS) | Supabase - Postgres, Auth, Storage |
| Hosting        | Netlify                            |

## Project structure

```
src/
  components/        Shared UI (Navbar, ListingCard)
  features/
    auth/            Register, Login, Forgot/Reset password, AuthHeader
    listings/        Listings page, grid, toolbar, filters drawer,
                     detail page, create/edit modals, useListings hook
    profile/         Public and own profile page
  lib/
    supabase.ts      Supabase client
    format.ts        Price and date formatting helpers
  styles/
    global.css       Global styles and design tokens
  App.tsx            Routes
  main.tsx           Entry point
```

The codebase is organised by feature. Data fetching, filtering, pagination, caching and scroll restoration for the listings grid all live in a single `useListings` hook, keeping the page components focused on presentation.

## Data model

The app expects the following Supabase tables and storage buckets. This reflects the schema the current code reads and writes.

**Tables**

- `profiles` - `id` (uuid, references `auth.users`), `name`, `city`, `avatar_url`, `role`
- `listings` - `id` (uuid), `title`, `description`, `price` (nullable), `city`, `category_id` (references `categories`), `user_id` (references the owner), `status` (for example `active`), `created_at`
- `listing_images` - `id`, `listing_id` (references `listings`), `url`, `position`
- `categories` - `id`, `name`

**Storage buckets**

- `listing-images` - listing photos
- `avatars` - profile avatars

> Note: the schema above is the shape the application relies on. You will need the matching tables, foreign keys, Row Level Security policies and public storage buckets configured in your own Supabase project for a local copy to function.

## Getting started

### Prerequisites

- Node.js 18 or newer
- A Supabase project with the tables and buckets described above

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

The app is deployed on Netlify. Connect the repository, set the build command to `npm run build`, the publish directory to `dist`, and add the two `VITE_SUPABASE_*` environment variables in the Netlify dashboard. A redirect rule sending all paths to `/index.html` is recommended so client-side routes resolve on direct navigation and refresh.

## Roadmap

- **Real-time messaging** - Direct, real-time chat between buyers and sellers.
- **Admin panel** - A management dashboard for the existing `admin` role (moderating listings and users); the role check and navigation entry are already in place.
- **Custom backend** - Longer term, replacing Supabase with a self-hosted backend.
