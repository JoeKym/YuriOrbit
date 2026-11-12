import type { ContentTitle, ContentFilter, PaginatedResult, ContentType } from '@/types/content';
import { normalizeAniList } from './normalize';
import { getMaturityLevel } from '@/lib/content/maturity-preference';
import { maturityRank } from '@/lib/content/maturity';
import { GL_ALLOWED_CLASSIFICATIONS } from './classify';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const REQUEST_TIMEOUT = 15000;
const REQUEST_DELAY = 350;

const env = (import.meta as { env?: Record<string, string> }).env || {};
const isBrowser = typeof window !== 'undefined';
const clean = (val?: string) =>
  !val || val.trim() === '' || val.trim().toLowerCase() === 'value' ? undefined : val.trim();

/**
 * Optional AniList proxy, off unless VITE_ANILIST_API_URL points at one.
 *
 * functions/_lib/anilist-proxy.ts caches each distinct query at the edge, which
 * is what we want, but it cannot work on Cloudflare: AniList blocks Pages /
 * Workers egress IPs wholesale ("You have been manually blocked"), because that
 * egress is shared. So the browser calls graphql.anilist.co directly, where the
 * visitor's own IP is what AniList accepts. Point this at a relay with its own
 * egress address to switch the cached path back on.
 */
const configuredAnilistProxy = clean(env.VITE_ANILIST_API_URL);
const ANILIST_PROXY = configuredAnilistProxy ? configuredAnilistProxy.replace(/\/+$/, '') : '';

// AniList tags Yuri as a tag
const GL_TAGS = ['Yuri'];

const GENRE_MAP: Record<string, string> = {
  'Romance': 'Romance', 'Drama': 'Drama', 'Comedy': 'Comedy', 'Fantasy': 'Fantasy',
  'Historical': 'Historical', 'Mystery': 'Mystery', 'Psychological': 'Psychological',
  'Supernatural': 'Supernatural', 'Science Fiction': 'Sci-Fi', 'Tragedy': 'Tragedy',
  'Action': 'Action', 'Adventure': 'Adventure', 'Thriller': 'Thriller', 'Horror': 'Horror',
  'Music': 'Music', 'Slice of Life': 'Slice of Life', 'School Life': 'School Life',
  'Slow Burn': 'Slow Burn',
};

// Maps our sort keys to AniList MediaSort enum values
const SORT_MAP: Record<string, string> = {
  POPULARITY: 'POPULARITY_DESC',
  SCORE: 'SCORE_DESC',
  NEWEST: 'START_DATE_DESC',
  YEAR: 'START_DATE_DESC',
  TITLE: 'TITLE_ROMAJI',
  TRENDING: 'TRENDING_DESC',
  UPDATED_AT: 'UPDATED_AT_DESC',
};

const FORMAT_MAP: Partial<Record<ContentType, string[]>> = {
  MANGA: ['MANGA', 'ONE_SHOT'],
  MANHWA: ['MANHWA'],
  MANHUA: ['MANHUA'],
  LIGHT_NOVEL: ['NOVEL'],
};

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  synonyms
  description
  countryOfOrigin
  genres
  tags { id name rank }
  averageScore
  popularity
  favourites
  status
  season
  seasonYear
  startDate { year month day }
  endDate { year month day }
  episodes
  chapters
  volumes
  coverImage { extraLarge large medium color }
  bannerImage
  format
  source
  siteUrl
  isAdult
  externalLinks { url site type icon color }
  relations { edges { relationType node { id title { romaji english } coverImage { large } format type genres tags { name rank } } } }
  trailer { id site }
`;

function timeoutFetch(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

let lastRequestTime = 0;

/** Only needed when we talk to AniList ourselves; the edge proxy paces upstream. */
async function paceAnilistRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY - elapsed));
  }
  lastRequestTime = Date.now();
}

/** Error carrying the HTTP status, so callers can tell 404/5xx from a GraphQL error. */
type AnilistError = Error & { status?: number };

async function postAnilistQuery(endpoint: string, body: string): Promise<unknown> {
  const resp = await timeoutFetch(
    endpoint,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
    },
    REQUEST_TIMEOUT
  );
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    const error = new Error(`AniList ${resp.status}: ${text.slice(0, 200)}`) as AnilistError;
    error.status = resp.status;
    throw error;
  }
  const json = await resp.json();
  if (json.errors) {
    // Status 200: the query itself is wrong, retrying elsewhere will not help.
    const error = new Error(json.errors[0]?.message || 'AniList GraphQL error') as AnilistError;
    error.status = 200;
    throw error;
  }
  return json.data;
}

/**
 * Statuses worth retrying: AniList throttles with 429 and occasionally returns
 * a transient 5xx. Without a retry the caller sees a rejection, `allSettled`
 * swallows it, and a whole row of the homepage silently disappears.
 */
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

async function anilistQuery(query: string, variables: Record<string, unknown>): Promise<unknown> {
  const body = JSON.stringify({ query, variables });

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await submitAnilistQuery(body);
    } catch (error) {
      const status = (error as AnilistError).status;
      if (attempt >= MAX_ATTEMPTS || status === undefined || !RETRYABLE_STATUSES.has(status)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700 * attempt));
      await paceAnilistRequest();
    }
  }
}

async function submitAnilistQuery(body: string): Promise<unknown> {

  if (ANILIST_PROXY) {
    try {
      return await postAnilistQuery(ANILIST_PROXY, body);
    } catch (error) {
      // A missing or broken proxy (static-only self-host, Pages Function down)
      // must not take the catalogue with it: AniList accepts browser requests.
      const status = (error as AnilistError).status;
      // 403 included on purpose: upstream policy blocks are the failure mode we
      // actually hit, and a direct call is better than a dead catalogue.
      const proxyUnavailable =
        status === undefined || status === 403 || status === 404 || status === 405 || status >= 500;
      if (!isBrowser || !proxyUnavailable) throw error;
      await paceAnilistRequest();
    }
  } else {
    await paceAnilistRequest();
  }

  return postAnilistQuery(ANILIST_ENDPOINT, body);
}

interface MediaFilterVars {
  page: number;
  perPage: number;
  type?: 'MANGA' | 'ANIME';
  tag_in?: string[];
  genre?: string;
  format_in?: string[];
  status_in?: string[];
  seasonYear?: number;
  search?: string;
  countryOfOrigin?: string;
  /** `false` hides adult titles; leaving it out requests everything. */
  isAdult?: boolean | null;
}

/**
 * AniList's `isAdult` is a hard filter, so it follows the visitor's maturity
 * setting: `false` for Safe/Suggestive, `null` (no filter) once erotica and
 * pornographic content is allowed.
 */
/**
 * `false` hides adult titles. Above SUGGESTIVE no value is sent at all.
 *
 * Sending `isAdult: null` looks like "no preference" but AniList treats it as a
 * filter that matches nothing — anime, novels and dramas came back empty for
 * every visitor on the erotica and pornographic levels.
 */
function adultFilter(): boolean | undefined {
  return maturityRank(getMaturityLevel()) >= maturityRank('EROTICA') ? undefined : false;
}

function buildPageQuery(sortEnum: string): string {
  return `query ($page: Int, $perPage: Int, $type: MediaType, $tag_in: [String], $genre: String, $format_in: [MediaFormat], $status_in: [MediaStatus], $seasonYear: Int, $search: String, $countryOfOrigin: CountryCode, $isAdult: Boolean) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { currentPage hasNextPage total perPage lastPage }
    media(type: $type, tag_in: $tag_in, genre: $genre, format_in: $format_in, status_in: $status_in, seasonYear: $seasonYear, search: $search, countryOfOrigin: $countryOfOrigin, sort: [${sortEnum}], isAdult: $isAdult) {
      ${MEDIA_FIELDS}
    }
  }
}`;
}

/**
 * AniList stops counting at 5000 and reports that number for every larger
 * query, so anything at or above it is a floor, not a count.
 */
const ANILIST_TOTAL_CAP = 5000;

async function fetchFiltered(vars: MediaFilterVars, sortEnum: string): Promise<PaginatedResult> {
  const query = buildPageQuery(sortEnum);
  const adult = vars.isAdult ?? adultFilter();
  const payload: Record<string, unknown> = { ...vars };
  if (adult === undefined) delete payload.isAdult;
  else payload.isAdult = adult;

  const data = await anilistQuery(query, payload) as {
    Page: { pageInfo: { hasNextPage: boolean; total: number; currentPage: number; perPage: number }, media: unknown[] }
  };
  const items = (data.Page.media || []).map((m) => normalizeAniList(m as Parameters<typeof normalizeAniList>[0]));
  return {
    items,
    page: data.Page.pageInfo.currentPage,
    perPage: data.Page.pageInfo.perPage,
    total: data.Page.pageInfo.total,
    totalCapped: data.Page.pageInfo.total >= ANILIST_TOTAL_CAP,
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}

async function fetchGLBase(extra: Partial<MediaFilterVars> = {}, sortEnum: string, perPage = 20): Promise<ContentTitle[]> {
  const result = await fetchFiltered(
    { page: 1, perPage, tag_in: GL_TAGS, ...extra },
    sortEnum
  );
  return result.items;
}

export async function searchGLTitles(filter: ContentFilter, page = 1, perPage = 20): Promise<PaginatedResult> {
  const sortEnum = SORT_MAP[filter.sort || 'POPULARITY'] || 'POPULARITY_DESC';
  const extra: Partial<MediaFilterVars> = {};

  if (filter.genre) extra.genre = GENRE_MAP[filter.genre] || filter.genre;
  if (filter.year) extra.seasonYear = filter.year;
  if (filter.status && filter.status !== 'ALL') extra.status_in = [filter.status];
  if (filter.contentType && filter.contentType !== 'ALL') {
    if (filter.contentType === 'MANHWA') {
      extra.type = 'MANGA';
      extra.countryOfOrigin = 'KR';
      extra.format_in = ['MANGA', 'ONE_SHOT'];
    } else if (filter.contentType === 'MANHUA') {
      extra.type = 'MANGA';
      extra.countryOfOrigin = 'CN';
      extra.format_in = ['MANGA', 'ONE_SHOT'];
    } else if (filter.contentType === 'MOVIE') {
      extra.type = 'ANIME';
      extra.format_in = ['MOVIE'];
    } else if (filter.contentType === 'TV' || filter.contentType === 'DRAMA') {
      extra.type = 'ANIME';
      extra.format_in = ['TV', 'TV_SHORT', 'OVA', 'ONA'];
    } else if (filter.contentType === 'WEBTOON') {
      // AniList has no webtoon format: it indexes them as digital manga.
      extra.type = 'MANGA';
      extra.format_in = ['MANGA', 'ONE_SHOT'];
    } else if (filter.contentType === 'LIGHT_NOVEL') {
      extra.type = 'MANGA';
      extra.format_in = ['NOVEL'];
    } else if (filter.contentType === 'MANGA') {
      extra.type = 'MANGA';
      extra.format_in = ['MANGA', 'ONE_SHOT'];
    }
  }

  if (filter.query) {
    return fetchFiltered({ page, perPage, search: filter.query, tag_in: GL_TAGS, ...extra }, sortEnum);
  }

  return fetchFiltered({ page, perPage, tag_in: GL_TAGS, ...extra }, sortEnum);
}

export async function getTrendingGL(perPage = 20): Promise<ContentTitle[]> {
  return fetchGLBase({}, 'TRENDING_DESC', perPage);
}

export async function getPopularGL(perPage = 20): Promise<ContentTitle[]> {
  return fetchGLBase({}, 'POPULARITY_DESC', perPage);
}

export async function getRecentGL(perPage = 20): Promise<ContentTitle[]> {
  return fetchGLBase({}, 'START_DATE_DESC', perPage);
}

export async function getCompletedGL(perPage = 20): Promise<ContentTitle[]> {
  return fetchGLBase({ status_in: ['FINISHED'] }, 'POPULARITY_DESC', perPage);
}

export async function getGLByGenre(genre: string, perPage = 20): Promise<ContentTitle[]> {
  const g = GENRE_MAP[genre] || genre;
  return fetchGLBase({ genre: g }, 'POPULARITY_DESC', perPage);
}

export async function getGLByContentType(contentType: ContentType, perPage = 30): Promise<ContentTitle[]> {
  const extra: Partial<MediaFilterVars> = {};
  if (contentType === 'MANHWA') {
    extra.type = 'MANGA';
    extra.countryOfOrigin = 'KR';
    extra.format_in = ['MANGA', 'ONE_SHOT'];
  } else if (contentType === 'MANHUA') {
    extra.type = 'MANGA';
    extra.countryOfOrigin = 'CN';
    extra.format_in = ['MANGA', 'ONE_SHOT'];
  } else if (contentType === 'MOVIE') {
    extra.type = 'ANIME';
    extra.format_in = ['MOVIE'];
  } else if (contentType === 'TV') {
    extra.type = 'ANIME';
    extra.format_in = ['TV', 'TV_SHORT', 'OVA', 'ONA'];
  } else if (contentType === 'LIGHT_NOVEL') {
    extra.type = 'MANGA';
    extra.format_in = ['NOVEL'];
  } else {
    extra.type = 'MANGA';
    extra.format_in = ['MANGA', 'ONE_SHOT'];
  }
  return fetchGLBase(extra, 'POPULARITY_DESC', perPage);
}

// ─── Creator search ──────────────────────────────────────────────────────────

/** Smaller field set for staff lookups — creator queries return many titles. */
const MEDIA_FIELDS_LIGHT = `
  id
  idMal
  title { romaji english native }
  synonyms
  description
  countryOfOrigin
  genres
  tags { id name rank }
  averageScore
  popularity
  status
  startDate { year }
  coverImage { extraLarge large }
  bannerImage
  format
  siteUrl
  isAdult
`;

export interface CreatorMatch {
  name: string;
  titles: ContentTitle[];
}

/**
 * Find GL titles by creator (author, artist, director, voice actor).
 *
 * AniList's media search only looks at titles and synonyms, so a name like
 * "Milk Morinaga" returns nothing there. Searching the Staff type and walking
 * `staffMedia` fixes that; manga and anime credits are fetched together.
 */
export async function searchGLByCreator(query: string, perPage = 3): Promise<CreatorMatch[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const gql = `query ($q: String, $perPage: Int) {
    Page(page: 1, perPage: $perPage) {
      staff(search: $q, sort: SEARCH_MATCH) {
        id
        name { full native }
        manga: staffMedia(type: MANGA, sort: POPULARITY_DESC, perPage: 12) { ${MEDIA_FIELDS_LIGHT} }
        anime: staffMedia(type: ANIME, sort: POPULARITY_DESC, perPage: 12) { ${MEDIA_FIELDS_LIGHT} }
      }
    }
  }`;

  try {
    const data = await anilistQuery(gql, { q: trimmed, perPage }) as {
      Page: {
        staff: {
          id: number;
          name?: { full?: string; native?: string };
          manga?: unknown[];
          anime?: unknown[];
        }[];
      };
    };

    const matches: CreatorMatch[] = [];
    for (const member of data.Page.staff || []) {
      const name = member.name?.full || member.name?.native;
      if (!name) continue;

      const seen = new Set<string>();
      const titles: ContentTitle[] = [];
      for (const media of [...(member.manga || []), ...(member.anime || [])]) {
        const normalized = normalizeAniList(media as Parameters<typeof normalizeAniList>[0]);
        if (!GL_ALLOWED_CLASSIFICATIONS.includes(normalized.glClassification)) continue;
        if (normalized.isAdult && adultFilter() === false) continue;
        if (seen.has(normalized.id)) continue;
        seen.add(normalized.id);
        titles.push({ ...normalized, creators: [name] });
      }

      if (titles.length > 0) {
        matches.push({ name, titles: titles.slice(0, 12) });
      }
    }
    return matches;
  } catch {
    return [];
  }
}

export async function getTitleById(id: string): Promise<ContentTitle | null> {
  const providerId = id.replace('ANILIST-', '');
  const query = `query ($id: Int) {
    Media(id: $id) {
      ${MEDIA_FIELDS}
    }
  }`;
  try {
    const data = await anilistQuery(query, { id: parseInt(providerId) }) as { Media: unknown };
    if (!data.Media) return null;
    return normalizeAniList(data.Media as Parameters<typeof normalizeAniList>[0]);
  } catch {
    return null;
  }
}

// Aliases for compatibility
export const anilistSearchGL = searchGLTitles;
export const anilistGetPopularGL = getPopularGL;
