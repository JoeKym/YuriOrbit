import { useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Play } from 'lucide-react';
import { tmdbGetWatchProviders, tmdbPreferredRegion } from '@/lib/providers';
import type { TmdbWatchProviderResult } from '@/lib/providers/tmdb';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchMyProfile, saveWatchRegion } from '@/lib/profiles';
import {
  REGION_OPTIONS,
  readStoredWatchRegion,
  regionName,
  writeStoredWatchRegion,
} from '@/lib/content/watch-region';

export type StreamingProvidersStatus = 'loading' | 'available' | 'unavailable';

interface StreamingProvidersProps {
  providerId: string;
  mediaType: 'movie' | 'tv';
  /** Used when TMDB does not return a JustWatch link for the region. */
  fallbackHref?: string;
  /** Rendered only when availability or an explicit region choice exists. */
  heading?: string;
  className?: string;
  onStatusChange?: (status: StreamingProvidersStatus) => void;
}

/**
 * Regional streaming availability from TMDB, with a region selector shared
 * across titles. TMDB's terms require the JustWatch attribution below wherever
 * this data is displayed.
 */
export function StreamingProviders({
  providerId,
  mediaType,
  fallbackHref,
  heading,
  className,
  onStatusChange,
}: StreamingProvidersProps) {
  const { user } = useAuth();
  const touchedRef = useRef(false);
  const [region, setRegion] = useState(() => readStoredWatchRegion() || tmdbPreferredRegion());
  const [manual, setManual] = useState(() => !!readStoredWatchRegion());
  const [data, setData] = useState<TmdbWatchProviderResult | null>(null);
  const [loading, setLoading] = useState(true);

  // Signed-in visitors keep their region on their profile, across devices. The
  // local value is only a cache and must not override a fresh choice.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let cancelled = false;
    fetchMyProfile(userId)
      .then(({ data: profile }) => {
        if (cancelled || touchedRef.current) return;
        const stored = profile?.watchRegion;
        if (!stored || !/^[A-Z]{2}$/.test(stored)) return;
        setRegion(stored);
        setManual(true);
        writeStoredWatchRegion(stored);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);
    onStatusChange?.('loading');

    tmdbGetWatchProviders(providerId, mediaType, region, { fallbackToUS: !manual })
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
        onStatusChange?.(result ? 'available' : 'unavailable');
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        onStatusChange?.('unavailable');
      });

    return () => {
      cancelled = true;
    };
  }, [providerId, mediaType, region, manual]);

  const options = useMemo(() => {
    const list = [...REGION_OPTIONS];
    if (!list.some((option) => option.code === region)) {
      list.unshift({ code: region, name: regionName(region) });
    }
    return list;
  }, [region]);

  // With no explicit region choice and no availability anywhere, stay hidden.
  if (!manual && !data) return null;

  const handleRegionChange = (value: string) => {
    touchedRef.current = true;

    if (value === 'auto') {
      writeStoredWatchRegion(null);
      setManual(false);
      setRegion(tmdbPreferredRegion());
      if (user?.id) void saveWatchRegion(user.id, null);
      return;
    }

    writeStoredWatchRegion(value);
    setManual(true);
    setRegion(value);
    if (user?.id) void saveWatchRegion(user.id, value);
  };

  return (
    <div className={className}>
      {heading && <h2 className="section-title mb-3">{heading}</h2>}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-ink-400">
        <Globe className="h-3.5 w-3.5" />
        <label htmlFor="watch-provider-region" className="sr-only">
          Streaming region
        </label>
        <select
          id="watch-provider-region"
          value={manual ? region : 'auto'}
          onChange={(e) => handleRegionChange(e.target.value)}
          className="rounded-lg border border-ink-700 bg-ink-850 px-2 py-1 text-xs text-ink-100 focus:outline-none"
          title="Streaming availability region"
        >
          <option value="auto">Detect automatically ({regionName(tmdbPreferredRegion())})</option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="text-xs text-ink-400">Checking availability in {regionName(region)}…</p>
      )}

      {!loading && data && (
        <>
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
                    width={28}
                    height={28}
                    loading="lazy"
                    decoding="async"
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
          <p className="mt-2 text-[11px] text-ink-400">
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
        </>
      )}

      {!loading && !data && manual && (
        <p className="text-sm text-ink-400">
          No streaming availability is listed in {regionName(region)}.
        </p>
      )}
    </div>
  );
}
