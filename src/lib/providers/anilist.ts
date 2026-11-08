import type { ContentTitle, ContentFilter, PaginatedResult, ContentType } from '@/types/content';
import { normalizeAniList } from './normalize';
import { getMaturityLevel } from '@/lib/content/maturity-preference';
import { maturityRank } from '@/lib/content/maturity';
import { GL_ALLOWED_CLASSIFICATIONS } from './classify';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const REQUEST_TIMEOUT = 15000;
const REQUEST_DELAY = 350;

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
  relations { edges { relationType node { id title { romaji english } coverImage { large } format type } } }
  trailer { id site }
`;

function timeoutFetch(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

let lastRequestTime = 0;

async function anilistQuery(query: string, variables: Record<string, unknown>): Promise<unknown> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY - elapsed));
  }
  lastRequestTime = Date.now();

  const resp = await timeoutFetch(
    ANILIST_ENDPOINT,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    },
    REQUEST_TIMEOUT
  );
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`AniList ${resp.status}: ${text.slice(0, 200)}`);
  }
  const json = await resp.json();
  if (json.errors) {
    throw new Error(json.errors[0]?.message || 'AniList GraphQL error');
  }
  return json.data;
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
  /** `false` hides adult titles, `null` requests everything. */
  isAdult?: boolean | null;
}

/**
 * AniList's `isAdult` is a hard filter, so it follows the visitor's maturity
 * setting: `false` for Safe/Suggestive, `null` (no filter) once erotica and
 * pornographic content is allowed.
 */
function adultFilter(): boolean | null {
  return maturityRank(getMaturityLevel()) >= maturityRank('EROTICA') ? null : false;
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

async function fetchFiltered(vars: MediaFilterVars, sortEnum: string): Promise<PaginatedResult> {
  const query = buildPageQuery(sortEnum);
  const data = await anilistQuery(query, { ...vars, isAdult: vars.isAdult ?? adultFilter() } as unknown as Record<string, unknown>) as {
    Page: { pageInfo: { hasNextPage: boolean; total: number; currentPage: number; perPage: number }, media: unknown[] }
  };
  const items = (data.Page.media || []).map((m) => normalizeAniList(m as Parameters<typeof normalizeAniList>[0]));
  return {
    items,
    page: data.Page.pageInfo.currentPage,
    perPage: data.Page.pageInfo.perPage,
    total: data.Page.pageInfo.total,
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
    } else if (filter.contentType === 'TV') {
      extra.type = 'ANIME';
      extra.format_in = ['TV', 'TV_SHORT', 'OVA', 'ONA'];
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
        if (normalized.isAdult && adultFilter() !== null) continue;
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
