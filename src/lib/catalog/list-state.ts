/**
 * How far into a filtered list the visitor had read, kept per filter
 * combination so returning from a title page lands in the same place.
 * Shared by the format pages and Discover.
 */
export interface ListState {
  pages: number;
  scrollY: number;
}

const LIST_STATE_PREFIX = 'yuriorbit:catalog-list:';
export const MAX_RESTORED_PAGES = 10;

const listStateKey = (listKey: string) => `${LIST_STATE_PREFIX}${listKey}`;

export function readListState(listKey: string): ListState {
  const fallback: ListState = { pages: 1, scrollY: 0 };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.sessionStorage.getItem(listStateKey(listKey));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<ListState>;
    const pages = Number.isFinite(parsed.pages)
      ? Math.min(Math.max(Math.trunc(parsed.pages as number), 1), MAX_RESTORED_PAGES)
      : 1;
    const scrollY = Number.isFinite(parsed.scrollY) ? Math.max(parsed.scrollY as number, 0) : 0;
    return { pages, scrollY };
  } catch {
    return fallback;
  }
}

export function writeListState(listKey: string, state: ListState) {
  if (typeof window === 'undefined') return;
  try {
    if (state.pages <= 1 && state.scrollY <= 0) {
      window.sessionStorage.removeItem(listStateKey(listKey));
      return;
    }
    window.sessionStorage.setItem(listStateKey(listKey), JSON.stringify(state));
  } catch {
    // Storage is a nicety; the list still works without it.
  }
}
