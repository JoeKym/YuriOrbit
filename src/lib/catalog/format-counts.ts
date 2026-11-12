import { searchGLTitles } from '@/lib/providers';
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
const CACHE = new Map<ContentType, FormatCount>();

export async function loadFormatCount(contentType: ContentType): Promise<FormatCount> {
  const cached = CACHE.get(contentType);
  if (cached) return cached;

  try {
    const result = await searchGLTitles({ contentType }, 1, 1);

    const count: FormatCount = result.total
      ? { exact: result.total }
      : result.totalFloor
        ? { floor: result.totalFloor }
        : {};

    if (count.exact || count.floor) CACHE.set(contentType, count);
    return count;
  } catch {
    return {};
  }
}
