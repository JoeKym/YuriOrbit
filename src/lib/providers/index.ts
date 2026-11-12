/**
 * Unified provider index for YuriOrbit.
 * Aggregates content from AniList, MangaDex, and TMDB.
 * All providers are free and require no authentication.
 *
 * Every list that leaves this module is canonicalized: duplicates coming from
 * two upstream providers are merged, and each title carries a YuriOrbit slug id
 * (see `src/lib/catalog/canonical.ts`) instead of a provider id.
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
  searchGLByCreator as anilistByCreator,
} from './anilist';
import {
  mangadexSearchGL,
  mangadexGetPopular,
  mangadexGetById,
  mangadexGetChapters,
  mangadexGetChapterPages,
  mangadexFindMangaId,
} from './mangadex';
import { tmdbGetGLMovies, tmdbGetGLDramas, tmdbGetById, tmdbSearchGL, tmdbSearchGLByCreator } from './tmdb';
import { GL_ALLOWED_CLASSIFICATIONS } from './classify';
import { getCached, setCached, clearProviderCache } from './cache';
import { getMaturityLevel } from '@/lib/content/maturity-preference';
import { filterByMaturity } from '@/lib/content/maturity';
import { canonicalizeTitle, canonicalizeTitles } from '@/lib/catalog/canonical';
import { findRegisteredBySlug, getRegisteredTitle, registerTitles } from '@/lib/catalog/registry';
import { fetchContentModeration, filterModeratedTitles } from '@/lib/moderation/contentModeration';
import { isLegacyProviderId, slugToQuery, slugifyTitle, titleKey } from '@/lib/catalog/identity';
import { getSavedRef, rememberSavedRef } from '@/lib/content/saved-refs';
import { canonicalSlugFor, rememberSlugAlias } from '@/lib/catalog/slug-redirects';

export { classifyGL, filterGL, glConfidence, GL_ALLOWED_CLASSIFICATIONS } from './classify';
export { normalizeAniList } from './normalize';
export { getCached, setCached, clearProviderCache } from './cache';
export {
  tmdbGetWatchProviders,
  tmdbGetTrailerKey,
  tmdbPreferredRegion,
} from './tmdb';
export type { TmdbWatchProvider } from './tmdb';

// Re-export chapter helpers from MangaDex
export {
  mangadexGetChapters,
  mangadexGetChapterPages,
  mangadexFindMangaId,
  getCachedChapterPages,
  prefetchChapterPages,
} from './mangadex';
export type { ChapterImageQuality } from './mangadex';

function isGL(title: ContentTitle): boolean {
  return GL_ALLOWED_CLASSIFICATIONS.includes(title.glClassification);
}

/**
 * Everything that leaves this module goes through the visitor's maturity
 * filter, so no page has to remember to apply it.
 */
function visible(
  titles: ContentTitle[],
  onDropped?: (title: ContentTitle) => void
): ContentTitle[] {
  return filterByMaturity(titles, getMaturityLevel(), onDropped);
}

/** Cache keys carry the maturity level: queries differ per level (adult flags). */
function levelKey(): string {
  return getMaturityLevel();
}

async function withoutBlocked<T extends ContentTitle>(
  titles: T[],
  onHidden?: (title: T) => void
): Promise<T[]> {
  try {
    const map = await fetchContentModeration();
    return filterModeratedTitles(titles, map, onHidden) as T[];
  } catch {
    return titles;
  }
}

// ─── Trending / Popular ────────────────────────────────────────────────────────

export async function getTrendingGL(perPage = 20): Promise<ContentTitle[]> {
  const cacheKey = `trending_${perPage}_${levelKey()}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return withoutBlocked(cached);

  const [anilist, mangadex] = await Promise.allSettled([
    anilistTrending(perPage),
    mangadexGetPopular(perPage),
  ]);

  const results: ContentTitle[] = [];
  if (anilist.status === 'fulfilled') results.push(...anilist.value);
  if (mangadex.status === 'fulfilled') results.push(...mangadex.value);

  const final = await withoutBlocked(visible(canonicalizeTitles(results.filter(isGL)).slice(0, perPage * 2)));

  if (final.length > 0) setCached(cacheKey, final);
  return final;
}

export async function getPopularGL(perPage = 50): Promise<ContentTitle[]> {
  const cacheKey = `popular_${perPage}_${levelKey()}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return withoutBlocked(cached);

  const [anilist, mangadex] = await Promise.allSettled([
    anilistPopular(perPage),
    mangadexGetPopular(Math.min(perPage, 35)),
  ]);

  const results: ContentTitle[] = [];
  if (anilist.status === 'fulfilled') results.push(...anilist.value);
  if (mangadex.status === 'fulfilled') results.push(...mangadex.value);

  const final = await withoutBlocked(visible(canonicalizeTitles(results.filter(isGL)).slice(0, perPage * 2)));

  if (final.length > 0) setCached(cacheKey, final);
  return final;
}

export async function getRecentGL(perPage = 20): Promise<ContentTitle[]> {
  const cacheKey = `recent_${perPage}_${levelKey()}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return withoutBlocked(cached);

  const results = await anilistRecent(perPage);
  const final = await withoutBlocked(visible(canonicalizeTitles(results.filter(isGL))));

  if (final.length > 0) setCached(cacheKey, final);
  return final;
}

export async function getCompletedGL(perPage = 20): Promise<ContentTitle[]> {
  const cacheKey = `completed_${perPage}_${levelKey()}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return withoutBlocked(cached);

  const results = await anilistCompleted(perPage);
  const final = await withoutBlocked(visible(canonicalizeTitles(results.filter(isGL))));

  if (final.length > 0) setCached(cacheKey, final);
  return final;
}

export async function getGLByGenre(genre: string, perPage = 20): Promise<ContentTitle[]> {
  const cacheKey = `genre_${genre}_${perPage}_${levelKey()}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return withoutBlocked(cached);

  const results = await anilistByGenre(genre, perPage);
  const final = await withoutBlocked(visible(canonicalizeTitles(results.filter(isGL))));

  if (final.length > 0) setCached(cacheKey, final);
  return final;
}

export async function getGLByContentType(
  contentType: ContentTitle['contentType'],
  perPage = 20
): Promise<ContentTitle[]> {
  const cacheKey = `type_${contentType}_${perPage}_${levelKey()}`;
  const cached = getCached<ContentTitle[]>(cacheKey);
  if (cached && cached.length > 0) return withoutBlocked(cached);

  // A rail asks for a fixed window, but classification happens afterwards. Ask
  // for a wider slice so rows that get dropped (weak Yuri tag, moderation,
  // maturity) cannot push qualifying titles off the rail — without this, raising
  // the content filter *shrank* the Manhwa rail, because adult titles took the
  // same slots while failing classification.
  const fetchSize = Math.min(perPage * 3, 60);

  let results: ContentTitle[];
  if (contentType === 'MOVIE') {
    const tmdbResults = await tmdbGetGLMovies().catch(() => []);
    results = tmdbResults.length > 0 ? tmdbResults : await anilistByType('MOVIE', fetchSize);
  } else if (contentType === 'TV' || contentType === 'DRAMA') {
    const tmdbResults = await tmdbGetGLDramas().catch(() => []);
    results = tmdbResults.length > 0 ? tmdbResults : await anilistByType('TV', fetchSize);
  } else {
    results = await anilistByType(contentType, fetchSize);
  }

  const final = await withoutBlocked(visible(canonicalizeTitles(results.filter(isGL))));
  if (final.length > 0) setCached(cacheKey, final);
  return final.slice(0, perPage);
}

// ─── Search (unified across providers) ────────────────────────────────────────

/**
 * Formats whose upstream queries are precise enough to enforce locally.
 *
 * `MANGA` is the reason this exists: AniList answers it with
 * `type: MANGA, format_in: [MANGA, ONE_SHOT]` and no country filter, then our
 * normaliser relabels Korean results MANHWA and Chinese ones MANHUA. MangaDex
 * does add `originalLanguage: ['ja']`, but the merged list was never checked
 * against the requested format, so a "Manga" page showed manhwa and manhua.
 *
 * `WEBTOON` is deliberately absent: no provider returns that label (AniList has
 * no webtoon format, so its results normalise to MANGA/MANHWA/MANHUA), and a
 * strict check would empty the page.
 */
const ENFORCED_CONTENT_TYPES = new Set<ContentTitle['contentType']>([
  'MANGA',
  'MANHWA',
  'MANHUA',
  'LIGHT_NOVEL',
  'MOVIE',
  'TV',
  'DRAMA',
]);

function matchesContentType(
  title: ContentTitle,
  wanted: ContentTitle['contentType']
): boolean {
  if (title.contentType === wanted) return true;
  // TMDB does not separate live-action drama from TV series, so the two labels
  // are interchangeable for screen formats.
  const screenPair =
    (wanted === 'TV' || wanted === 'DRAMA') &&
    (title.contentType === 'TV' || title.contentType === 'DRAMA');
  return screenPair;
}

export type SearchFilterDropReason = 'MATURITY' | 'MODERATION';
export type SearchFilterDropReporter = (title: ContentTitle, reason: SearchFilterDropReason) => void;

export async function searchGLTitles(
  filter: ContentFilter,
  page = 1,
  perPage = 20,
  onGlDropped?: (title: ContentTitle) => void,
  onFilterDropped?: SearchFilterDropReporter
): Promise<PaginatedResult> {
  const contentType = filter.contentType;
  const isScreen = contentType === 'MOVIE' || contentType === 'TV' || contentType === 'DRAMA';

  // MangaDex only indexes comics, so it stays out of film/series and novel queries.
  const useMangaDex = !isScreen && contentType !== 'LIGHT_NOVEL';
  const promises: Promise<PaginatedResult>[] = [anilistSearch(filter, page, perPage)];
  if (useMangaDex) {
    promises.push(mangadexSearchGL(filter, page, perPage, onGlDropped));
  }

  if (isScreen || !contentType || contentType === 'ALL') {
    promises.push(
      tmdbSearchGL(filter, page, onGlDropped, (title) =>
        onFilterDropped?.(title, 'MATURITY')
      )
    );
  }

  const results = await Promise.allSettled(promises);

  const items: ContentTitle[] = [];
  let total = 0;
  let hasNextPage = false;

  for (const r of results) {
    if (r.status === 'fulfilled') {
      items.push(...r.value.items);
      // A capped total (AniList stops at 5000) is a floor, not a count, so it
      // must not win the max or the rail would read the same number everywhere.
      if (!r.value.totalCapped) total = Math.max(total, r.value.total || 0);
      hasNextPage = hasNextPage || r.value.hasNextPage;
    }
  }

  const glItems = items.filter((title) => {
    if (isGL(title)) return true;
    onGlDropped?.(title);
    return false;
  });

  // Drop rows a provider returned outside the format that was asked for, before
  // dedupe decides which source represents a title.
  const typedItems =
    filter.contentType && filter.contentType !== 'ALL' && ENFORCED_CONTENT_TYPES.has(filter.contentType)
      ? glItems.filter((title) => matchesContentType(title, filter.contentType as ContentTitle['contentType']))
      : glItems;

  // Cross-provider duplicates collapse into one canonical entry here.
  const mature = visible(canonicalizeTitles(typedItems), (title) =>
    onFilterDropped?.(title, 'MATURITY')
  );
  const deduped = await withoutBlocked(mature, (title) =>
    onFilterDropped?.(title, 'MODERATION')
  );

  return {
    items: deduped,
    page,
    perPage,
    total,
    hasNextPage,
  };
}

// ─── Creator Lookup ──────────────────────────────────────────────────────────

export interface CreatorGroup {
  name: string;
  titles: ContentTitle[];
}

/**
 * Search by creator across AniList (authors, artists, directors of anime) and
 * TMDB (live-action writers, directors, cast). Results are grouped per person.
 */
export async function getCreatorTitles(query: string, perPage = 3): Promise<CreatorGroup[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const [anilist, tmdb] = await Promise.allSettled([
    anilistByCreator(trimmed, perPage),
    tmdbSearchGLByCreator(trimmed),
  ]);

  const groups: CreatorGroup[] = [];
  const seenNames = new Set<string>();

  const push = async (name: string, titles: ContentTitle[]) => {
    const key = name.toLowerCase();
    if (seenNames.has(key)) return;
    const canonical = await withoutBlocked(visible(canonicalizeTitles(titles.filter(isGL))));
    if (canonical.length === 0) return;
    seenNames.add(key);
    groups.push({ name, titles: canonical });
  };

  if (anilist.status === 'fulfilled') {
    for (const match of anilist.value) await push(match.name, match.titles);
  }
  if (tmdb.status === 'fulfilled') {
    for (const match of tmdb.value) await push(match.name, match.titles);
  }

  return groups;
}

export const searchGLByCreator = getCreatorTitles;

/**
 * Fast in-memory lookup. When the user navigates from a card or search dropdown,
 * the title was already registered in the registry during list rendering; returning
 * it directly avoids a redundant network round-trip. Returns null to fall
 * back to a normal text search.
 */
export function resolveDirectTitle(raw: string): ContentTitle | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const registered = getRegisteredTitle(trimmed) ?? findRegisteredBySlug(trimmed);
  if (registered) return registered;

  return null;
}

// ─── Single Title Lookup ───────────────────────────────────────────────────────

async function fetchProviderTitle(id: string): Promise<ContentTitle | null> {
  if (id.startsWith('ANILIST-')) return anilistById(id);
  if (id.startsWith('MANGADEX-')) return mangadexGetById(id);
  if (id.startsWith('TMDB-')) return tmdbGetById(id);
  return anilistById(id);
}

/**
 * Fetch the exact upstream record behind a saved title. The library stores the
 * provider and its id, so a renamed or re-merged title still opens instead of
 * falling through to a name search that may no longer match.
 */
/**
 * Remember how a slug resolved so a later visit — including a library entry
 * saved before provider ids existed — can skip the name search entirely.
 */
function rememberResolvedRef(titleId: string, title: ContentTitle): void {
  if (!title.providerId) return;
  rememberSavedRef({
    titleId,
    provider: title.provider,
    providerId: title.providerId,
    contentType: title.contentType,
    updatedAt: new Date().toISOString(),
  });
}

async function fetchSavedProviderTitle(slug: string): Promise<ContentTitle | null> {
  const ref = getSavedRef(slug);
  if (!ref?.providerId) return null;

  const id = ref.providerId;
  try {
    if (ref.provider === 'ANILIST') {
      return await anilistById(`ANILIST-${id.replace('ANILIST-', '')}`);
    }
    if (ref.provider === 'MANGADEX') {
      return await mangadexGetById(`MANGADEX-${id.replace('MANGADEX-', '')}`);
    }
    if (ref.provider === 'TMDB') {
      const mediaType = ref.contentType === 'MOVIE' ? 'movie' : 'tv';
      return await tmdbGetById(`TMDB-${mediaType}-${id.replace(/^TMDB-(movie|tv)-/, '')}`);
    }
  } catch {
    return null;
  }
  return null;
}

/** Re-resolve a slug id against the providers (used for direct/deep links). */
async function resolveSlug(slug: string): Promise<ContentTitle | null> {
  const withYear = /^(.*)-(\d{4})$/.exec(slug);
  const baseSlug = withYear ? withYear[1] : slug.replace(/-\d+$/, '');
  const wantedYear = withYear ? Number(withYear[2]) : undefined;

  const query = slugToQuery(baseSlug);
  if (!query) return null;

  const result = await searchGLTitles({ query }, 1, 30);

  const matchesSlug = (item: ContentTitle) =>
    slugifyTitle(item.title) === baseSlug ||
    item.altTitles.some((alt) => slugifyTitle(alt) === baseSlug);

  const matchingTitle = result.items.filter(matchesSlug);
  const match =
    (wantedYear ? matchingTitle.find((item) => item.releaseYear === wantedYear) : undefined) ??
    matchingTitle[0] ??
    result.items.find((item) => item.id === slug);

  if (match) {
    // Keep the canonical id: pages redirect an old alias to it, and the shared
    // table records the mapping so other devices do the same.
    if (match.id !== slug) {
      rememberSlugAlias(slug, match.id, match.provider, match.providerId);
    }
    registerTitles([match]);
    rememberResolvedRef(slug, match);
    rememberResolvedRef(match.id, match);
    return match;
  }

  const wantedKey = titleKey(query);
  const loose = result.items.find(
    (item) =>
      titleKey(item.title) === wantedKey ||
      item.altTitles.some((alt) => titleKey(alt) === wantedKey)
  );
  if (loose) {
    if (loose.id !== slug) {
      rememberSlugAlias(slug, loose.id, loose.provider, loose.providerId);
    }
    registerTitles([loose]);
    rememberResolvedRef(slug, loose);
    rememberResolvedRef(loose.id, loose);
    return loose;
  }

  return null;
}

/**
 * Resolves a title by ID. Handles YuriOrbit slugs,
 * legacy provider IDs (`ANILIST-12345`, `MANGADEX-uuid`, `TMDB-movie-999`), and title names.
 */
export async function getTitleById(id: string): Promise<ContentTitle | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;

  const cached = getRegisteredTitle(trimmed) ?? findRegisteredBySlug(trimmed);
  if (cached) return cached;

  if (isLegacyProviderId(trimmed)) {
    const raw = await fetchProviderTitle(trimmed);
    if (!raw) return null;
    const canonical = canonicalizeTitle(raw);
    registerTitles([canonical]);
    rememberResolvedRef(trimmed, canonical);
    rememberResolvedRef(canonical.id, canonical);
    return canonical;
  }

  // A merged story may have moved to a canonical slug on another device.
  const canonicalSlug = await canonicalSlugFor(trimmed);
  if (canonicalSlug !== trimmed) {
    const redirected =
      getRegisteredTitle(canonicalSlug) ?? findRegisteredBySlug(canonicalSlug);
    if (redirected) return redirected;

    const resolved = await resolveSlug(canonicalSlug);
    if (resolved) return resolved;
  }

  // Saved titles carry the upstream reference, so resolve them exactly before
  // falling back to a slug/name search.
  const saved = await fetchSavedProviderTitle(trimmed);
  if (saved) {
    const canonical = canonicalizeTitle(saved);
    // The saved entry may still use the title's pre-rename slug. Publish the
    // mapping so other devices follow it too, then keep serving the requested
    // id for this render (the page redirects once the alias is known).
    if (canonical.id !== trimmed) {
      rememberSlugAlias(trimmed, canonical.id, canonical.provider, canonical.providerId);
    }
    const resolved = { ...canonical, id: trimmed };
    registerTitles([resolved]);
    return resolved;
  }

  return resolveSlug(trimmed);
}
