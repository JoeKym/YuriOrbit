// Cloudflare Pages Function: TMDB Proxy with Secure Server Keys & CORS

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

const DEFAULT_TMDB_KEY = '1b6a1d5c7d35d07b8b50f2f7a00c0a37';

export const onRequest = async (context: any) => {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  try {
    const url = new URL(request.url);
    const targetPath = url.pathname.replace(/^\/api\/tmdb/, '') || '/';
    const targetUrl = new URL(`https://api.themoviedb.org/3${targetPath}${url.search}`);

    const forwardHeaders = new Headers();
    forwardHeaders.set('Accept', 'application/json');

    const token = env?.TMDB_READ_ACCESS_TOKEN;
    const apiKey = env?.TMDB_API_KEY || DEFAULT_TMDB_KEY;

    if (token) {
      forwardHeaders.set('Authorization', `Bearer ${token}`);
    } else if (!targetUrl.searchParams.has('api_key')) {
      targetUrl.searchParams.set('api_key', apiKey);
    }

    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    for (const [k, v] of Object.entries(CORS_HEADERS)) {
      responseHeaders.set(k, v);
    }

    if (request.method === 'GET' && upstreamResponse.ok) {
      responseHeaders.set('Cache-Control', 'public, max-age=1800, s-maxage=3600');
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status_message: error?.message || 'TMDB Proxy Internal Error',
        success: false,
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
