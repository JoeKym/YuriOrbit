# YuriOrbit

> Discover, track, and curate Yuri and Girls' Love anime, manga, manhwa, webtoons, light novels, and live-action dramas worldwide.

YuriOrbit is a community-first media catalog and discovery platform dedicated to Girls' Love (GL) and Yuri storytelling across Asian and international entertainment.

---

## Features

- **Unified GL Catalog:** Browse across Manga, Manhwa, Manhua, Webtoons, Light Novels, Anime, and Live-Action Dramas.
- **Multi-Source Aggregation:** Real-time data from AniList, MangaDex, Jikan (MyAnimeList), and TMDB.
- **Built-in Manga Reader:** Direct MangaDex chapter reading with automatic chapter sorting and official source attribution.
- **Smart GL Classification:** Curated filtering for Confirmed GL, GL-Related, and Subtext titles.
- **Personal Library:** Track reading & watching progress (Currently Reading, Plan to Read, Completed, Favourites).
- **Authentication & Profiles:** Secure authentication powered by Supabase Auth.

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v7
- **MangaDex Proxy:** Lightweight Node proxy (`proxy/server.mjs`) with CORS headers and health check
- **API Aggregation:** AniList GraphQL, MangaDex REST, Jikan REST, TMDB API
- **Auth:** Supabase Auth (`@supabase/supabase-js`)
- **Hosting:** Render (Static Site for frontend, Web Service for proxy)

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Installation & Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/JoeKym/YuriOrbit.git
   cd YuriOrbit
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start the development server (with Vite's built-in API proxy):
   ```bash
   npm run dev
   ```

5. Run test suite:
   ```bash
   npm run test
   ```

6. Run the local MangaDex proxy (optional):
   ```bash
   npm run proxy
   ```

---

## Deployment to Render

YuriOrbit is configured as a multi-service Render Blueprint in `render.yaml`:

1. **`yuriorbit` (Static Site)**:
   - Hosts the pre-built React frontend at `yuriorbit.onrender.com`.
   - Fast, globally distributed static CDN with instant loads (no cold starts).
   - SPA route rewrite (`/*` -> `/index.html`).
   - Connects to the MangaDex proxy via `VITE_MANGADEX_API_URL`.

2. **`yuriorbit-proxy` (Web Service)**:
   - Lightweight Node server (`proxy/server.mjs`) deployed on Render at `yuriorbit-proxy.onrender.com`.
   - Resolves browser CORS blocks by proxying requests to `https://api.mangadex.org`.
   - Health check available at `/health`.

In Render, connect the repo with your Blueprint or create the static site and proxy web service as defined in `render.yaml`.

---

## Deployment to Cloudflare Pages (Recommended)

YuriOrbit can be deployed directly to Cloudflare Pages with zero cold starts:

1. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select your `JoeKym/YuriOrbit` repository.
3. Configure build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Set Environment Variables:
   - `NODE_VERSION`: `20`
   - `VITE_APP_NAME`: `YuriOrbit`
   - `VITE_SUPABASE_URL`: Your Supabase project URL (`https://<project-ref>.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` *(or `VITE_SUPABASE_PUBLISHABLE_KEY`)*: Your Supabase anon/publishable client key — either name works
   - `VITE_ADMIN_EMAILS` *(optional)*: Comma-separated list of admin account emails
   - `TMDB_READ_ACCESS_TOKEN` *(preferred; server-side secret for Pages Functions)*: Your TMDB API Read Access Token (v4). Store it as a Cloudflare secret, not a `VITE_` variable.
   - `TMDB_API_KEY` *(fallback; optional server-side secret for Pages Functions)*: Your TMDB API Key (v3), used only when the Read Access Token is not configured. Store it as a Cloudflare secret, not a `VITE_` variable.

   > **Important:** `VITE_*` variables are inlined into the JS bundle at **build time**. Adding or changing them in the Cloudflare dashboard does nothing until you trigger a new deployment. If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing the site still loads — sign-in is simply disabled and libraries stay local to the browser.
5. Deploy. Cloudflare automatically hosts the static assets on its edge CDN and mounts the serverless functions in `functions/api/` on `/api/*` on the same domain.

---

## Public profiles, Anime hub & Admin console

### 1. Apply the database migration

The profile, Editor's Picks, site-settings and audit tables live in
`supabase/migrations/20261107120000_profiles_featured_settings_audit.sql`.
Paste it into the Supabase SQL editor and run it — it is idempotent and also adds
the policy that lets anyone read the library of a **public** profile.

Until it is applied everything still works: `/user/*` shows a "profiles aren't
enabled yet" notice, and the homepage simply omits the Editor's Picks rail.

### 2. Account pages — `/auth` and `/profile`

- **`/auth`** is the full auth page: sign in, sign up (email + username +
  password + confirmation), forgot password, and password reset (`/auth?mode=reset`).
  `?next=` is honoured after a successful sign-in.
- **`/profile`** is the signed-in account page: header card with avatar, stats,
  recent library grid, and an inline editor (avatar upload, username, display
  name, bio, public toggle). Signed-out visitors are redirected to
  `/auth?next=/profile`. `/settings` links here.

### 3. Public profiles — `/user/{username}`

Profiles are public by default; switching the public toggle off in `/profile`
hides both the profile and its library from everyone except the owner.

### 4. Admin console — `/admin`

Admin access is enforced **server-side** by `functions/api/admin/[[path]].ts`:
the caller's Supabase access token is verified against Supabase Auth, their email
is checked against an allowlist, and only then are privileged queries performed
with the service role key. The old client-side email check is now just UI.

Add these to the Cloudflare Pages project (Settings → Environment variables):

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Project URL, e.g. `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key used server-side. **Never add a `VITE_` prefix** — that would ship it to the browser. |
| `ADMIN_EMAILS` | Comma-separated admin emails (optional; the owner account is allowed by default) |

`SUPABASE_SECRET_KEY` is accepted as an alternative to `SUPABASE_SERVICE_ROLE_KEY`
when using Supabase's new-style keys.

Tabs are addressable by slug, e.g. `/admin?tab=users` or `/admin?tab=featured`:
`overview`, `users`, `library`, `featured`, `settings`, `audit`.

What the console does:

- **Overview** — accounts, new signups, library entries by status, most-tracked titles
- **Users** — search accounts, inspect library size, purge a library or delete an account
- **Library entries** — search and moderate every tracked title
- **Editor's Picks** — pin catalog titles to the homepage
- **Site settings** — the site-wide announcement banner
- **Audit log** — every privileged action, with actor and timestamp

---

## Title identity, ids and search results

Titles no longer use upstream ids in URLs. Every catalog entry gets a YuriOrbit
slug derived from its title (for example `/title/bloom-into-you-2015`), which is
what `ContentCard`, the library, and history all link to.

- `src/lib/catalog/identity.ts` — slug building, title normalisation, provider-id
  detection.
- `src/lib/catalog/registry.ts` — a small localStorage registry that remembers
  which slug belongs to which provider id, so a slug link can be resolved later
  even though the catalog is fetched live from AniList/MangaDex/TMDB.
- `src/lib/catalog/canonical.ts` — merges the same work returned by both APIs
  (title + alt titles, family-gated) before results are rendered, so searching
  "Bloom Into You" no longer shows it twice.
- Legacy links (`ANILIST-…`, `MANGADEX-…`, `TMDB-movie-…`) still resolve, and old
  library rows keep working.

MangaDex artwork is served through `/api/mangadex/covers/*` (see
`functions/api/mangadex/[[path]].ts`). This keeps covers same-origin — the browser
otherwise blocks them — and drops the `Referer` header, because MangaDex answers
cross-origin cover requests with a "you can read this at mangadex.org" placeholder
image.
