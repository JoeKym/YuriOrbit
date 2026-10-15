import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Heart, BookOpen, Play, Share2, Flag, ExternalLink, Star,
  ChevronLeft, Calendar, Globe, Layers, Hash, TrendingUp, Users
} from 'lucide-react';
import type { ContentTitle, LibraryStatus } from '@/types/content';
import { CONTENT_TYPE_LABELS, LIBRARY_STATUS_LABELS } from '@/types/content';
import { getTitleById } from '@/lib/providers';
import { useLibrary } from '@/hooks/useLibrary';
import { cn, formatScore, getFallbackCover, getFallbackBanner, getStatusLabel, getStatusColor } from '@/lib/utils/format';

const STATUSES: LibraryStatus[] = ['CURRENT', 'PLANNED', 'COMPLETED', 'ON_HOLD', 'DROPPED', 'FAVOURITE'];

export function TitleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState<ContentTitle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const { isInLibrary, addToLibrary, removeFromLibrary, getEntry, updateProgress, updateRating, updateNotes } = useLibrary();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      if (!id) return;
      try {
        const result = await getTitleById(id);
        if (cancelled) return;
        setTitle(result);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const isSaved = id ? isInLibrary(id) : false;
  const entry = id ? getEntry(id) : undefined;

  if (loading) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
        <div className="skeleton mb-6 h-6 w-24 rounded" />
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="skeleton h-80 w-56 rounded-xl" />
          <div className="flex-1 space-y-3">
            <div className="skeleton h-10 w-2/3 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="skeleton h-24 w-full rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !title) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-ink-200">Title not found</p>
        <p className="mt-1 text-sm text-ink-400">This title may not exist or could not be loaded.</p>
        <Link to="/discover" className="btn-primary mt-4">Back to Discover</Link>
      </div>
    );
  }

  const isReadable = ['MANGA', 'MANHWA', 'MANHUA', 'WEBTOON'].includes(title.contentType);
  const isWatchable = ['MOVIE', 'TV', 'DRAMA'].includes(title.contentType);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: title.title, url }); } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  return (
    <div>
      {title.bannerImage && (
        <div className="relative h-48 md:h-72 overflow-hidden">
          <img
            src={title.bannerImage}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
        </div>
      )}

      <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
        <Link to="/discover" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-400 transition-colors hover:text-rose-400">
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>

        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex-shrink-0">
            <div className="relative w-40 md:w-56 overflow-hidden rounded-xl shadow-card">
              <img
                src={title.coverImage || getFallbackCover(title.title)}
                alt={title.title}
                className="w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).src = getFallbackCover(title.title); }}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="chip">{CONTENT_TYPE_LABELS[title.contentType]}</span>
              <span className={cn('text-sm font-medium', getStatusColor(title.status))}>{getStatusLabel(title.status)}</span>
              {title.glClassification === 'GL_RELATED' && (
                <span className="chip" style={{ borderColor: '#f59e0b40', color: '#fbbf24', background: '#f59e0b15' }}>GL-Related</span>
              )}
            </div>

            <h1 className="font-display text-3xl font-semibold text-ink-50 md:text-4xl">{title.title}</h1>

            {title.altTitles.length > 0 && (
              <p className="mt-1 text-sm text-ink-400">
                Also known as: {title.altTitles.slice(0, 3).join(' · ')}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-300">
              {title.releaseYear && (
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-ink-400" /> {title.releaseYear}</span>
              )}
              {title.country && (
                <span className="flex items-center gap-1.5"><Globe className="h-4 w-4 text-ink-400" /> {title.country}</span>
              )}
              {title.averageScore && (
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-400 fill-amber-400" /> {formatScore(title.averageScore)}</span>
              )}
              {title.popularity && (
                <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-ink-400" /> #{title.popularity}</span>
              )}
              {title.chapters && (
                <span className="flex items-center gap-1.5"><Hash className="h-4 w-4 text-ink-400" /> {title.chapters} chapters</span>
              )}
              {title.volumes && (
                <span className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-ink-400" /> {title.volumes} volumes</span>
              )}
              {title.episodes && (
                <span className="flex items-center gap-1.5"><Play className="h-4 w-4 text-ink-400" /> {title.episodes} episodes</span>
              )}
            </div>

            {title.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {title.genres.map((g) => (
                  <Link key={g} to={`/discover?genre=${encodeURIComponent(g)}`} className="chip hover:chip-active">
                    {g}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {isReadable && (
                <Link to={`/read/${title.id}`} className="btn-primary">
                  <BookOpen className="h-4 w-4" /> Start Reading
                </Link>
              )}
              {isWatchable && (
                <Link to={`/watch/${title.id}`} className="btn-primary">
                  <Play className="h-4 w-4" /> Watch
                </Link>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className={cn(isSaved ? 'btn-secondary' : 'btn-secondary')}
                >
                  <Heart className={cn('h-4 w-4', isSaved && 'fill-rose-500 text-rose-500')} />
                  {isSaved ? LIBRARY_STATUS_LABELS[entry?.status || 'FAVOURITE'] : 'Add to Library'}
                </button>
                {showStatusMenu && (
                  <div className="absolute top-full mt-1 left-0 z-20 w-48 rounded-lg border border-ink-700 bg-ink-850 py-1 shadow-card-hover animate-fade-in-fast">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        onClick={() => { addToLibrary(title, s); setShowStatusMenu(false); }}
                        className={cn(
                          'block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-ink-800',
                          entry?.status === s ? 'text-rose-400' : 'text-ink-200'
                        )}
                      >
                        {LIBRARY_STATUS_LABELS[s]}
                      </button>
                    ))}
                    {isSaved && (
                      <>
                        <div className="my-1 border-t border-ink-700" />
                        <button
                          onClick={() => { removeFromLibrary(title.id); setShowStatusMenu(false); }}
                          className="block w-full px-3 py-2 text-left text-sm text-error-400 transition-colors hover:bg-ink-800"
                        >
                          Remove from Library
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button onClick={handleShare} className="btn-secondary">
                <Share2 className="h-4 w-4" /> Share
              </button>
            </div>
          </div>
        </div>

        {title.description && (
          <div className="mt-8 max-w-3xl">
            <h2 className="section-title mb-3">Synopsis</h2>
            <p className="text-sm leading-relaxed text-ink-300 whitespace-pre-line">{title.description}</p>
          </div>
        )}

        {title.tags.length > 0 && (
          <div className="mt-6 max-w-3xl">
            <h2 className="section-title mb-3">Tags</h2>
            <div className="flex flex-wrap gap-2">
              {title.tags.slice(0, 20).map((t) => (
                <span key={t.id} className="chip text-xs">
                  {t.name}{t.rank ? ` · ${t.rank}%` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {isSaved && (
          <div className="mt-6 max-w-3xl rounded-xl border border-ink-800 bg-ink-900 p-4">
            <h3 className="mb-3 text-sm font-semibold text-ink-100">Your Progress</h3>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-ink-400">Progress:</label>
                <input
                  type="number"
                  min="0"
                  max={title.chapters || title.episodes || 999}
                  value={entry?.progress || 0}
                  onChange={(e) => updateProgress(title.id, parseInt(e.target.value) || 0)}
                  className="w-20 rounded-lg border border-ink-700 bg-ink-850 px-2 py-1 text-sm text-ink-50 focus:border-rose-500/50 focus:outline-none"
                />
                <span className="text-xs text-ink-400">/ {title.chapters || title.episodes || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-ink-400">Rating:</label>
                <select
                  value={entry?.rating || 0}
                  onChange={(e) => updateRating(title.id, parseInt(e.target.value))}
                  className="rounded-lg border border-ink-700 bg-ink-850 px-2 py-1 text-sm text-ink-50 focus:border-rose-500/50 focus:outline-none"
                >
                  <option value="0">—</option>
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n}/10</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Add a personal note..."
                  defaultValue={entry?.notes || ''}
                  onBlur={(e) => updateNotes(title.id, e.target.value)}
                  className="w-full rounded-lg border border-ink-700 bg-ink-850 px-3 py-1.5 text-sm text-ink-50 placeholder:text-ink-400 focus:border-rose-500/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {title.externalLinks.length > 0 && (
          <div className="mt-8 max-w-3xl">
            <h2 className="section-title mb-3">Official Sources</h2>
            <div className="flex flex-wrap gap-2">
              {title.externalLinks.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  <ExternalLink className="h-4 w-4" /> {link.site}
                </a>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-400">
              Metadata sourced from {title.provider}. YuriVerse does not host copyrighted content.
            </p>
          </div>
        )}

        {title.relations.length > 0 && (
          <div className="mt-8">
            <h2 className="section-title mb-3">Related Titles</h2>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {title.relations.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/title/${rel.id}`}
                  className="group flex-shrink-0 w-32"
                >
                  <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-ink-850 transition-all duration-300 group-hover:ring-1 group-hover:ring-rose-500/20">
                    <img
                      src={rel.coverImage || getFallbackCover(rel.title)}
                      alt={rel.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-ink-200">{rel.title}</p>
                  <p className="text-[10px] text-ink-400">{rel.relationType.replace(/_/g, ' ').toLowerCase()}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <button
            onClick={() => alert('Thank you for the report. Our team will review this title\'s metadata.')}
            className="btn-ghost text-xs text-ink-400"
          >
            <Flag className="h-3.5 w-3.5" /> Report incorrect information
          </button>
        </div>
      </div>
    </div>
  );
}
