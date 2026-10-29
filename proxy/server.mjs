import http from 'node:http';

const PORT = process.env.PORT || 3001;
const TARGET = 'https://api.mangadex.org';

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/' || req.url === '/health' || req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'yuriorbit-mangadex-proxy' }));
    return;
  }

  try {
    let targetPath = req.url.replace(/^\/api\/mangadex/, '') || '/';
    if (!targetPath.startsWith('/')) {
      targetPath = '/' + targetPath;
    }
    const targetUrl = new URL(targetPath, TARGET);

    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'YuriOrbit/1.0 (https://github.com/JoeKym/YuriOrbit)',
      },
    });

    const contentType = upstream.headers.get('content-type') || 'application/json';
    const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=300';

    res.writeHead(upstream.status, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl,
    });

    const body = await upstream.arrayBuffer();
    res.end(Buffer.from(body));
  } catch (err) {
    console.error('Proxy error:', err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'MangaDex proxy error', message: err?.message || 'Unknown error' }));
  }
});

server.listen(PORT, () => {
  console.log(`MangaDex proxy listening on port ${PORT}`);
});
