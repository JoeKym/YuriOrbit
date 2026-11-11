import { useEffect, useRef, useState } from 'react';
import type { ContentTitle } from '@/types/content';
import { getWatchAvailability } from '@/lib/content/watch-availability';
import type { TmdbWatchProviderResult } from '@/lib/providers/tmdb';

/**
 * Find the TMDB record behind a card. Merged entries often use an AniList or
 * MangaDex title as their primary source, but keep the TMDB source alongside.
 */
function tmdbLookup(title: ContentTitle): { providerId: string; mediaType: 'movie' | 'tv' } | null {
  if (title.provider === 'TMDB' && title.providerId) {
    return {
      providerId: title.providerId,
      mediaType: title.contentType === 'MOVIE' ? 'movie' : 'tv',
    };
  }

  const source = title.sources?.find((entry) => entry.provider === 'TMDB');
  if (!source?.providerId) return null;

  const fromUrl = source.url ? /\/movie\//.test(source.url) : false;
  return {
    providerId: source.providerId,
    mediaType: fromUrl || title.contentType === 'MOVIE' ? 'movie' : 'tv',
  };
}

/**
 * Provider logos for a card. The lookup only starts once the card is close to
 * the viewport, so offscreen rows in a large grid cost nothing.
 */
export function AvailabilityBadge({ title }: { title: ContentTitle }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<TmdbWatchProviderResult | null>(null);
  const lookup = tmdbLookup(title);
  const providerId = lookup?.providerId;
  const mediaType = lookup?.mediaType;

  useEffect(() => {
    const element = ref.current;
    if (!element || !providerId) return;

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
      { rootMargin: '300px' }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [providerId]);

  useEffect(() => {
    if (!visible || !providerId || !mediaType) return;
    let cancelled = false;

    getWatchAvailability(providerId, mediaType).then((result) => {
      if (!cancelled) setData(result);
    });

    return () => {
      cancelled = true;
    };
  }, [visible, providerId, mediaType]);

  if (!lookup) return null;

  const providers = data?.providers ?? [];
  const shown = providers.slice(0, 3);
  const remaining = providers.length - shown.length;

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-10">
      {shown.length > 0 && (
        <span
          className="absolute right-2 top-[70px] flex items-center gap-1 rounded-md border border-white/10 bg-ink-950/85 px-1.5 py-1 shadow-sm backdrop-blur-md"
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
