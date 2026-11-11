import { useEffect, useRef, useState } from 'react';
import type { ContentTitle } from '@/types/content';
import { getWatchAvailability } from '@/lib/content/watch-availability';
import type { TmdbWatchProviderResult } from '@/lib/providers/tmdb';

/**
 * Provider logos for a card. The lookup only starts once the card is close to
 * the viewport, so offscreen rows in a large grid cost nothing.
 */
export function AvailabilityBadge({ title }: { title: ContentTitle }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<TmdbWatchProviderResult | null>(null);
  const mediaType = title.contentType === 'MOVIE' ? 'movie' : 'tv';

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    getWatchAvailability(title.providerId, mediaType).then((result) => {
      if (!cancelled) setData(result);
    });

    return () => {
      cancelled = true;
    };
  }, [visible, title.providerId, mediaType]);

  const providers = data?.providers ?? [];
  const shown = providers.slice(0, 3);
  const remaining = providers.length - shown.length;

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute right-2 top-[70px] z-10 flex flex-col items-end gap-1"
    >
      {shown.length > 0 && (
        <span
          className="flex items-center gap-1 rounded-md border border-white/10 bg-ink-950/85 px-1.5 py-1 shadow-sm backdrop-blur-md"
          title={`Streaming via JustWatch (${data?.region}): ${providers
            .map((provider) => provider.name)
            .join(', ')}`}
        >
          {shown.map((provider) =>
            provider.logoUrl ? (
              <img
                key={provider.id}
                src={provider.logoUrl}
                alt={provider.name}
                loading="lazy"
                className="h-4 w-4 rounded-sm object-cover"
              />
            ) : (
              <span key={provider.id} className="text-[9px] font-medium text-ink-200">
                {provider.name}
              </span>
            )
          )}
          {remaining > 0 && (
            <span className="text-[9px] font-semibold text-ink-300">+{remaining}</span>
          )}
        </span>
      )}
    </div>
  );
}
