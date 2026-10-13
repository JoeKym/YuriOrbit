import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Search, X, Grid3x3, List } from 'lucide-react';
import { ContentCardGrid } from '@/components/content/ContentCard';
import { ContentCardSkeleton } from '@/components/content/ContentCard';
import type { ContentTitle, ContentFilter, ContentType, ReleaseStatus, SourceProvider } from '@/types/content';
import { GENRE_LIST, SORT_OPTIONS, CONTENT_TYPE_LABELS } from '@/types/content';
import { searchGLTitles } from '@/lib/providers';
import { GL_ALLOWED_CLASSIFICATIONS } from '@/lib/providers/classify';
import { cn } from '@/lib/utils/format';

const CONTENT_TYPES: (ContentType | 'ALL')[] = ['ALL', 'MANGA', 'MANHWA', 'MANHUA', 'WEBTOON', 'LIGHT_NOVEL', 'MOVIE', 'TV'];
const STATUSES: (ReleaseStatus | 'ALL')[] = ['ALL', 'RELEASING', 'FINISHED', 'NOT_YET_RELEASED', 'HIATUS'];

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

  const filter: ContentFilter = {
    query: searchParams.get('q') || undefined,
    contentType: (searchParams.get('type') as ContentType | 'ALL') || 'ALL',
    genre: searchParams.get('genre') || undefined,
    year: searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined,
    status: (searchParams.get('status') as ReleaseStatus | 'ALL') || 'ALL',
    source: (searchParams.get('source') as SourceProvider | 'ALL') || 'ALL',
    sort: (searchParams.get('sort') as ContentFilter['sort']) || 'POPULARITY',
    classification: 'CONFIRMED_GL',
  };

  const updateFilter = useCallback((key: string, value: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== 'ALL' && value !== '') next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
    setPage(1);
  }, [searchParams, setSearchParams]);

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams());
    setPage(1);
  }, [setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const result = await searchGLTitles(filter, 1, 24);
        if (cancelled) return;
        const filtered = result.items.filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification));
        setTitles(filtered);
        setHasNextPage(result.hasNextPage);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [filter.query, filter.contentType, filter.genre, filter.year, filter.status, filter.sort]);

  const loadMore = async () => {
    if (loadingMore || !hasNextPage) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const result = await searchGLTitles(filter, next, 24);
      const filtered = result.items.filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification));
      setTitles((prev) => [...prev, ...filtered]);
      setPage(next);
      setHasNextPage(result.hasNextPage);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (filter.query) activeFilters.push({ key: 'q', label: `Search: ${filter.query}`, value: filter.query });
  if (filter.contentType && filter.contentType !== 'ALL') activeFilters.push({ key: 'type', label: CONTENT_TYPE_LABELS[filter.contentType as ContentType], value: filter.contentType });
  if (filter.genre) activeFilters.push({ key: 'genre', label: filter.genre, value: filter.genre });
  if (filter.year) activeFilters.push({ key: 'year', label: String(filter.year), value: String(filter.year) });
  if (filter.status && filter.status !== 'ALL') activeFilters.push({ key: 'status', label: filter.status, value: filter.status });

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-ink-50">Discover GL</h1>
        <p className="mt-1 text-sm text-ink-400">Browse and filter Girls' Love content across all formats.</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            defaultValue={filter.query || ''}
            onChange={(e) => updateFilter('q', e.target.value)}
            placeholder="Search by title..."
            className="w-full rounded-lg border border-ink-700 bg-ink-850 py-2.5 pl-9 pr-3 text-sm text-ink-50 placeholder:text-ink-400 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
          />
        </div>
        <select
          value={filter.sort}
          onChange={(e) => updateFilter('sort', e.target.value)}
          className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2.5 text-sm text-ink-50 focus:border-rose-500/50 focus:outline-none"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn-secondary"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
        <div className="flex rounded-lg border border-ink-700 bg-ink-850">
          <button
            onClick={() => setViewMode('grid')}
            className={cn('rounded-l-lg p-2.5 transition-colors', viewMode === 'grid' ? 'bg-rose-500/15 text-rose-400' : 'text-ink-400 hover:text-ink-200')}
            aria-label="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn('rounded-r-lg p-2.5 transition-colors', viewMode === 'list' ? 'bg-rose-500/15 text-rose-400' : 'text-ink-400 hover:text-ink-200')}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-6 grid gap-4 rounded-xl border border-ink-800 bg-ink-900 p-4 animate-fade-in-fast md:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">Content Type</label>
            <select
              value={filter.contentType || 'ALL'}
              onChange={(e) => updateFilter('type', e.target.value)}
              className="input-field"
            >
              {CONTENT_TYPES.map((t) => (
                <option key={t} value={t}>{t === 'ALL' ? 'All Types' : CONTENT_TYPE_LABELS[t as ContentType]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">Genre</label>
            <select
              value={filter.genre || ''}
              onChange={(e) => updateFilter('genre', e.target.value)}
              className="input-field"
            >
              <option value="">All Genres</option>
              {GENRE_LIST.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">Year</label>
            <input
              type="number"
              min="1970"
              max={new Date().getFullYear() + 1}
              value={filter.year || ''}
              onChange={(e) => updateFilter('year', e.target.value)}
              placeholder="Any year"
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">Status</label>
            <select
              value={filter.status || 'ALL'}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="input-field"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s === 'ALL' ? 'Any Status' : s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <span key={f.key} className="chip chip-active">
              {f.label}
              <button onClick={() => updateFilter(f.key, undefined)} className="ml-1 hover:text-rose-200">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button onClick={clearAll} className="btn-ghost text-xs">Clear all</button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 14 }).map((_, i) => <ContentCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-ink-400 mb-4">Something went wrong while loading content.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Try again</button>
        </div>
      ) : titles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="mb-4 h-12 w-12 text-ink-600" />
          <p className="text-lg font-medium text-ink-200">No titles found</p>
          <p className="mt-1 text-sm text-ink-400">Try adjusting your filters or search terms.</p>
          <button onClick={clearAll} className="btn-secondary mt-4">Clear filters</button>
        </div>
      ) : viewMode === 'grid' ? (
        <>
          <ContentCardGrid titles={titles} />
          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <button onClick={loadMore} disabled={loadingMore} className="btn-secondary">
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      ) : (
        <ListView titles={titles} />
      )}
    </div>
  );
}

function ListView({ titles }: { titles: ContentTitle[] }) {
  return (
    <div className="space-y-2">
      {titles.map((title) => (
        <a
          key={title.id}
          href={`/title/${title.id}`}
          className="flex gap-4 rounded-xl border border-ink-800 bg-ink-900 p-3 transition-all duration-200 hover:border-ink-700 hover:bg-ink-850"
        >
          <img
            src={title.coverImage}
            alt={title.title}
            loading="lazy"
            className="h-20 w-14 flex-shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-ink-50 truncate">{title.title}</h3>
            <p className="mt-0.5 text-xs text-ink-400">{CONTENT_TYPE_LABELS[title.contentType]} · {title.releaseYear || '—'}</p>
            {title.description && <p className="mt-1 text-sm text-ink-300 line-clamp-2">{title.description}</p>}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {title.genres.slice(0, 3).map((g) => (
                <span key={g} className="chip text-[10px]">{g}</span>
              ))}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
