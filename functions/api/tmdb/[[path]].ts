interface Env {
  TMDB_API_KEY?: string;
  TMDB_READ_ACCESS_TOKEN?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Handle CORS preflight - TMDB proxy
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
  const targetPath = url.pathname.replace(/^\/api\/tmdb/, '') || '/';
  const targetUrl = new URL(targetPath + url.search, 'https://api.themoviedb.org/3');

  // Inject server-side secret if available and query param not already present
  if (env.TMDB_API_KEY && !targetUrl.searchParams.has('api_key')) {
    targetUrl.searchParams.set('api_key', env.TMDB_API_KEY);
  }

  const headers = new Headers();
  headers.set('Accept', 'application/json');
  if (env.TMDB_READ_ACCESS_TOKEN) {
    headers.set('Authorization', `Bearer ${env.TMDB_READ_ACCESS_TOKEN}`);
  }

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      cf: {
        cacheTtl: 3600,
        cacheEverything: true,
      },
    });

    const responseHeaders = new Headers(upstreamResponse.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'TMDB gateway failed', message: err?.message || 'Unknown error' }),
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
