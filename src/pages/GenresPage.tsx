import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { ContentTitle } from '@/types/content';
import { GENRE_LIST } from '@/types/content';
import { getPopularGL } from '@/lib/providers';
import { GL_ALLOWED_CLASSIFICATIONS } from '@/lib/providers/classify';
import { ContentCardSkeleton } from '@/components/content/ContentCard';

const FEATURED_GENRES = ['Romance', 'Drama', 'Comedy', 'Fantasy', 'Historical', 'School Life', 'Slice of Life', 'Mystery', 'Supernatural', 'Science Fiction', 'Tragedy', 'Slow Burn', 'Action'];

export function GenresPage() {
  const [genreData, setGenreData] = useState<Record<string, ContentTitle[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const popular = await getPopularGL(50);
        if (cancelled) return;
        const filtered = popular.filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification));

        const data: Record<string, ContentTitle[]> = {};
        for (const g of FEATURED_GENRES) {
          const genreKey = g === 'Science Fiction' ? 'Sci-Fi' : g;
          data[g] = filtered.filter((t) =>
            t.genres.includes(genreKey) ||
            (g === 'Slow Burn' && t.tags.some((tag) => tag.name.toLowerCase().includes('slow burn')))
          ).slice(0, 6);
        }
        if (!cancelled) setGenreData(data);
      } catch {
        // leave empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <h1 className="mb-1 font-display text-3xl font-semibold text-ink-50">Genre Explorer</h1>
      <p className="mb-6 text-sm text-ink-400">Browse GL content by genre.</p>

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
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => <ContentCardSkeleton key={i} />)}
              </div>
            </section>
          ))}
        </div>
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
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {titles.slice(0, 6).map((t) => (
                    <Link
                      key={t.id}
                      to={`/title/${t.id}`}
                      className="group block"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-ink-850 shadow-card transition-all duration-300 group-hover:shadow-card-hover group-hover:ring-1 group-hover:ring-rose-500/20">
                        <img
                          src={t.coverImage}
                          alt={t.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 to-transparent" />
                        <div className="absolute bottom-0 p-3">
                          <h3 className="line-clamp-2 text-xs font-medium text-ink-50">{t.title}</h3>
                        </div>
                      </div>
                    </Link>
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
