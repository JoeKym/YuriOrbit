import type { ContentTitle, ContentFilter, PaginatedResult, ContentType } from '@/types/content';
import { normalizeAniList } from './normalize';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const REQUEST_TIMEOUT = 15000;
const REQUEST_DELAY = 350;

// AniList uses "Girls Love" (with space) as the official genre tag
const GL_GENRES = ['Yuri', "Girls Love", 'Shoujo Ai'];

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
  genre_in?: string[];
  genre?: string;
  format_in?: string[];
  status_in?: string[];
  seasonYear?: number;
  search?: string;
}

// FIX: sort is now inlined as a literal enum in each query rather than a variable
// because AniList requires MediaSort enum type, not String — this fixes the 400 errors.
function buildPageQuery(sortEnum: string): string {
  return `query ($page: Int, $perPage: Int, $genre_in: [String], $genre: String, $format_in: [MediaFormat], $status_in: [MediaStatus], $seasonYear: Int, $search: String) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { currentPage hasNextPage total perPage lastPage }
    media(type: MANGA, genre_in: $genre_in, genre: $genre, format_in: $format_in, status_in: $status_in, seasonYear: $seasonYear, search: $search, sort: [${sortEnum}], isAdult: false) {
      ${MEDIA_FIELDS}
    }
  }
}`;
}

async function fetchFiltered(vars: MediaFilterVars, sortEnum: string): Promise<PaginatedResult> {
  const query = buildPageQuery(sortEnum);
  const data = await anilistQuery(query, vars as unknown as Record<string, unknown>) as {
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
    { page: 1, perPage, genre_in: GL_GENRES, ...extra },
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
    const fmts = FORMAT_MAP[filter.contentType as ContentType];
    if (fmts) extra.format_in = fmts;
  }

  if (filter.query) {
    return fetchFiltered({ page, perPage, search: filter.query, genre_in: GL_GENRES, ...extra }, sortEnum);
  }

  return fetchFiltered({ page, perPage, genre_in: GL_GENRES, ...extra }, sortEnum);
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
  const formats = FORMAT_MAP[contentType];
  if (!formats) return [];
  return fetchGLBase({ format_in: formats }, 'POPULARITY_DESC', perPage);
}

export async function getTitleById(id: string): Promise<ContentTitle | null> {
  const providerId = id.replace('ANILIST-', '');
  const query = `query ($id: Int) {
    Media(id: $id, type: MANGA) {
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
