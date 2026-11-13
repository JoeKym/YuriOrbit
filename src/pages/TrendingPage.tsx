import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { ContentCard, ContentCardSkeleton } from '@/components/content/ContentCard';
import { LoadMoreButton } from '@/components/content/LoadMoreButton';
import { searchGLTitles } from '@/lib/providers';
import { usePaginatedTitles } from '@/hooks/usePaginatedTitles';
import { usePageMeta } from '@/hooks/usePageMeta';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui';
import { useListRestoreEffects, useRestoredPageDepth } from '@/hooks/useListRestore';
import { useStatusCounts } from '@/hooks/useStatusCounts';
import {
  ActiveFilterBar,
  ActiveFilterChip,
  FilterGroup,
  FilterPanel,
  FilterRow,
} from '@/components/catalog/FilterRail';
import { cn } from '@/lib/utils/format';
import type { ContentType, ReleaseStatus } from '@/types/content';

const PER_PAGE = 24;

type FormatValue = ContentType | 'ALL';
type StatusValue = ReleaseStatus | 'ALL';

const TYPE_OPTIONS: { value: FormatValue; label: string }[] = [
  { value: 'ALL', label: 'All formats' },
  { value: 'MANGA', label: 'Manga' },
  { value: 'MANHWA', label: 'Manhwa' },
  { value: 'MANHUA', label: 'Manhua' },
  { value: 'WEBTOON', label: 'Webtoons' },
  { value: 'LIGHT_NOVEL', label: 'Novels' },
  { value: 'ANIME', label: 'Anime' },
  { value: 'TV', label: 'TV Series' },
  { value: 'MOVIE', label: 'Movies' },
  { value: 'DRAMA', label: 'Dramas' },
];

const STATUS_OPTIONS: { value: StatusValue; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'RELEASING', label: 'Ongoing' },
  { value: 'FINISHED', label: 'Completed' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
  { value: 'HIATUS', label: 'Hiatus' },
];

const STATUS_VALUES = STATUS_OPTIONS.map((option) => option.value);
const FORMAT_VALUES = TYPE_OPTIONS.map((option) => option.value);

// URL values are validated on read, so a hand-edited or stale link degrades to
// the default instead of requesting nonsense from the providers.
const parseFormat = (value: string | null): FormatValue =>
  value && FORMAT_VALUES.includes(value as FormatValue) ? (value as FormatValue) : 'ALL';
const parseStatus = (value: string | null): StatusValue =>
  value && STATUS_VALUES.includes(value as StatusValue) ? (value as StatusValue) : 'ALL';

export function TrendingPage() {
  usePageMeta({ title: 'Trending', description: "See trending Girls' Love titles on YuriOrbit.", path: '/trending' });

  // Filters live in the query string so a choice survives navigation, refresh
  // and sharing.
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '');
  const query = searchInput;
  const format = parseFormat(searchParams.get('format'));
  const status = parseStatus(searchParams.get('status'));

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

  const listKey = `trending|${format}|${status}`;
  const restorePages = useRestoredPageDepth(listKey);

  const feed = usePaginatedTitles(
    (page) =>
      searchGLTitles(
        {
          sort: 'TRENDING',
          contentType: format === 'ALL' ? undefined : format,
          status: status === 'ALL' ? undefined : status,
        },
        page,
        PER_PAGE
      ),
    listKey,
    { initialPages: restorePages }
  );

  useListRestoreEffects({ listKey, pages: feed.page, loading: feed.loading });

  const counts = useStatusCounts(format, STATUS_VALUES);

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return feed.titles;
    return feed.titles.filter((t) => `${t.title} ${t.genres?.join(' ') || ''}`.toLowerCase().includes(q));
  }, [feed.titles, query]);

  const activeFilters = [
    query.trim() ? { key: 'q' as const, label: `Search: ${query.trim()}` } : null,
    format !== 'ALL'
      ? { key: 'format' as const, label: TYPE_OPTIONS.find((o) => o.value === format)?.label ?? format }
      : null,
    status !== 'ALL'
      ? { key: 'status' as const, label: STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status }
      : null,
  ].filter((item): item is { key: 'q' | 'format' | 'status'; label: string } => item !== null);

  const clearFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const clearOne = (key: 'q' | 'format' | 'status') => {
    if (key === 'q') setSearchInput('');
    setFilterParam(key, undefined);
  };

  const gridClass = 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <PageHeader
        eyebrow="This orbit's pulse"
        title="Trending"
        accent="GL"
        description="Popular Girls' Love titles right now, with filters as an alternate view."
        className="mb-6"
        actions={
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            aria-expanded={showFilters}
            onClick={() => setShowFilters((v) => !v)}
            icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          >
            Filters{activeFilters.length > 0 ? ' · active' : ''}
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className={cn('lg:sticky lg:top-24 lg:self-start', showFilters ? 'block' : 'hidden lg:block')}>
          <FilterPanel onReset={activeFilters.length > 0 ? clearFilters : undefined}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
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
              <FilterGroup title="Format">
                {TYPE_OPTIONS.map((option) => (
                  <FilterRow
                    key={option.value}
                    label={option.label}
                    active={format === option.value}
                    onClick={() =>
                      setFilterParam('format', option.value === 'ALL' ? undefined : option.value)
                    }
                  />
                ))}
              </FilterGroup>

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
            </div>
          </FilterPanel>
        </aside>

        <div className="min-w-0">
          <ActiveFilterBar
            count={activeFilters.length}
            onClearAll={clearFilters}
            emptyLabel="None — showing the trending GL titles across every format."
          >
            {activeFilters.map((f) => (
              <ActiveFilterChip key={f.key} label={f.label} onRemove={() => clearOne(f.key)} />
            ))}
          </ActiveFilterBar>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-ink-400">
              {feed.loading ? (
                'Loading trending titles…'
              ) : query.trim() ? (
                <>
                  <span className="font-semibold text-ink-200">{displayed.length}</span> of{' '}
                  {feed.titles.length} loaded match "{query.trim()}"
                </>
              ) : (
                <>
                  <span className="font-semibold text-ink-200">{feed.titles.length}</span> trending titles loaded
                </>
              )}
            </p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-400">Trending order</p>
          </div>

          {feed.loading ? (
            <div className={gridClass}>
              {Array.from({ length: 14 }).map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          ) : feed.error ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-800 bg-ink-900/40 p-8 py-20 text-center">
              <AlertCircle className="mb-3 h-10 w-10 text-rose-400" />
              <h3 className="text-base font-semibold text-ink-100">Unable to load trending titles</h3>
              <p className="mt-1 max-w-sm text-xs text-ink-400">We encountered an issue fetching trending content.</p>
              <div className="mt-4 flex gap-3">
                <button onClick={feed.reload} className="btn-primary flex items-center gap-1.5 text-xs">
                  <RotateCcw className="h-3.5 w-3.5" /> Try Again
                </button>
                <Link to="/discover" className="btn-secondary text-xs">
                  Browse Discovery
                </Link>
              </div>
            </div>
          ) : feed.titles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-800 p-8 py-20 text-center">
              <Search className="mb-3 h-10 w-10 text-ink-600" />
              <h3 className="text-base font-medium text-ink-200">No trending titles available</h3>
              <p className="mt-1 max-w-sm text-xs text-ink-400">Try changing filters or explore the discovery page.</p>
              <Link to="/discover" className="btn-secondary mt-4 text-xs">
                Browse all GL
              </Link>
            </div>
          ) : (
            <>
              <div className={gridClass}>
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
