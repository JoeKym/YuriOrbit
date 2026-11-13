import { searchGLTitles } from '@/lib/providers';
import { getMaturityLevel } from '@/lib/content/maturity-preference';
import type { ContentType } from '@/types/content';

export interface FormatCount {
  /** Precise provider total. */
  exact?: number;
  /** Provider cap reached: the real figure is at least this. */
  floor?: number;
}

/**
 * Titles per format, cached for the browser session.
 *
 * Counts come from the providers themselves. When a provider stops counting at
 * its own ceiling the number is reported as a floor ("5,000+") rather than
 * passed off as exact, and a format with no trustworthy figure at all returns
 * an empty object.
 */
const CACHE = new Map<string, FormatCount>();

/** Counts move with the content filter, so the cache key includes it. */
const cacheKey = (contentType: ContentType) => `${getMaturityLevel()}:${contentType}`;

export async function loadFormatCount(contentType: ContentType): Promise<FormatCount> {
  const key = cacheKey(contentType);
  const cached = CACHE.get(key);
  if (cached) return cached;

  try {
    const result = await searchGLTitles({ contentType }, 1, 1);

    const count: FormatCount = result.total
      ? { exact: result.total }
      : result.totalFloor
        ? { floor: result.totalFloor }
        : {};

    if (count.exact || count.floor) CACHE.set(key, count);
    return count;
  } catch {
    return {};
  }
}
