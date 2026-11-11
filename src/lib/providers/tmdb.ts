/**
 * TMDB (The Movie Database) provider for GL movies, dramas, and TV series.
 * Features curated discovery for Thai, Japanese, Korean, Chinese (Baihe), and international GL.
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

/** Verified TMDB keyword IDs for Girls' Love, Yuri, Sapphic, and Baihe. */
const CORE_GL_KEYWORD_IDS = [
  '280003', // girls' love (gl)
  '9833',   // lesbian relationship
  '214564', // yuri
  '379589', // baihe
  '333351', // wlw
  '286187', // sapphic
  '383699', // girls love
];

const ASIAN_GL_COUNTRIES = 'TH|JP|KR|CN|TW';

/**
 * Mainstream series, soap operas, or BL series that have minor LGBT tags but
 * are NOT centered on Girls' Love / Yuri romance.
 */
const EXCLUDED_TITLES = new Set([
  'ulice',
  'all american',
  'the affair',
  'bad buddy', // BL
  'grey\'s anatomy',
  'station 19',
  'chicago fire',
  'riverdale',
  'glee',
  'coronation street',
  'eastenders',
  'emmerdale',
  'hollyoaks',
  'orange is the new black',
  'pretty little liars',
  'elite',
  'sex education',
  'arcane',
  'yellowjackets',
]);

/** Low-budget softcore / pink-film keywords that pollute Asian film tags on TMDB. */
const EROTIC_TITLE_SIGNALS = [
  '불륜',
  '부부',
  'sister-in-law',
  'sensual',
  'erotic story',
  'erotic video',
  'sex and',
  'hot body',
  'secret sex',
  'lustful',
];

const KNOWN_GL_KEYWORDS = [
  'girls love',
  'girls\' love',
  'yuri',
  'lesbian romance',
  'sapphic',
  'baihe',
  'wlw',
  'female-female',
  'women fall in love',
  'woman falls in love',
  'two women',
  'two girls',
];

function includeAdult(): string {
  return maturityRank(getMaturityLevel()) >= maturityRank('PORNOGRAPHIC') ? 'true' : 'false';
}

/** Curated Asian GL dramas (Thai, Japanese, Korean, Chinese Baihe) to guarantee top titles appear. */
const CURATED_ASIAN_GL_QUERIES = [
  'GAP The Series',
  'The Secret of Us',
  'The Loyal Pin',
  'Blank',
  '23.5',
  'Chaser Game W',
  'AYAKA is in LOVE with HIROKO',
  'Couple of Mirrors',
  'She Makes My Heart Flutter',
  'Fragrance of the First Flower',
  'Affair',
  'Love Senior',
  'Show Me Love',
  'Apple My Love',
  'Pluto',
  'Thai GL',
  'Baihe drama',
];

const MOVIE_SEARCHES = [
  'The Handmaiden',
  'Portrait of a Lady on Fire',
  'Carol',
  'Kase-san and Morning Glories',
  'Liz and the Blue Bird',
  'Ride or Die',
  'Saving Face',
  'Imagine Me & You',
  'The World to Come',
  'D.E.B.S.',
  'Bottoms',
  'yuri movie',
  'girls love film',
  'sapphic romance',
];

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeTMDB(m: TMDBMovie, isTV = false): ContentTitle {
  const title = (isTV ? (m.name || m.original_name) : (m.title || m.original_title)) || 'Unknown Title';
  const altTitles: string[] = [];
  if (isTV && m.original_name && m.original_name !== title) altTitles.push(m.original_name);
  if (!isTV && m.original_title && m.original_title !== title) altTitles.push(m.original_title);

  const genres = (m.genres || []).map((g) => g.name);
  const description = m.overview;
  const contentType = isTV ? 'TV' : 'MOVIE';
  const country = (m.origin_country?.[0] || m.original_language || '').toUpperCase();

  const releaseDate = m.release_date || m.first_air_date;
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : undefined;

  const normTitle = title.toLowerCase().trim();
  const descLower = (description || '').toLowerCase();

  // Detect low-budget adult/erotic exploitation
  const isEroticSignal = EROTIC_TITLE_SIGNALS.some(
    (signal) => normTitle.includes(signal) || descLower.includes(signal)
  );

  let glClassification = classifyGL({ genres, description, title, altTitles });

  // Exclude mainstream non-GL shows that bypass general keywords
  if (EXCLUDED_TITLES.has(normTitle)) {
    glClassification = 'EXCLUDED';
  }

  // If classifyGL returned NEEDS_REVIEW, check if it matches verified GL markers
  if (glClassification === 'NEEDS_REVIEW') {
    const isExplicitGL = KNOWN_GL_KEYWORDS.some((kw) => normTitle.includes(kw) || descLower.includes(kw));
    if (isExplicitGL) {
      glClassification = 'CONFIRMED_GL';
      if (!genres.includes("Girls' Love")) genres.unshift("Girls' Love");
    }
  }

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
    isAdult: m.adult || isEroticSignal,
    maturityRating: (m.adult || isEroticSignal) ? 'PORNOGRAPHIC' : inferMaturity({ genres, description }),
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
 * Asian Live-Action GL Dramas (Thai, Japanese, Korean, Chinese, Taiwanese).
 * Excludes anime genre (16) so live-action dramas are surfaced.
 */
async function tmdbDiscoverAsianDramas(page = 1): Promise<ContentTitle[]> {
  const params: Record<string, string> = {
    with_keywords: CORE_GL_KEYWORD_IDS.join('|'),
    with_origin_country: ASIAN_GL_COUNTRIES,
    without_genres: '16',
    sort_by: 'popularity.desc',
    page: String(page),
    language: 'en-US',
    include_adult: includeAdult(),
  };
  try {
    const resp = await tmdbFetch<TMDBPageResponse>('/discover/tv', params);
    return (resp.results || []).map((m) => normalizeTMDB(m, true));
  } catch {
    return [];
  }
}

/**
 * Asian GL Movies (Handmaiden, Kase-san, Liz and the Blue Bird, Ride or Die, etc.)
 */
async function tmdbDiscoverAsianMovies(page = 1): Promise<ContentTitle[]> {
  const params: Record<string, string> = {
    with_keywords: CORE_GL_KEYWORD_IDS.join('|'),
    with_origin_country: ASIAN_GL_COUNTRIES,
    sort_by: 'popularity.desc',
    page: String(page),
    language: 'en-US',
    include_adult: includeAdult(),
  };
  try {
    const resp = await tmdbFetch<TMDBPageResponse>('/discover/movie', params);
    return (resp.results || []).map((m) => normalizeTMDB(m, false));
  } catch {
    return [];
  }
}

/**
 * General GL keyword discovery across movies and TV worldwide (US, UK, FR, ES, CA, etc.).
 */
async function tmdbDiscover(mediaType: 'movie' | 'tv', page = 1): Promise<ContentTitle[]> {
  const params: Record<string, string> = {
    with_keywords: CORE_GL_KEYWORD_IDS.join('|'),
    sort_by: 'popularity.desc',
    page: String(page),
    language: 'en-US',
    include_adult: includeAdult(),
    'vote_count.gte': '5',
  };
  try {
    const resp = await tmdbFetch<TMDBPageResponse>(`/discover/${mediaType}`, params);
    return (resp.results || []).map((m) => normalizeTMDB(m, mediaType === 'tv'));
  } catch {
    return [];
  }
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
    for (const m of r.value.results || []) {
      items.push(normalizeTMDB(m, mediaType === 'tv'));
    }
  }
  return items;
}

/**
 * Search TMDB for GL movies and dramas across all countries.
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
      const promises: Promise<ContentTitle[]>[] = [];
      if (wantsTV) {
        promises.push(tmdbDiscoverAsianDramas(page));
        promises.push(tmdbDiscover('tv', page));
      }
      if (wantsMovie) {
        promises.push(tmdbDiscoverAsianMovies(page));
        promises.push(tmdbDiscover('movie', page));
      }
      const settled = await Promise.allSettled(promises);
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
    const [asianMovies, globalMovies, searched] = await Promise.allSettled([
      tmdbDiscoverAsianMovies(page),
      tmdbDiscover('movie', page),
      tmdbTextSearch('movie', MOVIE_SEARCHES.slice(0, 5), page),
    ]);

    const items: ContentTitle[] = [];
    if (asianMovies.status === 'fulfilled') items.push(...asianMovies.value);
    if (globalMovies.status === 'fulfilled') items.push(...globalMovies.value);
    if (searched.status === 'fulfilled') items.push(...searched.value);

    return collectGL(items);
  } catch {
    return [];
  }
}

/** Discover GL TV series and dramas (Thai, Japanese, Korean, Chinese Baihe, and international). */
export async function tmdbGetGLDramas(page = 1): Promise<ContentTitle[]> {
  try {
    const [asianDramas, curatedHits, globalTv] = await Promise.allSettled([
      tmdbDiscoverAsianDramas(page),
      tmdbTextSearch('tv', CURATED_ASIAN_GL_QUERIES.slice(0, 8), page),
      tmdbDiscover('tv', page),
    ]);

    const items: ContentTitle[] = [];
    // Prioritize Asian GL dramas at the top
    if (curatedHits.status === 'fulfilled') items.push(...curatedHits.value);
    if (asianDramas.status === 'fulfilled') items.push(...asianDramas.value);
    if (globalTv.status === 'fulfilled') items.push(...globalTv.value);

    return collectGL(items);
  } catch {
    return [];
  }
}

/**
 * Find GL titles via a person (director, writer, actor) on TMDB.
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

// ─── Watch providers & trailers ──────────────────────────────────────────────

export interface TmdbWatchProvider {
  id: number;
  name: string;
  logoUrl?: string;
}

export interface TmdbWatchProviderResult {
  /** Region the returned availability actually belongs to (falls back to US). */
  region: string;
  /** JustWatch region page for the title. */
  link?: string;
  providers: TmdbWatchProvider[];
}

interface TmdbProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path?: string;
}

interface TmdbRegionProviders {
  link?: string;
  flatrate?: TmdbProviderEntry[];
  rent?: TmdbProviderEntry[];
  buy?: TmdbProviderEntry[];
}

/** Best-guess ISO country for TMDB availability, defaulting to the US. */
export function tmdbPreferredRegion(): string {
  if (typeof navigator === 'undefined') return 'US';
  const LocaleCtor = (Intl as unknown as {
    Locale?: new (tag: string) => { region?: string };
  }).Locale;
  if (!LocaleCtor) return 'US';

  const languages = [navigator.language, ...(navigator.languages || [])].filter(Boolean);
  for (const language of languages) {
    try {
      const region = new LocaleCtor(language).region;
      if (region && /^[A-Z]{2}$/.test(region)) return region;
    } catch {
      /* Unparseable locale: try the next one. */
    }
  }
  return 'US';
}

/**
 * Streaming availability for a title, preferring the visitor's region and
 * falling back to US data when that region has no entry. TMDB requires a
 * JustWatch attribution wherever this data is shown, so callers get the link.
 */
export interface TmdbWatchProviderOptions {
  /** Fall back to US availability when the requested region has none. */
  fallbackToUS?: boolean;
}

export async function tmdbGetWatchProviders(
  providerId: string,
  mediaType: 'movie' | 'tv',
  region = 'US',
  options: TmdbWatchProviderOptions = {}
): Promise<TmdbWatchProviderResult | null> {
  const { fallbackToUS = true } = options;
  try {
    const resp = await tmdbFetch<{ results?: Record<string, TmdbRegionProviders> }>(
      `/${mediaType}/${providerId}/watch/providers`
    );
    const results = resp.results || {};
    const local = results[region];
    const fallback = fallbackToUS ? results.US : undefined;

    const chosen = local?.flatrate?.length
      ? { region, entry: local }
      : fallback?.flatrate?.length
        ? { region: 'US', entry: fallback }
        : local
          ? { region, entry: local }
          : fallback
            ? { region: 'US', entry: fallback }
            : null;
    if (!chosen) return null;

    const source = chosen.entry.flatrate?.length
      ? chosen.entry.flatrate
      : [...(chosen.entry.rent || []), ...(chosen.entry.buy || [])];

    const seen = new Set<number>();
    const providers: TmdbWatchProvider[] = [];
    for (const entry of source) {
      if (seen.has(entry.provider_id)) continue;
      seen.add(entry.provider_id);
      providers.push({
        id: entry.provider_id,
        name: entry.provider_name,
        logoUrl: entry.logo_path ? `${TMDB_IMAGE_BASE}/w92${entry.logo_path}` : undefined,
      });
    }
    if (providers.length === 0) return null;

    return {
      region: chosen.region,
      link: chosen.entry.link,
      providers: providers.slice(0, 8),
    };
  } catch {
    return null;
  }
}

/** First YouTube trailer for a TMDB title, preferring official English uploads. */
export async function tmdbGetTrailerKey(
  providerId: string,
  mediaType: 'movie' | 'tv'
): Promise<string | null> {
  try {
    const resp = await tmdbFetch<{
      results?: {
        key?: string;
        site?: string;
        type?: string;
        official?: boolean;
        iso_639_1?: string;
      }[];
    }>(`/${mediaType}/${providerId}/videos`, { language: 'en-US' });

    const trailers = (resp.results || []).filter(
      (video) => video.site === 'YouTube' && video.type === 'Trailer' && !!video.key
    );
    const best =
      trailers.find((video) => video.official && video.iso_639_1?.startsWith('en')) ??
      trailers.find((video) => video.official) ??
      trailers[0];
    return best?.key ?? null;
  } catch {
    return null;
  }
}
