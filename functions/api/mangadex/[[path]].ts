interface Env {
  MANGADEX_API_KEY?: string;
  MANGADEX_ACCESS_TOKEN?: string;
}

const MD_USER_AGENT =
  'YuriOrbit/1.0.0 (+https://github.com/JoeKym/YuriOrbit; mail.jkyme@gmail.com)';

/**
 * MangaDex /at-home/server URLs are only guaranteed for 15 minutes and usually
 * point at a third-party MangaDex@Home node that can be slow or missing the
 * chapter. Cache them well below that window and refresh on failure.
 */
const AT_HOME_TTL = 10 * 60 * 1000;

type AtHome = { baseUrl: string; hash: string };

const atHomeCache = new Map<string, { at: number; data: AtHome }>();
const atHomeInflight = new Map<string, Promise<AtHome | null>>();

function upstreamHeaders(env: Env, accept: string): Headers {
  const headers = new Headers();
  headers.set('Accept', accept);
  headers.set('User-Agent', MD_USER_AGENT);
  if (env.MANGADEX_ACCESS_TOKEN) {
    headers.set('Authorization', `Bearer ${env.MANGADEX_ACCESS_TOKEN}`);
  } else if (env.MANGADEX_API_KEY) {
    headers.set('Authorization', `Bearer ${env.MANGADEX_API_KEY}`);
  }
  return headers;
}

async function fetchAtHome(chapterId: string, env: Env, force = false): Promise<AtHome | null> {
  if (!force) {
    const cached = atHomeCache.get(chapterId);
    if (cached && Date.now() - cached.at < AT_HOME_TTL) return cached.data;
    const pending = atHomeInflight.get(chapterId);
    if (pending) return pending;
  }

  const request = (async (): Promise<AtHome | null> => {
    try {
      const res = await fetch(
        `https://api.mangadex.org/at-home/server/${encodeURIComponent(chapterId)}`,
        { headers: upstreamHeaders(env, 'application/json') }
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        baseUrl?: string;
        chapter?: { hash?: string };
      };
      if (!data.baseUrl || !data.chapter?.hash) return null;
      const value: AtHome = {
        baseUrl: data.baseUrl.replace(/\/+$/, ''),
        hash: data.chapter.hash,
      };
      atHomeCache.set(chapterId, { at: Date.now(), data: value });
      return value;
    } catch {
      return null;
    } finally {
      atHomeInflight.delete(chapterId);
    }
  })();

  atHomeInflight.set(chapterId, request);
  return request;
}

async function fetchPageImage(
  target: string,
  env: Env,
  method: string
): Promise<Response | null> {
  try {
    return await fetch(target, {
      method,
      headers: upstreamHeaders(env, 'image/avif,image/webp,image/jpeg,image/png,image/*'),
      cf: { cacheTtl: 86400, cacheEverything: true },
    });
  } catch {
    return null;
  }
}

async function handlePageImage(url: URL, env: Env, request: Request): Promise<Response> {
  const chapterId = (url.searchParams.get('chapter') || '').trim();
  const file = (url.searchParams.get('file') || '').trim();
  const hashParam = (url.searchParams.get('hash') || '').trim();

  const notFound = () =>
    new Response('Image not found', {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
    });

  if (!/^[0-9a-f-]{16,64}$/i.test(chapterId)) {
    return new Response('Invalid chapter id', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/.test(file) || file.includes('..')) {
    return new Response('Invalid file name', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }

  const method = request.method === 'HEAD' ? 'HEAD' : 'GET';
  const home = await fetchAtHome(chapterId, env);
  const hash = home?.hash || (/^[0-9a-f]{16,64}$/i.test(hashParam) ? hashParam : null);

  let upstream: Response | null = null;

  if (home) {
    upstream = await fetchPageImage(`${home.baseUrl}/data/${home.hash}/${encodeURIComponent(file)}`, env, method);
  }

  // A dead node or expired URL falls back to MangaDex's canonical uploads host.
  if ((!upstream || !upstream.ok) && hash) {
    const fallback = await fetchPageImage(
      `https://uploads.mangadex.org/data/${hash}/${encodeURIComponent(file)}`,
      env,
      method
    );
    if (fallback?.ok || !upstream) upstream = fallback;
  }

  // Last attempt: the node may have changed since the cached at-home response.
  if (!upstream || !upstream.ok) {
    const refreshed = await fetchAtHome(chapterId, env, true);
    if (refreshed && refreshed.baseUrl !== home?.baseUrl) {
      const retry = await fetchPageImage(
        `${refreshed.baseUrl}/data/${refreshed.hash}/${encodeURIComponent(file)}`,
        env,
        method
      );
      if (retry?.ok) upstream = retry;
    }
  }

  if (!upstream || !upstream.ok) return notFound();

  const headers = new Headers();
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'image/jpeg');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('Access-Control-Allow-Origin', '*');
  const length = upstream.headers.get('Content-Length');
  if (length) headers.set('Content-Length', length);

  return new Response(method === 'HEAD' ? null : upstream.body, { status: 200, headers });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
      },
    });
  }

  const url = new URL(request.url);
  const targetPath = url.pathname.replace(/^\/api\/mangadex/, '') || '/';

  // Chapter pages are proxied through this origin: the upstream node URL is
  // short-lived and MangaDex serves hotlinked images incorrectly.
  if (targetPath === '/page') {
    return handlePageImage(url, env, request);
  }

  // Covers live on uploads.mangadex.org. Proxying them keeps the browser on our
  // own origin, which avoids Chrome's Opaque Response Blocking (ERR_BLOCKED_BY_ORB)
  // that silently broke every MangaDex cover image.
  const isCover = targetPath.startsWith('/covers/');
  const upstreamOrigin = isCover ? 'https://uploads.mangadex.org' : 'https://api.mangadex.org';
  const targetUrl = new URL(targetPath + url.search, upstreamOrigin);

  const headers = upstreamHeaders(
    env,
    isCover ? 'image/avif,image/webp,image/jpeg,image/png,image/*' : 'application/json'
  );

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      cf: {
        cacheTtl: isCover ? 86400 : 300,
        cacheEverything: true,
      },
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    if (isCover) {
      responseHeaders.set('Cache-Control', 'public, max-age=86400, immutable');
      responseHeaders.set('Content-Disposition', 'inline');
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'MangaDex gateway failed', message: err?.message || 'Unknown error' }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
