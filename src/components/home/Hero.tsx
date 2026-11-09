import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Heart, Play, ShieldAlert, Sparkles, Star } from 'lucide-react';
import type { ContentTitle, MaturityLevel } from '@/types/content';
import { CONTENT_TYPE_LABELS } from '@/types/content';
import { cn, formatScore, getFallbackCover } from '@/lib/utils/format';
import { useLibrary } from '@/hooks/useLibrary';
import { maturityOf } from '@/lib/content/maturity';
import { useMaturity } from '@/hooks/useMaturity';

const ROTATE_MS = 7000;

interface SpotLight {
  key: string;
  label: string;
  matches: (title: ContentTitle) => boolean;
}

/** Format buckets for the spotlight tabs. Live-action TV goes with dramas. */
const SPOTLIGHTS: SpotLight[] = [
  { key: 'all', label: 'Everything', matches: () => true },
  { key: 'manga', label: 'Manga', matches: (t) => t.contentType === 'MANGA' },
  { key: 'manhwa', label: 'Manhwa', matches: (t) => t.contentType === 'MANHWA' },
  { key: 'manhua', label: 'Manhua', matches: (t) => t.contentType === 'MANHUA' },
  { key: 'webtoon', label: 'Webtoons', matches: (t) => t.contentType === 'WEBTOON' },
  { key: 'novel', label: 'Novels', matches: (t) => t.contentType === 'LIGHT_NOVEL' || t.contentType === 'WEB_NOVEL' || t.contentType === 'BOOK' },
  { key: 'anime', label: 'Anime', matches: (t) => t.contentType === 'TV' && t.provider !== 'TMDB' },
  { key: 'movies', label: 'Movies', matches: (t) => t.contentType === 'MOVIE' },
  { key: 'dramas', label: 'Dramas', matches: (t) => t.contentType === 'DRAMA' || (t.contentType === 'TV' && t.provider === 'TMDB') },
];

const MATURITY_BADGES: Partial<Record<MaturityLevel, { label: string; className: string }>> = {
  EROTICA: { label: '18+ Erotica', className: 'border-rose-500/50 bg-rose-500/15 text-rose-200' },
  PORNOGRAPHIC: { label: '18+ Explicit', className: 'border-rose-500/60 bg-rose-600/20 text-rose-100' },
  SUGGESTIVE: { label: 'Suggestive', className: 'border-amber-500/40 bg-amber-500/10 text-amber-200' },
};

function displayFormat(title: ContentTitle): string {
  if (title.contentType === 'TV' && title.provider === 'TMDB') return 'Live-action drama';
  return CONTENT_TYPE_LABELS[title.contentType];
}

/**
 * Rotating hero. Shows real catalogue picks across every format, cross-fades
 * between them, and offers a spotlight tab per format. The deck is rebuilt
 * whenever new picks arrive, and each full pass rotates the order so returning
 * visitors are not shown the same loop.
 */
export function Hero({ titles, loading }: { titles: ContentTitle[]; loading?: boolean }) {
  const [spotlight, setSpotlight] = useState('all');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [rotation, setRotation] = useState(0);
  const { library, addToLibrary, removeFromLibrary } = useLibrary();
  const { level } = useMaturity();
  const timerRef = useRef<number | null>(null);

  const pools = useMemo(() => {
    const map = new Map<string, ContentTitle[]>();
    for (const spot of SPOTLIGHTS) {
      map.set(spot.key, titles.filter(spot.matches));
    }
    return map;
  }, [titles]);

  const availableSpots = useMemo(
    () => SPOTLIGHTS.filter((spot) => spot.key === 'all' || (pools.get(spot.key)?.length ?? 0) > 0),
    [pools]
  );

  const deck = useMemo(() => {
    const base = pools.get(spotlight) ?? [];
    if (base.length === 0) return [];
    // Rotate the deck so a repeat pass surfaces different picks.
    const offset = rotation % base.length;
    return [...base.slice(offset), ...base.slice(0, offset)];
  }, [pools, spotlight, rotation]);

  const slide = deck.length > 0 ? deck[index % deck.length] : undefined;

  const advance = useCallback(
    (direction: 1 | -1) => {
      if (deck.length < 2) return;
      setIndex((current) => {
        const next = current + direction;
        if (next >= deck.length) {
          setRotation((r) => r + 3);
          return 0;
        }
        if (next < 0) return deck.length - 1;
        return next;
      });
    },
    [deck.length]
  );

  useEffect(() => {
    if (!slide || paused || deck.length < 2) return;
    const reducedMotion =
      document.documentElement.classList.contains('motion-reduce') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    timerRef.current = window.setTimeout(() => advance(1), ROTATE_MS);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [slide, paused, deck.length, advance]);

  // Keep the pointer inside the deck when the pool changes.
  useEffect(() => {
    setIndex(0);
  }, [spotlight, titles]);

  if (loading && !slide) {
    return (
      <section className="relative overflow-hidden border-b border-ink-800/70">
        <div className="h-[440px] w-full animate-shimmer bg-gradient-to-r from-ink-900 via-ink-850 to-ink-900 bg-[length:200%_100%] md:h-[520px]" />
      </section>
    );
  }

  if (!slide) return null;

  const maturity = maturityOf(slide);
  const maturityBadge = MATURITY_BADGES[maturity];
  const saved = library.some((entry) => entry.titleId === slide.id);
  const backdrop = slide.bannerImage || slide.coverImage || getFallbackCover(slide.title);

  return (
    <section
      className="relative overflow-hidden border-b border-ink-800/70"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured Girls' Love picks"
    >
      {/* Cross-fading backdrops */}
      {deck.map((item, position) => (
        <div
          key={`${item.id}-${position}`}
          aria-hidden
          className={cn(
            'absolute inset-0 transition-opacity duration-[1200ms] ease-smooth',
            item.id === slide.id ? 'opacity-100' : 'opacity-0'
          )}
        >
          <img
            src={item.bannerImage || item.coverImage || getFallbackCover(item.title)}
            alt=""
            className="h-full w-full object-cover object-center animate-hero-zoom"
            onError={(event) => {
              (event.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/70 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(232,77,138,0.18),transparent_65%)]" />

      <div className="relative mx-auto flex max-w-[1600px] flex-col gap-8 px-4 pb-8 pt-14 md:flex-row md:items-end md:gap-12 md:px-6 md:pb-10 md:pt-20">
        <div key={slide.id} className="max-w-2xl animate-fade-in">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-200">
              <Sparkles className="h-3 w-3" />
              {displayFormat(slide)}
            </span>
            {slide.releaseYear && (
              <span className="rounded-full border border-ink-700/70 bg-ink-900/70 px-2.5 py-1 text-[11px] text-ink-300">
                {slide.releaseYear}
              </span>
            )}
            {slide.averageScore ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                {formatScore(slide.averageScore)}
              </span>
            ) : null}
            {maturityBadge && (
              <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium', maturityBadge.className)}>
                <ShieldAlert className="h-3 w-3" />
                {maturityBadge.label}
              </span>
            )}
          </div>

          <h1 className="font-display text-4xl font-semibold leading-[1.05] text-ink-50 text-balance md:text-6xl">
            {slide.title}
          </h1>

          {slide.altTitles.length > 0 && (
            <p className="mt-2 line-clamp-1 text-xs text-ink-400">{slide.altTitles[0]}</p>
          )}

          {slide.description && (
            <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-relaxed text-ink-300 md:text-base">
              {slide.description}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {slide.genres.slice(0, 4).map((genre) => (
              <span key={genre} className="rounded-full border border-ink-600/70 bg-ink-950/70 px-2.5 py-0.5 text-[11px] text-ink-200 backdrop-blur-sm">
                {genre}
              </span>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to={`/title/${slide.id}`} className="btn-primary">
              <Play className="h-4 w-4" />
              View title
            </Link>
            <button
              onClick={() => {
                if (saved) {
                  const entry = library.find((item) => item.titleId === slide.id);
                  if (entry) removeFromLibrary(entry.titleId);
                } else {
                  addToLibrary(slide, 'PLANNED');
                }
              }}
              className="btn-secondary"
            >
              <Heart className={cn('h-4 w-4', saved && 'fill-rose-500 text-rose-500')} />
              {saved ? 'In your library' : 'Save for later'}
            </button>
          </div>
        </div>

        {/* Poster + controls */}
        <div className="flex flex-1 flex-col items-start gap-4 md:items-end">
          <div className="relative hidden md:block">
            <div className="absolute -inset-4 rounded-3xl bg-rose-500/10 blur-2xl" aria-hidden />
            <img
              key={`poster-${slide.id}`}
              src={slide.coverImage || getFallbackCover(slide.title)}
              alt={slide.title}
              className="relative h-56 w-40 rounded-2xl object-cover shadow-card-hover ring-1 ring-white/10 animate-fade-in"
              onError={(event) => {
                (event.target as HTMLImageElement).src = getFallbackCover(slide.title);
              }}
            />
          </div>

          <div className="flex w-full flex-col gap-3 md:items-end">
            <div className="flex flex-wrap gap-1.5">
              {availableSpots.map((spot) => (
                <button
                  key={spot.key}
                  onClick={() => setSpotlight(spot.key)}
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                    spotlight === spot.key
                      ? 'bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/40'
                      : 'bg-ink-900/70 text-ink-300 hover:bg-ink-850 hover:text-ink-100'
                  )}
                  aria-pressed={spotlight === spot.key}
                >
                  {spot.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="mr-1 text-[11px] tabular-nums text-ink-400">
                {String((index % deck.length) + 1).padStart(2, '0')} / {String(deck.length).padStart(2, '0')}
              </span>
              <button
                onClick={() => advance(-1)}
                className="rounded-full border border-ink-700/70 bg-ink-900/70 p-1.5 text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50"
                aria-label="Previous pick"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => advance(1)}
                className="rounded-full border border-ink-700/70 bg-ink-900/70 p-1.5 text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50"
                aria-label="Next pick"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex max-w-[16rem] flex-wrap justify-end gap-1" aria-hidden>
              {deck.slice(0, 12).map((item, position) => (
                <button
                  key={`dot-${item.id}-${position}`}
                  onClick={() => setIndex(position)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    position === index % deck.length ? 'w-6 bg-rose-400' : 'w-1.5 bg-ink-600 hover:bg-ink-400'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Current level, so the filter is never a surprise */}
      <div className="relative mx-auto max-w-[1600px] px-4 pb-6 md:px-6 md:pb-7">
        <p className="text-[10px] uppercase tracking-wider text-ink-500">
          Content filter: {level.toLowerCase()} · change it in{' '}
          <Link to="/settings" className="text-ink-400 underline decoration-dotted hover:text-ink-200">
            settings
          </Link>
        </p>
      </div>
    </section>
  );
}
