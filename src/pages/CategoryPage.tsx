import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { ContentCardGrid, ContentCardSkeleton } from '@/components/content/ContentCard';
import { LoadMoreButton } from '@/components/content/LoadMoreButton';
import type { ContentType, ReleaseStatus } from '@/types/content';
import { searchGLTitles } from '@/lib/providers';
import { usePaginatedTitles } from '@/hooks/usePaginatedTitles';
import { usePageMeta } from '@/hooks/usePageMeta';
import { cn } from '@/lib/utils/format';

interface CategoryPageProps {
  contentType: ContentType;
  title: string;
}

const PER_PAGE = 30;
const STATUS_OPTIONS: { value: ReleaseStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'RELEASING', label: 'Ongoing' },
  { value: 'FINISHED', label: 'Completed' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
  { value: 'HIATUS', label: 'Hiatus' },
];

export function CategoryPage({ contentType, title }: CategoryPageProps) {
  usePageMeta({
    title,
    description: `Browse curated ${title.toLowerCase()} on YuriOrbit.`,
    path: window.location.pathname,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ReleaseStatus | 'ALL'>('ALL');
  const [sort, setSort] = useState<'POPULARITY' | 'TRENDING' | 'SCORE' | 'UPDATED_AT'>('POPULARITY');

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

  const displayed = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return feed.titles;
    return feed.titles.filter((t) => {
      const hay = `${t.title} ${t.altTitles?.join(' ') || ''} ${t.genres?.join(' ') || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [feed.titles, query]);

  const hasFilters = !!query.trim() || status !== 'ALL' || sort !== 'POPULARITY';

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-3xl font-semibold text-ink-50">{title}</h1>
          <p className="text-sm text-ink-400">Browse curated {title.toLowerCase()} across our connected catalogues.</p>
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium',
            showFilters || hasFilters
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              : 'border-ink-700 bg-ink-900 text-ink-200 hover:bg-ink-850'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 grid gap-3 rounded-2xl border border-ink-800 bg-ink-900/60 p-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] text-ink-400">Refine loaded titles</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title, alt name, genre…"
                className="input-field pl-9 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ReleaseStatus | 'ALL')}
              className="input-field text-xs"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="input-field text-xs"
            >
              <option value="POPULARITY">Popularity</option>
              <option value="TRENDING">Trending</option>
              <option value="SCORE">Score</option>
              <option value="UPDATED_AT">Recently updated</option>
            </select>
          </div>
          {hasFilters && (
            <div className="md:col-span-4">
              <button
                onClick={() => {
                  setQuery('');
                  setStatus('ALL');
                  setSort('POPULARITY');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200"
              >
                <X className="h-3.5 w-3.5" /> Reset filters
              </button>
            </div>
          )}
        </div>
      )}

      {feed.loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
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
          {query.trim() && (
            <p className="mb-3 text-xs text-ink-400">
              Showing {displayed.length} of {feed.titles.length} loaded titles matching "{query.trim()}".
            </p>
          )}
          <ContentCardGrid titles={displayed} />
          <LoadMoreButton
            onClick={feed.loadMore}
            loading={feed.loadingMore}
            hasMore={feed.hasNextPage}
            count={feed.titles.length}
          />
        </>
      )}
    </div>
  );
}
