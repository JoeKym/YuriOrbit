import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, BookOpen, ArrowRight } from 'lucide-react';
import { Carousel } from '@/components/content/Carousel';
import type { ContentTitle } from '@/types/content';
import { GL_ALLOWED_CLASSIFICATIONS } from '@/lib/providers/classify';
import { getTrendingGL, getPopularGL, getRecentGL, getCompletedGL } from '@/lib/providers';

function filterGLTitles(titles: ContentTitle[]): ContentTitle[] {
  return titles.filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification));
}

export function HomePage() {
  const [sections, setSections] = useState<Record<string, ContentTitle[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const [trendingRes, popularRes, recentRes, completedRes] = await Promise.allSettled([
          getTrendingGL(20),
          getPopularGL(50),
          getRecentGL(20),
          getCompletedGL(20),
        ]);

        if (cancelled) return;

        const data: Record<string, ContentTitle[]> = {};

        const trending = trendingRes.status === 'fulfilled' ? filterGLTitles(trendingRes.value) : [];
        const popular = popularRes.status === 'fulfilled' ? filterGLTitles(popularRes.value) : [];
        const recent = recentRes.status === 'fulfilled' ? filterGLTitles(recentRes.value) : [];
        const completed = completedRes.status === 'fulfilled' ? filterGLTitles(completedRes.value) : [];

        data['trending'] = trending.length > 0 ? trending : popular.slice(0, 20);

        const pool = popular.length > 0 ? popular : trending;

        data['popularManga'] = pool.filter((t) => t.contentType === 'MANGA').slice(0, 20);
        data['manhwa'] = pool.filter((t) => t.contentType === 'MANHWA').slice(0, 20);
        data['manhua'] = pool.filter((t) => t.contentType === 'MANHUA').slice(0, 20);
        data['novels'] = pool.filter((t) => t.contentType === 'LIGHT_NOVEL').slice(0, 20);

        data['romance'] = pool.filter((t) => t.genres.includes('Romance')).slice(0, 20);
        data['fantasy'] = pool.filter((t) => t.genres.some((g) => g === 'Fantasy' || g === 'Supernatural')).slice(0, 20);
        data['schoolLife'] = pool.filter((t) => t.genres.includes('School Life') || t.tags.some((tag) => tag.name === 'School')).slice(0, 20);
        data['drama'] = pool.filter((t) => t.genres.includes('Drama')).slice(0, 20);
        data['historical'] = pool.filter((t) => t.genres.includes('Historical')).slice(0, 20);
        data['slowBurn'] = pool.filter((t) => t.tags.some((tag) => tag.name.toLowerCase().includes('slow burn'))).slice(0, 20);

        data['recent'] = recent.length > 0 ? recent : pool.slice(0, 20);
        data['completed'] = completed.length > 0 ? completed : pool.filter((t) => t.status === 'FINISHED').slice(0, 20);

        const hasAny = Object.values(data).some((arr) => arr.length > 0);
        if (!hasAny) {
          setError(true);
        }

        setSections(data);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [loadKey]);

  const get = (key: string) => sections[key] || [];

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ink-950 via-ink-900 to-ink-850" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(232,77,138,0.08),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(147,98,240,0.06),transparent_60%)]" />

        <div className="relative mx-auto max-w-[1600px] px-4 py-20 md:px-6 md:py-28">
          <div className="max-w-2xl animate-slide-up">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/5 px-3 py-1">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-xs font-medium text-rose-300">Girls' Love Discovery Platform</span>
            </div>
            <h1 className="font-display text-4xl font-semibold leading-tight text-ink-50 text-balance md:text-6xl">
              Find your next GL obsession.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-ink-300 md:text-lg">
              Discover yuri manga, manhwa, webtoons, novels, movies, and dramas from across the world in one carefully curated place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/discover" className="btn-primary">
                Explore GL
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/library" className="btn-secondary">
                <BookOpen className="h-4 w-4" />
                Browse My Library
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
        {error && (
          <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-error-500/30 bg-error-500/5 p-4 sm:flex-row sm:items-center">
            <span className="text-sm text-error-400">
              Some content sections could not be loaded due to temporary upstream connectivity.
            </span>
            <button
              onClick={() => setLoadKey((k) => k + 1)}
              className="rounded-lg bg-error-500/20 px-3 py-1.5 text-xs font-medium text-error-300 hover:bg-error-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        <Carousel title="Trending Now" titles={get('trending')} loading={loading} viewAllLink="/trending" />
        <Carousel title="Popular GL Manga" titles={get('popularManga')} loading={loading} viewAllLink="/manga" />
        <Carousel title="Manhwa" titles={get('manhwa')} loading={loading} viewAllLink="/manhwa" />
        <Carousel title="Manhua" titles={get('manhua')} loading={loading} viewAllLink="/manhua" />
        <Carousel title="GL Novels" titles={get('novels')} loading={loading} viewAllLink="/novels" />
        <Carousel title="Recently Released" titles={get('recent')} loading={loading} />
        <Carousel title="Completed Stories" titles={get('completed')} loading={loading} />
        <Carousel title="Slow-Burn Romance" titles={get('slowBurn')} loading={loading} />
        <Carousel title="Romance" titles={get('romance')} loading={loading} />
        <Carousel title="Fantasy & Supernatural" titles={get('fantasy')} loading={loading} />
        <Carousel title="School Life" titles={get('schoolLife')} loading={loading} />
        <Carousel title="Emotional Drama" titles={get('drama')} loading={loading} />
        <Carousel title="Historical GL" titles={get('historical')} loading={loading} />
      </div>
    </div>
  );
}
