/**
 * Unified provider index for YuriOrbit.
 * Aggregates content from AniList, Jikan (MAL), MangaDex, and TMDB.
 * All providers are free and require no authentication.
 */
import type { ContentTitle, ContentFilter, PaginatedResult } from '@/types/content';
import {
  searchGLTitles as anilistSearch,
  getTrendingGL as anilistTrending,
  getPopularGL as anilistPopular,
  getRecentGL as anilistRecent,
  getCompletedGL as anilistCompleted,
  getGLByGenre as anilistByGenre,
  getGLByContentType as anilistByType,
  getTitleById as anilistById,
} from './anilist';
import { jikanSearchGL, jikanGetPopular, jikanGetById } from './jikan';
import { mangadexSearchGL, mangadexGetPopular, mangadexGetById, mangadexGetChapters, mangadexGetChapterPages, mangadexFindMangaId } from './mangadex';
import { tmdbGetGLMovies, tmdbGetGLDramas, tmdbGetById, tmdbSearchGL } from './tmdb';
import { GL_ALLOWED_CLASSIFICATIONS } from './classify';
import { getCached, setCached, clearProviderCache } from './cache';

export { classifyGL, filterGL, GL_ALLOWED_CLASSIFICATIONS } from './classify';
export { normalizeAniList } from './normalize';
export { getCached, setCached, clearProviderCache } from './cache';

// Re-export chapter helpers from MangaDex
export { mangadexGetChapters, mangadexGetChapterPages, mangadexFindMangaId };

/** De-duplicate titles from multiple providers using a stable key. */
function dedupe(titles: ContentTitle[]): ContentTitle[] {
  const seen = new Set<string>();
  return titles.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

// ─── Trending / Popular ────────────────────────────────────────────────────────

export async function getTrendingGL(perPage = 20): Promise<ContentTitle[]> {
  const cacheKey = `trending_${perPage}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const [anilist, jikan] = await Promise.allSettled([
    anilistTrending(perPage),
    jikanGetPopular(perPage),
  ]);

  const results: ContentTitle[] = [];
  if (anilist.status === 'fulfilled') results.push(...anilist.value);
  if (jikan.status === 'fulfilled') results.push(...jikan.value);

  const final = dedupe(results)
    .filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification))
    .slice(0, perPage * 2);

  if (final.length > 0) setCached(cacheKey, final);
  return final;
}

export async function getPopularGL(perPage = 50): Promise<ContentTitle[]> {
  const cacheKey = `popular_${perPage}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const [anilist, jikan, mangadex] = await Promise.allSettled([
    anilistPopular(perPage),
    jikanGetPopular(Math.min(perPage, 25)),
    mangadexGetPopular(Math.min(perPage, 25)),
  ]);

  const results: ContentTitle[] = [];
  if (anilist.status === 'fulfilled') results.push(...anilist.value);
  if (jikan.status === 'fulfilled') results.push(...jikan.value);
  if (mangadex.status === 'fulfilled') results.push(...mangadex.value);

  const final = dedupe(results)
    .filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification))
    .slice(0, perPage * 2);

  if (final.length > 0) setCached(cacheKey, final);
  return final;
}

export async function getRecentGL(perPage = 20): Promise<ContentTitle[]> {
  const cacheKey = `recent_${perPage}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const results = await anilistRecent(perPage);
  if (results.length > 0) setCached(cacheKey, results);
  return results;
}

export async function getCompletedGL(perPage = 20): Promise<ContentTitle[]> {
  const cacheKey = `completed_${perPage}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const results = await anilistCompleted(perPage);
  if (results.length > 0) setCached(cacheKey, results);
  return results;
}

export async function getGLByGenre(genre: string, perPage = 20): Promise<ContentTitle[]> {
  const cacheKey = `genre_${genre}_${perPage}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  const results = await anilistByGenre(genre, perPage);
  if (results.length > 0) setCached(cacheKey, results);
  return results;
}

export async function getGLByContentType(contentType: ContentTitle['contentType'], perPage = 30): Promise<ContentTitle[]> {
  const cacheKey = `type_${contentType}_${perPage}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return cached;

  // For movies/dramas pull from TMDB with AniList fallback; for manga/manhwa/manhua use AniList
  let results: ContentTitle[] = [];
  if (contentType === 'MOVIE') {
    const tmdbResults = await tmdbGetGLMovies().catch(() => []);
    if (tmdbResults.length > 0) {
      results = tmdbResults;
    } else {
      results = await anilistByType('MOVIE', perPage);
    }
  } else if (contentType === 'TV' || contentType === 'DRAMA') {
    const tmdbResults = await tmdbGetGLDramas().catch(() => []);
    if (tmdbResults.length > 0) {
      results = tmdbResults;
    } else {
      results = await anilistByType('TV', perPage);
    }
  } else {
    results = await anilistByType(contentType, perPage);
  }

  if (results.length > 0) setCached(cacheKey, results);
  return results;
}

// ─── Search (unified across providers) ────────────────────────────────────────

export async function searchGLTitles(filter: ContentFilter, page = 1, perPage = 20): Promise<PaginatedResult> {
  const contentType = filter.contentType;

  const promises: Promise<PaginatedResult>[] = [
    anilistSearch(filter, page, perPage),
    mangadexSearchGL(filter, page, perPage),
    jikanSearchGL(filter, page, perPage),
  ];

  if (contentType === 'MOVIE' || contentType === 'TV' || contentType === 'DRAMA' || !contentType || contentType === 'ALL') {
    promises.push(tmdbSearchGL(filter, page));
  }

  const results = await Promise.allSettled(promises);

  const items: ContentTitle[] = [];
  let total = 0;
  let hasNextPage = false;

  for (const r of results) {
    if (r.status === 'fulfilled') {
      items.push(...r.value.items);
      total = Math.max(total, r.value.total || 0);
      hasNextPage = hasNextPage || r.value.hasNextPage;
    }
  }

  const deduped = dedupe(items).filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification));

  return {
    items: deduped.slice(0, perPage * 3),
    page,
    perPage,
    total,
    hasNextPage,
  };
}

// ─── Single Title Lookup ───────────────────────────────────────────────────────

export async function getTitleById(id: string): Promise<ContentTitle | null> {
  const cacheKey = `title_${id}`;
  const cached = getCached<ContentTitle>(cacheKey);
  if (cached) return cached;

  let result: ContentTitle | null = null;
  if (id.startsWith('ANILIST-')) result = await anilistById(id);
  else if (id.startsWith('JIKAN-')) result = await jikanGetById(id);
  else if (id.startsWith('MANGADEX-')) result = await mangadexGetById(id);
  else if (id.startsWith('TMDB-')) result = await tmdbGetById(id);
  else result = await anilistById(id);

  if (result) setCached(cacheKey, result);
  return result;
}
