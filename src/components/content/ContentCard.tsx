import { Link } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import type { ContentTitle } from '@/types/content';
import { CONTENT_TYPE_LABELS } from '@/types/content';
import { cn, formatScore, getFallbackCover } from '@/lib/utils/format';
import { useLibrary } from '@/hooks/useLibrary';

interface ContentCardProps {
  title: ContentTitle;
  className?: string;
}

export function ContentCard({ title, className }: ContentCardProps) {
  const { isInLibrary, addToLibrary, removeFromLibrary } = useLibrary();
  const saved = isInLibrary(title.id);

  return (
    <Link
      to={`/title/${title.id}`}
      className={cn(
        'group relative block flex-shrink-0 w-[140px] md:w-[170px]',
        'transition-transform duration-200 ease-smooth hover:z-10',
        className
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-ink-850 shadow-card transition-all duration-300 group-hover:shadow-card-hover group-hover:ring-1 group-hover:ring-rose-500/20">
        <img
          src={title.coverImage || getFallbackCover(title.title)}
          alt={title.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getFallbackCover(title.title);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent opacity-80" />

        <div className="absolute top-2 left-2">
          <span className="rounded-md bg-ink-950/80 px-2 py-0.5 text-[10px] font-medium text-ink-200 backdrop-blur-sm">
            {CONTENT_TYPE_LABELS[title.contentType]}
          </span>
        </div>

        {title.averageScore && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 backdrop-blur-sm">
            <Star className="h-3 w-3 fill-amber-400" />
            {formatScore(title.averageScore)}
          </div>
        )}

        <button
          onClick={(e) => {
            e.preventDefault();
            if (saved) removeFromLibrary(title.id);
            else addToLibrary(title, 'FAVOURITE');
          }}
          className="absolute bottom-2 right-2 rounded-full bg-ink-950/80 p-1.5 backdrop-blur-sm transition-all duration-200 hover:bg-ink-900"
          aria-label={saved ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart
            className={cn('h-4 w-4 transition-colors', saved ? 'fill-rose-500 text-rose-500' : 'text-ink-300')}
          />
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="line-clamp-2 text-sm font-medium text-ink-50 leading-tight">
            {title.title}
          </h3>
          {title.releaseYear && (
            <p className="mt-0.5 text-[11px] text-ink-300">{title.releaseYear}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ContentCardSkeleton() {
  return (
    <div className="w-[140px] md:w-[170px] flex-shrink-0">
      <div className="skeleton aspect-[3/4] rounded-xl" />
    </div>
  );
}

export function ContentCardGrid({ titles, className }: { titles: ContentTitle[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7', className)}>
      {titles.map((title) => (
        <ContentCard key={title.id} title={title} className="w-full" />
      ))}
    </div>
  );
}
