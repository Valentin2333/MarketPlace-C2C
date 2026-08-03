# MarketPlace C2C - frontend

React + TypeScript + Vite frontend for MarketPlace C2C. Talks to the custom
Express API in [`../backend`](../backend) - see the [root README](../README.md)
for the live demo link, full feature list, and overall project overview.

## Prerequisites

- Node.js 18 or newer
- The backend running (locally or deployed) - see [`../backend/README.md`](../backend/README.md)

## Setup

```bash
npm install
```

Add to `.env` in this folder:

```env
VITE_API_URL=http://localhost:4000
```
(or your deployed backend's URL, if you're not running it locally)

## Running

```bash
npm run dev
```

Starts on the URL Vite prints (by default `http://localhost:5173`).

## Available scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint over the project |
| `npm test` | Run unit tests (Vitest) |

## Testing

Unit tests cover pure logic only - formatting helpers, auth error-message
mapping, URL parsing - no component or browser tests yet. They need no
external services or database, so:

```bash
npm test
```

Test files sit next to the code they test (e.g. `src/lib/format.test.ts`
alongside `src/lib/format.ts`).

## Project structure

```
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
```

The app is organised by feature. Data fetching, filtering, pagination,
caching and scroll restoration for the listings grid all live in a single
`useListings` hook, keeping page components focused on presentation.
Cross-cutting concerns (favorites, unread messages, reports, theme, toasts,
current-user identity, the WebSocket connection) each follow a
Context + Provider + Hook pattern.

## Deployment (Netlify)

- **Base directory**: `frontend`
- **Build command**: `npm run build`
- **Publish directory**: `frontend/dist` (or `dist`, if base directory is already set to `frontend`)
- **Environment variables**: `VITE_API_URL` set to your deployed backend's URL
- `public/_redirects` sends all paths to `/index.html` so client-side routes resolve on direct navigation and refresh - make sure it's present in the build output.
