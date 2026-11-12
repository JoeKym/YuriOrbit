import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { ContentCard, ContentCardSkeleton } from '@/components/content/ContentCard';
import { LoadMoreButton } from '@/components/content/LoadMoreButton';
import type { ContentType, ReleaseStatus } from '@/types/content';
import { searchGLTitles } from '@/lib/providers';
import { usePaginatedTitles } from '@/hooks/usePaginatedTitles';
import { usePageMeta } from '@/hooks/usePageMeta';
import { PageHeading } from '@/components/layout/PageHeading';
import { cn } from '@/lib/utils/format';

interface CategoryPageProps {
  contentType: ContentType;
  title: string;
}

type StatusValue = ReleaseStatus | 'ALL';
type SortValue = 'POPULARITY' | 'TRENDING' | 'SCORE' | 'UPDATED_AT';

const PER_PAGE = 30;

const STATUS_OPTIONS: { value: StatusValue; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'RELEASING', label: 'Ongoing' },
  { value: 'FINISHED', label: 'Completed' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
  { value: 'HIATUS', label: 'Hiatus' },
];

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'POPULARITY', label: 'Popularity' },
  { value: 'TRENDING', label: 'Trending' },
  { value: 'SCORE', label: 'Score' },
  { value: 'UPDATED_AT', label: 'Recently updated' },
];

/**
 * Per-status result totals, cached for the browser session so moving between
 * category pages does not re-query the providers for numbers it already has.
 */
const COUNT_CACHE = new Map<string, number>();

function FilterRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors',
        active
          ? 'border-rose-500/35 bg-rose-500/10 text-rose-200'
          : 'border-transparent text-ink-300 hover:border-ink-700 hover:bg-ink-850 hover:text-ink-100'
      )}
    >
      <span className="truncate">{label}</span>
      {typeof count === 'number' && (
        <span className={cn('shrink-0 text-[11px] tabular-nums', active ? 'text-rose-200/80' : 'text-ink-500')}>
          {count.toLocaleString()}
        </span>
      )}
    </button>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-ink-800/70 pt-3">
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function CategoryPage({ contentType, title }: CategoryPageProps) {
  usePageMeta({
    title,
    description: `Browse curated ${title.toLowerCase()} on YuriOrbit.`,
    path: window.location.pathname,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusValue>('ALL');
  const [sort, setSort] = useState<SortValue>('POPULARITY');
  const [counts, setCounts] = useState<Partial<Record<StatusValue, number>>>({});

  const feed = usePaginatedTitles(
    (page) =>
      searchGLTitles(
        {
          contentType,
          status: status === 'ALL' ? undefined : status,
          sort,
        },
        page,
        PER_PAGE
      ),
    `${contentType}|${status}|${sort}`
  );

  // Totals for each status, one query at a time so the providers are not hit in a burst.
  useEffect(() => {
    let cancelled = false;
    const next: Partial<Record<StatusValue, number>> = {};
    for (const option of STATUS_OPTIONS) {
      const cached = COUNT_CACHE.get(`${contentType}|${option.value}`);
      if (typeof cached === 'number') next[option.value] = cached;
    }
    if (Object.keys(next).length > 0) setCounts(next);

    (async () => {
      for (const option of STATUS_OPTIONS) {
        const key = `${contentType}|${option.value}`;
        if (COUNT_CACHE.has(key)) continue;
        try {
          const result = await searchGLTitles(
            { contentType, status: option.value === 'ALL' ? undefined : option.value, sort: 'POPULARITY' },
            1,
            1
          );
          const total = result.total ?? 0;
          COUNT_CACHE.set(key, total);
          if (cancelled) return;
          setCounts((prev) => ({ ...prev, [option.value]: total }));
        } catch {
          // A failed count is not a page failure — the rail simply omits it.
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [contentType]);

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return feed.titles;
    return feed.titles.filter((t) => {
      const hay = `${t.title} ${t.altTitles?.join(' ') || ''} ${t.genres?.join(' ') || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [feed.titles, query]);

  const hasFilters = !!query.trim() || status !== 'ALL' || sort !== 'POPULARITY';

  const resetFilters = () => {
    setQuery('');
    setStatus('ALL');
    setSort('POPULARITY');
  };

  const statusLabel = STATUS_OPTIONS.find((option) => option.value === status)?.label ?? 'All statuses';
  const sortLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? 'Popularity';

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <PageHeading
          eyebrow="Curated GL catalogue"
          title="GL"
          accent={title.replace(/^GL\s+/, '')}
          description={`Browse curated ${title.toLowerCase()} across our connected catalogues.`}
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium lg:hidden',
            showFilters || hasFilters
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              : 'border-ink-700 bg-ink-900 text-ink-200 hover:bg-ink-850'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className={cn('lg:sticky lg:top-24 lg:self-start', showFilters ? 'block' : 'hidden lg:block')}>
          <div className="rounded-2xl border border-ink-800 bg-ink-900/60 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
                <SlidersHorizontal className="h-3 w-3" /> Filter works
              </h2>
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-200"
                >
                  <X className="h-3 w-3" /> Reset
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search loaded titles…"
                className="input-field pl-9 text-xs"
              />
            </div>

            <div className="mt-3 space-y-3">
              <FilterGroup title="Publishing status">
                {STATUS_OPTIONS.map((option) => (
                  <FilterRow
                    key={option.value}
                    label={option.label}
                    count={counts[option.value]}
                    active={status === option.value}
                    onClick={() => setStatus(option.value)}
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Sort by">
                {SORT_OPTIONS.map((option) => (
                  <FilterRow
                    key={option.value}
                    label={option.label}
                    active={sort === option.value}
                    onClick={() => setSort(option.value)}
                  />
                ))}
              </FilterGroup>
            </div>

            <p className="mt-3 border-t border-ink-800/70 pt-3 text-[10px] leading-relaxed text-ink-500">
              Counts come from the live catalogue query and update as providers respond.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-400">
              {feed.loading ? (
                'Loading titles…'
              ) : feed.total > 0 ? (
                <>
                  <span className="font-semibold text-ink-200">{feed.total.toLocaleString()}</span>{' '}
                  {feed.total === 1 ? 'title' : 'titles'} catalogued
                </>
              ) : (
                'Live catalogue'
              )}
              {query.trim() && (
                <span className="text-ink-500">
                  {' '}
                  · {displayed.length} of {feed.titles.length} loaded match "{query.trim()}"
                </span>
              )}
            </p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500">
              {statusLabel} · {sortLabel}
            </p>
          </div>

          {feed.loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 14 }).map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : feed.error ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-800 bg-ink-900/40 p-8 py-20 text-center">
              <AlertCircle className="mb-3 h-10 w-10 text-rose-400" />
              <h3 className="text-base font-semibold text-ink-100">Unable to load {title.toLowerCase()}</h3>
              <p className="mt-1 max-w-sm text-xs text-ink-400">
                We encountered a network or rate limit issue fetching content.
              </p>
              <div className="mt-4 flex gap-3">
                <button onClick={feed.reload} className="btn-primary flex items-center gap-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Try Again
                </button>
                <Link to="/discover" className="btn-secondary text-xs">
                  Browse Discovery
                </Link>
              </div>
            </div>
          ) : feed.titles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-800 p-8 py-20 text-center">
              <Search className="mb-3 h-10 w-10 text-ink-600" />
              <h3 className="text-base font-medium text-ink-200">No {title.toLowerCase()} found</h3>
              <p className="mt-1 max-w-sm text-xs text-ink-400">
                This category does not have enough matching classified GL content yet. Try changing filters.
              </p>
              <Link to="/discover" className="btn-secondary mt-4 text-xs">
                Browse all GL
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {displayed.map((item) => (
                  <ContentCard key={item.id} title={item} className="w-full" />
                ))}
              </div>
              <LoadMoreButton
                onClick={feed.loadMore}
                loading={feed.loadingMore}
                hasMore={feed.hasNextPage}
                count={feed.titles.length}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
