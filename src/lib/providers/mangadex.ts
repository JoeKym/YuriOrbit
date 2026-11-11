/**
 * MangaDex API provider — completely free, no API key required.
 * Used for manga/manhwa/manhua chapter lists and GL content discovery.
 * Docs: https://api.mangadex.org/docs/
 */
import type { ContentTitle, PaginatedResult, ContentFilter, ChapterInfo, Tag, MaturityLevel } from '@/types/content';
import { classifyGL, GL_ALLOWED_CLASSIFICATIONS } from './classify';
import { getMaturityLevel } from '@/lib/content/maturity-preference';
import { mangadexContentRatings } from '@/lib/content/maturity';

const env = (import.meta as { env?: Record<string, string> }).env || {};
const isBrowser = typeof window !== 'undefined';
// Route via same-origin Cloudflare Pages Functions / Vite proxy in the browser,
// or fallback to the direct MangaDex endpoint in Node/test environments.
const configuredUrl = env.VITE_MANGADEX_API_URL || '';
const isValidCustomUrl = configuredUrl && !configuredUrl.includes('onrender.com');
const rawBase = isValidCustomUrl ? configuredUrl : (isBrowser ? '/api/mangadex' : 'https://api.mangadex.org');
const MANGADEX_BASE = rawBase.replace(/\/+$/, '');

/**
 * Covers must be served from our own origin: Chrome's Opaque Response Blocking
 * drops direct <img> requests to uploads.mangadex.org (the response is treated
 * as opaque), which left MangaDex cards blank. `functions/api/mangadex`
 * forwards `/covers/*` to uploads.mangadex.org. In Node/test runs we still hit
 * the upstream host directly.
 */
const MANGADEX_COVERS_BASE = isBrowser
  ? `${MANGADEX_BASE}/covers`
  : 'https://uploads.mangadex.org/covers';

/**
 * Chapter pages go through our own image proxy. At-home URLs are short-lived
 * and point at rotating nodes, so the browser must never hotlink them.
 */
const MANGADEX_PAGE_BASE = isBrowser ? `${MANGADEX_BASE}/page` : '/api/mangadex/page';
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
    locale?: string;
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
  /** Cross-catalogue URLs MangaDex knows for this work (MAL, AniList, official). */
  links?: Record<string, string>;
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

/** MangaDex publishes its own four-step content rating; keep it verbatim. */
function mapMDMaturity(contentRating?: string): MaturityLevel {
  switch (contentRating) {
    case 'suggestive': return 'SUGGESTIVE';
    case 'erotica': return 'EROTICA';
    case 'pornographic': return 'PORNOGRAPHIC';
    default: return 'SAFE';
  }
}

// MangaDex tag IDs to exclude (BL)
const EXCLUDE_TAG_IDS = [
  '5920b825-4181-4a17-beeb-9baec0c9d5cc', // Boys' Love
];

const LATIN_LANGS = ['en', 'ja-ro', 'ko-ro', 'zh-ro', 'es-la', 'es', 'pt-br', 'fr', 'id'];

function getBestText(loc: MDLocalizedString | undefined): string {
  if (!loc) return '';
  for (const lang of LATIN_LANGS) {
    const value = loc[lang];
    if (value && value.trim()) return value.trim();
  }
  // Fall back to any latin-script value before jumping to CJK-only text.
  for (const value of Object.values(loc)) {
    if (value && /[a-zA-Z]/.test(value)) return value.trim();
  }
  return Object.values(loc).find(Boolean)?.trim() || '';
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
  const covers = relationships.filter((r) => r.type === 'cover_art' && r.attributes?.fileName);
  if (covers.length === 0) return undefined;

  // Prefer the English/localised cover, then the first one MangaDex returns.
  const cover = covers.find((c) => c.attributes?.locale === 'en') ?? covers[0];
  const fileName = cover.attributes?.fileName;
  if (!fileName) return undefined;

  // MangaDex cover filenames already include the extension; sizes are appended
  // (e.g. `abc.jpg.512.jpg`). Only produce URLs for actual image files so we
  // never render a non-image string in an <img> tag.
  if (!/\.(jpe?g|png|webp|gif)$/i.test(fileName)) return undefined;

  return `${MANGADEX_COVERS_BASE}/${mangaId}/${fileName}.512.jpg`;
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

  // Author/artist names are only present when the request asked for them.
  const creators = m.relationships
    .filter((r) => (r.type === 'author' || r.type === 'artist') && r.attributes?.name)
    .map((r) => r.attributes!.name!)
    .filter((name, index, all) => all.indexOf(name) === index);

  // MangaDex links back to MAL, AniList and official sources. Keeping them lets
  // the catalog recognise the same work under another provider's title.
  const providerLinks = Object.entries(attrs.links ?? {}).flatMap(([site, url]) =>
    typeof url === 'string' && /^https?:\/\//i.test(url)
      ? [{ url, site, type: 'METADATA' as const }]
      : []
  );

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
    creators: creators.length > 0 ? creators : undefined,
    maturityRating: mapMDMaturity(attrs.contentRating),
    status: mapMDStatusInternal(attrs.status),
    releaseYear: attrs.year,
    externalLinks: [
      { url: `https://mangadex.org/title/${m.id}`, site: 'MangaDex', type: 'METADATA' },
      ...providerLinks,
    ],
    relations: [],
    glClassification,
    sourceUrl: `https://mangadex.org/title/${m.id}`,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Search GL manga/manhwa on MangaDex. */
export async function mangadexSearchGL(
  filter: ContentFilter,
  page = 1,
  perPage = 24,
  onGlDropped?: (title: ContentTitle) => void
): Promise<PaginatedResult> {
  const limit = Math.min(perPage, 100);
  const offset = (page - 1) * limit;

  const isTextSearch = Boolean(filter.query && filter.query.trim());
  const [orderField, orderDir] = mapMDSort(filter.sort || (isTextSearch ? 'RELEVANCE' : undefined)).split(':');

  const params: Record<string, string | string[]> = {
    excludedTags: EXCLUDE_TAG_IDS,
    includes: ['cover_art', 'author', 'artist'],
    limit: String(limit),
    offset: String(offset),
    contentRating: mangadexContentRatings(getMaturityLevel()),
    [`order[${orderField || (isTextSearch ? 'relevance' : 'followedCount')}]`]: orderDir || 'desc',
  };

  // Apply the GL filter upstream, including for text searches. Filtering the
  // page locally afterwards made `total` and `hasNextPage` count results that
  // were then discarded, and filled pages with unrelated title matches.
  params.includedTags = GL_TAG_IDS;
  if (!isTextSearch) params.availableTranslatedLanguage = ['en'];

  if (filter.query) {
    params.title = filter.query.trim();
  }
  if (filter.status && filter.status !== 'ALL') {
    const s = mapMDStatus2(filter.status);
    if (s) params.status = [s];
  }
  if (filter.year) {
    params.year = String(filter.year);
  }

  if (filter.contentType && filter.contentType !== 'ALL') {
    if (filter.contentType === 'MANHWA') params.originalLanguage = ['ko'];
    else if (filter.contentType === 'MANHUA') params.originalLanguage = ['zh', 'zh-hk'];
    else if (filter.contentType === 'MANGA') params.originalLanguage = ['ja'];
  }

  try {
    let resp = await mdFetch<MDListResponse<MDManga>>('/manga', params);

    // MangaDex does not always stem "unni" to "unnie". Retry the spelling only
    // when the first query is empty, replacing the response so the reported
    // total still describes exactly the query whose rows are shown.
    if (isTextSearch && filter.query && /\bunni\b/i.test(filter.query) && (resp.data || []).length === 0) {
      const altParams = { ...params, title: filter.query.replace(/\bunni\b/gi, 'unnie') };
      const altResp = await mdFetch<MDListResponse<MDManga>>('/manga', altParams).catch(() => null);
      if (altResp) resp = altResp;
    }

    const normalized = resp.data.map(normalizeMangaDex);
    let items = normalized.filter((t) => {
      if (GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification)) return true;
      onGlDropped?.(t);
      return false;
    });

    if (isTextSearch && filter.query) {
      const qNorm = filter.query.toLowerCase().replace(/[^a-z0-9]/g, '');
      const qWords = filter.query.toLowerCase().split(/\s+/).filter(Boolean);
      items.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const titleB = (b.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const exactA = titleA.includes(qNorm) || qNorm.includes(titleA);
        const exactB = titleB.includes(qNorm) || qNorm.includes(titleB);
        if (exactA && !exactB) return -1;
        if (!exactA && exactB) return 1;

        const wordsA = qWords.filter((w) => (a.title || '').toLowerCase().includes(w)).length;
        const wordsB = qWords.filter((w) => (b.title || '').toLowerCase().includes(w)).length;
        return wordsB - wordsA;
      });
    }

    return {
      items,
      page,
      perPage: limit,
      total: resp.total,
      hasNextPage: offset + resp.limit < resp.total,
    };
  } catch {
    return { items: [], page, perPage, total: 0, hasNextPage: false };
  }
}

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
      includes: ['cover_art', 'author', 'artist'],
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
        contentRating: mangadexContentRatings(getMaturityLevel()),
        includes: ['cover_art', 'author', 'artist'],
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
      contentRating: mangadexContentRatings(getMaturityLevel()),
    });

    let data = resp.data || [];
    if (data.length === 0) {
      const fallbackResp = await mdFetch<MDListResponse<MDChapter>>(`/manga/${mdId}/feed`, {
        'order[chapter]': 'asc',
        limit: String(Math.min(perPage, 500)),
        contentRating: mangadexContentRatings(getMaturityLevel()),
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

export type ChapterImageQuality = 'data-saver' | 'data';

/**
 * Page-image URL lists are stable proxy URLs, so cache them for the session's
 * browsing window. This lets a prefetched next chapter render instantly.
 * The cache is keyed by quality because the two variants use different files.
 */
const PAGE_URL_TTL = 5 * 60 * 1000;
const pageUrlCache = new Map<string, { at: number; urls: string[] }>();

function pageCacheKey(chapterId: string, quality: ChapterImageQuality): string {
  return `${chapterId}:${quality}`;
}

export function getCachedChapterPages(
  chapterId: string,
  quality: ChapterImageQuality = 'data-saver'
): string[] | null {
  const key = pageCacheKey(chapterId, quality);
  const cached = pageUrlCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.at > PAGE_URL_TTL) {
    pageUrlCache.delete(key);
    return null;
  }
  return cached.urls;
}

function warmImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    } catch {
      resolve();
    }
  });
}

const prefetching = new Map<string, Promise<void>>();

/**
 * Warm chapter pages in the background so advancing is instant.
 * Images are fetched in small batches through our own proxy, which keeps the
 * upstream node within its rate limits.
 *
 * Pass `maxPages` to warm only the first few pages, which lets the reader
 * start on the next chapter before the current one has finished loading.
 * Warming those pages again in a later call is a browser-cache hit.
 */
export type PrefetchProgress = (warmed: number, total: number) => void;

export interface PrefetchChapterOptions {
  quality?: ChapterImageQuality;
  maxPages?: number;
  onProgress?: PrefetchProgress;
}

const progressListeners = new Map<string, Set<PrefetchProgress>>();

export function prefetchChapterPages(
  chapterId: string,
  options: PrefetchChapterOptions = {}
): Promise<void> {
  if (!isBrowser || !chapterId) return Promise.resolve();
  const { quality = 'data-saver', maxPages, onProgress } = options;
  const key = `${chapterId}:${quality}:${maxPages && maxPages > 0 ? maxPages : 'all'}`;

  if (onProgress) {
    const listeners = progressListeners.get(key) ?? new Set<PrefetchProgress>();
    listeners.add(onProgress);
    progressListeners.set(key, listeners);
  }

  const running = prefetching.get(key);
  if (running) return running;

  const notify = (warmed: number, total: number) => {
    const listeners = progressListeners.get(key);
    if (!listeners) return;
    for (const listener of listeners) {
      try {
        listener(warmed, total);
      } catch {
        /* A broken listener must never stop the prefetch. */
      }
    }
  };

  const task = (async () => {
    const all = await mangadexGetChapterPages(chapterId, quality);
    const urls = maxPages && maxPages > 0 ? all.slice(0, maxPages) : all;
    const total = urls.length;
    notify(0, total);
    for (let i = 0; i < urls.length; i += 3) {
      await Promise.all(urls.slice(i, i + 3).map(warmImage));
      notify(Math.min(i + 3, total), total);
    }
  })()
    .catch(() => undefined)
    .finally(() => {
      prefetching.delete(key);
      progressListeners.delete(key);
    });

  prefetching.set(key, task);
  return task;
}

/** Get the page image URLs for a specific MangaDex chapter. */
export async function mangadexGetChapterPages(
  chapterId: string,
  quality: ChapterImageQuality = 'data-saver'
): Promise<string[]> {
  const cached = getCachedChapterPages(chapterId, quality);
  if (cached) return cached;

  try {
    const resp = await mdFetch<{
      result: string;
      baseUrl: string;
      chapter: { hash: string; data: string[]; dataSaver: string[] };
    }>(`/at-home/server/${chapterId}`);

    // Data-saver pages are much smaller and load faster; originals are offered
    // as an opt-in. Each variant falls back to the other if it is unavailable.
    const hasSaver = (resp.chapter.dataSaver?.length ?? 0) > 0;
    const hasOriginal = (resp.chapter.data?.length ?? 0) > 0;
    const useSaver = quality === 'data-saver' ? hasSaver : !hasOriginal && hasSaver;
    const files = useSaver ? resp.chapter.dataSaver ?? [] : resp.chapter.data ?? [];
    const urls = files.map(
      (file) =>
        `${MANGADEX_PAGE_BASE}?chapter=${encodeURIComponent(chapterId)}&hash=${encodeURIComponent(
          resp.chapter.hash
        )}&file=${encodeURIComponent(file)}${useSaver ? '&saver=1' : ''}`
    );
    if (urls.length > 0) {
      pageUrlCache.set(pageCacheKey(chapterId, quality), { at: Date.now(), urls });
    }
    return urls;
  } catch {
    return [];
  }
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function mapMDSort(sort?: string): string {
  switch (sort) {
    case 'NEWEST': return 'latestUploadedChapter:desc';
    case 'UPDATED_AT': return 'updatedAt:desc';
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
