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
- **MangaDex Proxy:** Lightweight Node proxy (`proxy/server.mjs`) with CORS headers and health check
- **API Aggregation:** AniList GraphQL, MangaDex REST, Jikan REST, TMDB API
- **Auth:** Kinde Auth (`@kinde-oss/kinde-auth-react`)
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
