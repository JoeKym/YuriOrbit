import { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, BookOpen, CheckCircle, Clock, XCircle, Pause, Trash2, Download, Star, LogIn, Cloud, HardDrive, BookMarked, ShieldAlert } from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import { useAuth } from '@/lib/auth/AuthContext';
import { CONTENT_TYPE_LABELS, type LibraryStatus } from '@/types/content';
import { getLibraryStatusLabel, getLibraryStatusFilterLabel } from '@/lib/utils/status';
import { getFallbackCover } from '@/lib/utils/format';
import { usePageMeta } from '@/hooks/usePageMeta';
import { AvailabilityBadge } from '@/components/content/AvailabilityBadge';
import { countNewChapters, loadChapterProgress } from '@/lib/content/chapter-updates';
import { useChapterUpdatePrefs } from '@/lib/content/chapter-update-prefs';
import { Badge, Button, buttonClasses, Chip, Dialog, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layout/PageHeader';

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

  const { library, removeFromLibrary, clearLibrary, isAuthenticated, restoredCount, dismissRestoreNotice } =
    useLibrary();
  const { isLoading } = useAuth();
  // 'UPDATES' is a view rather than a saved status, so it is not in STATUS_FILTERS.
  const [chapterPrefs] = useChapterUpdatePrefs();
  const showUpdates = chapterPrefs.showBadges;
  const [filter, setFilter] = useState<LibraryStatus | 'ALL' | 'UPDATES'>(() =>
    new URLSearchParams(window.location.search).get('filter') === 'UPDATES' ? 'UPDATES' : 'ALL'
  );
  const [sort, setSort] = useState<'recent' | 'title' | 'rating'>('recent');
  const [latestChapters, setLatestChapters] = useState<Record<string, number>>({});
  const [confirmClear, setConfirmClear] = useState(false);

  // The entries list is only read inside the effect below; keying the effect on
  // the tracked ids keeps a progress edit from re-asking MangaDex. Which entries
  // are tracked is decided by content type, not provider: canonical ids usually
  // name the dominant upstream record rather than MangaDex.
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const onlyReading = chapterPrefs.onlyReading;
  const trackedIds = library
    .filter(
      (entry) =>
        ['MANGA', 'MANHWA', 'MANHUA', 'WEBTOON'].includes(entry.contentType) &&
        (!onlyReading || entry.status === 'CURRENT')
    )
    .map((entry) => `${entry.titleId}:${entry.provider ?? ''}`)
    .join('|');

  useEffect(() => {
    const tracked = libraryRef.current.filter(
      (entry) =>
        ['MANGA', 'MANHWA', 'MANHUA', 'WEBTOON'].includes(entry.contentType) &&
        (!onlyReading || entry.status === 'CURRENT')
    );
    if (tracked.length === 0) return;
    let cancelled = false;

    loadChapterProgress(tracked)
      .then((progress) => {
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const [titleId, value] of Object.entries(progress)) {
          if (value.latestChapter !== undefined) next[titleId] = value.latestChapter;
        }
        setLatestChapters(next);
      })
      .catch(() => {
        // A missing badge is better than a broken library.
      });

    return () => {
      cancelled = true;
    };
  }, [trackedIds, onlyReading]);

  const newChaptersFor = (entry: (typeof library)[number]) =>
    countNewChapters(entry.progress, latestChapters[entry.titleId]);
  /** Nothing is counted while badges are off, so no surface can show a stale total. */
  const updatesCount = showUpdates ? library.filter((entry) => newChaptersFor(entry) > 0).length : 0;

  useEffect(() => {
    if (!showUpdates) setFilter((current) => (current === 'UPDATES' ? 'ALL' : current));
  }, [showUpdates]);

  const filtered = library
    .filter((e) => {
      if (filter === 'ALL') return true;
      if (filter === 'UPDATES') return newChaptersFor(e) > 0;
      return e.status === filter;
    })
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
      <div className="mx-auto max-w-page px-4 py-8 md:px-6">
        <PageHeader
          title="My Library"
          description="Everything you've saved, in one place."
          className="mb-6"
        />
        {!isAuthenticated && !isLoading && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <LogIn className="h-5 w-5 flex-shrink-0 text-rose-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink-100">Sign in to sync your library</p>
              <p className="text-xs text-ink-400">Your titles will be available across all your devices.</p>
            </div>
            <Link to="/auth" className={buttonClasses('primary', 'sm')}>Sign in</Link>
          </div>
        )}
        <EmptyState
          icon={BookOpen}
          title="Your library is empty"
          description="Start adding titles to your library by browsing the catalogue."
          action={
            <Link to="/discover" className={buttonClasses('primary', 'md')}>
              Discover GL
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-page px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center justify-between">
        <PageHeader
          title="My Library"
          description={
            <>
              {library.length} title{library.length !== 1 ? 's' : ''} saved
              {updatesCount > 0 && (
                <span className="text-rose-300">
                  {' · '}
                  {updatesCount} with new chapter{updatesCount === 1 ? '' : 's'}
                </span>
              )}
            </>
          }
        />
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleExport} icon={<Download className="h-3.5 w-3.5" />}>
            Export
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmClear(true)}
            icon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Clear all
          </Button>
        </div>
      </div>

      {restoredCount > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="flex-1">
            Restored {restoredCount} title{restoredCount === 1 ? '' : 's'} from this browser's backup:
            the local database came back empty, so the saved copy filled it in again.
          </p>
          <button
            onClick={dismissRestoreNotice}
            className="shrink-0 text-xs font-medium text-amber-300 transition-colors hover:text-amber-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <Fragment key={s}>
            <Chip selected={filter === s} onClick={() => setFilter(s)}>
              {getLibraryStatusFilterLabel(s)}
            </Chip>
            {s === 'ALL' && updatesCount > 0 && (
              <Chip
                selected={filter === 'UPDATES'}
                onClick={() => setFilter('UPDATES')}
                icon={<BookMarked className="h-3 w-3" />}
                count={updatesCount}
              >
                New chapters
              </Chip>
            )}
          </Fragment>
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
        <EmptyState
          icon={filter === 'UPDATES' ? BookMarked : BookOpen}
          title={filter === 'UPDATES' ? 'Nothing new right now' : 'No titles in this category'}
          description={
            filter === 'UPDATES'
              ? 'Every tracked title is up to date.'
              : 'Try another status filter to see the rest of your library.'
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry) => {
            const Icon = STATUS_ICONS[entry.status];
            const latestChapter = latestChapters[entry.titleId];
            const newChapters = newChaptersFor(entry);
            const total = latestChapter ?? entry.totalProgress;
            return (
              <div key={entry.id} className="flex gap-3 rounded-xl border border-ink-800 bg-ink-900 p-3 transition-all duration-200 hover:border-ink-700">
                <Link to={`/title/${entry.titleId}`} className="flex-shrink-0">
                  <img
                    src={entry.coverImage || getFallbackCover(entry.title)}
                    alt={entry.title}
                    width={64}
                    height={96}
                    loading="lazy"
                    decoding="async"
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
                    <p className="mt-1 text-xs text-ink-400">
                      Progress: {entry.progress}
                      {total ? `/${total}` : ''}
                    </p>
                  )}
                  {showUpdates && newChapters > 0 && (
                    <p className="mt-1">
                      <Badge variant="update" icon={<BookMarked className="h-3 w-3" />}>
                        {newChapters} new chapter{newChapters === 1 ? '' : 's'}
                      </Badge>
                    </p>
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

      <Dialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Remove all titles?"
        description="This clears the saved library in this browser and cannot be undone. Export first if you want a backup."
        tone="danger"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                clearLibrary();
                setConfirmClear(false);
              }}
            >
              Remove all
            </Button>
          </>
        }
      />
    </div>
  );
}
