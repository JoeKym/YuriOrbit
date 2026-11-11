import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, ExternalLink, ChevronLeft, Star, Calendar, Globe } from 'lucide-react';
import type { ContentTitle, ExternalLink as ExternalLinkInfo } from '@/types/content';
import {
  getTitleById,
  tmdbGetWatchProviders,
  tmdbGetTrailerKey,
  tmdbPreferredRegion,
} from '@/lib/providers';
import type { TmdbWatchProvider } from '@/lib/providers';
import { CONTENT_TYPE_LABELS } from '@/types/content';
import { cn, formatScore, getFallbackCover, getFallbackBanner, getStatusLabel, getStatusColor } from '@/lib/utils/format';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useContentModeration } from '@/hooks/useContentModeration';
import { ContentUnavailable } from '@/components/site/ContentUnavailable';
import { RestrictedNotice } from '@/components/site/RestrictedNotice';

const STREAMING_SITE_HINTS = [
  'crunchyroll', 'hidive', 'netflix', 'youtube', 'viki', 'amazon', 'prime video',
  'hulu', 'disney', 'gagaoolala', 'iqiyi', 'wetv', 'bilibili', 'tencent',
  'viu', 'abema', 'unext', 'dmm', 'tubi', 'max', 'paramount', 'apple tv',
];

/** AniList tags video links as STREAMING; older cached records can omit it. */
function isStreamingLink(link: ExternalLinkInfo): boolean {
  if (link.type === 'STREAMING') return true;
  const site = link.site.toLowerCase();
  return !link.type && STREAMING_SITE_HINTS.some((hint) => site.includes(hint));
}

export function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState<ContentTitle | null>(null);
  const [loading, setLoading] = useState(true);
  const [tmdbTrailerId, setTmdbTrailerId] = useState<string | null>(null);
  const [watchProviders, setWatchProviders] = useState<TmdbWatchProvider[]>([]);
  const [watchProvidersRegion, setWatchProvidersRegion] = useState('');
  const [watchProvidersLink, setWatchProvidersLink] = useState<string | undefined>(undefined);
  const moderation = useContentModeration(id);
  usePageMeta({
    title: title ? `Watch ${title.title}` : (loading ? 'Loading…' : 'Watch'),
    description: title?.synopsis
      ? title.synopsis.replace(/\s+/g, ' ').slice(0, 160)
      : title?.title
        ? `Watch information and details for ${title.title} on YuriOrbit.`
        : 'Watch Girls\' Love titles on YuriOrbit.',
    path: id ? `/watch/${id}` : undefined,
    image: title?.bannerImage || title?.coverImage,
  });


  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const result = await getTitleById(id);
        if (cancelled) return;
        setTitle(result);
      } catch {
        if (!cancelled) setTitle(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // TMDB gives us regional streaming availability and trailers for live action.
  useEffect(() => {
    setTmdbTrailerId(null);
    setWatchProviders([]);
    setWatchProvidersRegion('');
    setWatchProvidersLink(undefined);

    if (!title || title.provider !== 'TMDB' || !title.providerId) return;

    let cancelled = false;
    const mediaType = title.contentType === 'MOVIE' ? 'movie' : 'tv';
    const hasAniListTrailer = !!(title.trailerId && title.trailerSite === 'youtube');

    tmdbGetWatchProviders(title.providerId, mediaType, tmdbPreferredRegion())
      .then((data) => {
        if (cancelled || !data) return;
        setWatchProviders(data.providers);
        setWatchProvidersRegion(data.region);
        setWatchProvidersLink(data.link);
      })
      .catch(() => undefined);

    if (!hasAniListTrailer) {
      tmdbGetTrailerKey(title.providerId, mediaType)
        .then((key) => {
          if (!cancelled && key) setTmdbTrailerId(key);
        })
        .catch(() => undefined);
    }

    return () => { cancelled = true; };
  }, [title?.id, title?.providerId, title?.provider, title?.contentType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="skeleton h-8 w-32 rounded" />
      </div>
    );
  }

  if (!title) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Play className="mb-4 h-12 w-12 text-ink-600" />
        <p className="text-lg font-medium text-ink-200">Title not found</p>
        <Link to="/discover" className="btn-primary mt-4">Back to Discover</Link>
      </div>
    );
  }

  if (moderation && (moderation.action === 'takedown' || moderation.action === 'suspended')) {
    return (
      <ContentUnavailable
        moderation={moderation}
        backTo={{ to: `/title/${title.id}`, label: 'Title details' }}
      />
    );
  }

  const trailerId =
    title.trailerId && title.trailerSite === 'youtube' ? title.trailerId : tmdbTrailerId;
  const hasTrailer = !!trailerId;

  // Keep social/database links out of Watch Options; they belong in sources.
  const streamingLinks = title.externalLinks.filter(isStreamingLink);
  const otherLinks = title.externalLinks.filter((link) => !isStreamingLink(link));

  return (
    <div>
      <div className="relative h-48 md:h-80 overflow-hidden">
        <img
          src={title.bannerImage || getFallbackBanner(title.title)}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-6 md:px-6">
        <RestrictedNotice moderation={moderation} />
        <Link to={`/title/${title.id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-rose-400 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Back to title
        </Link>

        <div className="flex flex-col gap-6 md:flex-row">
          <img
            src={title.coverImage || getFallbackCover(title.title)}
            alt={title.title}
            className="h-48 w-32 flex-shrink-0 rounded-xl shadow-card object-cover md:h-64 md:w-44"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="chip">{CONTENT_TYPE_LABELS[title.contentType]}</span>
              <span className={cn('text-sm font-medium', getStatusColor(title.status))}>{getStatusLabel(title.status)}</span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink-50 md:text-3xl">{title.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-ink-300">
              {title.releaseYear && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-ink-400" /> {title.releaseYear}</span>}
              {title.country && <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-ink-400" /> {title.country}</span>}
              {title.averageScore && <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-400 fill-amber-400" /> {formatScore(title.averageScore)}</span>}
            </div>
          </div>
        </div>

        {hasTrailer && (
          <div className="mt-8">
            <h2 className="section-title mb-3">Trailer</h2>
            <div className="relative aspect-video overflow-hidden rounded-xl border border-ink-800 bg-ink-900">
              <iframe
                src={`https://www.youtube.com/embed/${trailerId}`}
                title={`${title.title} Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-ink-800 bg-ink-900 p-6">
          <h2 className="mb-3 text-lg font-semibold text-ink-50">Watch Options</h2>
          <p className="mb-4 text-sm text-ink-400">
            YuriOrbit provides metadata and discovery for GL films and series. Direct playback requires visiting an authorized streaming platform. We do not host or redistribute copyrighted video.
          </p>

          {streamingLinks.length > 0 || watchProviders.length > 0 ? (
            <div className="space-y-4">
              {watchProviders.length > 0 && (
                <div>
                  <div className="flex flex-wrap gap-2">
                    {watchProviders.map((provider) => (
                      <a
                        key={provider.id}
                        href={watchProvidersLink || title.sourceUrl || '#'}
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
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <Play className="h-4 w-4 text-ink-300" />
                        )}
                        <span className="text-xs font-medium text-ink-200">{provider.name}</span>
                      </a>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-ink-500">
                    Availability in {watchProvidersRegion}. Streaming data provided by{' '}
                    {watchProvidersLink ? (
                      <a
                        href={watchProvidersLink}
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
                </div>
              )}

              {streamingLinks.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {streamingLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary"
                    >
                      <ExternalLink className="h-4 w-4" /> Watch on {link.site}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-400">No streaming availability is listed for this title yet.</p>
          )}
        </div>

        {otherLinks.length > 0 && (
          <div className="mt-6 max-w-3xl">
            <h2 className="section-title mb-2">Official Sources</h2>
            <p className="mb-2 text-xs text-ink-400">
              Metadata, social and reference pages for this title.
            </p>
            <div className="flex flex-wrap gap-2">
              {otherLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {link.site}
                </a>
              ))}
            </div>
          </div>
        )}

        {title.description && (
          <div className="mt-6 max-w-3xl">
            <h2 className="section-title mb-2">Synopsis</h2>
            <p className="text-sm leading-relaxed text-ink-300 whitespace-pre-line">{title.description}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-ink-400">
            Source: {title.provider} · YuriOrbit does not host copyrighted content.
          </p>
        </div>
      </div>
    </div>
  );
}
