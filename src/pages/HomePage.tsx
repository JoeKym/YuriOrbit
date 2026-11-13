import { useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import { Hero } from '@/components/home/Hero';
import { TestimonialsSection } from '@/components/site/TestimonialsSection';
import { Carousel } from '@/components/content/Carousel';
import { usePageMeta } from '@/hooks/usePageMeta';
import { CatalogStats } from '@/components/site/CatalogStats';
import type { ContentTitle, ContentType } from '@/types/content';
import { GL_ALLOWED_CLASSIFICATIONS } from '@/lib/providers/classify';
import { getTrendingGL, getPopularGL, getRecentGL, getCompletedGL, getGLByContentType } from '@/lib/providers';
import { supabase } from '@/lib/supabase';

interface FeaturedRow {
  title_id: string;
  title: string;
  cover_image: string | null;
  content_type: string | null;
}

function filterGLTitles(titles: ContentTitle[]): ContentTitle[] {
  return titles.filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification));
}

const YURI_TAG_RE = /^(yuri|girls love|girls' love|shoujo ai|shoujo-ai|lesbian|sapphic|wlw|female-female romance)$/i;

/** Highest AniList rank of the yuri tags on a title — -1 when it carries none. */
function yuriTagRank(title: ContentTitle): number {
  const ranks = title.tags
    .filter((tag) => YURI_TAG_RE.test(tag.name.trim()))
    .map((tag) => tag.rank ?? 0);
  return ranks.length > 0 ? Math.max(...ranks) : -1;
}

function dedupe(titles: ContentTitle[]): ContentTitle[] {
  const seen = new Set<string>();
  return titles.filter((title) => {
    if (seen.has(title.id)) return false;
    seen.add(title.id);
    return true;
  });
}

/**
 * Hero deck: admin-pinned picks first (when an editor has pinned any), then a
 * round-robin across formats so manga, manhwa, manhua, novels and screen
 * adaptations all get a turn. Nothing is hardcoded — the order comes from live
 * catalogue data and rotates on every pass.
 */
function buildHeroDeck(pinned: ContentTitle[], pool: ContentTitle[]): ContentTitle[] {
  const buckets = new Map<ContentType, ContentTitle[]>();
  for (const title of dedupe(pool)) {
    const bucket = buckets.get(title.contentType);
    if (bucket) bucket.push(title);
    else buckets.set(title.contentType, [title]);
  }

  const mixed: ContentTitle[] = [];
  let added = true;
  while (mixed.length < 36 && added) {
    added = false;
    for (const bucket of buckets.values()) {
      const next = bucket.shift();
      if (!next) continue;
      mixed.push(next);
      added = true;
      if (mixed.length >= 36) break;
    }
  }

  return dedupe([...pinned, ...mixed]).slice(0, 40);
}

export function HomePage() {
  usePageMeta({
    // Brand first, and identical to the static shell's <title>. Google uses the
    // homepage title to decide the site name; a tagline-only title loses it.
    title: "YuriOrbit — Your World of Girls' Love",
    description:
      "Discover, track, and enjoy curated Yuri and Girls' Love anime, manga, manhwa, webtoons, light novels, and live-action dramas from around the globe.",
    path: '/',
    siteNameSuffix: false,
  });
  const [sections, setSections] = useState<Record<string, ContentTitle[]>>({});
  const [pinned, setPinned] = useState<ContentTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        // Per-format fetches so every rail (and the hero) has content even when
        // the overall popular pool is manga-heavy.
        const [trendingRes, popularRes, recentRes, completedRes, manhwaRes, manhuaRes, novelRes, movieRes, tvRes] =
          await Promise.allSettled([
            getTrendingGL(20),
            getPopularGL(60),
            getRecentGL(20),
            getCompletedGL(20),
            getGLByContentType('MANHWA', 20),
            getGLByContentType('MANHUA', 20),
            getGLByContentType('LIGHT_NOVEL', 20),
            getGLByContentType('MOVIE', 20),
            getGLByContentType('TV', 20),
          ]);

        if (cancelled) return;

        const data: Record<string, ContentTitle[]> = {};

        const trending = trendingRes.status === 'fulfilled' ? filterGLTitles(trendingRes.value) : [];
        const popular = popularRes.status === 'fulfilled' ? filterGLTitles(popularRes.value) : [];
        const recent = recentRes.status === 'fulfilled' ? filterGLTitles(recentRes.value) : [];
        const completed = completedRes.status === 'fulfilled' ? filterGLTitles(completedRes.value) : [];

        // AniList's user-voted Yuri tag is applied loosely (Slime carries it at
        // rank 30), so the top rail keeps only titles where the tag is strongly
        // applied — unless that would leave the rail nearly empty.
        const strongTrending = trending.filter((title) => {
          if (title.glClassification !== 'CONFIRMED_GL') return false;
          const rank = yuriTagRank(title);
          return rank === -1 ? title.provider !== 'ANILIST' : rank >= 50;
        });
        data['trending'] =
          strongTrending.length >= 6
            ? strongTrending
            : trending.length > 0
              ? trending
              : popular.slice(0, 20);

        const pool = popular.length > 0 ? popular : trending;
        data['pool'] = pool;

        const fulfilled = (result: PromiseSettledResult<ContentTitle[]>) =>
          result.status === 'fulfilled' ? filterGLTitles(result.value) : [];
        const manhwa = fulfilled(manhwaRes);
        const manhua = fulfilled(manhuaRes);
        const novels = fulfilled(novelRes);
        const movies = fulfilled(movieRes);
        const tv = fulfilled(tvRes);

        data['popularManga'] = pool.filter((t) => t.contentType === 'MANGA').slice(0, 20);
        data['screen'] = dedupe([
          ...pool.filter(
            (t) =>
              t.contentType === 'TV' ||
              t.contentType === 'MOVIE' ||
              t.contentType === 'DRAMA' ||
              t.contentType === 'ANIME'
          ),
          ...movies,
          ...tv,
        ]).slice(0, 20);
        data['manhwa'] = manhwa.length > 0 ? manhwa : pool.filter((t) => t.contentType === 'MANHWA').slice(0, 20);
        data['manhua'] = manhua.length > 0 ? manhua : pool.filter((t) => t.contentType === 'MANHUA').slice(0, 20);
        data['novels'] = novels.length > 0 ? novels : pool.filter((t) => t.contentType === 'LIGHT_NOVEL').slice(0, 20);
        data['movies'] = movies;
        data['tv'] = tv;

        data['romance'] = pool.filter((t) => t.genres.includes('Romance')).slice(0, 20);
        data['fantasy'] = pool.filter((t) => t.genres.some((g) => g === 'Fantasy' || g === 'Supernatural')).slice(0, 20);
        data['schoolLife'] = pool.filter((t) => t.genres.includes('School Life') || t.tags.some((tag) => tag.name === 'School')).slice(0, 20);
        data['drama'] = pool.filter((t) => t.genres.includes('Drama')).slice(0, 20);
        data['historical'] = pool.filter((t) => t.genres.includes('Historical')).slice(0, 20);
        data['slowBurn'] = pool.filter((t) => t.tags.some((tag) => tag.name.toLowerCase().includes('slow burn'))).slice(0, 20);

        // Fallbacks must stay distinct from the other rails: copying `pool` here
        // made "Recently Released" a carbon copy of "Trending Now" whenever the
        // upstream call failed.
        const releasedPool = pool.filter((t) => t.status === 'RELEASING' || t.status === 'FINISHED');
        data['recent'] =
          recent.length > 0
            ? recent
            : [...releasedPool].sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0)).slice(0, 20);
        data['completed'] =
          completed.length > 0 ? completed : pool.filter((t) => t.status === 'FINISHED').slice(0, 20);

        const hasAny = Object.entries(data).some(([key, arr]) => key !== 'pool' && arr.length > 0);
        if (!hasAny) setError(true);

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

  // Optional editorial pinning from the admin console. Absent table is harmless.
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    supabase
      .from('featured_titles')
      .select('title_id,title,cover_image,content_type')
      .order('position', { ascending: true })
      .limit(12)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const picks = (data as FeaturedRow[]).map<ContentTitle>((row) => ({
          id: row.title_id,
          providerId: row.title_id,
          provider: 'CURATED',
          title: row.title,
          altTitles: [],
          contentType: (row.content_type || 'MANGA') as ContentType,
          coverImage: row.cover_image ?? undefined,
          genres: [],
          tags: [],
          status: 'UNKNOWN',
          externalLinks: [],
          relations: [],
          maturityRating: 'SUGGESTIVE',
          glClassification: 'CONFIRMED_GL',
        }));
        setPinned(picks);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const get = (key: string) => sections[key] || [];

  const heroDeck = useMemo(() => {
    const pool = dedupe([
      ...get('trending'),
      ...get('pool'),
      ...get('recent'),
      ...get('manhwa'),
      ...get('manhua'),
      ...get('novels'),
      ...get('movies'),
      ...get('tv'),
    ]).filter((title) => title.glClassification === 'CONFIRMED_GL');

    // Pinned titles may not be in the live pool; enrich them when they are.
    const byId = new Map(pool.map((title) => [title.id, title]));
    const enrichedPins = pinned.map((pin) => byId.get(pin.id) ?? pin);

    return buildHeroDeck(enrichedPins, pool.length > 0 ? pool : pinned);
  }, [sections, pinned]);

  return (
    <div>
      <Hero titles={heroDeck} loading={loading && heroDeck.length === 0} />

      <div className="mx-auto max-w-page px-4 pt-8 md:px-6">
        <CatalogStats className="mt-0" />
      </div>

      <div className="mx-auto max-w-page px-4 py-8 md:px-6">
        {error && (
          <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-xl border border-error-500/30 bg-error-500/5 p-4 sm:flex-row sm:items-center">
            <span className="flex items-center gap-2 text-sm text-error-400">
              <Heart className="h-4 w-4" />
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
        <Carousel title="Anime, Movies & Dramas" titles={get('screen')} loading={loading} viewAllLink="/anime" />
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

      <TestimonialsSection />
    </div>
  );
}
