import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, BookOpen, CheckCircle, Clock, XCircle, Pause, Trash2, Download, Star, LogIn, Cloud, HardDrive } from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import { useAuth } from '@/lib/auth/AuthContext';
import { CONTENT_TYPE_LABELS, type LibraryStatus } from '@/types/content';
import { getLibraryStatusLabel, getLibraryStatusFilterLabel } from '@/lib/utils/status';
import { cn, getFallbackCover } from '@/lib/utils/format';
import { usePageMeta } from '@/hooks/usePageMeta';
import { AvailabilityBadge } from '@/components/content/AvailabilityBadge';

const STATUS_FILTERS: (LibraryStatus | 'ALL')[] = ['ALL', 'CURRENT', 'PLANNED', 'COMPLETED', 'FAVOURITE', 'ON_HOLD', 'DROPPED'];

const STATUS_ICONS: Record<LibraryStatus, typeof Heart> = {
  CURRENT: BookOpen,
  PLANNED: Clock,
  COMPLETED: CheckCircle,
  FAVOURITE: Heart,
  ON_HOLD: Pause,
  DROPPED: XCircle,
};

export function LibraryPage() {
  usePageMeta({ title: 'My Library', description: 'Track and manage your Girls\' Love reading and watching list on YuriOrbit.', path: '/library', noIndex: true });

  const { library, removeFromLibrary, clearLibrary, isAuthenticated } = useLibrary();
  const { isLoading } = useAuth();
  const [filter, setFilter] = useState<LibraryStatus | 'ALL'>('ALL');
  const [sort, setSort] = useState<'recent' | 'title' | 'rating'>('recent');

  const filtered = library
    .filter((e) => filter === 'ALL' || e.status === filter)
    .sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleExport = () => {
    const data = JSON.stringify(library, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yuriorbit-library.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (library.length === 0) {
    return (
      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
        <h1 className="mb-1 font-display text-3xl font-semibold text-ink-50">My Library</h1>
        {!isAuthenticated && !isLoading && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <LogIn className="h-5 w-5 flex-shrink-0 text-rose-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink-100">Sign in to sync your library</p>
              <p className="text-xs text-ink-400">Your titles will be available across all your devices.</p>
            </div>
            <Link to="/auth" className="btn-primary text-xs">Sign in</Link>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BookOpen className="mb-4 h-12 w-12 text-ink-600" />
          <p className="text-lg font-medium text-ink-200">Your library is empty</p>
          <p className="mt-1 text-sm text-ink-400">Start adding titles to your library by browsing the catalogue.</p>
          <Link to="/discover" className="btn-primary mt-4">Discover GL</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-50">My Library</h1>
          <p className="mt-1 text-sm text-ink-400">{library.length} title{library.length !== 1 ? 's' : ''} saved</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary text-xs">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button
            onClick={() => { if (confirm('Remove all titles from your library? This cannot be undone.')) clearLibrary(); }}
            className="btn-ghost text-xs text-error-400"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn('chip transition-colors', filter === s && 'chip-active')}
          >
            {getLibraryStatusFilterLabel(s)}
          </button>
        ))}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'recent' | 'title' | 'rating')}
          className="ml-auto rounded-lg border border-ink-700 bg-ink-850 px-3 py-1.5 text-xs text-ink-50 focus:outline-none"
        >
          <option value="recent">Recently Updated</option>
          <option value="title">Title A-Z</option>
          <option value="rating">Highest Rated</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm text-ink-400">No titles in this category.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => {
            const Icon = STATUS_ICONS[entry.status];
            return (
              <div key={entry.id} className="flex gap-3 rounded-xl border border-ink-800 bg-ink-900 p-3 transition-all duration-200 hover:border-ink-700">
                <Link to={`/title/${entry.titleId}`} className="flex-shrink-0">
                  <img
                    src={entry.coverImage || getFallbackCover(entry.title)}
                    alt={entry.title}
                    loading="lazy"
                    className="h-24 w-16 rounded-lg bg-ink-850 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getFallbackCover(entry.title);
                    }}
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link to={`/title/${entry.titleId}`}>
                    <h3 className="truncate font-medium text-ink-50 hover:text-rose-400 transition-colors">{entry.title}</h3>
                  </Link>
                  <p className="mt-0.5 text-xs text-ink-400">{CONTENT_TYPE_LABELS[entry.contentType]}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-ink-300">
                      <Icon className="h-3 w-3" /> {getLibraryStatusLabel(entry.status, entry.contentType)}
                    </span>
                  </div>
                  {['MOVIE', 'TV', 'DRAMA'].includes(entry.contentType) && (
                    <AvailabilityBadge title={entry} variant="inline" />
                  )}
                  {entry.progress > 0 && (
                    <p className="mt-1 text-xs text-ink-400">Progress: {entry.progress}{entry.totalProgress ? `/${entry.totalProgress}` : ''}</p>
                  )}
                  {entry.rating && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400" /> {entry.rating}/10
                    </p>
                  )}
                  {entry.notes && (
                    <p className="mt-1 text-xs text-ink-400 italic line-clamp-2">"{entry.notes}"</p>
                  )}
                </div>
                <button
                  onClick={() => removeFromLibrary(entry.titleId)}
                  className="self-start rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-error-400"
                  aria-label="Remove"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/50 p-4">
        {isAuthenticated ? (
          <>
            <Cloud className="h-4 w-4 flex-shrink-0 text-rose-400" />
            <p className="text-xs text-ink-400">
              Your library is synced to your account and available across all devices.
            </p>
          </>
        ) : (
          <>
            <HardDrive className="h-4 w-4 flex-shrink-0 text-ink-400" />
            <p className="text-xs text-ink-400">
              Your library is stored locally in this browser. <Link to="/auth" className="text-rose-400 hover:text-rose-300">Sign in</Link> to sync across devices. Export your library to keep a backup.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
