CC/**
 * MangaDex reverse proxy — Cloudflare Workers / Pages Functions implementation.
 *
 * MangaDex does not send CORS headers, so the browser cannot call
 * https://api.mangadex.org directly. This proxy runs same-origin at
 * /api/mangadex/* on the Pages project, so the frontend never needs a
 * cross-origin hop (and no separate service / cold start).
 *
 * The handler is runtime-agnostic: it only uses fetch, URL, Request and
 * Response, so scripts/test-proxy-worker.mjs can exercise it under Node.
 */

const MANGADEX_ORIGIN = 'https://api.mangadex.org';

/** MangaDex rejects requests without an identifying User-Agent (403). */
const MANGADEX_USER_AGENT = 'YuriOrbit/1.0 (https://github.com/JoeKym/YuriOrbit)';

const API_PREFIX = '/api/mangadex';
const UPSTREAM_TIMEOUT_MS = 15_000;
const DEFAULT_CACHE_SECONDS = 300;
const MAX_CACHE_SECONDS = 3_600;

const ALLOWED_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  'Access-Control-Max-Age': '86400',
};

export interface ProxyOptions {
  /** Handed to the runtime so cache writes do not delay the response. */
  waitUntil?: (promise: Promise<unknown>) => void;
}

/**
 * Maps an incoming proxy request URL onto the MangaDex origin, preserving the
 * query string byte for byte (MangaDex uses bracketed keys such as
 * `order[chapter]`, which must not be re-encoded from scratch).
 */
export function buildUpstreamUrl(requestUrl: string): URL {
  const incoming = new URL(requestUrl);
  let path = incoming.pathname;

  if (path === API_PREFIX) {
    path = '/';
  } else if (path.startsWith(`${API_PREFIX}/`)) {
    path = path.slice(API_PREFIX.length);
  }

  const upstream = new URL(path || '/', MANGADEX_ORIGIN);
  upstream.search = incoming.search;
  return upstream;
}

function isCacheable(response: Response): boolean {
  return response.status === 200;
}

/** Keeps upstream `max-age` but clamps it so stale chapter data cannot linger. */
function cacheSecondsFrom(upstream: Response): number {
  const header = upstream.headers.get('cache-control') || '';
  const match = /max-age=(\d+)/i.exec(header);
  const parsed = match ? Number.parseInt(match[1], 10) : DEFAULT_CACHE_SECONDS;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CACHE_SECONDS;
  return Math.min(parsed, MAX_CACHE_SECONDS);
}

function jsonError(status: number, error: string, message: string): Response {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function fetchUpstream(url: URL, method: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        'User-Agent': MANGADEX_USER_AGENT,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Cloudflare's edge cache; absent in the Node test harness. */
function edgeCache(): Cache | undefined {
  const runtime = globalThis as { caches?: { default?: Cache } };
  return runtime.caches?.default;
}

export async function handleMangadexProxy(
  request: Request,
  options: ProxyOptions = {},
): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (!ALLOWED_METHODS.includes(method as (typeof ALLOWED_METHODS)[number])) {
    return jsonError(405, 'method_not_allowed', `Method ${method} is not proxied.`);
  }

  let upstreamUrl: URL;
  try {
    upstreamUrl = buildUpstreamUrl(request.url);
  } catch {
    return jsonError(400, 'bad_request', 'Malformed request URL.');
  }

  const cache = method === 'GET' ? edgeCache() : undefined;
  const cacheKey = upstreamUrl.toString();

  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return withCors(hit);
  }

  let upstream: Response;
  try {
    upstream = await fetchUpstream(upstreamUrl, method);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return jsonError(
      timedOut ? 504 : 502,
      timedOut ? 'upstream_timeout' : 'upstream_error',
      `MangaDex proxy failed: ${message}`,
    );
  }

  const cacheSeconds = cacheSecondsFrom(upstream);
  const headers = new Headers(upstream.headers);
  headers.set('Content-Type', upstream.headers.get('content-type') || 'application/json');
  headers.set('Cache-Control', `public, max-age=${cacheSeconds}`);
  headers.set('X-Proxy', 'yuriorbit-mangadex');

  const response = new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });

  if (cache && isCacheable(upstream)) {
    const stored = new Response(response.clone().body, {
      status: response.status,
      headers: response.headers,
    });
    const write = cache.put(cacheKey, stored).catch(() => undefined);
    if (options.waitUntil) options.waitUntil(write);
    else void write;
  }

  return withCors(response);
}
