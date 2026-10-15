import { defineEventHandler, proxyRequest } from 'h3';

// Proxy TMDB API requests to avoid CORS issues
export default defineEventHandler(async (event) => {
  // Forward the request to TMDB API
  const baseURL = 'https://api.themoviedb.org/3';
  
  // Get the original path and query
  const path = getRequestURL(event).pathname.replace(/^\/api\/tmdb/, '');
  const query = getRequestURL(event).search;
  
  // Proxy the request
  return await proxyRequest(event, baseURL + path + query, {
    headers: {
      // Forward relevant headers
      'Accept': 'application/json',
      'User-Agent': getHeader(event, 'user-agent') || 'YuriOrbit/1.0'
    }
  });
});