import type { ContentType, LibraryStatus } from '@/types/content';

export function isLiveActionType(type?: ContentType | string | null): boolean {
  return type === 'TV' || type === 'MOVIE' || type === 'DRAMA';
}

export function isVideoType(type?: ContentType | string | null): boolean {
  return isLiveActionType(type);
}

export function getReleaseStatusDisplay(status?: string | null, contentType?: ContentType | string | null): { label: string; color: string } {
  const live = isLiveActionType(contentType);
  switch (status) {
    case 'RELEASING':
      return live ? { label: 'Airing', color: 'text-accent-400' } : { label: 'Ongoing', color: 'text-accent-400' };
    case 'FINISHED':
      return live ? { label: 'Ended', color: 'text-ink-300' } : { label: 'Completed', color: 'text-ink-300' };
    case 'NOT_YET_RELEASED':
      return live ? { label: 'Coming Soon', color: 'text-lavender-400' } : { label: 'Upcoming', color: 'text-lavender-400' };
    case 'HIATUS':
      return { label: 'On Break', color: 'text-amber-400' };
    case 'CANCELLED':
      return { label: 'Canceled', color: 'text-red-400' };
    default:
      return { label: status ? String(status) : 'Unknown', color: 'text-ink-400' };
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
