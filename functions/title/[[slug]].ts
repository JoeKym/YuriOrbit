/**
 * `/title/<slug>` — one HTML page per catalogue work, assembled at the edge.
 *
 * The catalogue is live, so a title page cannot be pre-built the way the routes
 * in `scripts/prerender.mjs` are. Instead every request for `/title/<slug>`
 * lands here: the SPA shell is read from the built assets, the title's metadata
 * is resolved from the catalogue providers, and the head is rewritten before the
 * document is returned. React then hydrates the same shell as on any other
 * route, so a visitor sees the normal app while a crawler that never runs
 * JavaScript sees that one work's title, description, canonical, Open Graph data
 * and JSON-LD.
 *
 * Pages Functions run before `_redirects`, so this handler wins even with the
 * SPA catch-all (`/* /index.html 200`) in `public/_redirects`.
 *
 * Env:
 *   ASSETS            — built site assets (injected by Pages).
 *   ANILIST_API_URL   — optional AniList relay. AniList blocks Cloudflare's
 *                       egress, so without this only MangaDex-backed pages
 *                       resolve real metadata; anime pages fall back to a
 *                       slug-derived title and description.
 */
import { renderTitlePage, resolveTitleMeta, slugOnlyMeta } from '../_lib/title-meta';

interface Env {
  ASSETS: Fetcher;
  ANILIST_API_URL?: string;
}

/** Long enough to spare the providers, short enough to pick up catalogue edits. */
const CACHE_SECONDS = 3_600;

function edgeCache(): Cache | undefined {
  const runtime = globalThis as { caches?: { default?: Cache } };
  return runtime.caches?.default;
}

function firstSlug(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] ?? '').trim();
  return String(value ?? '').trim();
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params, waitUntil } = context;
  const method = request.method.toUpperCase();

  if (method !== 'GET' && method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  const url = new URL(request.url);
  const slug = firstSlug(params.slug as string | string[] | undefined);
  const cache = edgeCache();
  // Internal key: never reachable as a public URL, so nothing can poison it.
  const cacheKey = new Request(`${url.origin}/__edge/title/${encodeURIComponent(slug || '-')}`);

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return method === 'HEAD' ? new Response(null, { headers: hit.headers, status: 200 }) : hit;
  }

  const shellResponse = await env.ASSETS.fetch(new URL('/index.html', url));
  if (!shellResponse.ok) return shellResponse;
  const shell = await shellResponse.text();

  // `/title/` with no slug is the app's own not-found route: serve it untouched.
  const html = slug
    ? renderTitlePage(shell, await resolveSafely(slug, env), url.origin)
    : shell;

  const response = new Response(method === 'HEAD' ? null : html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=86400`,
      'X-YuriOrbit-Render': 'title-edge',
    },
  });

  if (cache) {
    const cacheable = new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': `public, max-age=0, s-maxage=${CACHE_SECONDS}`,
        'X-YuriOrbit-Render': 'title-edge',
      },
    });
    const write = cache.put(cacheKey, cacheable).catch(() => undefined);
    if (waitUntil) waitUntil(write);
    else void write;
  }

  return response;
};

/** A provider outage leaves the page with its slug-derived copy, never an error. */
async function resolveSafely(slug: string, env: Env) {
  try {
    return await resolveTitleMeta(slug, { anilistEndpoint: env.ANILIST_API_URL });
  } catch {
    return slugOnlyMeta(slug);
  }
}
