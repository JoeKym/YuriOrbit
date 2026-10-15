import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BookOpen, ExternalLink, ChevronLeft, ChevronRight, List, Maximize2, X } from 'lucide-react';
import type { ContentTitle } from '@/types/content';
import { getTitleById } from '@/lib/providers';
import { getFallbackCover } from '@/lib/utils/format';
import { useLibrary } from '@/hooks/useLibrary';
import { cn } from '@/lib/utils/format';

export function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState<ContentTitle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTOC, setShowTOC] = useState(false);
  const [readerWidth, setReaderWidth] = useState<'narrow' | 'normal' | 'wide'>('normal');
  const [bgColor, setBgColor] = useState<'dark' | 'light' | 'sepia'>('dark');
  const [fullscreen, setFullscreen] = useState(false);
  const { updateProgress, getEntry } = useLibrary();

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

  const entry = id ? getEntry(id) : undefined;
  const currentChapter = entry?.progress || 1;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
      if (e.key === 'f' || e.key === 'F') setFullscreen(f => !f);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
        <BookOpen className="mb-4 h-12 w-12 text-ink-600" />
        <p className="text-lg font-medium text-ink-200">Title not found</p>
        <Link to="/discover" className="btn-primary mt-4">Back to Discover</Link>
      </div>
    );
  }

  const hasChapters = (title.chapters || 0) > 0;

  const widthClass = readerWidth === 'narrow' ? 'max-w-2xl' : readerWidth === 'wide' ? 'max-w-5xl' : 'max-w-3xl';
  const bgClass = bgColor === 'light' ? 'bg-white text-ink-900' : bgColor === 'sepia' ? 'bg-amber-50 text-ink-900' : 'bg-ink-950 text-ink-100';

  return (
    <div className={cn('min-h-screen', bgClass, fullscreen && 'fixed inset-0 z-50 overflow-auto')}>
      <div className={cn('sticky top-0 z-30 border-b backdrop-blur-lg', bgColor === 'dark' ? 'border-ink-800 bg-ink-950/90' : 'border-stone-200 bg-white/90')}>
        <div className="mx-auto flex items-center gap-3 px-4 py-3">
          <Link to={`/title/${title.id}`} className="flex items-center gap-1.5 text-sm hover:text-rose-400 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Back to title
          </Link>
          <div className="ml-2 min-w-0 flex-1">
            <h1 className="truncate text-sm font-medium">{title.title}</h1>
          </div>
          <div className="flex items-center gap-1">
            <select
              value={readerWidth}
              onChange={(e) => setReaderWidth(e.target.value as 'narrow' | 'normal' | 'wide')}
              className="rounded-lg border border-ink-700 bg-ink-850 px-2 py-1.5 text-xs text-ink-50 focus:outline-none"
            >
              <option value="narrow">Narrow</option>
              <option value="normal">Normal</option>
              <option value="wide">Wide</option>
            </select>
            <select
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value as 'dark' | 'light' | 'sepia')}
              className="rounded-lg border border-ink-700 bg-ink-850 px-2 py-1.5 text-xs text-ink-50 focus:outline-none"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="sepia">Sepia</option>
            </select>
            <button
              onClick={() => setShowTOC(!showTOC)}
              className="rounded-lg p-2 text-ink-200 hover:bg-ink-800 transition-colors"
              aria-label="Table of contents"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="rounded-lg p-2 text-ink-200 hover:bg-ink-800 transition-colors"
              aria-label="Fullscreen"
            >
              {fullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {showTOC && (
        <div className="fixed right-0 top-0 z-40 h-full w-72 overflow-y-auto border-l border-ink-800 bg-ink-900 p-4 animate-fade-in-fast">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-ink-50">Chapters</h2>
            <button onClick={() => setShowTOC(false)} className="text-ink-400 hover:text-ink-50">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            {Array.from({ length: Math.min(hasChapters ? title.chapters! : 0, 100) }).map((_, i) => {
              const chNum = i + 1;
              return (
                <button
                  key={chNum}
                  onClick={() => { updateProgress(title.id, chNum); setShowTOC(false); }}
                  className={cn(
                    'block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    chNum === currentChapter ? 'bg-rose-500/10 text-rose-400' : 'text-ink-200 hover:bg-ink-800'
                  )}
                >
                  Chapter {chNum}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={cn('mx-auto px-4 py-8', widthClass)}>
        <div className="mb-6 text-center">
          <h2 className="font-display text-2xl font-semibold">{title.title}</h2>
          <p className="mt-1 text-sm opacity-60">Chapter {currentChapter}</p>
        </div>

        <div className={cn('rounded-xl border p-8 text-center', bgColor === 'dark' ? 'border-ink-800 bg-ink-900' : 'border-stone-200 bg-stone-50')}>
          <div className="mx-auto mb-4 w-32">
            <img
              src={title.coverImage || getFallbackCover(title.title)}
              alt={title.title}
              className="w-full rounded-lg shadow-card"
            />
          </div>
          <h3 className="mb-2 text-lg font-medium">Read on the official source</h3>
          <p className="mb-4 text-sm opacity-70 max-w-md mx-auto">
            YuriVerse provides metadata and discovery. Reading this title's full chapters requires visiting an authorized source. We do not host or proxy copyrighted pages.
          </p>

          {title.externalLinks.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {title.externalLinks
                .filter((l) => l.type !== 'METADATA' || l.site === 'AniList')
                .map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                  >
                    <ExternalLink className="h-4 w-4" /> Open {link.site}
                  </a>
                ))}
            </div>
          )}

          {title.externalLinks.length === 0 && (
            <p className="text-sm opacity-60">No official source links are available for this title yet.</p>
          )}
        </div>

        {hasChapters && (
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => currentChapter > 1 && updateProgress(title.id, currentChapter - 1)}
              disabled={currentChapter <= 1}
              className="btn-secondary disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <span className="text-sm opacity-60">{currentChapter} / {title.chapters}</span>
            <button
              onClick={() => currentChapter < (title.chapters || 0) && updateProgress(title.id, currentChapter + 1)}
              disabled={currentChapter >= (title.chapters || 0)}
              className="btn-secondary disabled:opacity-30"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs opacity-50">
            Source: {title.provider} · YuriVerse does not host copyrighted content.
          </p>
        </div>
      </div>
    </div>
  );
}
