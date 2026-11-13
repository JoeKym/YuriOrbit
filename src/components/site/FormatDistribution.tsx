import { useEffect, useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import type { ContentType } from '@/types/content';
import { CONTENT_TYPE_LABELS } from '@/types/content';
import { loadFormatCount } from '@/lib/catalog/format-counts';
import type { FormatCount } from '@/lib/catalog/format-counts';
import { cn } from '@/lib/utils/format';

/**
 * Formats we can count distinctly. Webtoons are left out on purpose: no upstream
 * separates them from manga, so a Webtoon bar would double-count the manga one.
 */
const CHARTED_FORMATS: ContentType[] = [
  'ANIME',
  'MANGA',
  'MANHWA',
  'MANHUA',
  'LIGHT_NOVEL',
  'TV',
  'MOVIE',
  'DRAMA',
];

type Row = { format: ContentType; value: FormatCount | null };

function rowValue(row: Row): number {
  return row.value?.exact ?? row.value?.floor ?? 0;
}

export function FormatDistribution({ className }: { className?: string }) {
  const [rows, setRows] = useState<Record<string, FormatCount | null>>({});

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Sequential on purpose: a burst would trip provider rate limits.
      for (const format of CHARTED_FORMATS) {
        if (cancelled) return;
        setRows((prev) => ({ ...prev, [format]: null }));
        const count = await loadFormatCount(format);
        if (cancelled) return;
        setRows((prev) => ({ ...prev, [format]: count }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const view = useMemo(() => {
    const all: Row[] = CHARTED_FORMATS.map((format) => ({ format, value: rows[format] ?? undefined ?? null }));
    const sorted = [...all].sort((a, b) => rowValue(b) - rowValue(a));
    const largest = sorted.reduce((max, row) => Math.max(max, rowValue(row)), 0);
    const exactTotal = all.reduce((sum, row) => sum + (row.value?.exact ?? 0), 0);
    const exactFormats = all.filter((row) => row.value?.exact).length;
    const floorFormats = all.filter((row) => !row.value?.exact && row.value?.floor).length;
    const unavailable = all.filter((row) => row.value && !row.value.exact && !row.value.floor).length;
    const loading = all.some((row) => row.value === null || row.value === undefined);

    return { sorted, largest, exactTotal, exactFormats, floorFormats, unavailable, loading };
  }, [rows]);

  return (
    <section className={cn('mt-10 card-surface p-5', className)}>
      <div className="mb-1 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-rose-400" />
        <h2 className="font-semibold text-ink-50">Catalogue by format</h2>
      </div>
      <p className="text-sm text-ink-400">
        How the live catalogue is spread across the formats YuriOrbit indexes, at your current content filter.
        {view.exactTotal > 0 && (
          <>
            {' '}
            <span className="text-ink-300">{view.exactTotal.toLocaleString()}</span> titles counted exactly across{' '}
            {view.exactFormats} format{view.exactFormats === 1 ? '' : 's'}.
          </>
        )}
      </p>

      <ul className="mt-4 space-y-2.5">
        {view.sorted.map((row) => {
          const label = CONTENT_TYPE_LABELS[row.format] ?? row.format;
          const loading = row.value === null || row.value === undefined;
          const exact = row.value?.exact ?? null;
          const floor = exact === null ? (row.value?.floor ?? null) : null;
          const share =
            exact !== null && view.exactTotal > 0 ? Math.round((exact / view.exactTotal) * 100) : null;
          const width =
            view.largest > 0 && rowValue(row) > 0 ? Math.max(3, Math.round((rowValue(row) / view.largest) * 100)) : 0;

          return (
            <li key={row.format} className="grid grid-cols-[86px_minmax(0,1fr)_auto] items-center gap-3">
              <span className="truncate text-xs font-medium text-ink-300">{label}</span>

              <span className="h-2 overflow-hidden rounded-full bg-ink-800/80">
                <span
                  className={cn(
                    'block h-full rounded-full transition-all duration-700 ease-out',
                    exact !== null && 'bg-gradient-to-r from-rose-500 to-lavender-500',
                    floor !== null && 'bg-gradient-to-r from-rose-500/60 to-lavender-500/40',
                    loading && 'animate-pulse-soft bg-ink-700',
                    row.value && exact === null && floor === null && 'bg-ink-800'
                  )}
                  style={{ width: loading ? '35%' : `${width}%` }}
                />
              </span>

              <span className="w-24 text-right text-[11px] tabular-nums text-ink-400">
                {exact !== null ? (
                  <>
                    <span className="font-semibold text-ink-200">{exact.toLocaleString()}</span>
                    {share !== null && <span className="ml-1 text-ink-500">{share}%</span>}
                  </>
                ) : floor !== null ? (
                  <>
                    <span className="font-semibold text-ink-300">{floor.toLocaleString()}+</span>
                    <span className="ml-1 text-ink-600">cap</span>
                  </>
                ) : loading ? (
                  <span className="text-ink-600">counting…</span>
                ) : (
                  <span className="text-ink-600">n/a</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
        {view.loading
          ? 'Counts load one format at a time so the providers are not hammered.'
          : view.floorFormats > 0
            ? `AniList stops counting at 5,000, so a "+" bar is a floor rather than a total — the real figure is at least that, and there is no way to get the exact one from the source. Percentages use exact counts only${view.unavailable > 0 ? `, and ${view.unavailable} format${view.unavailable === 1 ? '' : 's'} have no usable count` : ''}.`
            : 'Every bar is a live provider total, not a hard-coded figure.'}
      </p>
    </section>
  );
}
