/**
 * How much chapter tracking the library does.
 *
 * Kept beside the tracker itself because it changes what the tracker is asked
 * for: turning badges off should stop the badge count appearing anywhere, and
 * "only what I'm reading" narrows the lookup to `CURRENT` entries so a large
 * read-only library does not spend the per-visit name-resolution budget.
 */
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'yuriorbit:chapter-update-prefs';
const SYNCED_KEY = 'yuriorbit:chapter-update-prefs:synced';
const CHANGE_EVENT = 'yuriorbit:chapter-update-prefs-changed';

export interface ChapterUpdatePrefs {
  /** Show the "N new chapters" chip on cards and the New chapters filter. */
  showBadges: boolean;
  /** Only look for releases on titles marked Currently Reading. */
  onlyReading: boolean;
}

export const DEFAULT_CHAPTER_UPDATE_PREFS: ChapterUpdatePrefs = {
  showBadges: true,
  onlyReading: false,
};

export function readChapterUpdatePrefs(): ChapterUpdatePrefs {
  if (typeof window === 'undefined') return DEFAULT_CHAPTER_UPDATE_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<ChapterUpdatePrefs>) : null;
    return {
      showBadges:
        typeof parsed?.showBadges === 'boolean'
          ? parsed.showBadges
          : DEFAULT_CHAPTER_UPDATE_PREFS.showBadges,
      onlyReading:
        typeof parsed?.onlyReading === 'boolean'
          ? parsed.onlyReading
          : DEFAULT_CHAPTER_UPDATE_PREFS.onlyReading,
    };
  } catch {
    return DEFAULT_CHAPTER_UPDATE_PREFS;
  }
}

export function writeChapterUpdatePrefs(next: ChapterUpdatePrefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Storage blocked: the setting simply does not stick.
  }
}

/**
 * Whether this browser has preferences of its own, i.e. someone moved a switch
 * here. A guest who configured the library should not have those choices wiped by
 * the account defaults the first time they sign in.
 */
export function hasLocalChapterUpdatePrefs(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Whether this browser has already reconciled its preferences with the account.
 * Until it has, the first sign-in pushes local values up rather than pulling the
 * account's down.
 */
export function wasChapterUpdatePrefsSynced(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SYNCED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markChapterUpdatePrefsSynced(): void {
  try {
    window.localStorage.setItem(SYNCED_KEY, '1');
  } catch {
    // Storage blocked: the sync simply runs again on the next visit.
  }
}

/** Reads the stored prefs and re-renders when another view changes them. */
export function useChapterUpdatePrefs() {
  const [prefs, setPrefs] = useState<ChapterUpdatePrefs>(readChapterUpdatePrefs);

  useEffect(() => {
    const sync = () => setPrefs(readChapterUpdatePrefs());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const update = (patch: Partial<ChapterUpdatePrefs>) =>
    writeChapterUpdatePrefs({ ...readChapterUpdatePrefs(), ...patch });

  return [prefs, update] as const;
}
