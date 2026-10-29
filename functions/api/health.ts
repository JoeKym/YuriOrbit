export const onRequest = async () => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'YuriOrbit Cloudflare Pages Functions',
      timestamp: new Date().toISOString(),
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
