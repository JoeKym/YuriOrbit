/**
 * Jikan API v4 provider — unofficial MyAnimeList REST API, no key required.
 * Used as a secondary source for GL manga metadata.
 */
import type { ContentTitle, PaginatedResult, ContentFilter } from '@/types/content';
import { classifyGL, GL_ALLOWED_CLASSIFICATIONS } from './classify';
import { normalizeAniList } from './normalize';

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const REQUEST_DELAY = 500; // Jikan rate limit: 3 req/s burst, 60/min
const TIMEOUT = 15000;

let lastJikanRequest = 0;

async function jikanFetch<T>(path: string): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastJikanRequest;
  if (elapsed < REQUEST_DELAY) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY - elapsed));
  }
  lastJikanRequest = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(`${JIKAN_BASE}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`Jikan ${resp.status}: ${path}`);
    return (await resp.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Type definitions ────────────────────────────────────────────────────────

interface JikanImage {
  jpg?: { image_url?: string; large_image_url?: string };
  webp?: { image_url?: string; large_image_url?: string };
}

interface JikanManga {
  mal_id: number;
  url: string;
  images: JikanImage;
  title: string;
  title_english?: string;
  title_japanese?: string;
  title_synonyms?: string[];
  type?: string; // Manga, Manhwa, Manhua, Novel, One-shot, Doujinshi
  chapters?: number;
  volumes?: number;
  status?: string; // Publishing, Finished, On Hiatus, Discontinued, Not yet published
  publishing?: boolean;
  published?: { from?: string; to?: string };
  score?: number;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  synopsis?: string;
  background?: string;
  genres?: { mal_id: number; name: string }[];
  explicit_genres?: { mal_id: number; name: string }[];
  themes?: { mal_id: number; name: string }[];
  demographics?: { mal_id: number; name: string }[];
}

interface JikanPageResponse<T> {
  data: T[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: { count: number; total: number; per_page: number };
  };
}

interface JikanSingleResponse<T> {
  data: T;
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

function mapJikanStatus(status?: string, publishing?: boolean): ContentTitle['status'] {
  if (publishing) return 'RELEASING';
  switch (status) {
    case 'Publishing': return 'RELEASING';
    case 'Finished': return 'FINISHED';
    case 'On Hiatus': return 'HIATUS';
    case 'Discontinued': return 'CANCELLED';
    case 'Not yet published': return 'NOT_YET_RELEASED';
    default: return 'UNKNOWN';
  }
}

function mapJikanType(type?: string): ContentTitle['contentType'] {
  switch (type) {
    case 'Manhwa': return 'MANHWA';
    case 'Manhua': return 'MANHUA';
    case 'Novel': return 'LIGHT_NOVEL';
    case 'One-shot': return 'MANGA';
    default: return 'MANGA';
  }
}

function normalizeJikan(m: JikanManga): ContentTitle {
  const allGenres = [
    ...(m.genres || []),
    ...(m.themes || []),
    ...(m.demographics || []),
  ].map((g) => g.name);

  const title = m.title_english || m.title || 'Unknown Title';
  const altTitles = [m.title, m.title_japanese, ...(m.title_synonyms || [])].filter(Boolean) as string[];
  const contentType = mapJikanType(m.type);

  const glClassification = classifyGL({
    genres: allGenres,
    description: m.synopsis,
    title,
    altTitles,
  });

  const cover = m.images?.webp?.large_image_url
    || m.images?.webp?.image_url
    || m.images?.jpg?.large_image_url
    || m.images?.jpg?.image_url;

  const releaseYear = m.published?.from ? new Date(m.published.from).getFullYear() : undefined;

  return {
    id: `JIKAN-${m.mal_id}`,
    providerId: String(m.mal_id),
    provider: 'JIKAN',
    title,
    altTitles,
    description: m.synopsis,
    contentType,
    coverImage: cover,
    genres: allGenres,
    tags: [],
    status: mapJikanStatus(m.status, m.publishing),
    releaseYear,
    averageScore: m.score ? Math.round(m.score * 10) : undefined,
    popularity: m.popularity,
    chapters: m.chapters,
    volumes: m.volumes,
    externalLinks: [
      { url: m.url, site: 'MyAnimeList', type: 'METADATA' },
    ],
    relations: [],
    glClassification,
    sourceUrl: m.url,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Search GL manga/manhwa via Jikan MAL. */
export async function jikanSearchGL(filter: ContentFilter, page = 1, perPage = 24): Promise<PaginatedResult> {
  try {
    const params = new URLSearchParams({
      genres: '74', // MAL genre ID 74 = Girls Love (Yuri)
      page: String(page),
      limit: String(Math.min(perPage, 25)), // Jikan max 25/page
      order_by: mapSortToJikan(filter.sort),
      sort: 'desc',
    });

    if (filter.query) params.set('q', filter.query);
    if (filter.status && filter.status !== 'ALL') {
      const s = mapStatusToJikan(filter.status);
      if (s) params.set('status', s);
    }
    if (filter.year) {
      params.set('start_date', `${filter.year}-01-01`);
      params.set('end_date', `${filter.year}-12-31`);
    }

    const resp = await jikanFetch<JikanPageResponse<JikanManga>>(`/manga?${params}`);
    const items = (resp.data || [])
      .map(normalizeJikan)
      .filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification));

    return {
      items,
      page: resp.pagination?.current_page || page,
      perPage: resp.pagination?.items?.per_page || perPage,
      total: resp.pagination?.items?.total || items.length,
      hasNextPage: resp.pagination?.has_next_page || false,
    };
  } catch {
    return { items: [], page, perPage, total: 0, hasNextPage: false };
  }
}

/** Get a single title by MAL ID from Jikan. */
export async function jikanGetById(malId: string): Promise<ContentTitle | null> {
  try {
    const id = malId.replace('JIKAN-', '');
    const resp = await jikanFetch<JikanSingleResponse<JikanManga>>(`/manga/${id}`);
    return normalizeJikan(resp.data);
  } catch {
    return null;
  }
}

/** Get trending/popular GL manga from Jikan. */
export async function jikanGetPopular(perPage = 20): Promise<ContentTitle[]> {
  try {
    const params = new URLSearchParams({
      genres: '74',
      order_by: 'members',
      sort: 'desc',
      limit: String(Math.min(perPage, 25)),
    });
    const resp = await jikanFetch<JikanPageResponse<JikanManga>>(`/manga?${params}`);
    return resp.data
      .map(normalizeJikan)
      .filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification));
  } catch {
    return [];
  }
}

function mapSortToJikan(sort?: string): string {
  switch (sort) {
    case 'SCORE': return 'score';
    case 'NEWEST': return 'start_date';
    case 'YEAR': return 'start_date';
    case 'TITLE': return 'title';
    default: return 'members'; // POPULARITY
  }
}

function mapStatusToJikan(status?: string): string | null {
  switch (status) {
    case 'RELEASING': return 'publishing';
    case 'FINISHED': return 'complete';
    case 'HIATUS': return 'hiatus';
    case 'NOT_YET_RELEASED': return 'upcoming';
    default: return null;
  }
}
