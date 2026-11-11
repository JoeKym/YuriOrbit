import { useSyncExternalStore } from 'react';
import { getWatchRegion, subscribeWatchRegion } from '@/lib/content/watch-region';

/** The visitor's chosen streaming region, re-rendering when it changes. */
export function useWatchRegion(): string | null {
  return useSyncExternalStore(subscribeWatchRegion, getWatchRegion, () => null);
}
