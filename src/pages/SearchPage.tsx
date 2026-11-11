import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Hash, Search, SlidersHorizontal, UserRound } from 'lucide-react';
import { ContentCardGrid, ContentCardSkeleton } from '@/components/content/ContentCard';
import { LoadMoreButton } from '@/components/content/LoadMoreButton';
import { useDebounce } from '@/hooks/useDebounce';
import { useMaturity } from '@/hooks/useMaturity';
import { FORMAT_FILTERS, liveSearch, matchesFormat, type FormatFilter, type LiveSearchResult } from '@/lib/search';
import { MATURITY_LABELS } from '@/types/content';
import { cn } from '@/lib/utils/format';
import { usePageMeta } from '@/hooks/usePageMeta';

const FORMAT_KEYS = FORMAT_FILTERS.map((filter) => filter.key);

/** Results fetched per request; "Load more" asks for another batch. */
const SEARCH_PAGE = 60;

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const rawFormat = (searchParams.get('format') || 'all') as FormatFilter;
  const format: FormatFilter = FORMAT_KEYS.includes(rawFormat) ? rawFormat : 'all';

  const [input, setInput] = useState(query);
  const [result, setResult] = useState<LiveSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedLimit, setLoadedLimit] = useState(SEARCH_PAGE);
  const { level } = useMaturity();

  usePageMeta({
    title: query ? `Search: ${query}` : 'Search',
    description: 'Search Girls\' Love anime, manga, manhwa, webtoons, novels, and dramas on YuriOrbit.',
    path: '/search',
    noIndex: true,
  });

  const debouncedInput = useDebounce(input, 350);

  // Typing rewrites ?q= so the page stays shareable and back/forward works.
  useEffect(() => {
    if (debouncedInput.trim() === query) return;
    const next = new URLSearchParams(searchParams);
    if (debouncedInput.trim()) next.set('q', debouncedInput.trim());
    else next.delete('q');
    setSearchParams(next, { replace: true });
  }, [debouncedInput, query, searchParams, setSearchParams]);

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setResult(null);
      setLoading(false);
      setLoadingMore(false);
      setLoadedLimit(SEARCH_PAGE);
      return;
    }

    setLoading(true);
    setLoadedLimit(SEARCH_PAGE);
    liveSearch(trimmed, { limit: SEARCH_PAGE, includeCreators: true })
      .then((next) => {
        if (!cancelled) setResult(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query, level]);

  const loadMoreResults = async () => {
    const trimmed = query.trim();
    if (trimmed.length < 2 || loadingMore) return;

    const nextLimit = loadedLimit + SEARCH_PAGE;
    setLoadingMore(true);
    try {
      const next = await liveSearch(trimmed, { limit: nextLimit, includeCreators: true });
      setResult(next);
      setLoadedLimit(nextLimit);
    } catch {
      // Keep the results already on screen if the next batch fails.
    } finally {
      setLoadingMore(false);
    }
  };

  const hits = useMemo(
    () => (result?.hits ?? []).filter((hit) => matchesFormat(hit.title, format)),
    [result, format]
  );

  const formatCounts = useMemo(() => {
    const counts = new Map<FormatFilter, number>();
    for (const filter of FORMAT_FILTERS) {
      counts.set(filter.key, (result?.hits ?? []).filter((hit) => matchesFormat(hit.title, filter.key)).length);
    }
    return counts;
  }, [result]);

  const updateFormat = (next: FormatFilter) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('format');
    else params.set('format', next);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <h1 className="mb-1 font-display text-3xl font-semibold text-ink-50">
        {query ? `Results for “${query}”` : 'Search'}
      </h1>
      <p className="mb-4 text-sm text-ink-400">
        Search by title, alternate title, creator, or an exact id —{' '}
        <span className="text-ink-300">ANILIST-30013</span>, <span className="text-ink-300">TMDB-movie-12345</span>, or a YuriOrbit slug.
      </p>

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type to search — results update as you type"
          aria-label="Search the catalogue"
          className="w-full rounded-xl border border-ink-800 bg-ink-900/70 py-3 pl-11 pr-4 text-sm text-ink-50 placeholder:text-ink-400 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-ink-500">
          <SlidersHorizontal className="h-3 w-3" /> Format
        </span>
        {FORMAT_FILTERS.map((filter) => {
          const count = formatCounts.get(filter.key) ?? 0;
          return (
            <button
              key={filter.key}
              onClick={() => updateFormat(filter.key)}
              className={cn('chip', format === filter.key && 'chip-active')}
              aria-pressed={format === filter.key}
            >
              {filter.label}
              {query && count > 0 && <span className="text-[10px] text-ink-500">{count}</span>}
            </button>
          );
        })}
      </div>

      <p className="mb-5 text-xs text-ink-500">
        Showing content rated <span className="text-ink-300">{MATURITY_LABELS[level]}</span> or lower.{' '}
        <Link to="/settings" className="underline decoration-dotted hover:text-ink-300">
          Change filter
        </Link>
      </p>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 14 }).map((_, i) => <ContentCardSkeleton key={i} />)}
        </div>
      ) : !query || query.trim().length < 2 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="mb-4 h-12 w-12 text-ink-600" />
          <p className="text-lg font-medium text-ink-200">Start searching</p>
          <p className="mt-1 max-w-md text-sm text-ink-400">
            Titles and aliases, creator names, and exact ids all work. Two characters is enough.
          </p>
        </div>
      ) : result?.error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="mb-4 text-ink-400">Search failed — the providers did not answer. Please try again.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      ) : (
        <>
          {result?.direct && (
            <p className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-200">
              <Hash className="h-3.5 w-3.5" />
              Exact id match — opening {result.direct.title} directly.
            </p>
          )}

          {hits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search className="mb-4 h-12 w-12 text-ink-600" />
              <p className="text-lg font-medium text-ink-200">No titles found</p>
              <p className="mt-1 max-w-md text-sm text-ink-400">
                {format === 'all'
                  ? 'Try a shorter query, an alternate title, or a creator name.'
                  : 'Nothing in this format for that query — try “All formats”.'}
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs text-ink-400">
                {hits.length} title{hits.length === 1 ? '' : 's'}
                {result?.creators.length ? ` · ${result.creators.length} creator match${result.creators.length === 1 ? '' : 'es'}` : ''}
              </p>
              <ContentCardGrid titles={hits.map((hit) => hit.title)} showAvailability />

              {(result?.creators.length ?? 0) > 0 && (
                <div className="mt-8 space-y-3">
                  <h2 className="section-title flex items-center gap-2 text-lg">
                    <UserRound className="h-4 w-4 text-lavender-400" /> Matched creators
                  </h2>
                  {result!.creators.map((group) => {
                    const titles = group.titles.filter((title) => matchesFormat(title, format));
                    if (titles.length === 0) return null;
                    return (
                      <p key={group.name} className="text-xs text-ink-400">
                        <span className="font-medium text-ink-200">{group.name}</span>
                        {' — '}
                        {titles.slice(0, 4).map((title) => title.title).join(' · ')}
                        {titles.length > 4 ? ` and ${titles.length - 4} more` : ''}
                      </p>
                    );
                  })}
                </div>
              )}

              <LoadMoreButton
                onClick={loadMoreResults}
                loading={loadingMore}
                hasMore={(result?.hits.length ?? 0) >= loadedLimit}
                count={hits.length}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
