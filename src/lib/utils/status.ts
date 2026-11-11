import type { ContentType, LibraryStatus } from '@/types/content';

export function isLiveActionType(type?: ContentType | string | null): boolean {
  return type === 'TV' || type === 'MOVIE' || type === 'DRAMA';
}

export function isVideoType(type?: ContentType | string | null): boolean {
  return isLiveActionType(type);
}

export interface ReleaseStatusDisplay {
  label: string;
  color: string;
  /** Dot colour for compact status indicators. */
  dotClass: string;
  /** Chip background, border and text for overlay badges. */
  bgClass: string;
}

export function getReleaseStatusDisplay(
  status?: string | null,
  contentType?: ContentType | string | null
): ReleaseStatusDisplay {
  const live = isLiveActionType(contentType);
  switch (status) {
    case 'RELEASING':
      return {
        label: live ? 'Airing' : 'Ongoing',
        color: 'text-accent-400',
        dotClass: 'bg-accent-400',
        bgClass: 'border-accent-500/30 bg-accent-500/10 text-accent-300',
      };
    case 'FINISHED':
      return {
        label: live ? 'Ended' : 'Completed',
        color: 'text-ink-300',
        dotClass: 'bg-ink-400',
        bgClass: 'border-ink-700 bg-ink-850 text-ink-300',
      };
    case 'NOT_YET_RELEASED':
      return {
        label: live ? 'Coming Soon' : 'Upcoming',
        color: 'text-lavender-400',
        dotClass: 'bg-lavender-400',
        bgClass: 'border-lavender-500/30 bg-lavender-500/10 text-lavender-300',
      };
    case 'HIATUS':
      return {
        label: 'On Break',
        color: 'text-amber-400',
        dotClass: 'bg-amber-400',
        bgClass: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      };
    case 'CANCELLED':
      return {
        label: 'Canceled',
        color: 'text-red-400',
        dotClass: 'bg-red-400',
        bgClass: 'border-red-500/30 bg-red-500/10 text-red-300',
      };
    default:
      return {
        label: status ? String(status) : 'Unknown',
        color: 'text-ink-400',
        dotClass: 'bg-ink-500',
        bgClass: 'border-ink-700 bg-ink-850 text-ink-300',
      };
  }
}

// Back-compat name used by updated components
export const getStatusDisplay = getReleaseStatusDisplay;

export function getLibraryStatusLabel(status: LibraryStatus, contentType?: ContentType | string | null): string {
  const video = isVideoType(contentType);
  switch (status) {
    case 'CURRENT':
      return video ? 'Currently Watching' : 'Currently Reading';
    case 'PLANNED':
      return video ? 'Plan to Watch' : 'Plan to Read';
    case 'COMPLETED':
      return 'Completed';
    case 'ON_HOLD':
      return 'On Hold';
    case 'DROPPED':
      return 'Dropped';
    case 'FAVOURITE':
      return 'Favourites';
    default:
      return String(status);
  }
}

export function getLibraryStatusFilterLabel(status: LibraryStatus | 'ALL'): string {
  if (status === 'ALL') return 'All';
  switch (status) {
    case 'CURRENT':
      return 'In Progress';
    case 'PLANNED':
      return 'Planned';
    case 'COMPLETED':
      return 'Completed';
    case 'ON_HOLD':
      return 'On Hold';
    case 'DROPPED':
      return 'Dropped';
    case 'FAVOURITE':
      return 'Favourites';
    default:
      return String(status);
  }
}
