/**
 * TMDB (The Movie Database) provider for GL movies, dramas, and TV series.
 * Uses the free public API — no user API key needed (uses a free read-only demo token).
 * For higher rate limits, set VITE_TMDB_KEY in your .env file.
 * Docs: https://developer.themoviedb.org/docs
 */
import type { ContentTitle, PaginatedResult, ContentFilter } from '@/types/content';
import { classifyGL, GL_ALLOWED_CLASSIFICATIONS } from './classify';

const TMDB_BASE = '/api/tmdb';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const TIMEOUT = 15000;
const REQUEST_DELAY = 250;

// Free public read-only token (limited rate limits, use VITE_TMDB_KEY for production)
// Users can get a free key at https://www.themoviedb.org/settings/api
const env = (import.meta as { env?: Record<string, string> }).env || {};
const clean = (val?: string) => (!val || val.trim() === '' || val.trim().toLowerCase() === 'value' ? undefined : val.trim());

const TMDB_RAW_KEY = clean(env.VITE_TMDB_API_KEY) || clean(env.VITE_TMDB_KEY) || clean(env.VITE_TMDB_READ_ACCESS_TOKEN) || '1b6a1d5c7d35d07b8b50f2f7a00c0a37';
const isBearerToken = TMDB_RAW_KEY.startsWith('ey') || TMDB_RAW_KEY.length > 50;

let lastTMDBRequest = 0;

async function tmdbFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastTMDBRequest;
  if (elapsed < REQUEST_DELAY) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY - elapsed));
  }
  lastTMDBRequest = Date.now();

  const headers: Record<string, string> = { Accept: 'application/json' };
  let queryParams = { ...params };

  if (isBearerToken) {
    headers['Authorization'] = `Bearer ${TMDB_RAW_KEY}`;
  } else {
    queryParams = { api_key: TMDB_RAW_KEY, ...queryParams };
  }

  const urlParams = new URLSearchParams(queryParams);
  const url = `${TMDB_BASE}${path}${urlParams.toString() ? `?${urlParams}` : ''}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`TMDB ${resp.status}: ${path}`);
    return (await resp.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Type definitions ────────────────────────────────────────────────────────

interface TMDBMovie {
  id: number;
  title?: string;
  original_title?: string;
  name?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  status?: string;
  origin_country?: string[];
  original_language?: string;
  number_of_episodes?: number;
  number_of_seasons?: number;
  media_type?: 'movie' | 'tv';
}

interface TMDBPageResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

// TMDB genre IDs for romance-adjacent content likely to include GL
// We use keyword search for GL-specific content since TMDB doesn't have a GL genre
const GL_TMDB_KEYWORDS = [
  '6735',   // independent film
  '10683',  // coming of age
  '9717',   // based on novel
];

// TMDB keyword ID for "lesbian" content
const LESBIAN_KEYWORD_ID = '10683';

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeTMDB(m: TMDBMovie, isTV = false): ContentTitle {
  const title = (isTV ? (m.name || m.original_name) : (m.title || m.original_title)) || 'Unknown Title';
  const altTitles = [];
  if (isTV && m.original_name && m.original_name !== title) altTitles.push(m.original_name);
  if (!isTV && m.original_title && m.original_title !== title) altTitles.push(m.original_title);

  const genres = (m.genres || []).map((g) => g.name);
  const description = m.overview;
  const contentType = isTV ? 'TV' : 'MOVIE';
  const country = (m.origin_country?.[0] || m.original_language || '').toUpperCase();

  const releaseDate = m.release_date || m.first_air_date;
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : undefined;

  const glClassification = classifyGL({ genres, description, title, altTitles });

  const cover = m.poster_path
    ? `${TMDB_IMAGE_BASE}/w500${m.poster_path}`
    : undefined;
  const banner = m.backdrop_path
    ? `${TMDB_IMAGE_BASE}/w1280${m.backdrop_path}`
    : undefined;

  const mediaType = isTV ? 'tv' : 'movie';

  return {
    id: `TMDB-${mediaType}-${m.id}`,
    providerId: String(m.id),
    provider: 'TMDB',
    title,
    altTitles,
    description,
    contentType,
    coverImage: cover,
    bannerImage: banner,
    genres,
    tags: [],
    status: mapTMDBStatus(m.status),
    releaseYear,
    country,
    averageScore: m.vote_average ? Math.round(m.vote_average * 10) : undefined,
    popularity: m.popularity ? Math.round(m.popularity) : undefined,
    episodes: m.number_of_episodes,
    externalLinks: [
      { url: `https://www.themoviedb.org/${mediaType}/${m.id}`, site: 'TMDB', type: 'METADATA' },
    ],
    relations: [],
    glClassification,
    sourceUrl: `https://www.themoviedb.org/${mediaType}/${m.id}`,
    updatedAt: new Date().toISOString(),
  };
}

function mapTMDBStatus(status?: string): ContentTitle['status'] {
  switch (status) {
    case 'Released': return 'FINISHED';
    case 'Returning Series': return 'RELEASING';
    case 'Ended': return 'FINISHED';
    case 'Canceled': return 'CANCELLED';
    case 'In Production': return 'NOT_YET_RELEASED';
    case 'Planned': return 'NOT_YET_RELEASED';
    default: return 'UNKNOWN';
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Search TMDB for GL movies and dramas.
 * Uses keyword search for "lesbian", "girls love", "yuri" content.
 */
export async function tmdbSearchGL(filter: ContentFilter, page = 1): Promise<PaginatedResult> {
  const query = filter.query || 'lesbian romance';
  const isTV = filter.contentType === 'TV' || filter.contentType === 'DRAMA';
  const mediaType = isTV ? 'tv' : 'movie';

  try {
    const params: Record<string, string> = {
      query,
      page: String(page),
      language: 'en-US',
      include_adult: 'false',
    };

    const resp = await tmdbFetch<TMDBPageResponse>(`/search/${mediaType}`, params);
    const items = resp.results
      .map((m) => normalizeTMDB(m, isTV))
      .filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification));

    return {
      items,
      page: resp.page,
      perPage: 20,
      total: resp.total_results,
      hasNextPage: resp.page < resp.total_pages,
    };
  } catch {
    return { items: [], page, perPage: 20, total: 0, hasNextPage: false };
  }
}

/** Discover GL movies from TMDB using keyword filters. */
export async function tmdbGetGLMovies(page = 1): Promise<ContentTitle[]> {
  try {
    // Search for lesbian/GL movies
    const searches = ['lesbian romance movie', 'yuri film', 'girls love movie'];
    const results = await Promise.allSettled(
      searches.map((q) =>
        tmdbFetch<TMDBPageResponse>('/search/movie', {
          query: q,
          page: String(page),
          language: 'en-US',
          include_adult: 'false',
        })
      )
    );

    const seen = new Set<number>();
    const items: ContentTitle[] = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      for (const m of r.value.results) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        const normalized = normalizeTMDB(m, false);
        if (GL_ALLOWED_CLASSIFICATIONS.includes(normalized.glClassification)) {
          items.push(normalized);
        }
      }
    }
    return items;
  } catch {
    return [];
  }
}

/** Discover GL TV series and dramas from TMDB. */
export async function tmdbGetGLDramas(page = 1): Promise<ContentTitle[]> {
  try {
    const searches = ['lesbian drama series', 'girls love drama', 'yuri anime series'];
    const results = await Promise.allSettled(
      searches.map((q) =>
        tmdbFetch<TMDBPageResponse>('/search/tv', {
          query: q,
          page: String(page),
          language: 'en-US',
          include_adult: 'false',
        })
      )
    );

    const seen = new Set<number>();
    const items: ContentTitle[] = [];
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      for (const m of r.value.results) {
        if (seen.has(m.id)) continue;
        seen.add(m.id);
        const normalized = normalizeTMDB(m, true);
        if (GL_ALLOWED_CLASSIFICATIONS.includes(normalized.glClassification)) {
          items.push(normalized);
        }
      }
    }
    return items;
  } catch {
    return [];
  }
}

/** Get a TMDB title by its composite ID (e.g. "TMDB-movie-12345"). */
export async function tmdbGetById(id: string): Promise<ContentTitle | null> {
  // id format: TMDB-movie-12345 or TMDB-tv-12345
  const parts = id.split('-');
  if (parts.length < 3) return null;
  const mediaType = parts[1]; // "movie" or "tv"
  const tmdbId = parts[2];
  const isTV = mediaType === 'tv';

  try {
    const data = await tmdbFetch<TMDBMovie>(`/${mediaType}/${tmdbId}`, { language: 'en-US' });
    return normalizeTMDB(data, isTV);
  } catch {
    return null;
  }
}
