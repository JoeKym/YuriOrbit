import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, ExternalLink, ChevronLeft, Star, Calendar, Globe } from 'lucide-react';
import type { ContentTitle } from '@/types/content';
import { getTitleById } from '@/lib/providers';
import { CONTENT_TYPE_LABELS } from '@/types/content';
import { cn, formatScore, getFallbackCover, getFallbackBanner, getStatusLabel, getStatusColor } from '@/lib/utils/format';

export function WatchPage() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState<ContentTitle | null>(null);
  const [loading, setLoading] = useState(true);

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

  const hasTrailer = !!(title.trailerId && title.trailerSite === 'youtube');

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
                src={`https://www.youtube.com/embed/${title.trailerId}`}
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
            YuriVerse provides metadata and discovery for GL films and series. Direct playback requires visiting an authorized streaming platform. We do not host or redistribute copyrighted video.
          </p>

          {title.externalLinks.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {title.externalLinks.map((link, i) => (
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
          ) : (
            <p className="text-sm text-ink-400">No official viewing links are available for this title yet.</p>
          )}
        </div>

        {title.description && (
          <div className="mt-6 max-w-3xl">
            <h2 className="section-title mb-2">Synopsis</h2>
            <p className="text-sm leading-relaxed text-ink-300 whitespace-pre-line">{title.description}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-ink-400">
            Source: {title.provider} · YuriVerse does not host copyrighted content.
          </p>
        </div>
      </div>
    </div>
  );
}
