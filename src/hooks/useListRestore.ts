import { useEffect, useRef } from 'react';
import { MAX_RESTORED_PAGES, readListState, writeListState } from '@/lib/catalog/list-state';
import type { ListState } from '@/lib/catalog/list-state';

/**
 * How many feed pages to load up front for the filter combination the visitor
 * had already read. Only the combination present at mount restores; anything
 * reached by changing a filter starts at page 1.
 */
export function useRestoredPageDepth(listKey: string): number {
  const mountKey = useRef(listKey);
  const remembered = useRef<ListState | null>(null);
  if (remembered.current === null) remembered.current = readListState(listKey);

  const pages = listKey === mountKey.current ? remembered.current.pages : 1;
  return Math.min(Math.max(pages, 1), MAX_RESTORED_PAGES);
}

/**
 * Persists how far into a list the visitor has read and puts them back there
 * when they return. `pages` is the feed's current depth (1 for lists that load
 * everything at once, in which case only the scroll position is remembered).
 */
export function useListRestoreEffects({
  listKey,
  pages,
  loading,
}: {
  listKey: string;
  pages: number;
  loading: boolean;
}) {
  const rememberedScroll = useRef<number | null>(null);
  const scrollRestored = useRef(false);
  const pageRef = useRef(pages);
  pageRef.current = pages;

  // Remember the page depth. Skipped while loading so the page 1 placeholder
  // cannot overwrite the depth that is being restored.
  useEffect(() => {
    if (loading) return;
    writeListState(listKey, { pages, scrollY: readListState(listKey).scrollY });
  }, [listKey, pages, loading]);

  // Save the reading position when leaving or backgrounding the page.
  useEffect(() => {
    const save = () => {
      writeListState(listKey, { pages: pageRef.current, scrollY: window.scrollY });
    };
    window.addEventListener('pagehide', save);
    return () => {
      window.removeEventListener('pagehide', save);
      save();
    };
  }, [listKey]);

  // ScrollToTop resets the window on navigation; put the visitor back once the
  // remembered pages have rendered.
  useEffect(() => {
    if (loading || scrollRestored.current) return;
    if (rememberedScroll.current === null) rememberedScroll.current = readListState(listKey).scrollY;
    scrollRestored.current = true;
    const target = rememberedScroll.current;
    if (target > 0) {
      requestAnimationFrame(() => window.scrollTo({ top: target }));
    }
  }, [listKey, loading]);
}
