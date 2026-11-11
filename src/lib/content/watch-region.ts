/**
 * The visitor's streaming region preference.
 *
 * It lives in `localStorage` as a cache, and — for signed-in visitors — on their
 * profile row (`profiles.watch_region`). `null` means "detect automatically".
 */
export const WATCH_REGION_STORAGE_KEY = 'yuriorbit_watch_region';

export function readStoredWatchRegion(): string | null {
  try {
    const value = localStorage.getItem(WATCH_REGION_STORAGE_KEY);
    return value && /^[A-Z]{2}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeStoredWatchRegion(region: string | null): void {
  try {
    if (region) localStorage.setItem(WATCH_REGION_STORAGE_KEY, region);
    else localStorage.removeItem(WATCH_REGION_STORAGE_KEY);
  } catch {
    /* Private mode or storage disabled: the choice just won't persist. */
  }
}
