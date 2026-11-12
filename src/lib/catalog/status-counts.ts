import { searchGLTitles } from '@/lib/providers';
import type { ContentType, ReleaseStatus } from '@/types/content';

export type StatusFilter = ReleaseStatus | 'ALL';

/**
 * Result totals per status, kept for the browser session. Discover and the
 * format pages ask for the same numbers, so the cache is shared by both.
 */
const CACHE = new Map<string, number>();

const cacheKey = (contentType: ContentType | 'ALL', status: StatusFilter) => `${contentType}|${status}`;

export function peekStatusCount(contentType: ContentType | 'ALL', status: StatusFilter): number | undefined {
  return CACHE.get(cacheKey(contentType, status));
}

/**
 * One page of one status, read purely for its total. Callers run these
 * sequentially so a page of filters never bursts the providers at once.
 */
export async function loadStatusCount(
  contentType: ContentType | 'ALL',
  status: StatusFilter
): Promise<number | undefined> {
  const key = cacheKey(contentType, status);
  const cached = CACHE.get(key);
  if (typeof cached === 'number') return cached;

  try {
    const result = await searchGLTitles(
      {
        contentType: contentType === 'ALL' ? undefined : contentType,
        status: status === 'ALL' ? undefined : status,
        sort: 'POPULARITY',
      },
      1,
      1
    );
    // Providers that cannot answer precisely leave total empty or zero (a
    // capped AniList total is dropped upstream). An unknown count is hidden in
    // the rail rather than shown as 0.
    if (!result.total) return undefined;
    CACHE.set(key, result.total);
    return result.total;
  } catch {
    // A failed count is not a page failure — the rail just omits the number.
    return undefined;
  }
}
