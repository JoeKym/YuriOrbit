import { useCallback, useEffect, useRef, useState } from 'react';
import type { ContentTitle, PaginatedResult } from '@/types/content';

/** Providers occasionally return the same canonical title on two pages. */
function dedupe(titles: ContentTitle[]): ContentTitle[] {
  const seen = new Set<string>();
  return titles.filter((title) => {
    if (seen.has(title.id)) return false;
    seen.add(title.id);
    return true;
  });
}

export interface PaginatedFeed {
  titles: ContentTitle[];
  /** Result total reported by the providers on the first page (0 when unknown). */
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: boolean;
  hasNextPage: boolean;
  loadMore: () => void;
  reload: () => void;
}

/**
 * Walks one provider query page by page so listing pages can offer a
 * "Load more" control. `resetKey` (a filter, tab or content type) restarts
 * the feed from page 1 whenever it changes.
 */
export function usePaginatedTitles(
  fetchPage: (page: number) => Promise<PaginatedResult>,
  resetKey: string
): PaginatedFeed {
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  const [titles, setTitles] = useState<ContentTitle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(false);
    setHasNextPage(false);
    setTitles([]);
    setTotal(0);
    setPage(1);

    fetchRef
      .current(1)
      .then((result) => {
        if (cancelled) return;
        setTitles(dedupe(result.items));
        setTotal(result.total ?? 0);
        setHasNextPage(result.hasNextPage);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resetKey, reloadKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasNextPage) return;

    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const result = await fetchRef.current(nextPage);
      setTitles((prev) => dedupe([...prev, ...result.items]));
      setPage(nextPage);
      setHasNextPage(result.hasNextPage);
    } catch {
      // Keep the titles already on screen when a later page fails.
    } finally {
      setLoadingMore(false);
    }
  }, [hasNextPage, loadingMore, page]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { titles, total, loading, loadingMore, error, hasNextPage, loadMore, reload };
}
