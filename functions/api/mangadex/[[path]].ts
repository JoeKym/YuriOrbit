// Cloudflare Pages Function: MangaDex Proxy with Edge Caching & CORS

interface Env {
  MANGADEX_CLIENT_ID?: string;
  MANGADEX_CLIENT_SECRET?: string;
  MANGADEX_API_KEY?: string;
  MANGADEX_USER_AGENT?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, User-Agent',
  'Access-Control-Max-Age': '86400',
};

export const onRequest = async (context: any) => {
  const { request, env } = context;

  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  try {
    const url = new URL(request.url);
    const targetPath = url.pathname.replace(/^\/api\/mangadex/, '') || '/';
    const targetUrl = new URL(`https://api.mangadex.org${targetPath}${url.search}`);

    // Cloudflare Edge Cache for GET requests
    const cache = (caches as any)?.default;
    const cacheKey = new Request(targetUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (request.method === 'GET' && cache) {
      try {
        const cachedResponse = await cache.match(cacheKey);
        if (cachedResponse) {
          const resHeaders = new Headers(cachedResponse.headers);
          for (const [k, v] of Object.entries(CORS_HEADERS)) {
            resHeaders.set(k, v);
          }
          resHeaders.set('X-YuriOrbit-Cache', 'HIT');
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers: resHeaders,
          });
        }
      } catch {
        // Fall back to live fetch if cache match encounters an issue
      }
    }

    const forwardHeaders = new Headers();
    forwardHeaders.set('Accept', 'application/json');
    forwardHeaders.set(
      'User-Agent',
      env?.MANGADEX_USER_AGENT || 'YuriOrbit/1.0 (https://github.com/JoeKym/YuriOrbit)'
    );

    if (env?.MANGADEX_API_KEY) {
      forwardHeaders.set('Authorization', `Bearer ${env.MANGADEX_API_KEY}`);
    } else if (request.headers.has('Authorization')) {
      forwardHeaders.set('Authorization', request.headers.get('Authorization')!);
    }

    const forwardInit: RequestInit = {
      method: request.method,
      headers: forwardHeaders,
    };

    if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
      forwardInit.body = request.body;
    }

    const upstreamResponse = await fetch(targetUrl.toString(), forwardInit);

    const responseHeaders = new Headers(upstreamResponse.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(k, v);
    }
    responseHeaders.set('X-YuriOrbit-Cache', 'MISS');

    if (request.method === 'GET' && upstreamResponse.ok) {
      responseHeaders.set('Cache-Control', 'public, max-age=120, s-maxage=300');
      const responseToCache = new Response(upstreamResponse.clone().body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });

      if (cache && context.waitUntil) {
        context.waitUntil(cache.put(cacheKey, responseToCache));
      }
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        result: 'error',
        errors: [{ detail: error?.message || 'MangaDex Proxy Internal Error' }],
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      }
    );
  }
};
