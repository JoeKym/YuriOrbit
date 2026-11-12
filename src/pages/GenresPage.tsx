import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, AlertCircle, RotateCcw, SlidersHorizontal, Search, X } from 'lucide-react';
import type { ContentTitle } from '@/types/content';
import { GENRE_LIST } from '@/types/content';
import { getPopularGL } from '@/lib/providers';
import { GL_ALLOWED_CLASSIFICATIONS } from '@/lib/providers/classify';
import { ContentCard, ContentCardSkeleton } from '@/components/content/ContentCard';
import { cn } from '@/lib/utils/format';
import { usePageMeta } from '@/hooks/usePageMeta';
import { PageHeading } from '@/components/layout/PageHeading';

const FEATURED_GENRES = [
  'Romance',
  'Drama',
  'Comedy',
  'Fantasy',
  'Historical',
  'School Life',
  'Slice of Life',
  'Mystery',
  'Supernatural',
  'Science Fiction',
  'Tragedy',
  'Slow Burn',
  'Action',
];

export function GenresPage() {
  usePageMeta({
    title: 'Genres',
    description: "Browse Girls' Love titles by genre on YuriOrbit.",
    path: '/genres',
  });

  const [genreData, setGenreData] = useState<Record<string, ContentTitle[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Page-level filters (alternate to just browsing sections)
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('ALL');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const popular = await getPopularGL(60);
        if (cancelled) return;
        const filtered = popular.filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification));

        const data: Record<string, ContentTitle[]> = {};
        for (const g of FEATURED_GENRES) {
          const genreKey = g === 'Science Fiction' ? 'Sci-Fi' : g;
          data[g] = filtered
            .filter(
              (t) =>
                t.genres.includes(genreKey) ||
                (g === 'Slow Burn' && t.tags.some((tag) => tag.name.toLowerCase().includes('slow burn')))
            )
            .slice(0, 8);
        }

        const hasAnyContent = Object.values(data).some((arr) => arr.length > 0);
        if (!hasAnyContent) setError(true);
        if (!cancelled) setGenreData(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const allTitles = useMemo(() => {
    const seen = new Set<string>();
    const out: ContentTitle[] = [];
    for (const list of Object.values(genreData)) {
      for (const t of list) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        out.push(t);
      }
    }
    return out;
  }, [genreData]);

  const formats = useMemo(() => {
    const set = new Set<string>();
    for (const t of allTitles) if (t.contentType) set.add(t.contentType);
    return Array.from(set).sort();
  }, [allTitles]);

  const filteredTitles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTitles.filter((t) => {
      if (selectedGenre !== 'ALL') {
        const genreKey = selectedGenre === 'Science Fiction' ? 'Sci-Fi' : selectedGenre;
        const matchGenre =
          t.genres.includes(genreKey) ||
          (selectedGenre === 'Slow Burn' && t.tags.some((tag) => tag.name.toLowerCase().includes('slow burn')));
        if (!matchGenre) return false;
      }
      if (formatFilter !== 'ALL' && t.contentType !== formatFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (q) {
        const hay = `${t.title} ${t.altTitles?.join(' ') || ''} ${t.genres.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allTitles, selectedGenre, formatFilter, statusFilter, query]);

  const hasActiveFilters = query.trim() || selectedGenre !== 'ALL' || formatFilter !== 'ALL' || statusFilter !== 'ALL';

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageHeading
            eyebrow="Curated GL catalogue"
            title="Genre"
            accent="Explorer"
            description="Browse GL titles by genre, or use filters to narrow the view."
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
            showFilters || hasActiveFilters
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              : 'border-ink-700 bg-ink-900 text-ink-200 hover:bg-ink-850'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters {hasActiveFilters ? '• active' : ''}
        </button>
      </div>

      {showFilters && (
        <div className="mb-6 grid gap-3 rounded-2xl border border-ink-800 bg-ink-900/60 p-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] text-ink-400">Search within genre results</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Title or keyword…"
                className="input-field pl-9 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Genre</label>
            <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="input-field text-xs">
              <option value="ALL">All featured genres</option>
              {FEATURED_GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Format / Status</label>
            <div className="flex gap-2">
              <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)} className="input-field text-xs">
                <option value="ALL">All formats</option>
                {formats.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field text-xs">
                <option value="ALL">All status</option>
                <option value="RELEASING">Ongoing</option>
                <option value="FINISHED">Completed</option>
                <option value="HIATUS">Hiatus</option>
                <option value="NOT_YET_RELEASED">Upcoming</option>
              </select>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="md:col-span-4">
              <button
                onClick={() => {
                  setQuery('');
                  setSelectedGenre('ALL');
                  setFormatFilter('ALL');
                  setStatusFilter('ALL');
                }}
                className="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200"
              >
                <X className="h-3.5 w-3.5" /> Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-2">
        {GENRE_LIST.map((g) => (
          <Link
            key={g}
            to={`/discover?genre=${encodeURIComponent(g)}`}
            className="chip transition-colors hover:chip-active hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
          >
            {g}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="space-y-8">
          {FEATURED_GENRES.slice(0, 4).map((g) => (
            <section key={g}>
              <h2 className="section-title mb-3">{g}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ContentCardSkeleton key={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : error || allTitles.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-ink-800 bg-ink-900/40 p-8 py-20 text-center">
          <AlertCircle className="mb-3 h-10 w-10 text-rose-400" />
          <h3 className="text-base font-semibold text-ink-100">Unable to load genre titles</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-400">
            We encountered an issue fetching popular titles. You can try again or explore titles directly.
          </p>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setReloadKey((k) => k + 1)} className="btn-primary flex items-center gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Try Again
            </button>
            <Link to="/discover" className="btn-secondary text-xs">
              Browse Discovery
            </Link>
          </div>
        </div>
      ) : hasActiveFilters ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Filtered results</h2>
            <span className="text-xs text-ink-400">{filteredTitles.length} titles</span>
          </div>
          {filteredTitles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-800 p-8 text-center text-sm text-ink-400">
              No titles match these filters. Try clearing or broadening them.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {filteredTitles.map((t) => (
                <ContentCard key={t.id} title={t} className="w-full" />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="space-y-8">
          {FEATURED_GENRES.map((g) => {
            const titles = genreData[g];
            if (!titles || titles.length === 0) return null;
            return (
              <section key={g}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="section-title">{g}</h2>
                  <Link to={`/discover?genre=${encodeURIComponent(g)}`} className="btn-ghost text-xs">
                    View all <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                  {titles.map((t) => (
                    <ContentCard key={t.id} title={t} className="w-full" />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
