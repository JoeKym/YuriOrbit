import { defineEventHandler, proxyRequest, getMethod, readBody } from 'h3';

// Proxy AniList API requests to avoid CORS issues
export default defineEventHandler(async (event) => {
  // Forward the request to AniList GraphQL API
  const baseURL = 'https://graphql.anilist.co';
  
  // Get the original path and query (though for GraphQL, we usually POST to the root)
  const path = getRequestURL(event).pathname.replace(/^\/api\/anilist/, '');
  const query = getRequestURL(event).search;
  
  // For GraphQL, we typically POST to the endpoint, so we need to handle both GET and POST
  const method = getMethod(event);
  
  // Proxy the request
  return await proxyRequest(event, baseURL + path + query, {
    headers: {
      // Forward relevant headers
      'Accept': 'application/json',
      'Content-Type': getHeader(event, 'content-type') || 'application/json',
      'User-Agent': getHeader(event, 'user-agent') || 'YuriOrbit/1.0'
    },
    method,
    // For POST requests, we need to forward the body
    body: method === 'POST' ? await readBody(event) : undefined
  });
});