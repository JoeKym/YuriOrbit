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
- **Authentication & Profiles:** Secure authentication powered by Kinde Auth.

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v7
- **Edge Functions / Proxies:** Cloudflare Pages Functions (`functions/api/mangadex`, `functions/api/tmdb`) with edge caching and CORS handling
- **API Aggregation:** AniList GraphQL, MangaDex REST, Jikan REST, TMDB API
- **Auth:** Kinde Auth (`@kinde-oss/kinde-auth-react`)
- **Hosting:** Cloudflare Pages / Render

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

4. Start the development server (with built-in API proxies):
   ```bash
   npm run dev
   ```

5. Run test suite:
   ```bash
   npm run test
   ```

---

## Deployment to Cloudflare Pages

Cloudflare Pages hosts both the static frontend and the serverless Edge Functions in `functions/`:

1. In the **Cloudflare Dashboard**, navigate to **Compute (Workers & Pages)** > **Create** > **Pages** > **Connect to Git**.
2. Select repository: `JoeKym/YuriOrbit`.
3. Set the build configuration:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Set Environment Variables (in **Settings** > **Environment variables**):
   - `VITE_KINDE_CLIENT_ID`: Your Kinde Client ID
   - `VITE_KINDE_DOMAIN`: Your Kinde Domain (e.g. `https://your-domain.kinde.com`)
   - `VITE_KINDE_REDIRECT_URI`: Your production URL (e.g. `https://yuriorbit.pages.dev`)
   - `VITE_KINDE_LOGOUT_REDIRECT_URI`: Your production URL
   - Optional Server Secrets (used by Pages Functions):
     - `TMDB_READ_ACCESS_TOKEN` or `TMDB_API_KEY`: Custom TMDB key
     - `MANGADEX_USER_AGENT`: Custom User-Agent (defaults to `YuriOrbit/1.0`)
5. Click **Save and Deploy**.
