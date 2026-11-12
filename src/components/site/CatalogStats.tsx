import { useEffect, useState } from 'react';
import { BookOpen, Database, Layers } from 'lucide-react';
import type { ContentType } from '@/types/content';
import { searchGLTitles } from '@/lib/providers';
import { cn } from '@/lib/utils/format';

/** Formats the catalogue actually surfaces in navigation. */
const FORMATS: ContentType[] = ['MANGA', 'MANHWA', 'MANHUA', 'WEBTOON', 'LIGHT_NOVEL', 'TV', 'MOVIE', 'DRAMA'];

/** Providers wired into src/lib/providers. */
const SOURCES = ['AniList', 'MangaDex', 'Jikan (MAL)', 'TMDB'];

// One count pass per browser session; the About page is the only consumer.
let cachedTitleCount: number | null = null;

function Tile({
  icon: Icon,
  value,
  label,
  hint,
}: {
  icon: typeof BookOpen;
  value: string;
  label: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900/50 p-4 text-left transition-colors hover:border-rose-500/30">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10">
        <Icon className="h-4 w-4 text-rose-300" />
      </span>
      <p className="mt-3 font-display text-3xl font-semibold leading-none text-ink-50">{value}</p>
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">{label}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-500">{hint}</p>
    </div>
  );
}

/**
 * Catalogue facts pulled from the providers themselves rather than hard-coded
 * marketing numbers. Format and source counts are structural; the title total is
 * a live query summed across formats (skipped silently when a provider fails).
 */
export function CatalogStats({ className }: { className?: string }) {
  const [titleCount, setTitleCount] = useState<number | null>(cachedTitleCount);
  const [counting, setCounting] = useState(cachedTitleCount === null);

  useEffect(() => {
    if (cachedTitleCount !== null) return;
    let cancelled = false;

    (async () => {
      // Let the page's own rails start first; these counts are not urgent and
      // eight immediate queries would compete with them for provider budget.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      if (cancelled) return;

      let sum = 0;
      let answered = 0;

      // Sequential on purpose: a burst across formats trips provider rate limits.
      for (const format of FORMATS) {
        try {
          const result = await searchGLTitles({ contentType: format }, 1, 1);
          sum += result.total ?? 0;
          answered += 1;
        } catch {
          // Skip a format that fails; the tile still reports what answered.
        }
      }

      if (cancelled) return;
      if (answered > 0) {
        cachedTitleCount = sum;
        setTitleCount(sum);
      }
      setCounting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={cn('grid gap-3 sm:grid-cols-3', className ?? 'mt-10')}>
      <Tile
        icon={BookOpen}
        value={counting ? '—' : (titleCount ?? 0).toLocaleString()}
        label="Titles catalogued"
        hint={counting ? 'Counting live catalogue…' : 'Summed from live provider queries'}
      />
      <Tile
        icon={Layers}
        value={`${FORMATS.length}`}
        label="Formats & media"
        hint="Manga, manhwa, manhua, webtoons, novels, anime, film, drama"
      />
      <Tile
        icon={Database}
        value={`${SOURCES.length}`}
        label="Live data sources"
        hint={SOURCES.join(' · ')}
      />
    </div>
  );
}
