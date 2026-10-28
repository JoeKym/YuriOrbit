import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  BookOpen,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  List,
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { ContentTitle, ChapterInfo } from '@/types/content';
import {
  getTitleById,
  mangadexGetChapters,
  mangadexGetChapterPages,
  mangadexFindMangaId,
} from '@/lib/providers';
import { getFallbackCover, cn } from '@/lib/utils/format';
import { useLibrary } from '@/hooks/useLibrary';

export function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [title, setTitle] = useState<ContentTitle | null>(null);
  const [loadingTitle, setLoadingTitle] = useState(true);

  // MangaDex matching & chapters
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [readableChapters, setReadableChapters] = useState<ChapterInfo[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  const [matchedMangaId, setMatchedMangaId] = useState<string | null>(null);

  // Page images
  const [pageUrls, setPageUrls] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [pagesError, setPagesError] = useState<string | null>(null);

  // Reader display controls
  const [showTOC, setShowTOC] = useState(false);
  const [readerWidth, setReaderWidth] = useState<'narrow' | 'normal' | 'wide' | 'full'>('normal');
  const [bgColor, setBgColor] = useState<'dark' | 'light' | 'sepia'>('dark');
  const [fullscreen, setFullscreen] = useState(false);

  const { updateProgress, getEntry } = useLibrary();
  const topRef = useRef<HTMLDivElement>(null);

  // 1. Fetch title metadata
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setLoadingTitle(true);
      try {
        const result = await getTitleById(id);
        if (cancelled) return;
        setTitle(result);
      } catch {
        if (!cancelled) setTitle(null);
      } finally {
        if (!cancelled) setLoadingTitle(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // 2. Discover chapters via MangaDex
  useEffect(() => {
    let cancelled = false;

    async function loadChapters() {
      if (!title || !id) return;

      setLoadingChapters(true);
      try {
        let mdId: string | null = null;
        if (id.startsWith('MANGADEX-')) {
          mdId = id.replace('MANGADEX-', '');
        } else {
          mdId = await mangadexFindMangaId(title.title, title.altTitles);
        }

        if (cancelled) return;
        setMatchedMangaId(mdId);

        if (!mdId) {
          setReadableChapters([]);
          return;
        }

        const allChapters = await mangadexGetChapters(mdId);
        if (cancelled) return;

        const available = allChapters.filter((c) => c.readable);
        setReadableChapters(available);

        if (available.length > 0) {
          // Check URL query param ?ch=
          const queryCh = searchParams.get('ch');
          let initialIdx = 0;
          if (queryCh) {
            const parsedNum = parseFloat(queryCh);
            const foundIdx = available.findIndex((c) => c.number === parsedNum || c.id === queryCh);
            if (foundIdx >= 0) initialIdx = foundIdx;
          } else {
            // Check library saved progress
            const entry = getEntry(id);
            if (entry && entry.progress) {
              const foundIdx = available.findIndex((c) => c.number === entry.progress);
              if (foundIdx >= 0) initialIdx = foundIdx;
            }
          }
          setActiveChapterIndex(initialIdx);
        }
      } catch {
        if (!cancelled) {
          setReadableChapters([]);
        }
      } finally {
        if (!cancelled) setLoadingChapters(false);
      }
    }

    loadChapters();
    return () => { cancelled = true; };
  }, [title, id]);

  // 3. Load page images for active chapter
  const activeChapter = readableChapters[activeChapterIndex];

  useEffect(() => {
    let cancelled = false;

    async function loadPages() {
      if (!activeChapter) {
        setPageUrls([]);
        return;
      }

      setLoadingPages(true);
      setPagesError(null);

      try {
        const urls = await mangadexGetChapterPages(activeChapter.id);
        if (cancelled) return;

        if (urls.length === 0) {
          setPagesError('No pages could be loaded for this chapter. The server may be busy or rate-limited.');
        } else {
          setPageUrls(urls);
          // Sync progress with library
          if (id && activeChapter.number) {
            updateProgress(id, activeChapter.number);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setPagesError(err instanceof Error ? err.message : 'Failed to fetch chapter images.');
        }
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    }

    loadPages();
    return () => { cancelled = true; };
  }, [activeChapter?.id]);

  // Handle chapter switch
  const selectChapter = (index: number) => {
    if (index < 0 || index >= readableChapters.length) return;
    setActiveChapterIndex(index);
    setShowTOC(false);
    const ch = readableChapters[index];
    if (ch) {
      setSearchParams({ ch: String(ch.number) }, { replace: true });
    }
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTOC(false);
        setFullscreen(false);
      }
      if (e.key === 'f' || e.key === 'F') {
        setFullscreen((f) => !f);
      }
      if (readableChapters.length > 0) {
        if (e.key === 'ArrowLeft' && activeChapterIndex > 0) {
          selectChapter(activeChapterIndex - 1);
        }
        if (e.key === 'ArrowRight' && activeChapterIndex < readableChapters.length - 1) {
          selectChapter(activeChapterIndex + 1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeChapterIndex, readableChapters.length]);

  if (loadingTitle) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="skeleton h-10 w-48 rounded mb-4" />
        <p className="text-sm text-ink-400">Loading title details...</p>
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

  const widthClass =
    readerWidth === 'narrow'
      ? 'max-w-2xl'
      : readerWidth === 'wide'
      ? 'max-w-5xl'
      : readerWidth === 'full'
      ? 'max-w-none'
      : 'max-w-3xl';

  const bgClass =
    bgColor === 'light'
      ? 'bg-stone-100 text-stone-900'
      : bgColor === 'sepia'
      ? 'bg-[#fbf0d9] text-[#433422]'
      : 'bg-ink-950 text-ink-100';

  const navBarBg =
    bgColor === 'light'
      ? 'border-stone-300 bg-white/95 text-stone-800'
      : bgColor === 'sepia'
      ? 'border-[#ebd7b2] bg-[#f4e6c7]/95 text-[#433422]'
      : 'border-ink-800 bg-ink-950/90 text-ink-100';

  const cardBg =
    bgColor === 'light'
      ? 'border-stone-300 bg-white text-stone-900 shadow-sm'
      : bgColor === 'sepia'
      ? 'border-[#ebd7b2] bg-[#f6ebcf] text-[#433422]'
      : 'border-ink-800 bg-ink-900 text-ink-100';

  return (
    <div ref={topRef} className={cn('min-h-screen transition-colors', bgClass, fullscreen && 'fixed inset-0 z-50 overflow-auto')}>
      {/* Top Header Bar */}
      <div className={cn('sticky top-0 z-30 border-b backdrop-blur-md transition-colors', navBarBg)}>
        <div className="mx-auto flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={`/title/${title.id}`}
              className="flex items-center gap-1.5 text-xs md:text-sm text-ink-400 hover:text-rose-400 transition-colors whitespace-nowrap"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xs md:text-sm font-semibold">{title.title}</h1>
              {activeChapter && (
                <p className="text-[11px] opacity-70 truncate">
                  {activeChapter.title || `Chapter ${activeChapter.number}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {readableChapters.length > 0 && (
              <>
                {/* Chapter Quick Select */}
                <select
                  value={activeChapterIndex}
                  onChange={(e) => selectChapter(parseInt(e.target.value, 10))}
                  className="rounded-lg border border-ink-700 bg-ink-850 px-2 py-1 text-xs text-ink-100 focus:outline-none max-w-[130px] md:max-w-[180px] truncate"
                  title="Select Chapter"
                >
                  {readableChapters.map((ch, idx) => (
                    <option key={ch.id} value={idx}>
                      {ch.number > 0 ? `Ch. ${ch.number}` : 'Ch.'} {ch.title ? `- ${ch.title}` : ''}
                    </option>
                  ))}
                </select>

                {/* Chapter List TOC button */}
                <button
                  onClick={() => setShowTOC(!showTOC)}
                  className="rounded-lg p-1.5 hover:bg-white/10 transition-colors text-xs flex items-center gap-1"
                  title="Chapter List"
                  aria-label="Table of contents"
                >
                  <List className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Reader Width */}
            <select
              value={readerWidth}
              onChange={(e) => setReaderWidth(e.target.value as 'narrow' | 'normal' | 'wide' | 'full')}
              className="hidden sm:inline-block rounded-lg border border-ink-700 bg-ink-850 px-2 py-1 text-xs text-ink-100 focus:outline-none"
              title="Reader Width"
            >
              <option value="narrow">Narrow</option>
              <option value="normal">Normal</option>
              <option value="wide">Wide</option>
              <option value="full">Full</option>
            </select>

            {/* Background Theme */}
            <select
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value as 'dark' | 'light' | 'sepia')}
              className="rounded-lg border border-ink-700 bg-ink-850 px-2 py-1 text-xs text-ink-100 focus:outline-none"
              title="Color Theme"
            >
              <option value="dark">Dark</option>
              <option value="sepia">Sepia</option>
              <option value="light">Light</option>
            </select>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
              title={fullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen (F)'}
              aria-label="Toggle Fullscreen"
            >
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Chapter List / TOC Drawer */}
      {showTOC && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in-fast">
          <div className="h-full w-80 max-w-[85vw] border-l border-ink-800 bg-ink-900 p-4 overflow-y-auto flex flex-col">
            <div className="mb-4 flex items-center justify-between pb-2 border-b border-ink-800">
              <h2 className="font-semibold text-sm text-ink-100">
                Chapters ({readableChapters.length})
              </h2>
              <button
                onClick={() => setShowTOC(false)}
                className="rounded p-1 text-ink-400 hover:text-ink-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto flex-1 pr-1">
              {readableChapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => selectChapter(idx)}
                  className={cn(
                    'block w-full rounded-lg px-3 py-2 text-left text-xs transition-colors',
                    idx === activeChapterIndex
                      ? 'bg-rose-500/20 text-rose-400 font-semibold'
                      : 'text-ink-300 hover:bg-ink-800 hover:text-ink-100'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">
                      {ch.number > 0 ? `Chapter ${ch.number}` : 'Oneshot'}{' '}
                      {ch.title && <span className="opacity-70 font-normal">· {ch.title}</span>}
                    </span>
                    {ch.pageCount && (
                      <span className="text-[10px] opacity-50 shrink-0 ml-2">
                        {ch.pageCount}p
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Reader Content */}
      <div className={cn('mx-auto px-2 sm:px-4 py-6', widthClass)}>
        {loadingChapters ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="h-8 w-8 text-rose-400 animate-spin mb-3" />
            <p className="text-sm font-medium">Checking MangaDex for readable chapters...</p>
            <p className="text-xs opacity-60 mt-1">Matching titles across catalog providers</p>
          </div>
        ) : readableChapters.length > 0 && activeChapter ? (
          <div>
            {/* Active Chapter Header */}
            <div className="mb-6 text-center">
              <h2 className="font-display text-xl sm:text-2xl font-bold">{title.title}</h2>
              <p className="mt-1 text-xs sm:text-sm opacity-70">
                {activeChapter.title || `Chapter ${activeChapter.number}`}
                {activeChapter.pageCount ? ` · ${activeChapter.pageCount} pages` : ''}
              </p>
            </div>

            {/* Pages Viewport */}
            {loadingPages ? (
              <div className="space-y-4 py-12 text-center">
                <RefreshCw className="h-8 w-8 text-rose-400 animate-spin mx-auto mb-3" />
                <p className="text-sm">Loading chapter pages from MangaDex CDN...</p>
                <div className="max-w-md mx-auto space-y-3 mt-6">
                  <div className="skeleton h-96 w-full rounded-lg" />
                  <div className="skeleton h-96 w-full rounded-lg" />
                </div>
              </div>
            ) : pagesError ? (
              <div className={cn('rounded-xl border p-8 text-center my-6', cardBg)}>
                <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold mb-2">Unable to load pages</h3>
                <p className="text-xs opacity-80 max-w-md mx-auto mb-4">{pagesError}</p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => selectChapter(activeChapterIndex)}
                    className="btn-primary text-xs"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry Chapter
                  </button>
                  {title.externalLinks.length > 0 && (
                    <a
                      href={title.externalLinks[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1" /> Read on {title.externalLinks[0].site}
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 sm:gap-2">
                {pageUrls.map((url, idx) => (
                  <div key={idx} className="relative w-full text-center">
                    <img
                      src={url}
                      alt={`Page ${idx + 1}`}
                      loading="lazy"
                      className="mx-auto block max-w-full h-auto rounded shadow-sm"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.style.opacity = '0.5';
                      }}
                    />
                    <div className="py-1 text-[11px] opacity-40 select-none">
                      {idx + 1} / {pageUrls.length}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Chapter Navigation */}
            <div className="mt-8 pt-4 border-t border-ink-800 flex items-center justify-between gap-3">
              <button
                onClick={() => selectChapter(activeChapterIndex - 1)}
                disabled={activeChapterIndex <= 0}
                className="btn-secondary text-xs sm:text-sm disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous Chapter
              </button>

              <span className="text-xs opacity-60">
                Chapter {activeChapterIndex + 1} of {readableChapters.length}
              </span>

              <button
                onClick={() => selectChapter(activeChapterIndex + 1)}
                disabled={activeChapterIndex >= readableChapters.length - 1}
                className="btn-primary text-xs sm:text-sm disabled:opacity-30 disabled:pointer-events-none"
              >
                Next Chapter <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>

            {activeChapterIndex >= readableChapters.length - 1 && (
              <div className="mt-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs font-medium text-emerald-300">
                  You are caught up with all available chapters on MangaDex!
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Official Source Notice for titles without MangaDex scans */
          <div className={cn('rounded-xl border p-6 sm:p-10 text-center my-4', cardBg)}>
            <div className="mx-auto mb-4 w-32 sm:w-40">
              <img
                src={title.coverImage || getFallbackCover(title.title)}
                alt={title.title}
                className="w-full rounded-lg shadow-card object-cover"
              />
            </div>

            <div className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-xs font-medium mb-3">
              Official Release
            </div>

            <h2 className="mb-2 text-lg sm:text-xl font-display font-semibold">
              Read on the official source
            </h2>

            <p className="mb-6 text-xs sm:text-sm opacity-80 max-w-lg mx-auto leading-relaxed">
              YuriOrbit provides discovery and metadata tracking. Online chapter scans are not hosted
              or available on MangaDex for this title. You can read the official licensed release
              directly on authorized platforms below:
            </p>

            {title.externalLinks.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {title.externalLinks.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs sm:text-sm inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open {link.site}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs opacity-60">
                No official source links are registered for this title yet.
              </p>
            )}

            <div className="mt-8 pt-4 border-t border-ink-800/50 text-[11px] opacity-50">
              Catalog source: {title.provider} · YuriOrbit does not host or redistribute copyrighted pages.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
