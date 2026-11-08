import { Link } from 'react-router-dom';
import { Heart, Star, BookOpen, Check, Bookmark } from 'lucide-react';
import type { ContentTitle } from '@/types/content';
import { CONTENT_TYPE_LABELS } from '@/types/content';
import { cn, formatScore, getFallbackCover } from '@/lib/utils/format';
import { useLibrary } from '@/hooks/useLibrary';
import { titleKey } from '@/lib/catalog/identity';
import { maturityOf } from '@/lib/content/maturity';

interface ContentCardProps {
  title: ContentTitle;
  className?: string;
}

function formatCount(num?: number): string | null {
  if (!num || num <= 0) return null;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

function getStatusIndicator(status?: string): { label: string; dotClass: string; bgClass: string } {
  switch (status) {
    case 'RELEASING':
      return {
        label: 'Ongoing',
        dotClass: 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]',
        bgClass: 'border-emerald-500/30 bg-emerald-950/60 text-emerald-300',
      };
    case 'FINISHED':
      return {
        label: 'Completed',
        dotClass: 'bg-sky-400',
        bgClass: 'border-sky-500/30 bg-sky-950/60 text-sky-300',
      };
    case 'HIATUS':
      return {
        label: 'Hiatus',
        dotClass: 'bg-amber-400',
        bgClass: 'border-amber-500/30 bg-amber-950/60 text-amber-300',
      };
    case 'NOT_YET_RELEASED':
      return {
        label: 'Upcoming',
        dotClass: 'bg-purple-400',
        bgClass: 'border-purple-500/30 bg-purple-950/60 text-purple-300',
      };
    default:
      return {
        label: '',
        dotClass: '',
        bgClass: '',
      };
  }
}

export function ContentCard({ title, className }: ContentCardProps) {
  const { library, addToLibrary, removeFromLibrary } = useLibrary();

  const savedEntry =
    library.find((entry) => entry.titleId === title.id) ??
    library.find((entry) => titleKey(entry.title) === titleKey(title.title));
  const saved = Boolean(savedEntry);

  const maturity = maturityOf(title);
  const maturityBadge =
    maturity === 'SUGGESTIVE'
      ? { label: 'PG', className: 'border-amber-500/40 bg-amber-500/20 text-amber-200' }
      : maturity === 'SAFE'
        ? null
        : { label: '18+', className: 'border-rose-500/50 bg-rose-600/30 text-rose-100' };

  const statusInfo = getStatusIndicator(title.status);
  const popularFormatted = formatCount(title.popularity);
  const primaryGenre = title.genres && title.genres.length > 0 ? title.genres[0] : null;

  const contentFormatLabel = CONTENT_TYPE_LABELS[title.contentType] || title.contentType;

  // Chapter or episode label if available
  const countLabel = title.chapters
    ? `Ch. ${title.chapters}`
    : title.episodes
      ? `${title.episodes} Ep.`
      : null;

  return (
    <Link
      to={`/title/${title.id}`}
      className={cn(
        'group relative block flex-shrink-0 w-[145px] sm:w-[165px] md:w-[185px]',
        'transition-all duration-300 ease-out hover:-translate-y-1 hover:z-20',
        className
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink-900 shadow-card transition-all duration-300 group-hover:shadow-card-hover group-hover:ring-1 group-hover:ring-rose-500/30">
        {/* Cover Art */}
        <img
          src={title.coverImage || getFallbackCover(title.title)}
          alt={title.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getFallbackCover(title.title);
          }}
        />

        {/* Resting Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/20 pointer-events-none" />

        {/* Top Badges Bar */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none">
          {/* Format & Maturity Tag Group */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="rounded-md border border-white/10 bg-ink-950/80 px-2 py-0.5 text-[10px] font-semibold text-ink-100 backdrop-blur-md shadow-sm">
              {contentFormatLabel}
            </span>

            {title.country && ['TH', 'JP', 'KR', 'CN', 'TW'].includes(title.country) && (
              <span className="rounded-md border border-white/10 bg-ink-950/80 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 backdrop-blur-md">
                {title.country}
              </span>
            )}

            {maturityBadge && (
              <span className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-bold backdrop-blur-md', maturityBadge.className)}>
                {maturityBadge.label}
              </span>
            )}
          </div>

          {/* Score Badge */}
          {title.averageScore ? (
            <div className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-ink-950/85 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 backdrop-blur-md shadow-sm">
              <Star className="h-3 w-3 fill-amber-400" />
              {formatScore(title.averageScore)}
            </div>
          ) : null}
        </div>

        {/* Quick Save (Heart) Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (savedEntry) removeFromLibrary(savedEntry.titleId);
            else addToLibrary(title, 'FAVOURITE');
          }}
          className={cn(
            'absolute top-9 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full',
            'border border-white/10 bg-ink-950/80 backdrop-blur-md shadow-md transition-all duration-200',
            'hover:scale-110 active:scale-95',
            saved
              ? 'border-rose-500/40 bg-rose-950/70 text-rose-400'
              : 'text-ink-300 hover:text-white hover:bg-ink-900'
          )}
          aria-label={saved ? 'Remove from library' : 'Save to library'}
          title={saved ? 'Saved in library' : 'Add to library'}
        >
          <Heart
            className={cn('h-3.5 w-3.5 transition-colors', saved ? 'fill-rose-500 text-rose-500' : '')}
          />
        </button>

        {/* Bottom Metadata & Title (Resting State) */}
        <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col justify-end transition-transform duration-300 group-hover:-translate-y-1">
          {/* Status Indicator & Format details */}
          <div className="flex items-center gap-2 mb-1 text-[11px] font-medium text-ink-300">
            {statusInfo.label && (
              <span className="flex items-center gap-1">
                <span className={cn('h-1.5 w-1.5 rounded-full', statusInfo.dotClass)} />
                <span className="text-[10px] text-ink-300">{statusInfo.label}</span>
              </span>
            )}
            {countLabel && (
              <>
                <span className="text-ink-600">•</span>
                <span className="text-[10px] text-ink-400">{countLabel}</span>
              </>
            )}
            {primaryGenre && (
              <>
                <span className="text-ink-600">•</span>
                <span className="text-[10px] text-rose-400 font-semibold truncate">{primaryGenre}</span>
              </>
            )}
          </div>

          {/* Title Header */}
          <h3 className="line-clamp-2 text-sm font-semibold text-ink-50 leading-snug tracking-tight group-hover:text-rose-200 transition-colors">
            {title.title}
          </h3>

          {/* Year & Metric line */}
          <div className="mt-1 flex items-center justify-between text-[11px] text-ink-400">
            {title.releaseYear ? <span>{title.releaseYear}</span> : <span />}
            {popularFormatted && (
              <span className="text-[10px] text-ink-400 font-mono">
                {popularFormatted} readers
              </span>
            )}
          </div>
        </div>

        {/* Hover Action & Synopsis Overlay (Reveals on Hover) */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-3 bg-gradient-to-t from-ink-950 via-ink-950/90 to-ink-950/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
          <div className="space-y-2">
            {/* Tag Pills */}
            <div className="flex items-center gap-1 flex-wrap">
              {title.genres?.slice(0, 2).map((g) => (
                <span
                  key={g}
                  className="rounded-full bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[9px] font-semibold text-rose-300"
                >
                  {g}
                </span>
              ))}
              {statusInfo.label && (
                <span className={cn('rounded-full border px-2 py-0.5 text-[9px] font-semibold flex items-center gap-1', statusInfo.bgClass)}>
                  <span className={cn('h-1 w-1 rounded-full', statusInfo.dotClass)} />
                  {statusInfo.label}
                </span>
              )}
            </div>

            {/* Title */}
            <h4 className="line-clamp-1 text-sm font-bold text-white leading-tight">
              {title.title}
            </h4>

            {/* Synopsis Teaser snippet */}
            {title.description ? (
              <p className="line-clamp-3 text-[11px] text-ink-200/90 leading-relaxed font-sans">
                {title.description.replace(/<[^>]*>/g, '')}
              </p>
            ) : null}

            {/* Quick Action Button */}
            <div className="pt-1 flex items-center gap-2">
              <span className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-rose-500">
                <BookOpen className="h-3.5 w-3.5" />
                <span>View Title</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ContentCardSkeleton() {
  return (
    <div className="w-[145px] sm:w-[165px] md:w-[185px] flex-shrink-0">
      <div className="skeleton aspect-[3/4] rounded-2xl" />
    </div>
  );
}

export function ContentCardGrid({ titles, className }: { titles: ContentTitle[]; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7', className)}>
      {titles.map((title) => (
        <ContentCard key={title.id} title={title} className="w-full" />
      ))}
    </div>
  );
}
