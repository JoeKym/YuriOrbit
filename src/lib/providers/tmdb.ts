/**
 * TMDB (The Movie Database) provider for GL movies, dramas, and TV series.
 * Uses the free public API — no user API key needed (uses a free read-only demo token).
 * For higher rate limits, set VITE_TMDB_KEY in your .env file.
 * Docs: https://developer.themoviedb.org/docs
 */
import type { ContentTitle, PaginatedResult, ContentFilter } from '@/types/content';
import { classifyGL, GL_ALLOWED_CLASSIFICATIONS } from './classify';
import { getMaturityLevel } from '@/lib/content/maturity-preference';
import { filterByMaturity, inferMaturity, maturityRank } from '@/lib/content/maturity';

const env = (import.meta as { env?: Record<string, string> }).env || {};
const isBrowser = typeof window !== 'undefined';
const clean = (val?: string) => (!val || val.trim() === '' || val.trim().toLowerCase() === 'value' ? undefined : val.trim());

// Route via same-origin Cloudflare Pages Functions / Vite proxy in the browser,
// or fallback to the direct TMDB endpoint in Node/test environments.
const rawTmdbBase = clean(env.VITE_TMDB_API_URL) || (isBrowser ? '/api/tmdb' : 'https://api.themoviedb.org/3');
const TMDB_BASE = rawTmdbBase.replace(/\/+$/, '');
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';
const TIMEOUT = 15000;
const REQUEST_DELAY = 250;

const TMDB_RAW_KEY = clean(env.VITE_TMDB_API_KEY) || clean(env.VITE_TMDB_KEY) || clean(env.VITE_TMDB_READ_ACCESS_TOKEN);
const isBearerToken = TMDB_RAW_KEY ? (TMDB_RAW_KEY.startsWith('ey') || TMDB_RAW_KEY.length > 50) : false;

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

  if (TMDB_RAW_KEY) {
    if (isBearerToken) {
      headers['Authorization'] = `Bearer ${TMDB_RAW_KEY}`;
    } else {
      queryParams = { api_key: TMDB_RAW_KEY, ...queryParams };
    }
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
  adult?: boolean;
}

interface TMDBPageResponse {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

interface TMDBPerson {
  id: number;
  name: string;
  known_for_department?: string;
}

interface TMDBCredits {
  cast?: { id: number; title?: string; name?: string; media_type?: string; adult?: boolean }[];
  crew?: { id: number; title?: string; name?: string; media_type?: string; adult?: boolean }[];
}

/**
 * TMDB has no Girls' Love genre, but it does have keywords. These IDs were
 * verified against themoviedb.org (e.g. /keyword/264386-lesbian). An earlier
 * revision used 10683 for "lesbian", which is actually "coming of age" — the
 * reason live-action GL discovery looked broken.
 */
const GL_KEYWORD_IDS = [
  '264386', // lesbian
  '214564', // yuri
  '286187', // sapphic
  '333351', // wlw
  '280003', // girls love (gl)
  '383699', // girls love
  '379589', // baihe
];

/** TMDB's `adult` flag means pornography, so it is only on at the top level. */
function includeAdult(): string {
  return maturityRank(getMaturityLevel()) >= maturityRank('PORNOGRAPHIC') ? 'true' : 'false';
}

/** Free-text queries per format, including native-language terms. */
const MOVIE_SEARCHES = [
  'lesbian romance',
  'lesbian film',
  'sapphic film',
  'yuri',
  'girls love',
  '百合 恋',
  '레즈비언',
];

const TV_SEARCHES = [
  'lesbian series',
  'girls love drama',
  'sapphic series',
  'wlw series',
  'yuri anime',
  '百合 ドラマ',
  '레즈비언 드라마',
  'thai gl',
];

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
    isAdult: m.adult,
    maturityRating: m.adult ? 'PORNOGRAPHIC' : inferMaturity({ genres, description }),
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

function isGL(title: ContentTitle): boolean {
  return GL_ALLOWED_CLASSIFICATIONS.includes(title.glClassification);
}

function collectGL(items: ContentTitle[]): ContentTitle[] {
  const seen = new Set<string>();
  const out: ContentTitle[] = [];
  for (const item of items) {
    if (seen.has(item.id) || !isGL(item)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return filterByMaturity(out, getMaturityLevel());
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Keyword-based discovery. This is the reliable path for live-action GL:
 * it finds films and series tagged lesbian/yuri/sapphic regardless of whether
 * their overview happens to contain our search words.
 */
async function tmdbDiscover(mediaType: 'movie' | 'tv', page = 1): Promise<ContentTitle[]> {
  const params: Record<string, string> = {
    with_keywords: GL_KEYWORD_IDS.join('|'),
    sort_by: 'popularity.desc',
    page: String(page),
    language: 'en-US',
    include_adult: includeAdult(),
    'vote_count.gte': '3',
  };
  const resp = await tmdbFetch<TMDBPageResponse>(`/discover/${mediaType}`, params);
  return (resp.results || []).map((m) => normalizeTMDB(m, mediaType === 'tv'));
}

async function tmdbTextSearch(mediaType: 'movie' | 'tv', queries: string[], page = 1): Promise<ContentTitle[]> {
  const results = await Promise.allSettled(
    queries.map((query) =>
      tmdbFetch<TMDBPageResponse>(`/search/${mediaType}`, {
        query,
        page: String(page),
        language: 'en-US',
        include_adult: includeAdult(),
      })
    )
  );

  const items: ContentTitle[] = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const m of r.value.results || []) items.push(normalizeTMDB(m, mediaType === 'tv'));
  }
  return items;
}

/**
 * Search TMDB for GL movies and dramas.
 * Uses keyword discovery plus text search, depending on the requested format.
 */
export async function tmdbSearchGL(filter: ContentFilter, page = 1): Promise<PaginatedResult> {
  const query = filter.query?.trim();
  const wantsMovie = !filter.contentType || filter.contentType === 'ALL' || filter.contentType === 'MOVIE';
  const wantsTV =
    !filter.contentType ||
    filter.contentType === 'ALL' ||
    filter.contentType === 'TV' ||
    filter.contentType === 'DRAMA';

  try {
    const batches: ContentTitle[] = [];

    if (query) {
      // A specific query is a text search; discover has no free-text input.
      const mediaTypes: ('movie' | 'tv')[] = [];
      if (wantsMovie) mediaTypes.push('movie');
      if (wantsTV) mediaTypes.push('tv');

      const settled = await Promise.allSettled(
        mediaTypes.map((mediaType) =>
          tmdbFetch<TMDBPageResponse>(`/search/${mediaType}`, {
            query,
            page: String(page),
            language: 'en-US',
            include_adult: includeAdult(),
          })
        )
      );
      settled.forEach((r, index) => {
        if (r.status !== 'fulfilled') return;
        const isTV = mediaTypes[index] === 'tv';
        for (const m of r.value.results || []) batches.push(normalizeTMDB(m, isTV));
      });
    } else {
      const settled = await Promise.allSettled([
        wantsMovie ? tmdbDiscover('movie', page) : Promise.resolve([]),
        wantsTV ? tmdbDiscover('tv', page) : Promise.resolve([]),
      ]);
      for (const r of settled) {
        if (r.status === 'fulfilled') batches.push(...r.value);
      }
    }

    const items = collectGL(batches);

    return {
      items,
      page,
      perPage: 20,
      total: items.length,
      hasNextPage: items.length >= 20,
    };
  } catch {
    return { items: [], page, perPage: 20, total: 0, hasNextPage: false };
  }
}

/** Discover GL movies (live action and animated) from TMDB. */
export async function tmdbGetGLMovies(page = 1): Promise<ContentTitle[]> {
  try {
    const [discovered, searched] = await Promise.allSettled([
      tmdbDiscover('movie', page),
      tmdbTextSearch('movie', MOVIE_SEARCHES, page),
    ]);

    const items: ContentTitle[] = [];
    if (discovered.status === 'fulfilled') items.push(...discovered.value);
    if (searched.status === 'fulfilled') items.push(...searched.value);

    return collectGL(items);
  } catch {
    return [];
  }
}

/** Discover GL TV series and dramas from TMDB (live action plus animation). */
export async function tmdbGetGLDramas(page = 1): Promise<ContentTitle[]> {
  try {
    const [discovered, searched] = await Promise.allSettled([
      tmdbDiscover('tv', page),
      tmdbTextSearch('tv', TV_SEARCHES, page),
    ]);

    const items: ContentTitle[] = [];
    if (discovered.status === 'fulfilled') items.push(...discovered.value);
    if (searched.status === 'fulfilled') items.push(...searched.value);

    return collectGL(items);
  } catch {
    return [];
  }
}

/**
 * Find GL titles via a person (director, writer, actor) on TMDB.
 * Mirrors AniList's staff search for live-action works.
 */
export async function tmdbSearchGLByCreator(query: string): Promise<{ name: string; titles: ContentTitle[] }[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  try {
    const people = await tmdbFetch<{ results: TMDBPerson[] }>('/search/person', {
      query: trimmed,
      include_adult: includeAdult(),
      language: 'en-US',
    });

    const matches: { name: string; titles: ContentTitle[] }[] = [];
    for (const person of (people.results || []).slice(0, 2)) {
      const credits = await tmdbFetch<TMDBCredits>(`/person/${person.id}/combined_credits`, { language: 'en-US' });
      const titles = collectGL(
        [...(credits.cast || []), ...(credits.crew || [])]
          .filter((credit) => credit.media_type === 'movie' || credit.media_type === 'tv')
          .map((credit) =>
            normalizeTMDB(
              {
                id: credit.id,
                title: credit.title,
                name: credit.name,
                adult: credit.adult,
                media_type: credit.media_type as 'movie' | 'tv',
              },
              credit.media_type === 'tv'
            )
          )
      );
      if (titles.length > 0) {
        matches.push({ name: person.name, titles: titles.slice(0, 12) });
      }
    }
    return matches;
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
