/**
 * Unified provider index for YuriVerse.
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
import { mangadexSearchGL, mangadexGetPopular, mangadexGetById, mangadexGetChapters, mangadexGetChapterPages } from './mangadex';
import { tmdbGetGLMovies, tmdbGetGLDramas, tmdbGetById } from './tmdb';
import { GL_ALLOWED_CLASSIFICATIONS } from './classify';

export { classifyGL, filterGL, GL_ALLOWED_CLASSIFICATIONS } from './classify';
export { normalizeAniList } from './normalize';

// Re-export chapter helpers from MangaDex
export { mangadexGetChapters, mangadexGetChapterPages };

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
  const [anilist, jikan] = await Promise.allSettled([
    anilistTrending(perPage),
    jikanGetPopular(perPage),
  ]);

  const results: ContentTitle[] = [];
  if (anilist.status === 'fulfilled') results.push(...anilist.value);
  if (jikan.status === 'fulfilled') results.push(...jikan.value);

  return dedupe(results)
    .filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification))
    .slice(0, perPage * 2);
}

export async function getPopularGL(perPage = 50): Promise<ContentTitle[]> {
  const [anilist, jikan, mangadex] = await Promise.allSettled([
    anilistPopular(perPage),
    jikanGetPopular(Math.min(perPage, 25)),
    mangadexGetPopular(Math.min(perPage, 25)),
  ]);

  const results: ContentTitle[] = [];
  if (anilist.status === 'fulfilled') results.push(...anilist.value);
  if (jikan.status === 'fulfilled') results.push(...jikan.value);
  if (mangadex.status === 'fulfilled') results.push(...mangadex.value);

  return dedupe(results)
    .filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification))
    .slice(0, perPage * 2);
}

export async function getRecentGL(perPage = 20): Promise<ContentTitle[]> {
  return anilistRecent(perPage);
}

export async function getCompletedGL(perPage = 20): Promise<ContentTitle[]> {
  return anilistCompleted(perPage);
}

export async function getGLByGenre(genre: string, perPage = 20): Promise<ContentTitle[]> {
  return anilistByGenre(genre, perPage);
}

export async function getGLByContentType(contentType: ContentTitle['contentType'], perPage = 30): Promise<ContentTitle[]> {
  // For movies/dramas pull from TMDB; for manga/manhwa/manhua use AniList + MangaDex
  if (contentType === 'MOVIE') {
    return tmdbGetGLMovies();
  }
  if (contentType === 'TV') {
    return tmdbGetGLDramas();
  }
  return anilistByType(contentType, perPage);
}

// ─── Search (unified across providers) ────────────────────────────────────────

export async function searchGLTitles(filter: ContentFilter, page = 1, perPage = 20): Promise<PaginatedResult> {
  const contentType = filter.contentType;

  // Route movies/dramas to TMDB
  if (contentType === 'MOVIE' || contentType === 'TV' || contentType === 'DRAMA') {
    // TMDB doesn't export searchGL currently; fall through to AniList + MangaDex
  }

  // For manga/manhwa/manhua or general search, aggregate AniList + MangaDex + Jikan
  const [anilistResult, mangadexResult, jikanResult] = await Promise.allSettled([
    anilistSearch(filter, page, perPage),
    mangadexSearchGL(filter, page, perPage),
    jikanSearchGL(filter, page, perPage),
  ]);

  const items: ContentTitle[] = [];
  let total = 0;
  let hasNextPage = false;

  if (anilistResult.status === 'fulfilled') {
    items.push(...anilistResult.value.items);
    total = Math.max(total, anilistResult.value.total || 0);
    hasNextPage = hasNextPage || anilistResult.value.hasNextPage;
  }
  if (mangadexResult.status === 'fulfilled') {
    items.push(...mangadexResult.value.items);
    total = Math.max(total, mangadexResult.value.total || 0);
    hasNextPage = hasNextPage || mangadexResult.value.hasNextPage;
  }
  if (jikanResult.status === 'fulfilled') {
    items.push(...jikanResult.value.items);
    total = Math.max(total, jikanResult.value.total || 0);
    hasNextPage = hasNextPage || jikanResult.value.hasNextPage;
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
  if (id.startsWith('ANILIST-')) return anilistById(id);
  if (id.startsWith('JIKAN-')) return jikanGetById(id);
  if (id.startsWith('MANGADEX-')) return mangadexGetById(id);
  if (id.startsWith('TMDB-')) return tmdbGetById(id);

  // Unknown prefix — try AniList as fallback
  return anilistById(id);
}
