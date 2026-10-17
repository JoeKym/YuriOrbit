# YuriOrbit [https://yuriverse.onrender.com/apple-touch-icon.png]

> Discover, track, and curate Yuri and Girls' Love anime, manga, manhwa, webtoons, light novels, and live-action dramas worldwide.

YuriOrbit is a community-first media catalog and discovery platform dedicated to Girls' Love (GL) and Yuri storytelling across Asian and international entertainment.

---

## Features

- **Unified GL Catalog:** Browse across Manga, Manhwa, Manhua, Webtoons, Light Novels, Anime, and Live-Action Dramas.
- **Multi-Source Aggregation:** Real-time data from AniList, MangaDex, Jikan (MyAnimeList), and TMDB.
- **Smart GL Classification:** Curated filtering for Confirmed GL, GL-Related, and Subtext titles.
- **Personal Library:** Track reading & watching progress (Currently Reading, Plan to Read, Completed, Favourites).
- **Authentication & Profiles:** Secure authentication powered by Kinde Auth.

---

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v7
- **UI Components:** Custom components built with Radix / Tailwind utilities
- **Auth:** Kinde Auth (`@kinde-oss/kinde-auth-react`)
- **API Aggregation:** AniList GraphQL, MangaDex REST, Jikan REST, TMDB API
- **Backend / Proxies:** Nitro server layer for CORS handling and API caching
- **Hosting:** Render

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JoeKym/YuriVerse.git
   cd YuriVerse
