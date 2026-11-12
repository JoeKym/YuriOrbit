import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import dyadComponentTagger from '@dyad-sh/react-vite-component-tagger';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Cloud preview hostnames are generated per session, and Vite rejects any
    // Host it does not know. They arrive through the environment rather than
    // being hard-coded here; never set this to `true`.
    allowedHosts: (process.env.VITE_ALLOWED_HOSTS ?? '')
      .split(',')
      .map((host) => host.trim())
      .filter(Boolean),
    proxy: {
      // Covers are served from a different MangaDex host; keep the proxy order
      // specific-first so /api/mangadex/covers is not swallowed by the API rule.
      '/api/mangadex/covers': {
        target: 'https://uploads.mangadex.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mangadex\/covers/, '/covers'),
        headers: {
          'User-Agent': 'YuriOrbit/1.0 (https://github.com/JoeKym/YuriOrbit)',
          'Accept': 'image/avif,image/webp,image/jpeg,image/png,image/*',
        },
        // MangaDex answers cross-origin image requests (see `Vary: Origin,
        // Referer`) with a "you can read this at mangadex.org" placeholder.
        // Strip the browser's referer/origin so the real artwork comes back.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('referer');
            proxyReq.removeHeader('origin');
          });
        },
      },
      '/api/mangadex': {
        target: 'https://api.mangadex.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mangadex/, ''),
        headers: {
          'User-Agent': 'YuriOrbit/1.0 (https://github.com/JoeKym/YuriOrbit)',
          'Accept': 'application/json',
        },
      },
      '/api/tmdb': {
        target: 'https://api.themoviedb.org/3',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tmdb/, ''),
      },
      // Production serves this from functions/_lib/anilist-proxy.ts, which adds
      // the edge cache. Plain `vite dev` has no Pages Functions, so forward the
      // GraphQL POST to AniList directly.
      '/api/anilist': {
        target: 'https://graphql.anilist.co',
        changeOrigin: true,
        rewrite: () => '/',
        headers: {
          Accept: 'application/json',
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
