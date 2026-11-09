import type { ContentType, ReleaseStatus } from '@/types/content';

export function isLiveActionType(contentType?: ContentType): boolean {
  return contentType === 'TV' || contentType === 'MOVIE';
}

export function getStatusDisplay(status?: ReleaseStatus | string, contentType?: ContentType): { label: string; dotClass: string; bgClass: string } {
  const live = isLiveActionType(contentType);
  const base = (label: string, dotClass: string, bgClass: string) => ({ label, dotClass, bgClass });
  switch (status) {
    case 'RELEASING':
      return live
        ? base('Airing', 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]', 'border-emerald-500/30 bg-emerald-950/60 text-emerald-300')
        : base('Ongoing', 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]', 'border-emerald-500/30 bg-emerald-950/60 text-emerald-300');
    case 'FINISHED':
      return live
        ? (contentType === 'MOVIE'
            ? base('Released', 'bg-sky-400', 'border-sky-500/30 bg-sky-950/60 text-sky-300')
            : base('Ended', 'bg-sky-400', 'border-sky-500/30 bg-sky-950/60 text-sky-300'))
        : base('Completed', 'bg-sky-400', 'border-sky-500/30 bg-sky-950/60 text-sky-300');
    case 'HIATUS':
      return live
        ? base('On Break', 'bg-amber-400', 'border-amber-500/30 bg-amber-950/60 text-amber-300')
        : base('Hiatus', 'bg-amber-400', 'border-amber-500/30 bg-amber-950/60 text-amber-300');
    case 'NOT_YET_RELEASED':
      return live
        ? base('Coming Soon', 'bg-purple-400', 'border-purple-500/30 bg-purple-950/60 text-purple-300')
        : base('Upcoming', 'bg-purple-400', 'border-purple-500/30 bg-purple-950/60 text-purple-300');
    case 'CANCELLED':
      return base('Canceled', 'bg-rose-400', 'border-rose-500/30 bg-rose-950/60 text-rose-300');
    default:
      return { label: '', dotClass: '', bgClass: '' };
  }
}
