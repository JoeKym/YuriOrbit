import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  SlidersHorizontal,
  Search,
  X,
  Grid3x3,
  List,
  Sparkles,
  BookOpen,
  Tv,
  Film,
  RotateCcw,
  Star,
  Globe,
  Loader2
} from 'lucide-react';
import { ContentCard, ContentCardSkeleton } from '@/components/content/ContentCard';
import type {
  ContentTitle,
  ContentFilter,
  ContentType,
  PaginatedResult,
  ReleaseStatus,
  SourceProvider,
  GLClassification
} from '@/types/content';
import {
  GENRE_LIST,
  SORT_OPTIONS,
  CONTENT_TYPE_LABELS
} from '@/types/content';
import { searchGLTitles, tmdbPreferredRegion } from '@/lib/providers';
import { getTitleAvailability } from '@/lib/content/watch-availability';
import { regionName } from '@/lib/content/watch-region';
import { GL_ALLOWED_CLASSIFICATIONS } from '@/lib/providers/classify';
import { cn, formatScore, getFallbackCover } from '@/lib/utils/format';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useWatchRegion } from '@/hooks/useWatchRegion';
import { useStatusCounts } from '@/hooks/useStatusCounts';
import { MAX_RESTORED_PAGES, readListState, writeListState } from '@/lib/catalog/list-state';
import {
  ActiveFilterBar,
  ActiveFilterChip,
  FilterGroup,
  FilterPanel,
  FilterRow,
} from '@/components/catalog/FilterRail';

interface MediaTypeTab {
  value: ContentType | 'ALL';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MEDIA_CATEGORIES: MediaTypeTab[] = [
  { value: 'ALL', label: 'All Titles', icon: Sparkles },
  { value: 'MANGA', label: 'Manga', icon: BookOpen },
  { value: 'MANHWA', label: 'Manhwa', icon: BookOpen },
  { value: 'MANHUA', label: 'Manhua', icon: BookOpen },
  { value: 'WEBTOON', label: 'Webtoons', icon: BookOpen },
  { value: 'LIGHT_NOVEL', label: 'Light Novels', icon: BookOpen },
  { value: 'TV', label: 'Anime & TV', icon: Tv },
  { value: 'MOVIE', label: 'Movies', icon: Film },
  { value: 'DRAMA', label: 'Live-Action', icon: Film },
];

const STATUS_OPTIONS: { value: ReleaseStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'RELEASING', label: 'Ongoing / airing' },
  { value: 'FINISHED', label: 'Completed' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
  { value: 'HIATUS', label: 'On hiatus' },
];

const STATUS_VALUES = STATUS_OPTIONS.map((option) => option.value);

/** Stable key for the current filter combination, regardless of param order. */
function canonicalQuery(params: URLSearchParams): string {
  return new URLSearchParams(
    Array.from(params.entries()).sort(([a], [b]) => a.localeCompare(b))
  ).toString();
}

export function DiscoverPage() {
  usePageMeta({ title: 'Discover', description: 'Discover Girls\' Love anime, manga, manhwa, webtoons, novels, and dramas on YuriOrbit.', path: '/discover' });

  const [searchParams, setSearchParams] = useSearchParams();
  const [titles, setTitles] = useState<ContentTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const streamingOnly = searchParams.get('streaming') === '1';
  const watchRegion = useWatchRegion();

  const filter: ContentFilter = useMemo(() => ({
    query: searchParams.get('q') || undefined,
    contentType: (searchParams.get('type') as ContentType | 'ALL') || 'ALL',
    genre: searchParams.get('genre') || undefined,
    year: searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined,
    status: (searchParams.get('status') as ReleaseStatus | 'ALL') || 'ALL',
    source: (searchParams.get('source') as SourceProvider | 'ALL') || 'ALL',
    sort: (searchParams.get('sort') as ContentFilter['sort']) || 'POPULARITY',
    classification: (searchParams.get('gl') as GLClassification) || 'CONFIRMED_GL',
  }), [searchParams]);

  const updateFilter = useCallback((key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'ALL' && value.trim() !== '') {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
    setPage(1);
  }, [searchParams, setSearchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter('q', searchInput);
  };

  const clearAllFilters = useCallback(() => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
    setPage(1);
  }, [setSearchParams]);

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchInput(searchParams.get('q') || '');
  }, [searchParams]);

  const [reloadKey, setReloadKey] = useState(0);

  const listKey = `discover|${canonicalQuery(searchParams)}`;
  const mountKey = useRef(listKey);
  const remembered = useRef(readListState(listKey));
  const scrollRestored = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // Only the filter combination the visitor left restores its depth.
    const restorePages = listKey === mountKey.current ? remembered.current.pages : 1;
    const pagesToLoad = Math.min(Math.max(restorePages, 1), MAX_RESTORED_PAGES);

    const keepGL = (items: ContentTitle[]) =>
      items.filter((t) =>
        filter.classification === 'ALL'
          ? true
          : GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification)
      );

    async function loadData() {
      setLoading(true);
      setError(false);
      try {
        const collected: ContentTitle[] = [];
        let last: PaginatedResult | null = null;
        let loaded = 0;

        for (let nextPage = 1; nextPage <= pagesToLoad; nextPage += 1) {
          const result = await searchGLTitles(filter, nextPage, 24);
          if (cancelled) return;
          collected.push(...keepGL(result.items));
          last = result;
          loaded = nextPage;
          if (!result.hasNextPage) break;
        }

        if (!last) return;
        setTitles(collected);
        setPage(loaded);
        setHasNextPage(last.hasNextPage);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [filter, reloadKey]);

  const pageRef = useRef(page);
  pageRef.current = page;

  // Remember how many pages are open for this filter combination. Skip while
  // loading so the placeholder depth cannot overwrite what is being restored.
  useEffect(() => {
    if (loading) return;
    writeListState(listKey, { pages: page, scrollY: readListState(listKey).scrollY });
  }, [listKey, page, loading]);

  // Save the reading position when leaving or backgrounding the page.
  useEffect(() => {
    const save = () => {
      writeListState(listKey, { pages: pageRef.current, scrollY: window.scrollY });
    };
    window.addEventListener('pagehide', save);
    return () => {
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [listKey]);

  // ScrollToTop resets the window on navigation; put the visitor back once the
  // remembered pages have rendered.
  useEffect(() => {
    if (loading || scrollRestored.current) return;
    scrollRestored.current = true;
    const target = remembered.current.scrollY;
    if (target > 0) {
      requestAnimationFrame(() => window.scrollTo({ top: target }));
    }
  }, [loading]);

  const loadMore = async () => {
    if (loadingMore || !hasNextPage) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await searchGLTitles(filter, nextPage, 24);
      const filtered = result.items.filter((t) =>
        filter.classification === 'ALL'
          ? true
          : GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification)
      );

      setTitles((prev) => [...prev, ...filtered]);
      setPage(nextPage);
      setHasNextPage(result.hasNextPage);
    } catch {
      // Keep existing list on pagination error
    } finally {
      setLoadingMore(false);
    }
  };

  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [checkedCount, setCheckedCount] = useState(0);
  const availabilityChecked = useRef<Set<string>>(new Set());
  const availabilityRegion = useRef<string | null | undefined>(undefined);

  // Availability needs one TMDB lookup per title, so check lazily through the
  // shared queue, then hide titles that are not streaming in the chosen region.
  useEffect(() => {
    if (!streamingOnly) {
      setCheckingAvailability(false);
      return;
    }

    // A new region invalidates every previous answer, including the set of
    // titles already checked, so start the batch over instead of keeping stale
    // visibility results from the old region.
    if (availabilityRegion.current !== watchRegion) {
      availabilityRegion.current = watchRegion;
      availabilityChecked.current.clear();
      setAvailability({});
      setCheckedCount(0);
    }

    const pending = titles.filter((title) => !availabilityChecked.current.has(title.id));
    if (pending.length === 0) {
      setCheckingAvailability(false);
      return;
    }

    let cancelled = false;
    setCheckingAvailability(true);
    setCheckedCount(0);
    let done = 0;

    void Promise.all(
      pending.map(async (title) => {
        const result = await getTitleAvailability(title);
        if (cancelled) return;
        availabilityChecked.current.add(title.id);
        setAvailability((prev) => ({ ...prev, [title.id]: Boolean(result) }));
        done += 1;
        setCheckedCount(done);
      })
    ).finally(() => {
      if (!cancelled) setCheckingAvailability(false);
    });

    return () => {
      cancelled = true;
    };
  }, [streamingOnly, titles, watchRegion]);

  const visibleTitles = streamingOnly
    ? titles.filter((title) => availability[title.id] === true)
    : titles;
  const streamingRegion = regionName(watchRegion || tmdbPreferredRegion());

  const activeFormat = filter.contentType && filter.contentType !== 'ALL' ? filter.contentType : 'ALL';
  const counts = useStatusCounts(activeFormat, STATUS_VALUES);

  // Build active filter tags for quick removal
  const activeFilters: { key: string; label: string }[] = [];
  if (filter.query) {
    activeFilters.push({ key: 'q', label: `Search: "${filter.query}"` });
  }
  if (filter.contentType && filter.contentType !== 'ALL') {
    activeFilters.push({
      key: 'type',
      label: CONTENT_TYPE_LABELS[filter.contentType] || filter.contentType,
    });
  }
  if (filter.genre) {
    activeFilters.push({ key: 'genre', label: filter.genre });
  }
  if (filter.year) {
    activeFilters.push({ key: 'year', label: `Year: ${filter.year}` });
  }
  if (filter.status && filter.status !== 'ALL') {
    activeFilters.push({
      key: 'status',
      label: STATUS_OPTIONS.find((s) => s.value === filter.status)?.label || filter.status,
    });
  }
  if (filter.sort && filter.sort !== 'POPULARITY') {
    activeFilters.push({
      key: 'sort',
      label: SORT_OPTIONS.find((s) => s.value === filter.sort)?.label || filter.sort,
    });
  }
  if (filter.classification && filter.classification === 'ALL') {
    activeFilters.push({ key: 'gl', label: 'All GL (inc. Subtext)' });
  }
  if (streamingOnly) {
    activeFilters.push({ key: 'streaming', label: `Streaming in ${streamingRegion}` });
  }

  const resultGridClass =
    'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100 pb-20">
      {/* Top Banner & Search Section */}
      <div className="border-b border-ink-850 bg-ink-900/60 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-ink-50 flex items-center gap-2">
                <span>Discover Yuri & Girls' Love</span>
              </h1>
              <p className="text-xs text-ink-400 mt-0.5">
                Explore curated manga, manhwa, anime, webtoons, light novels, and dramas
              </p>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                type="text"
                placeholder="Search titles, alternative names, creators..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input-field pl-10 pr-9 py-2 text-sm bg-ink-850/90 border-ink-700/80 focus:border-rose-500/60"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    updateFilter('q', undefined);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-200"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </form>
          </div>

          {/* Media Format Filter Carousel / Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar border-t border-ink-800/60 mt-3">
            {MEDIA_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive =
                filter.contentType === cat.value ||
                (!filter.contentType && cat.value === 'ALL');

              return (
                <button
                  key={cat.value}
                  onClick={() =>
                    updateFilter('type', cat.value === 'ALL' ? undefined : cat.value)
                  }
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200',
                    isActive
                      ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20 font-semibold'
                      : 'bg-ink-850/80 text-ink-300 hover:bg-ink-800 hover:text-ink-100 border border-ink-800/80'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
          <aside
            className={cn(
              'lg:sticky lg:top-[168px] lg:self-start',
              showFilters ? 'block' : 'hidden lg:block'
            )}
          >
            <FilterPanel onReset={activeFilters.length > 0 ? clearAllFilters : undefined}>
              <div className="space-y-3">
                <FilterGroup title="Girls' Love classification">
                  <FilterRow
                    label="Confirmed GL only"
                    active={filter.classification !== 'ALL'}
                    onClick={() => updateFilter('gl', 'CONFIRMED_GL')}
                  />
                  <FilterRow
                    label="Include subtext & GL-adjacent"
                    active={filter.classification === 'ALL'}
                    onClick={() => updateFilter('gl', 'ALL')}
                  />
                </FilterGroup>

                <FilterGroup title="Publishing status">
                  {STATUS_OPTIONS.map((option) => (
                    <FilterRow
                      key={option.value}
                      label={option.label}
                      count={counts[option.value]}
                      active={
                        filter.status === option.value ||
                        (!filter.status && option.value === 'ALL')
                      }
                      onClick={() =>
                        updateFilter('status', option.value === 'ALL' ? undefined : option.value)
                      }
                    />
                  ))}
                </FilterGroup>

                <FilterGroup title="Streaming">
                  <FilterRow
                    label={`Streaming in ${streamingRegion}`}
                    active={streamingOnly}
                    onClick={() => updateFilter('streaming', streamingOnly ? undefined : '1')}
                  />
                </FilterGroup>

                <FilterGroup title="Sort by">
                  {SORT_OPTIONS.map((option) => (
                    <FilterRow
                      key={option.value}
                      label={option.label}
                      active={(filter.sort || 'POPULARITY') === option.value}
                      onClick={() => updateFilter('sort', option.value)}
                    />
                  ))}
                </FilterGroup>

                <FilterGroup title="Release year">
                  <input
                    type="number"
                    min="1970"
                    max="2030"
                    value={filter.year || ''}
                    onChange={(e) => updateFilter('year', e.target.value)}
                    placeholder="e.g. 2024"
                    className="input-field py-1.5 text-xs"
                  />
                </FilterGroup>

                <FilterGroup title="Genres & themes">
                  <div className="flex max-h-52 flex-wrap gap-1.5 overflow-y-auto pr-1 pt-1">
                    {GENRE_LIST.map((genre) => {
                      const isSelected = filter.genre === genre;
                      return (
                        <button
                          key={genre}
                          onClick={() =>
                            updateFilter('genre', isSelected ? undefined : genre)
                          }
                          className={cn(
                            'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                            isSelected
                              ? 'border-rose-500/40 bg-rose-500/15 text-rose-200'
                              : 'border-ink-700/60 bg-ink-850/60 text-ink-300 hover:border-rose-500/30 hover:text-ink-100'
                          )}
                        >
                          {genre}
                        </button>
                      );
                    })}
                  </div>
                </FilterGroup>
              </div>
            </FilterPanel>
          </aside>

          <div className="min-w-0">
            {/* Always present, so the summary is visible on load whether or not
                anything is filtered. */}
            <ActiveFilterBar
              count={activeFilters.length}
              onClearAll={clearAllFilters}
              emptyLabel="None — showing every confirmed GL title, most popular first."
            >
              {activeFilters.map((f) => (
                <ActiveFilterChip
                  key={f.key}
                  label={f.label}
                  onRemove={() => updateFilter(f.key, undefined)}
                />
              ))}
            </ActiveFilterBar>

            {/* Toolbar: mobile filter toggle, active chips, view mode */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-medium transition-all duration-200 lg:hidden',
                    showFilters
                      ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                      : 'border-ink-700 bg-ink-900 text-ink-200 hover:bg-ink-850'
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>Filters</span>
                  {activeFilters.length > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                      {activeFilters.length}
                    </span>
                  )}
                </button>

              </div>

              <div className="ml-auto flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.14em] text-ink-500">
                  {loading ? 'Loading…' : `${visibleTitles.length} shown`}
                </span>
                {/* View Mode (Grid vs List) */}
                <div className="flex items-center rounded-lg border border-ink-700 bg-ink-900 p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      viewMode === 'grid'
                        ? 'bg-ink-750 text-ink-50'
                        : 'text-ink-400 hover:text-ink-200'
                    )}
                    title="Grid View"
                  >
                    <Grid3x3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      'p-1.5 rounded-md transition-colors',
                      viewMode === 'list'
                        ? 'bg-ink-750 text-ink-50'
                        : 'text-ink-400 hover:text-ink-200'
                    )}
                    title="List View"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {streamingOnly && checkingAvailability && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/60 px-3 py-2 text-xs text-ink-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
                Checking streaming availability in {streamingRegion}… {checkedCount}/{titles.length}
              </div>
            )}

            {/* Content Display: Loading, Error, Empty, or Results */}
            {loading ? (
              <div className={resultGridClass}>
                {Array.from({ length: 18 }).map((_, i) => (
                  <ContentCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-ink-800 bg-ink-900/40 p-8">
                <RotateCcw className="h-10 w-10 text-rose-400 mb-3" />
                <h3 className="text-base font-semibold text-ink-100">Unable to load titles</h3>
                <p className="mt-1 text-xs text-ink-400 max-w-sm">
                  We encountered an issue fetching metadata from the providers.
                </p>
                <button
                  onClick={() => {
                    setError(false);
                    setReloadKey((k) => k + 1);
                  }}
                  className="btn-primary mt-4 text-xs"
                >
                  Try Again
                </button>
              </div>
            ) : titles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-ink-800 p-8">
                <Search className="h-12 w-12 text-ink-600 mb-3" />
                <h3 className="text-base font-medium text-ink-200">No Yuri titles found</h3>
                <p className="mt-1 text-xs text-ink-400 max-w-sm">
                  No matching titles found for your current filter and search combination.
                </p>
                <button onClick={clearAllFilters} className="btn-secondary mt-4 text-xs">
                  Reset Filters
                </button>
              </div>
            ) : streamingOnly && visibleTitles.length === 0 ? (
              checkingAvailability ? (
                <div className={resultGridClass}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <ContentCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-ink-800 p-8">
                  <Globe className="h-12 w-12 text-ink-600 mb-3" />
                  <h3 className="text-base font-medium text-ink-200">
                    Nothing streaming in {streamingRegion}
                  </h3>
                  <p className="mt-1 text-xs text-ink-400 max-w-sm">
                    No titles in this batch have a streaming provider listed there. Change the region
                    in settings, or show all titles.
                  </p>
                  <button
                    onClick={() => updateFilter('streaming', undefined)}
                    className="btn-secondary mt-4 text-xs"
                  >
                    Show all titles
                  </button>
                </div>
              )
            ) : viewMode === 'grid' ? (
              <>
                <div className={resultGridClass}>
                  {visibleTitles.map((item) => (
                    <ContentCard key={item.id} title={item} className="w-full" showAvailability />
                  ))}
                </div>
                {hasNextPage && (
                  <div className="mt-12 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="btn-secondary px-8 py-2.5 text-xs font-medium disabled:opacity-50"
                    >
                      {loadingMore ? 'Loading titles...' : 'Load More Titles'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <ListView titles={visibleTitles} />
                {hasNextPage && (
                  <div className="mt-12 flex justify-center">
                    <button
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="btn-secondary px-8 py-2.5 text-xs font-medium disabled:opacity-50"
                    >
                      {loadingMore ? 'Loading titles...' : 'Load More Titles'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListView({ titles }: { titles: ContentTitle[] }) {
  return (
    <div className="space-y-2.5">
      {titles.map((title) => (
        <Link
          key={title.id}
          to={`/title/${title.id}`}
          className="flex gap-4 rounded-xl border border-ink-800 bg-ink-900 p-3.5 transition-all duration-200 hover:border-ink-700 hover:bg-ink-850 group"
        >
          <img
            src={title.coverImage || getFallbackCover(title.title)}
            alt={title.title}
            loading="lazy"
            className="h-24 w-16 flex-shrink-0 rounded-lg object-cover bg-ink-800"
            onError={(e) => {
              (e.target as HTMLImageElement).src = getFallbackCover(title.title);
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium text-sm text-ink-50 group-hover:text-rose-400 transition-colors line-clamp-1">
                {title.title}
              </h3>
              {title.averageScore && (
                <div className="flex items-center gap-1 rounded bg-ink-800/80 px-1.5 py-0.5 text-[11px] font-medium text-amber-400">
                  <Star className="h-3 w-3 fill-amber-400" />
                  <span>{formatScore(title.averageScore)}</span>
                </div>
              )}
            </div>

            <p className="mt-0.5 text-xs text-ink-400">
              {CONTENT_TYPE_LABELS[title.contentType] || title.contentType} · {title.releaseYear || '—'} · {title.status}
            </p>

            {title.description && (
              <p className="mt-1.5 text-xs text-ink-300 line-clamp-2 leading-relaxed">
                {title.description.replace(/<[^>]*>?/gm, '')}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {title.genres.slice(0, 4).map((g) => (
                <span key={g} className="chip text-[10px] py-0.5 px-2">
                  {g}
                </span>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
