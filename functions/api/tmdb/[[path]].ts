interface Env {
  TMDB_READ_ACCESS_TOKEN?: string;
  TMDB_API_KEY?: string;
  VITE_TMDB_API_KEY?: string;
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
  const subPath = url.pathname.replace(/^\/api\/tmdb\/?/, '');
  const targetUrl = new URL('https://api.themoviedb.org/3/' + subPath + url.search);

  const headers = new Headers();
  headers.set('Accept', 'application/json');

  // Forward incoming Authorization header if present
  const incomingAuth = request.headers.get('Authorization');
  if (incomingAuth) {
    headers.set('Authorization', incomingAuth);
  }

  // Attach server-side credentials if available
  const token = env.TMDB_READ_ACCESS_TOKEN;
  const apiKey = env.TMDB_API_KEY || env.VITE_TMDB_API_KEY;

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  } else if (apiKey && !targetUrl.searchParams.has('api_key') && !headers.has('Authorization')) {
    targetUrl.searchParams.set('api_key', apiKey);
  }

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      cf: {
        cacheTtl: 300,
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
