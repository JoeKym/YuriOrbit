import { useEffect, useMemo, useState } from 'react';
import { Globe, Play } from 'lucide-react';
import { tmdbGetWatchProviders, tmdbPreferredRegion } from '@/lib/providers';
import type { TmdbWatchProviderResult } from '@/lib/providers/tmdb';

export type StreamingProvidersStatus = 'loading' | 'available' | 'unavailable';

const REGION_STORAGE_KEY = 'yuriorbit_watch_region';

/** Common TMDB availability regions; the detected region is added if absent. */
const REGION_OPTIONS: { code: string; name: string }[] = [
  { code: 'AR', name: 'Argentina' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EG', name: 'Egypt' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MX', name: 'Mexico' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NO', name: 'Norway' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Turkey' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'VN', name: 'Vietnam' },
];

function regionName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
}

function readStoredRegion(): string | null {
  try {
    const value = localStorage.getItem(REGION_STORAGE_KEY);
    return value && /^[A-Z]{2}$/.test(value) ? value : null;
  } catch {
    return null;
  }
}

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
  const [region, setRegion] = useState(() => readStoredRegion() || tmdbPreferredRegion());
  const [manual, setManual] = useState(() => !!readStoredRegion());
  const [data, setData] = useState<TmdbWatchProviderResult | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (value === 'auto') {
      try {
        localStorage.removeItem(REGION_STORAGE_KEY);
      } catch {
        /* Storage unavailable: the choice just won't persist. */
      }
      setManual(false);
      setRegion(tmdbPreferredRegion());
      return;
    }

    try {
      localStorage.setItem(REGION_STORAGE_KEY, value);
    } catch {
      /* Storage unavailable: the choice just won't persist. */
    }
    setManual(true);
    setRegion(value);
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
        <p className="text-xs text-ink-500">Checking availability in {regionName(region)}…</p>
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
