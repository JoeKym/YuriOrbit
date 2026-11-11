import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { tmdbGetWatchProviders, tmdbPreferredRegion } from '@/lib/providers';
import type { TmdbWatchProviderResult } from '@/lib/providers/tmdb';

interface StreamingProvidersProps {
  providerId: string;
  mediaType: 'movie' | 'tv';
  /** Used when TMDB does not return a JustWatch link for the region. */
  fallbackHref?: string;
  /** Rendered only when availability exists, so empty pages don't get a heading. */
  heading?: string;
  className?: string;
}

/**
 * Regional streaming availability from TMDB. TMDB's terms require the
 * JustWatch attribution below wherever this data is displayed.
 */
export function StreamingProviders({
  providerId,
  mediaType,
  fallbackHref,
  heading,
  className,
}: StreamingProvidersProps) {
  const [data, setData] = useState<TmdbWatchProviderResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);

    tmdbGetWatchProviders(providerId, mediaType, tmdbPreferredRegion())
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [providerId, mediaType]);

  if (!data || data.providers.length === 0) return null;

  return (
    <div className={className}>
      {heading && <h2 className="section-title mb-3">{heading}</h2>}
      <div className="flex flex-wrap gap-2">
        {data.providers.map((provider) => (
          <a
            key={provider.id}
            href={data.link || fallbackHref || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 transition-colors hover:border-rose-500/40"
            title={`${provider.name} — availability and pricing on JustWatch`}
          >
            {provider.logoUrl ? (
              <img
                src={provider.logoUrl}
                alt=""
                loading="lazy"
                className="h-7 w-7 rounded-md object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Play className="h-4 w-4 text-ink-300" />
            )}
            <span className="text-xs font-medium text-ink-200">{provider.name}</span>
          </a>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-500">
        Availability in {data.region}. Streaming data provided by{' '}
        {data.link ? (
          <a
            href={data.link}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-rose-400"
          >
            JustWatch
          </a>
        ) : (
          'JustWatch'
        )}
        .
      </p>
    </div>
  );
}
