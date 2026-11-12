import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { ContentCard, ContentCardSkeleton } from '@/components/content/ContentCard';
import { LoadMoreButton } from '@/components/content/LoadMoreButton';
import type { ContentType, ReleaseStatus } from '@/types/content';
import { searchGLTitles } from '@/lib/providers';
import { usePaginatedTitles } from '@/hooks/usePaginatedTitles';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useStatusCounts } from '@/hooks/useStatusCounts';
import { useListRestoreEffects, useRestoredPageDepth } from '@/hooks/useListRestore';
import { PageHeading } from '@/components/layout/PageHeading';
import {
  ActiveFilterBar,
  ActiveFilterChip,
  FilterGroup,
  FilterPanel,
  FilterRow,
} from '@/components/catalog/FilterRail';
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

const STATUS_VALUES = STATUS_OPTIONS.map((option) => option.value);

function parseStatus(value: string | null): StatusValue {
  return STATUS_OPTIONS.some((option) => option.value === value) ? (value as StatusValue) : 'ALL';
}

function parseSort(value: string | null): SortValue {
  return SORT_OPTIONS.some((option) => option.value === value) ? (value as SortValue) : 'POPULARITY';
}

export function CategoryPage({ contentType, title }: CategoryPageProps) {
  usePageMeta({
    title,
    description: `Browse curated ${title.toLowerCase()} on YuriOrbit.`,
    path: window.location.pathname,
  });

  // Filters live in the query string so they survive navigation, refresh and sharing.
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const status = parseStatus(searchParams.get('status'));
  const sort = parseSort(searchParams.get('sort'));
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const query = searchInput;
  const counts = useStatusCounts(contentType, STATUS_VALUES);

  // Mirror URL changes that come from elsewhere (back/forward, chip removal).
  useEffect(() => {
    setSearchInput(searchParams.get('q') ?? '');
  }, [searchParams]);

  const setFilterParam = useCallback(
    (key: string, value: string | undefined, replace = false) => {
      const next = new URLSearchParams(searchParams);
      if (value && value !== 'ALL' && value.trim() !== '') {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams]
  );

  const listKey = `${contentType}|${status}|${sort}`;
  const restorePages = useRestoredPageDepth(listKey);

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
    listKey,
    // Only the filter combination the visitor left restores its page depth;
    // changing a filter starts from page 1 (handled inside the hook).
    { initialPages: restorePages }
  );

  useListRestoreEffects({ listKey, pages: feed.page, loading: feed.loading });

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return feed.titles;
    return feed.titles.filter((t) => {
      const hay = `${t.title} ${t.altTitles?.join(' ') || ''} ${t.genres?.join(' ') || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [feed.titles, query]);

  const hasFilters = !!query.trim() || status !== 'ALL' || sort !== 'POPULARITY';
  const activeFilterCount =
    (query.trim() ? 1 : 0) + (status !== 'ALL' ? 1 : 0) + (sort !== 'POPULARITY' ? 1 : 0);

  const resetFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
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
          <FilterPanel onReset={hasFilters ? resetFilters : undefined}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
              <input
                value={searchInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearchInput(value);
                  // Replace so typing does not fill the history stack.
                  setFilterParam('q', value, true);
                }}
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
                    onClick={() =>
                      setFilterParam('status', option.value === 'ALL' ? undefined : option.value)
                    }
                  />
                ))}
              </FilterGroup>

              <FilterGroup title="Sort by">
                {SORT_OPTIONS.map((option) => (
                  <FilterRow
                    key={option.value}
                    label={option.label}
                    active={sort === option.value}
                    onClick={() => setFilterParam('sort', option.value)}
                  />
                ))}
              </FilterGroup>
            </div>
          </FilterPanel>
        </aside>

        <div className="min-w-0">
          {/* Always present, so the summary is visible on load whether or not
              anything is filtered. */}
          <ActiveFilterBar
            count={activeFilterCount}
            onClearAll={resetFilters}
            emptyLabel={`None — showing every ${title.toLowerCase()} title, most popular first.`}
          >
            {query.trim() && (
                <ActiveFilterChip
                  label={`Search: ${query.trim()}`}
                  onRemove={() => setFilterParam('q', undefined)}
                />
              )}
              {status !== 'ALL' && (
                <ActiveFilterChip
                  label={`Status: ${statusLabel}`}
                  onRemove={() => setFilterParam('status', undefined)}
                />
              )}
              {sort !== 'POPULARITY' && (
                <ActiveFilterChip
                  label={`Sort: ${sortLabel}`}
                  onRemove={() => setFilterParam('sort', undefined)}
                />
              )}
          </ActiveFilterBar>

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
