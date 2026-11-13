import { useEffect, useState } from 'react';
import { BookOpen, Database, Layers } from 'lucide-react';
import type { ContentType } from '@/types/content';
import { loadFormatCount } from '@/lib/catalog/format-counts';
import { readCachedCatalogCount, storeCatalogCount } from '@/lib/catalog/catalog-count';
import type { CatalogCount } from '@/lib/catalog/catalog-count';
import { cn } from '@/lib/utils/format';

/** Every format the catalogue can serve. */
const FORMATS: ContentType[] = [
  'MANGA',
  'MANHWA',
  'MANHUA',
  'WEBTOON',
  'LIGHT_NOVEL',
  'ANIME',
  'TV',
  'MOVIE',
  'DRAMA',
];

/** Providers wired into src/lib/providers. */
const SOURCES = ['AniList', 'MangaDex', 'TMDB'];

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
      <p className="mt-2 text-micro font-semibold uppercase tracking-[0.16em] text-ink-400">{label}</p>
      <p className="mt-1 text-micro leading-relaxed text-ink-400">{hint}</p>
    </div>
  );
}

/**
 * Catalogue facts pulled from the providers themselves rather than hard-coded
 * marketing numbers.
 *
 * The title total used to be a single cross-format query, which reported the
 * largest single provider total and silently ignored the rest. It is now the sum
 * of each format's exact count, with the formats that sit at a provider cap
 * reported separately instead of being folded into the number.
 */
export function CatalogStats({ className }: { className?: string }) {
  const [catalog, setCatalog] = useState<CatalogCount | null>(readCachedCatalogCount);
  const [counting, setCounting] = useState(catalog === null);

  useEffect(() => {
    if (readCachedCatalogCount() !== null) return;
    let cancelled = false;

    (async () => {
      // Sequential: nine parallel provider queries is how rate limits happen.
      let count = 0;
      let exactFormats = 0;
      let flooredFormats = 0;

      for (const format of FORMATS) {
        if (cancelled) return;
        const result = await loadFormatCount(format);
        if (result.exact) {
          count += result.exact;
          exactFormats += 1;
        } else if (result.floor) {
          flooredFormats += 1;
        }
      }

      if (cancelled) return;
      if (exactFormats === 0) {
        setCounting(false);
        return;
      }

      const value: CatalogCount = { count, exactFormats, flooredFormats };
      storeCatalogCount(value);
      setCatalog(value);
      setCounting(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const hint = catalog
    ? `Sum of exact provider counts · ${catalog.exactFormats} of ${FORMATS.length} formats${
        catalog.flooredFormats > 0 ? ` · ${catalog.flooredFormats} at a source cap` : ''
      }`
    : counting
      ? 'Counting live catalogue…'
      : 'Provider counts unavailable right now';

  return (
    <div className={cn('grid gap-3 sm:grid-cols-3', className ?? 'mt-10')}>
      <Tile
        icon={BookOpen}
        value={catalog === null ? '—' : catalog.count.toLocaleString()}
        label="Titles catalogued"
        hint={hint}
      />
      <Tile
        icon={Layers}
        value={`${FORMATS.length}`}
        label="Formats & media"
        hint="Manga, manhwa, manhua, webtoons, novels, anime, TV, film, drama"
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
