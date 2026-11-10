import { useEffect, useState } from 'react';
import {
  fetchContentModeration,
  getModerationFor,
  type ContentModerationItem,
} from '@/lib/moderation/contentModeration';

const POLL_MS = 15_000;

/**
 * Live moderation state for one title. Re-checks while the page is open so a
 * takedown or suspension applies (and expires) without a reload.
 */
export function useContentModeration(titleId: string | undefined): ContentModerationItem | null {
  const [moderation, setModeration] = useState<ContentModerationItem | null>(null);

  useEffect(() => {
    if (!titleId) {
      setModeration(null);
      return;
    }
    let cancelled = false;

    async function refresh(force: boolean) {
      const map = await fetchContentModeration(force);
      if (!cancelled) setModeration(getModerationFor(map, titleId!));
    }

    void refresh(false);

    const onFocus = () => {
      if (document.visibilityState === 'visible') void refresh(true);
    };
    const timer = setInterval(onFocus, POLL_MS);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [titleId]);

  return moderation;
}
