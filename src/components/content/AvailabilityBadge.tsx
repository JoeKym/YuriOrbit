import { useEffect, useRef, useState } from 'react';
import { getTitleAvailability, tmdbLookupFor, type AvailabilityTitle } from '@/lib/content/watch-availability';
import { useWatchRegion } from '@/hooks/useWatchRegion';
import type { TmdbWatchProviderResult } from '@/lib/providers/tmdb';
import { cn } from '@/lib/utils/format';

type AvailabilityVariant = 'overlay' | 'compact' | 'inline';

/**
 * Provider logos for a card or list row. The lookup only starts once the badge
 * is close to the viewport, so offscreen rows in a large grid cost nothing.
 *
 * - overlay: full-size poster cards
 * - compact: small poster tiles (profile library grids)
 * - inline: normal flow, for list rows
 */
export function AvailabilityBadge({
  title,
  variant = 'overlay',
}: {
  title: AvailabilityTitle;
  variant?: AvailabilityVariant;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<TmdbWatchProviderResult | null>(null);
  const region = useWatchRegion();
  const lookup = tmdbLookupFor(title);
  const providerId = lookup?.providerId;

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

  // Re-run when the region changes so the logos always match the preference.
  useEffect(() => {
    if (!visible || !providerId) return;
    let cancelled = false;
    setData(null);

    getTitleAvailability(title).then((result) => {
      if (!cancelled) setData(result);
    });

    return () => {
      cancelled = true;
    };
  }, [visible, providerId, region, title]);

  if (!lookup) return null;

  const providers = data?.providers ?? [];
  const shown = providers.slice(0, 3);
  const remaining = providers.length - shown.length;
  const inline = variant === 'inline';
  const compact = variant === 'compact';

  return (
    <div
      ref={ref}
      className={inline ? 'mt-1.5 flex flex-wrap items-center gap-1' : 'pointer-events-none absolute inset-0 z-10'}
    >
      {shown.length > 0 && (
        <span
          className={cn(
            'flex items-center gap-1 rounded-md border border-white/10 bg-ink-950/85 px-1.5 py-1 shadow-sm backdrop-blur-md',
            variant === 'overlay' && 'absolute right-2 top-[70px]',
            compact && 'absolute right-1.5 top-1.5 gap-0.5 px-1 py-0.5',
            inline && 'w-fit pointer-events-auto'
          )}
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
                width={16}
                height={16}
                loading="lazy"
                decoding="async"
                className={cn('rounded-sm object-cover', compact ? 'h-3 w-3' : 'h-4 w-4')}
              />
            ) : (
              <span
                key={provider.id}
                className={cn('font-medium text-ink-200', compact ? 'text-micro' : 'text-micro')}
              >
                {provider.name}
              </span>
            )
          )}
          {remaining > 0 && (
            <span className={cn('font-semibold text-ink-300', compact ? 'text-micro' : 'text-micro')}>
              +{remaining}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
