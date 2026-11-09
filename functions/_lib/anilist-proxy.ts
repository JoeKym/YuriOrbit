/**
 * AniList GraphQL reverse proxy — Cloudflare Pages Functions implementation.
 *
 * AniList only accepts POST / GraphQL, which no CDN will cache on its own, so
 * every visitor used to hit graphql.anilist.co straight from the browser. The
 * site's upstream traffic was therefore bounded by the number of visitors
 * (and by AniList's 90 req/min/IP limit, which it enforces by banning rather
 * than throttling). This handler hashes each distinct query + variables pair
 * into an edge cache key, so the number of upstream calls is bounded by the
 * TTL instead of by traffic.
 *
 * The handler is runtime-agnostic: it only uses fetch, crypto.subtle and the
 * Cache API, so scripts can exercise it under Node with a stubbed `fetch` and
 * `caches.default`.
 */

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';

/** Catalogue rails change slowly; an hour is still fresh enough for discovery. */
const DEFAULT_TTL_SECONDS = 900;

const UPSTREAM_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 24 * 1024;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Max-Age': '86400',
};

export interface ProxyOptions {
  /** Handed to the runtime so cache writes do not delay the response. */
  waitUntil?: (promise: Promise<unknown>) => void;
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

/** Cloudflare's edge cache; absent in the Node test harness. */
function edgeCache(): Cache | undefined {
  const runtime = globalThis as { caches?: { default?: Cache } };
  return runtime.caches?.default;
}

/**
 * JSON with object keys in a stable order, so `{page, perPage}` and
 * `{perPage, page}` produce the same cache key.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value) ?? 'null';
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);

  return `{${entries.join(',')}}`;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/** Cache key for a query. The origin keeps it inside our own zone. */
export async function buildCacheKey(
  origin: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<string> {
  const hash = await sha256Hex(`${query}\u0000${stableStringify(variables)}`);
  return `${origin}/api/anilist/__cache/${hash}`;
}

function isCacheFresh(response: Response, ttlMs: number): boolean {
  const cachedAt = Number(response.headers.get('X-Proxy-Cached-At') || 0);
  if (!cachedAt) return false;
  return Date.now() - cachedAt < ttlMs;
}

async function fetchUpstream(body: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
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

export async function handleAnilistProxy(
  request: Request,
  options: ProxyOptions = {},
): Promise<Response> {
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (method !== 'POST') {
    return jsonError(405, 'method_not_allowed', 'AniList GraphQL queries must be POSTed.');
  }

  const requestUrl = new URL(request.url);

  // The browser sends an Origin header; refuse other sites so this endpoint
  // cannot be farmed as a free, anonymous AniList relay.
  const origin = request.headers.get('Origin');
  if (origin) {
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch {
      return jsonError(403, 'forbidden_origin', 'Unparseable Origin header.');
    }
    if (originHost !== requestUrl.host) {
      return jsonError(403, 'forbidden_origin', 'This proxy only serves YuriOrbit.');
    }
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return jsonError(413, 'payload_too_large', `Query body exceeds ${MAX_BODY_BYTES} bytes.`);
  }

  let payload: { query?: unknown; variables?: unknown };
  try {
    payload = JSON.parse(raw) as { query?: unknown; variables?: unknown };
  } catch {
    return jsonError(400, 'invalid_request', 'Body must be JSON.');
  }

  if (typeof payload.query !== 'string' || payload.query.trim() === '') {
    return jsonError(400, 'invalid_request', 'A GraphQL "query" string is required.');
  }

  const variables =
    payload.variables && typeof payload.variables === 'object' && !Array.isArray(payload.variables)
      ? (payload.variables as Record<string, unknown>)
      : {};

  const cacheKey = await buildCacheKey(requestUrl.origin, payload.query, variables);
  const cache = edgeCache();

  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit && isCacheFresh(hit, DEFAULT_TTL_SECONDS * 1000)) {
        const headers = new Headers(hit.headers);
        headers.set('X-Proxy-Cache', 'HIT');
        return withCors(new Response(hit.body, { status: hit.status, headers }));
      }
    } catch {
      // A cache fault must never fail the query.
    }
  }

  const body = JSON.stringify({ query: payload.query, variables });

  let upstream: Response;
  try {
    upstream = await fetchUpstream(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return jsonError(
      timedOut ? 504 : 502,
      timedOut ? 'upstream_timeout' : 'upstream_error',
      `AniList proxy failed: ${message}`,
    );
  }

  const text = await upstream.text();
  const headers = new Headers(CORS_HEADERS);
  headers.set('Content-Type', upstream.headers.get('content-type') || 'application/json');
  headers.set('X-Proxy', 'yuriorbit-anilist');

  const retryAfter = upstream.headers.get('retry-after');
  if (retryAfter) headers.set('Retry-After', retryAfter);

  // GraphQL errors come back as HTTP 200; never bake one into the cache.
  const isGraphqlError = /"errors"\s*:/.test(text);
  const cacheable = upstream.ok && !isGraphqlError;

  if (cacheable) {
    headers.set(
      'Cache-Control',
      `public, max-age=${DEFAULT_TTL_SECONDS}, s-maxage=${DEFAULT_TTL_SECONDS}`,
    );
    headers.set('X-Proxy-Cached-At', String(Date.now()));
    headers.set('X-Proxy-Cache', 'MISS');
  } else {
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Proxy-Cache', 'BYPASS');
  }

  const response = new Response(text, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });

  if (cache && cacheable) {
    const write = cache.put(cacheKey, response.clone()).catch(() => undefined);
    if (options.waitUntil) options.waitUntil(write);
    else void write;
  }

  return response;
}
