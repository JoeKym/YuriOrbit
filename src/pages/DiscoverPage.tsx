import { useEffect, useState, useCallback, useMemo } from 'react';
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
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { ContentCard, ContentCardGrid } from '@/components/content/ContentCard';
import { ContentCardSkeleton } from '@/components/content/ContentCard';
import type {
  ContentTitle,
  ContentFilter,
  ContentType,
  ReleaseStatus,
  SourceProvider,
  GLClassification
} from '@/types/content';
import {
  GENRE_LIST,
  SORT_OPTIONS,
  CONTENT_TYPE_LABELS
} from '@/types/content';
import { searchGLTitles } from '@/lib/providers';
import { GL_ALLOWED_CLASSIFICATIONS } from '@/lib/providers/classify';
import { cn, formatScore, getFallbackCover } from '@/lib/utils/format';

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
  { value: 'ALL', label: 'All Statuses' },
  { value: 'RELEASING', label: 'Ongoing / Airing' },
  { value: 'FINISHED', label: 'Completed' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
  { value: 'HIATUS', label: 'On Hiatus' },
];

export function DiscoverPage() {
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

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(false);
      try {
        const result = await searchGLTitles(filter, 1, 24);
        if (cancelled) return;

        const filtered = result.items.filter((t) =>
          filter.classification === 'ALL'
            ? true
            : GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification)
        );

        setTitles(filtered);
        setHasNextPage(result.hasNextPage);
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
  }, [filter]);

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
  if (filter.classification && filter.classification === 'ALL') {
    activeFilters.push({ key: 'gl', label: 'All GL (inc. Subtext)' });
  }

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
        {/* Controls Toolbar: Filters Button, Active Chips, Sort & View Mode */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border transition-all duration-200',
                showFilters
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
                  : 'border-ink-700 bg-ink-900 text-ink-200 hover:bg-ink-850'
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFilters.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFilters.length}
                </span>
              )}
            </button>

            {/* Active Filter Pills */}
            {activeFilters.map((f) => (
              <span key={f.key} className="chip chip-active">
                <span>{f.label}</span>
                <button
                  onClick={() => updateFilter(f.key, undefined)}
                  className="hover:text-rose-100 transition-colors"
                  aria-label={`Remove filter ${f.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {activeFilters.length > 0 && (
              <button
                onClick={clearAllFilters}
                className="btn-ghost text-xs text-rose-400 hover:text-rose-300 py-1 px-2"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Sort Dropdown */}
            <select
              value={filter.sort || 'POPULARITY'}
              onChange={(e) => updateFilter('sort', e.target.value)}
              className="px-3 py-1.5 bg-ink-900 border border-ink-700 rounded-lg text-xs text-ink-200 focus:outline-none focus:border-rose-500/50"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

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

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="mb-6 p-4 md:p-5 rounded-2xl bg-ink-900 border border-ink-800 shadow-xl grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            {/* Genre Selectors */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-2.5">
                Genres & Themes
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                {GENRE_LIST.map((genre) => {
                  const isSelected = filter.genre === genre;
                  return (
                    <button
                      key={genre}
                      onClick={() => updateFilter('genre', isSelected ? undefined : genre)}
                      className={cn(
                        'text-xs px-2.5 py-1 rounded-md transition-all duration-150',
                        isSelected
                          ? 'bg-rose-500 text-white font-medium shadow-sm'
                          : 'bg-ink-850 text-ink-300 hover:bg-ink-800 hover:text-ink-100 border border-ink-800'
                      )}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Release Status & Year */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink-200 mb-2">
                  Publication / Airing Status
                </label>
                <div className="flex flex-col gap-1.5">
                  {STATUS_OPTIONS.map((status) => {
                    const isSelected =
                      filter.status === status.value ||
                      (!filter.status && status.value === 'ALL');

                    return (
                      <button
                        key={status.value}
                        onClick={() =>
                          updateFilter(
                            'status',
                            status.value === 'ALL' ? undefined : status.value
                          )
                        }
                        className={cn(
                          'text-left text-xs px-3 py-1.5 rounded-lg transition-colors',
                          isSelected
                            ? 'bg-ink-800 text-rose-300 font-medium border border-rose-500/20'
                            : 'text-ink-400 hover:bg-ink-850 hover:text-ink-200'
                        )}
                      >
                        {status.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-200 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 text-ink-400" />
                  <span>Release Year</span>
                </label>
                <input
                  type="number"
                  min="1970"
                  max="2030"
                  value={filter.year || ''}
                  onChange={(e) => updateFilter('year', e.target.value)}
                  placeholder="e.g. 2024"
                  className="input-field py-1.5 text-xs max-w-[140px]"
                />
              </div>
            </div>

            {/* GL Focus & Classification */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-2.5">
                Girls' Love Classification
              </label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => updateFilter('gl', 'CONFIRMED_GL')}
                  className={cn(
                    'text-left text-xs p-3 rounded-xl border transition-all duration-200',
                    filter.classification !== 'ALL'
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-200 font-medium'
                      : 'bg-ink-850/60 border-ink-800 text-ink-400 hover:text-ink-200'
                  )}
                >
                  <div className="font-semibold text-ink-100 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-rose-400" />
                    <span>Confirmed GL Only</span>
                  </div>
                  <p className="text-[11px] text-ink-400 mt-1 leading-relaxed">
                    Canonical romantic Girls' Love, Shoujo Ai, and Yuri relationships.
                  </p>
                </button>

                <button
                  onClick={() => updateFilter('gl', 'ALL')}
                  className={cn(
                    'text-left text-xs p-3 rounded-xl border transition-all duration-200',
                    filter.classification === 'ALL'
                      ? 'bg-rose-500/10 border-rose-500/40 text-rose-200 font-medium'
                      : 'bg-ink-850/60 border-ink-800 text-ink-400 hover:text-ink-200'
                  )}
                >
                  <div className="font-semibold text-ink-100">
                    Include Subtext & GL-Adjacent
                  </div>
                  <p className="text-[11px] text-ink-400 mt-1 leading-relaxed">
                    Includes strong romantic subtext, queer themes, and GL side-couples.
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Display: Loading, Error, Empty, or Results */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
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
                setSearchParams(new URLSearchParams(searchParams));
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
        ) : viewMode === 'grid' ? (
          <>
            <ContentCardGrid titles={titles} />
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
            <ListView titles={titles} />
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
