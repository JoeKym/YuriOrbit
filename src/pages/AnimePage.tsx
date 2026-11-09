import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Film, RotateCcw, Search, Sparkles, Tv } from 'lucide-react';
import { ContentCardGrid, ContentCardSkeleton } from '@/components/content/ContentCard';
import { LoadMoreButton } from '@/components/content/LoadMoreButton';
import type { ContentType, PaginatedResult } from '@/types/content';
import { searchGLTitles } from '@/lib/providers';
import { usePaginatedTitles } from '@/hooks/usePaginatedTitles';
import { cn } from '@/lib/utils/format';

type AnimeTab = 'ALL' | 'TV' | 'MOVIE';

const TABS: { value: AnimeTab; label: string; icon: typeof Tv }[] = [
  { value: 'ALL', label: 'Everything', icon: Sparkles },
  { value: 'TV', label: 'Series & OVA', icon: Tv },
  { value: 'MOVIE', label: 'Films', icon: Film },
];

const PER_PAGE = 24;

/** One page of anime for a tab. "Everything" merges series and films. */
async function fetchAnimePage(tab: AnimeTab, page: number): Promise<PaginatedResult> {
  if (tab !== 'ALL') {
    return searchGLTitles({ contentType: tab as ContentType }, page, PER_PAGE);
  }

  const [series, films] = await Promise.all([
    searchGLTitles({ contentType: 'TV' }, page, PER_PAGE / 2),
    searchGLTitles({ contentType: 'MOVIE' }, page, PER_PAGE / 2),
  ]);

  return {
    items: [...series.items, ...films.items],
    page,
    perPage: PER_PAGE,
    total: (series.total ?? 0) + (films.total ?? 0),
    hasNextPage: series.hasNextPage || films.hasNextPage,
  };
}

export function AnimePage() {
  const [tab, setTab] = useState<AnimeTab>('ALL');
  const feed = usePaginatedTitles((page) => fetchAnimePage(tab, page), tab);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <div className="mb-6">
        <h1 className="mb-1 font-display text-3xl font-semibold text-ink-50">GL Anime</h1>
        <p className="text-sm text-ink-400">
          Yuri and Girls' Love anime — TV series, OVAs, ONAs and films across every studio.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        {TABS.map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.value;
          return (
            <button
              key={item.value}
              onClick={() => setTab(item.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/20'
                  : 'border border-ink-800 bg-ink-900 text-ink-300 hover:bg-ink-850 hover:text-ink-100'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
        {!feed.loading && !feed.error && (
          <span className="ml-auto text-xs text-ink-400">
            {feed.titles.length} title{feed.titles.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {feed.loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 14 }).map((_, i) => (
            <ContentCardSkeleton key={i} />
          ))}
        </div>
      ) : feed.error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-800 bg-ink-900/40 p-8 py-20 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-rose-400" />
          <h3 className="text-base font-semibold text-ink-100">Unable to load anime</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-400">
            We encountered a network or rate limit issue fetching anime metadata.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={feed.reload}
              className="btn-primary flex items-center gap-1.5 text-xs"
            >
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
          <h3 className="text-base font-medium text-ink-200">No anime in this category yet</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-400">
            This filter does not have enough classified GL titles right now.
          </p>
          <Link to="/discover" className="btn-secondary mt-4 text-xs">
            Browse all GL
          </Link>
        </div>
      ) : (
        <>
          <ContentCardGrid titles={feed.titles} />
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
