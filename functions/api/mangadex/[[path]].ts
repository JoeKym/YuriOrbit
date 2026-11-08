interface Env {
  MANGADEX_API_KEY?: string;
  MANGADEX_ACCESS_TOKEN?: string;
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

  // Covers live on uploads.mangadex.org. Proxying them keeps the browser on our
  // own origin, which avoids Chrome's Opaque Response Blocking (ERR_BLOCKED_BY_ORB)
  // that silently broke every MangaDex cover image.
  const isCover = targetPath.startsWith('/covers/');
  const upstreamOrigin = isCover ? 'https://uploads.mangadex.org' : 'https://api.mangadex.org';
  const targetUrl = new URL(targetPath + url.search, upstreamOrigin);

  const headers = new Headers();
  headers.set('Accept', isCover ? 'image/avif,image/webp,image/jpeg,image/png,image/*' : 'application/json');
  // MangaDex requires a dedicated client User-Agent. Forwarding browser user agents
  // from datacenter IPs causes MangaDex's Cloudflare DDoS protection to return verification HTML.
  headers.set('User-Agent', 'YuriOrbit/1.0.0 (+https://github.com/JoeKym/YuriOrbit; mail.jkyme@gmail.com)');

  if (env.MANGADEX_ACCESS_TOKEN) {
    headers.set('Authorization', `Bearer ${env.MANGADEX_ACCESS_TOKEN}`);
  } else if (env.MANGADEX_API_KEY) {
    headers.set('Authorization', `Bearer ${env.MANGADEX_API_KEY}`);
  }

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
