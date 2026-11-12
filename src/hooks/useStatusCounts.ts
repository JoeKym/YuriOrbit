import { useEffect, useState } from 'react';
import type { ContentType } from '@/types/content';
import { loadStatusCount, peekStatusCount } from '@/lib/catalog/status-counts';
import type { StatusFilter } from '@/lib/catalog/status-counts';

/**
 * Progressively fills in per-status totals for a filter rail. Statuses are
 * queried one after another, and anything already cached from an earlier visit
 * is shown immediately.
 */
export function useStatusCounts(
  contentType: ContentType | 'ALL',
  statuses: readonly StatusFilter[]
): Partial<Record<StatusFilter, number>> {
  const [counts, setCounts] = useState<Partial<Record<StatusFilter, number>>>(() => {
    const known: Partial<Record<StatusFilter, number>> = {};
    for (const status of statuses) {
      const cached = peekStatusCount(contentType, status);
      if (typeof cached === 'number') known[status] = cached;
    }
    return known;
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const status of statuses) {
        if (cancelled) return;
        const cached = peekStatusCount(contentType, status);
        if (typeof cached === 'number') {
          setCounts((prev) => (prev[status] === cached ? prev : { ...prev, [status]: cached }));
          continue;
        }
        const total = await loadStatusCount(contentType, status);
        if (cancelled || total === undefined) continue;
        setCounts((prev) => ({ ...prev, [status]: total }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // `statuses` is a module-level constant in every caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentType]);

  return counts;
}
