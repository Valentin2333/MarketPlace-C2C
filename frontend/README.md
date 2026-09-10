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
VITE_GOOGLE_CLIENT_ID=<your-web-client-id>.apps.googleusercontent.com
VITE_TURNSTILE_SITE_KEY=<your-cloudflare-turnstile-site-key>
```
(`VITE_API_URL` can be your deployed backend's URL if you're not running it
locally. `VITE_GOOGLE_CLIENT_ID` enables the **Sign in with Google** button —
it's the same OAuth "Web application" client ID the backend uses as
`GOOGLE_CLIENT_ID`, and it's a public value, safe to expose. If it's omitted,
the Google button simply doesn't render and email/password login still works.
`VITE_TURNSTILE_SITE_KEY` enables the Cloudflare Turnstile "check you're human"
bot protection — the gate shown once per browser session on load, plus a widget
on the login and registration forms. It's the public site key that pairs with
the backend's `TURNSTILE_SECRET_KEY`. If it's omitted, the gate and the form
widgets are skipped entirely and the app loads as normal.)

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
    BrandMark/         The logo mark (SVG), used in the navbar
    ErrorBoundary/     Catches render errors - ErrorBoundary, RouteErrorBoundary
                        (auto-resets per route), shared ErrorFallback UI
    Favorites/          FavoritesProvider/useFavorites + the heart button
    Footer/             Page footer
    GoogleSignInButton/ Renders the Google Identity Services sign-in button
    ListingCard/        Single listing card used in the listings grid
    Messages/           UnreadProvider/useUnread (live navbar unread counter)
    Navbar/             Top navigation
    PasswordInput/      Password field with an inline show/hide toggle
    Reports/            ReportsProvider/useReports (live admin report badge)
    RobotCheckGate/     Cloudflare Turnstile "are you human" on-load gate, plus
                        the reusable TurnstileWidget used on the auth forms
    ScrollToTop/         Scrolls to top on route change
    Spinner/             Loading spinner (sm/md/lg), used in every loading state
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
    notFound/          404 page for unmatched routes
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
- **Environment variables**: `VITE_API_URL` set to your deployed backend's URL, and `VITE_GOOGLE_CLIENT_ID` for Google sign-in. Vite bakes these in at build time, so after changing them trigger a fresh deploy ("Clear cache and deploy site").
- `public/_redirects` sends all paths to `/index.html` so client-side routes resolve on direct navigation and refresh - make sure it's present in the build output.
