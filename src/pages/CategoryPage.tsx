import { Link } from 'react-router-dom';
import { AlertCircle, RotateCcw, Search } from 'lucide-react';
import { ContentCardGrid, ContentCardSkeleton } from '@/components/content/ContentCard';
import { LoadMoreButton } from '@/components/content/LoadMoreButton';
import type { ContentType } from '@/types/content';
import { searchGLTitles } from '@/lib/providers';
import { usePaginatedTitles } from '@/hooks/usePaginatedTitles';
import { usePageMeta } from '@/hooks/usePageMeta';

interface CategoryPageProps {
  contentType: ContentType;
  title: string;
}

const PER_PAGE = 30;

export function CategoryPage({ contentType, title }: CategoryPageProps) {
  usePageMeta({
    title,
    description: `Browse curated ${title.toLowerCase()} on YuriOrbit.`,
    path: window.location.pathname,
  });
  const feed = usePaginatedTitles(
    (page) => searchGLTitles({ contentType }, page, PER_PAGE),
    contentType
  );

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <h1 className="mb-1 font-display text-3xl font-semibold text-ink-50">{title}</h1>
      <p className="mb-6 text-sm text-ink-400">
        Browse curated {title.toLowerCase()} across our connected catalogues.
      </p>

      {feed.loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 14 }).map((_, i) => <ContentCardSkeleton key={i} />)}
        </div>
      ) : feed.error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-ink-800 bg-ink-900/40 p-8">
          <AlertCircle className="h-10 w-10 text-rose-400 mb-3" />
          <h3 className="text-base font-semibold text-ink-100">Unable to load {title.toLowerCase()}</h3>
          <p className="mt-1 text-xs text-ink-400 max-w-sm">
            We encountered a network or rate limit issue fetching content.
          </p>
          <div className="mt-4 flex gap-3">
            <button onClick={feed.reload} className="btn-primary text-xs flex items-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Try Again
            </button>
            <Link to="/discover" className="btn-secondary text-xs">Browse Discovery</Link>
          </div>
        </div>
      ) : feed.titles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-ink-800 p-8">
          <Search className="h-10 w-10 text-ink-600 mb-3" />
          <h3 className="text-base font-medium text-ink-200">No {title.toLowerCase()} found</h3>
          <p className="mt-1 text-xs text-ink-400 max-w-sm">
            This category does not have enough classified GL content yet.
          </p>
          <Link to="/discover" className="btn-secondary mt-4 text-xs">Browse all GL</Link>
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
