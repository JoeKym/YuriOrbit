import type { ContentTitle, ContentFilter, PaginatedResult, ContentType } from '@/types/content';
import { normalizeAniList } from './normalize';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const REQUEST_TIMEOUT = 15000;
const REQUEST_DELAY = 700;
const MAX_RETRIES = 3;

// AniList has no "Yuri" genre; GL content is identified by the "Yuri" tag.
// tag_in requires ALL listed tags, so extra tag filters are appended to this.
const GL_TAGS = ['Yuri'];
const MIN_TAG_RANK = 40;

// UI genre -> AniList filter. Only AniList's fixed GenreCollection works as `genre`;
// everything else must be filtered as a tag.
const GENRE_MAP: Record<string, { genre?: string; tag?: string }> = {
  'Romance': { genre: 'Romance' }, 'Drama': { genre: 'Drama' }, 'Comedy': { genre: 'Comedy' },
  'Fantasy': { genre: 'Fantasy' }, 'Mystery': { genre: 'Mystery' }, 'Psychological': { genre: 'Psychological' },
  'Supernatural': { genre: 'Supernatural' }, 'Science Fiction': { genre: 'Sci-Fi' },
  'Action': { genre: 'Action' }, 'Adventure': { genre: 'Adventure' }, 'Thriller': { genre: 'Thriller' },
  'Horror': { genre: 'Horror' }, 'Music': { genre: 'Music' }, 'Slice of Life': { genre: 'Slice of Life' },
  'Historical': { tag: 'Historical' }, 'Tragedy': { tag: 'Tragedy' }, 'School Life': { tag: 'School' },
};

function resolveGenre(genre: string): { genre?: string; tag?: string } {
  return GENRE_MAP[genre] || { genre };
}

export function matchesGenre(title: ContentTitle, genre: string): boolean {
  const { genre: g, tag } = resolveGenre(genre);
  if (g) return title.genres.includes(g);
  return title.tags.some((t) => t.name === tag);
}

const SORT_MAP: Record<string, string> = {
  POPULARITY: 'POPULARITY_DESC', SCORE: 'SCORE_DESC', NEWEST: 'START_DATE_DESC',
  YEAR: 'START_DATE_DESC', TITLE: 'TITLE_ROMAJI',
};

// AniList has no MANHWA/MANHUA formats; they are MANGA filtered by country of origin.
const FORMAT_MAP: Partial<Record<ContentType, { format_in: string[]; countryOfOrigin?: string }>> = {
  MANGA: { format_in: ['MANGA', 'ONE_SHOT'], countryOfOrigin: 'JP' },
  MANHWA: { format_in: ['MANGA', 'ONE_SHOT'], countryOfOrigin: 'KR' },
  MANHUA: { format_in: ['MANGA', 'ONE_SHOT'], countryOfOrigin: 'CN' },
  LIGHT_NOVEL: { format_in: ['NOVEL'] },
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

let queue: Promise<unknown> = Promise.resolve();
let lastRequestTime = 0;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Serialize requests so concurrent callers don't burst past AniList's rate limit.
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = REQUEST_DELAY - (Date.now() - lastRequestTime);
    if (wait > 0) await sleep(wait);
    try {
      return await task();
    } finally {
      lastRequestTime = Date.now();
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

async function anilistQuery(query: string, variables: Record<string, unknown>): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    const resp = await enqueue(() =>
      timeoutFetch(
        ANILIST_ENDPOINT,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ query, variables }),
        },
        REQUEST_TIMEOUT
      )
    );
    if (resp.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = Number(resp.headers.get('Retry-After'));
      await sleep((Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2 ** attempt * 2) * 1000);
      continue;
    }
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
}

interface MediaFilterVars {
  page: number;
  perPage: number;
  tag_in?: string[];
  genre?: string;
  format_in?: string[];
  countryOfOrigin?: string;
  status_in?: string[];
  startDate_greater?: number;
  startDate_lesser?: number;
  search?: string;
  sort?: string;
}

const PAGE_QUERY = `query ($page: Int, $perPage: Int, $tag_in: [String], $genre: String, $format_in: [MediaFormat], $countryOfOrigin: CountryCode, $status_in: [MediaStatus], $startDate_greater: FuzzyDateInt, $startDate_lesser: FuzzyDateInt, $search: String, $sort: MediaSort) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { currentPage hasNextPage total perPage lastPage }
    media(type: MANGA, tag_in: $tag_in, minimumTagRank: ${MIN_TAG_RANK}, genre: $genre, format_in: $format_in, countryOfOrigin: $countryOfOrigin, status_in: $status_in, startDate_greater: $startDate_greater, startDate_lesser: $startDate_lesser, search: $search, sort: [$sort], isAdult: false) {
      ${MEDIA_FIELDS}
    }
  }
}`;

async function fetchFiltered(vars: MediaFilterVars): Promise<PaginatedResult> {
  const data = await anilistQuery(PAGE_QUERY, vars as unknown as Record<string, unknown>) as {
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

async function fetchGLBase(extra: Partial<MediaFilterVars> = {}, perPage = 20): Promise<ContentTitle[]> {
  const result = await fetchFiltered({
    page: 1,
    perPage,
    tag_in: GL_TAGS,
    sort: 'POPULARITY_DESC',
    ...extra,
  });
  return result.items;
}

function applyGenre(extra: Partial<MediaFilterVars>, genre: string) {
  const { genre: g, tag } = resolveGenre(genre);
  if (g) extra.genre = g;
  if (tag) extra.tag_in = [...GL_TAGS, tag];
}

function applyContentType(extra: Partial<MediaFilterVars>, contentType: ContentType) {
  const fmt = FORMAT_MAP[contentType];
  if (!fmt) return;
  extra.format_in = fmt.format_in;
  if (fmt.countryOfOrigin) extra.countryOfOrigin = fmt.countryOfOrigin;
}

export async function searchGLTitles(filter: ContentFilter, page = 1, perPage = 20): Promise<PaginatedResult> {
  const extra: Partial<MediaFilterVars> = {
    tag_in: GL_TAGS,
    sort: filter.query && !filter.sort ? 'SEARCH_MATCH' : SORT_MAP[filter.sort || 'POPULARITY'] || 'POPULARITY_DESC',
  };

  if (filter.query) extra.search = filter.query;
  if (filter.genre) applyGenre(extra, filter.genre);
  if (filter.year) {
    // seasonYear only applies to anime; manga/novels are filtered by start date (YYYYMMDD).
    extra.startDate_greater = (filter.year - 1) * 10000 + 1231;
    extra.startDate_lesser = (filter.year + 1) * 10000;
  }
  if (filter.status && filter.status !== 'ALL') extra.status_in = [filter.status];
  if (filter.contentType && filter.contentType !== 'ALL') applyContentType(extra, filter.contentType);

  return fetchFiltered({ page, perPage, ...extra });
}

export async function getTrendingGL(perPage = 20): Promise<ContentTitle[]> {
  return fetchGLBase({ sort: 'TRENDING_DESC' }, perPage);
}

export async function getPopularGL(perPage = 20): Promise<ContentTitle[]> {
  return fetchGLBase({ sort: 'POPULARITY_DESC' }, perPage);
}

function todayFuzzyDate(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export async function getRecentGL(perPage = 20): Promise<ContentTitle[]> {
  // Without an upper bound, unreleased titles with unknown start dates sort first.
  return fetchGLBase({ sort: 'START_DATE_DESC', startDate_lesser: todayFuzzyDate() }, perPage);
}

export async function getCompletedGL(perPage = 20): Promise<ContentTitle[]> {
  return fetchGLBase({ status_in: ['FINISHED'], sort: 'POPULARITY_DESC' }, perPage);
}

export async function getGLByGenre(genre: string, perPage = 20): Promise<ContentTitle[]> {
  const extra: Partial<MediaFilterVars> = { sort: 'POPULARITY_DESC' };
  applyGenre(extra, genre);
  return fetchGLBase(extra, perPage);
}

export async function getGLByContentType(contentType: ContentType, perPage = 30): Promise<ContentTitle[]> {
  if (!FORMAT_MAP[contentType]) return [];
  const extra: Partial<MediaFilterVars> = { sort: 'POPULARITY_DESC' };
  applyContentType(extra, contentType);
  return fetchGLBase(extra, perPage);
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
