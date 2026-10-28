/**
 * MangaDex API provider — completely free, no API key required.
 * Used for manga/manhwa/manhua chapter lists and GL content discovery.
 * Docs: https://api.mangadex.org/docs/
 */
import type { ContentTitle, PaginatedResult, ContentFilter, ChapterInfo, Tag } from '@/types/content';
import { classifyGL, GL_ALLOWED_CLASSIFICATIONS } from './classify';

const MANGADEX_BASE = 'https://api.mangadex.org';
const TIMEOUT = 15000;
const REQUEST_DELAY = 300; // Be polite to MangaDex

let lastMDRequest = 0;

async function mdFetch<T>(path: string, params?: Record<string, string | string[]>): Promise<T> {
  const now = Date.now();
  const elapsed = now - lastMDRequest;
  if (elapsed < REQUEST_DELAY) {
    await new Promise((r) => setTimeout(r, REQUEST_DELAY - elapsed));
  }
  lastMDRequest = Date.now();

  const urlParams = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (Array.isArray(v)) {
        const key = k.endsWith('[]') ? k : `${k}[]`;
        v.forEach((item) => urlParams.append(key, item));
      } else {
        urlParams.set(k, v);
      }
    }
  }

  const url = `${MANGADEX_BASE}${path}${urlParams.toString() ? `?${urlParams}` : ''}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`MangaDex ${resp.status}: ${path}`);
    return (await resp.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Type definitions ────────────────────────────────────────────────────────

interface MDLocalizedString {
  en?: string;
  ja?: string;
  'ja-ro'?: string;
  ko?: string;
  'ko-ro'?: string;
  zh?: string;
  'zh-ro'?: string;
  [lang: string]: string | undefined;
}

interface MDRelationship {
  id: string;
  type: string;
  attributes?: {
    fileName?: string;
    name?: string;
    title?: MDLocalizedString;
    description?: MDLocalizedString;
    volume?: string;
    chapter?: string;
    translatedLanguage?: string;
    publishAt?: string;
    readableAt?: string;
    externalUrl?: string;
    pages?: number;
  };
}

interface MDMangaAttributes {
  title: MDLocalizedString;
  altTitles: MDLocalizedString[];
  description: MDLocalizedString;
  status?: string; // ongoing, completed, hiatus, cancelled
  year?: number;
  contentRating?: string; // safe, suggestive, erotica, pornographic
  tags: { id: string; attributes: { name: MDLocalizedString; group: string } }[];
  publicationDemographic?: string;
  originalLanguage?: string;
  lastVolume?: string;
  lastChapter?: string;
  latestUploadedChapter?: string;
}

interface MDManga {
  id: string;
  type: 'manga';
  attributes: MDMangaAttributes;
  relationships: MDRelationship[];
}

interface MDListResponse<T> {
  result: string;
  data: T[];
  limit: number;
  offset: number;
  total: number;
}

interface MDChapterAttributes {
  volume?: string;
  chapter?: string;
  title?: string;
  translatedLanguage: string;
  externalUrl?: string;
  publishAt: string;
  readableAt: string;
  pages: number;
}

interface MDChapter {
  id: string;
  type: 'chapter';
  attributes: MDChapterAttributes;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// MangaDex tag IDs for GL content
const GL_TAG_IDS = [
  'a3c67850-4684-404e-9b7f-c69850ee5da6', // Girls' Love
];

// MangaDex tag IDs to exclude (BL)
const EXCLUDE_TAG_IDS = [
  '5920b825-4181-4a17-beeb-9baec0c9d5cc', // Boys' Love
];

function getBestText(loc: MDLocalizedString | undefined): string {
  if (!loc) return '';
  return loc.en || loc['ja-ro'] || loc['ko-ro'] || Object.values(loc).find(Boolean) || '';
}

function mapMDStatusInternal(status?: string): ContentTitle['status'] {
  switch (status) {
    case 'ongoing': return 'RELEASING';
    case 'completed': return 'FINISHED';
    case 'hiatus': return 'HIATUS';
    case 'cancelled': return 'CANCELLED';
    default: return 'UNKNOWN';
  }
}

function mapMDContentType(lang?: string): ContentTitle['contentType'] {
  switch (lang) {
    case 'ko': return 'MANHWA';
    case 'zh':
    case 'zh-hk': return 'MANHUA';
    default: return 'MANGA';
  }
}

function getCoverUrl(relationships: MDRelationship[], mangaId: string): string | undefined {
  const cover = relationships.find((r) => r.type === 'cover_art');
  if (!cover?.attributes?.fileName) return undefined;
  return `https://uploads.mangadex.org/covers/${mangaId}/${cover.attributes.fileName}.512.jpg`;
}

function normalizeMangaDex(m: MDManga): ContentTitle {
  const attrs = m.attributes;
  const title = getBestText(attrs.title);
  const altTitles = attrs.altTitles
    .flatMap((a) => Object.values(a))
    .filter((t): t is string => Boolean(t) && t !== title);

  const genres = attrs.tags
    .filter((t) => t.attributes.group === 'genre' || t.attributes.group === 'theme')
    .map((t) => getBestText(t.attributes.name));

  const description = getBestText(attrs.description);
  const contentType = mapMDContentType(attrs.originalLanguage);
  const coverImage = getCoverUrl(m.relationships, m.id);

  const tags: Tag[] = attrs.tags.map((t, idx) => ({
    id: idx + 1,
    name: getBestText(t.attributes.name),
  }));

  const glClassification = classifyGL({ genres, tags, description, title, altTitles });

  return {
    id: `MANGADEX-${m.id}`,
    providerId: m.id,
    provider: 'MANGADEX',
    title,
    altTitles,
    description,
    contentType,
    coverImage,
    genres,
    tags,
    status: mapMDStatusInternal(attrs.status),
    releaseYear: attrs.year,
    externalLinks: [
      { url: `https://mangadex.org/title/${m.id}`, site: 'MangaDex', type: 'METADATA' },
    ],
    relations: [],
    glClassification,
    sourceUrl: `https://mangadex.org/title/${m.id}`,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Search GL manga/manhwa on MangaDex. */
export async function mangadexSearchGL(filter: ContentFilter, page = 1, perPage = 24): Promise<PaginatedResult> {
  const offset = (page - 1) * perPage;

  // MangaDex uses order[field]=direction format
  const [orderField, orderDir] = mapMDSort(filter.sort).split(':');

  const params: Record<string, string | string[]> = {
    includedTags: GL_TAG_IDS,
    excludedTags: EXCLUDE_TAG_IDS,
    includes: ['cover_art'],
    limit: String(Math.min(perPage, 100)),
    offset: String(offset),
    availableTranslatedLanguage: ['en'],
    contentRating: ['safe', 'suggestive'],
    [`order[${orderField}]`]: orderDir || 'desc',
  };

  if (filter.query) params.title = filter.query;
  if (filter.status && filter.status !== 'ALL') {
    const s = mapMDStatus2(filter.status);
    if (s) params.status = [s];
  }
  if (filter.year) {
    params.year = String(filter.year);
  }

  // Map content type to MangaDex's originalLanguage filter
  if (filter.contentType && filter.contentType !== 'ALL') {
    if (filter.contentType === 'MANHWA') params.originalLanguage = ['ko'];
    else if (filter.contentType === 'MANHUA') params.originalLanguage = ['zh', 'zh-hk'];
    else if (filter.contentType === 'MANGA') params.originalLanguage = ['ja'];
  }

  try {
    const resp = await mdFetch<MDListResponse<MDManga>>('/manga', params);
    const items = resp.data
      .map(normalizeMangaDex)
      .filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification));

    return {
      items,
      page,
      perPage,
      total: resp.total,
      hasNextPage: offset + resp.limit < resp.total,
    };
  } catch {
    return { items: [], page, perPage, total: 0, hasNextPage: false };
  }
}

/** Get popular GL titles from MangaDex. */
export async function mangadexGetPopular(perPage = 24): Promise<ContentTitle[]> {
  try {
    const result = await mangadexSearchGL({}, 1, perPage);
    return result.items;
  } catch {
    return [];
  }
}

/** Get a MangaDex title by its UUID. */
export async function mangadexGetById(id: string): Promise<ContentTitle | null> {
  const mdId = id.replace('MANGADEX-', '');
  try {
    const resp = await mdFetch<{ result: string; data: MDManga }>(`/manga/${mdId}`, {
      includes: ['cover_art'],
    });
    return normalizeMangaDex(resp.data);
  } catch {
    return null;
  }
}

/** Fetch the chapter list for a MangaDex manga ID. */
/** Find a MangaDex manga ID by title or alternate titles. */
export async function mangadexFindMangaId(title: string, altTitles?: string[]): Promise<string | null> {
  const candidates: string[] = [];
  const addCandidate = (s?: string) => {
    if (!s) return;
    const clean = s.trim();
    if (clean && !candidates.includes(clean)) candidates.push(clean);
    const noParen = clean.split('(')[0].split(' - ')[0].trim();
    if (noParen && !candidates.includes(noParen)) candidates.push(noParen);
  };

  addCandidate(title);
  if (altTitles) {
    for (const alt of altTitles) addCandidate(alt);
  }

  for (const cand of candidates.slice(0, 4)) {
    try {
      const resp = await mdFetch<MDListResponse<MDManga>>('/manga', {
        title: cand,
        limit: '10',
        contentRating: ['safe', 'suggestive', 'erotica'],
      });

      const items = resp.data || [];
      if (items.length === 0) continue;

      for (const item of items) {
        const attrs = item.attributes;
        const allTitles = Object.values(attrs.title || {});
        if (Array.isArray(attrs.altTitles)) {
          for (const alt of attrs.altTitles) {
            allTitles.push(...Object.values(alt || {}));
          }
        }

        const lowerTitles = allTitles.map((t) => typeof t === 'string' ? t.toLowerCase().trim() : '');
        for (const c of candidates) {
          if (lowerTitles.includes(c.toLowerCase().trim())) {
            return item.id;
          }
        }
      }

      return items[0].id;
    } catch {
      continue;
    }
  }

  return null;
}

/** Fetch the chapter list for a MangaDex manga ID with deduplication and order. */
export async function mangadexGetChapters(mangaId: string, page = 1, perPage = 100): Promise<ChapterInfo[]> {
  const mdId = mangaId.replace('MANGADEX-', '');
  try {
    const resp = await mdFetch<MDListResponse<MDChapter>>(`/manga/${mdId}/feed`, {
      translatedLanguage: ['en'],
      'order[chapter]': 'asc',
      limit: String(Math.min(perPage, 500)),
      offset: String((page - 1) * perPage),
      contentRating: ['safe', 'suggestive', 'erotica'],
    });

    let data = resp.data || [];
    if (data.length === 0) {
      const fallbackResp = await mdFetch<MDListResponse<MDChapter>>(`/manga/${mdId}/feed`, {
        'order[chapter]': 'asc',
        limit: String(Math.min(perPage, 500)),
        contentRating: ['safe', 'suggestive', 'erotica'],
      });
      data = fallbackResp.data || [];
    }

    const chapterMap = new Map<number, ChapterInfo>();
    for (const ch of data) {
      const num = parseFloat(ch.attributes.chapter || '0');
      const isReadable = !ch.attributes.externalUrl && (ch.attributes.pages || 0) > 0;
      const chapterObj: ChapterInfo = {
        id: ch.id,
        number: num,
        title: ch.attributes.title || (num > 0 ? `Chapter ${num}` : 'Oneshot'),
        pageCount: ch.attributes.pages,
        readable: isReadable,
        externalUrl: ch.attributes.externalUrl || undefined,
      };

      const existing = chapterMap.get(num);
      if (!existing) {
        chapterMap.set(num, chapterObj);
      } else if (!existing.readable && isReadable) {
        chapterMap.set(num, chapterObj);
      } else if (existing.readable && isReadable && (chapterObj.pageCount || 0) > (existing.pageCount || 0)) {
        chapterMap.set(num, chapterObj);
      }
    }

    return Array.from(chapterMap.values()).sort((a, b) => a.number - b.number);
  } catch {
    return [];
  }
}

/** Get the page image URLs for a specific MangaDex chapter. */
export async function mangadexGetChapterPages(chapterId: string): Promise<string[]> {
  try {
    const resp = await mdFetch<{
      result: string;
      baseUrl: string;
      chapter: { hash: string; data: string[]; dataSaver: string[] };
    }>(`/at-home/server/${chapterId}`);

    return resp.chapter.data.map(
      (file) => `${resp.baseUrl}/data/${resp.chapter.hash}/${file}`
    );
  } catch {
    return [];
  }
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function mapMDSort(sort?: string): string {
  switch (sort) {
    case 'NEWEST': return 'latestUploadedChapter:desc';
    case 'YEAR': return 'year:desc';
    case 'TITLE': return 'title:asc';
    case 'SCORE': return 'rating:desc';
    case 'POPULARITY':
    default:
      return 'followedCount:desc';
  }
}

function mapMDStatus2(status?: string): string | null {
  switch (status) {
    case 'RELEASING': return 'ongoing';
    case 'FINISHED': return 'completed';
    case 'HIATUS': return 'hiatus';
    case 'CANCELLED': return 'cancelled';
    default: return null;
  }
}
