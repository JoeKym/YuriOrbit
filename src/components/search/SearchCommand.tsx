import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CornerDownLeft, Hash, Loader2, Search, UserRound, X } from 'lucide-react';
import type { SearchHit, LiveSearchResult } from '@/lib/search';
import { groupHitsByFormat, liveSearch } from '@/lib/search';
import { useDebounce } from '@/hooks/useDebounce';
import { useMaturity } from '@/hooks/useMaturity';
import { MATURITY_LABELS, CONTENT_TYPE_LABELS } from '@/types/content';
import { cn, getFallbackCover } from '@/lib/utils/format';

interface SearchCommandProps {
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

/**
 * Live search box for the navbar. Searches as you type (debounced), groups
 * results by format, accepts ids/slugs directly, and also finds titles through
 * their creators. Enter opens the highlighted result; otherwise /search lists
 * everything.
 */
export function SearchCommand({ variant = 'desktop', onNavigate }: SearchCommandProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<LiveSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const debouncedQuery = useDebounce(query, 350);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { level } = useMaturity();

  const groups = useMemo(() => (result ? groupHitsByFormat(result.hits) : []), [result]);
  const flatHits = useMemo(() => groups.flatMap((group) => group.hits), [groups]);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResult(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    liveSearch(trimmed, { limit: 28, includeCreators: true })
      .then((next) => {
        if (cancelled) return;
        setResult(next);
        setActiveIndex(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, level]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  const goToSearch = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setQuery('');
    setResult(null);
    close();
    inputRef.current?.blur();
  };

  const openHit = (hit: SearchHit) => {
    navigate(`/title/${hit.title.id}`);
    setQuery('');
    setResult(null);
    close();
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (flatHits.length === 0) {
      if (event.key === 'Enter') {
        event.preventDefault();
        goToSearch();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % flatHits.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + flatHits.length) % flatHits.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const hit = flatHits[activeIndex];
      if (hit) openHit(hit);
      else goToSearch();
    }
  };

  const showPanel = open && query.trim().length >= 2;
  const activeId = flatHits[activeIndex]?.title.id;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search titles, ids, creators…"
          aria-label="Search the catalogue"
          aria-expanded={showPanel}
          aria-controls="live-search-results"
          className={cn(
            'rounded-full border border-ink-800 bg-ink-900/80 py-1.5 pl-8 pr-8 text-xs text-ink-50 placeholder:text-ink-400',
            'transition-all duration-200 focus:border-rose-500/50 focus:bg-ink-850 focus:outline-none focus:ring-1 focus:ring-rose-500/30',
            variant === 'desktop' ? 'w-48 md:w-60 lg:w-72' : 'w-full py-2 text-sm'
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResult(null);
              inputRef.current?.focus();
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-ink-400 hover:text-ink-100"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {showPanel && (
        <div
          id="live-search-results"
          role="listbox"
          className={cn(
            'absolute right-0 z-50 mt-2 overflow-hidden rounded-xl border border-ink-700 bg-ink-900 shadow-2xl animate-fade-in-fast',
            variant === 'desktop' ? 'w-[26rem]' : 'w-full'
          )}
        >
          <div className="flex items-center justify-between border-b border-ink-800/80 px-3 py-1.5 text-[10px] uppercase tracking-wider text-ink-400">
            <span>Search</span>
            <span>Filter: {MATURITY_LABELS[level]}</span>
          </div>

          <div className="max-h-[26rem] overflow-y-auto py-1">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-ink-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
                Searching across providers…
              </div>
            )}

            {!loading && result?.direct && (
              <p className="px-3 pb-1 pt-1.5 text-[11px] text-ink-400">
                Matched an exact id — opening the title directly.
              </p>
            )}

            {!loading && result && flatHits.length === 0 && (
              <p className="px-3 py-4 text-xs text-ink-300">
                Nothing found for “{result.query}”. Try an alternate title, an id like <code className="text-ink-100">ANILIST-30013</code>, or a creator name.
              </p>
            )}

            {!loading &&
              groups.map((group) => (
                <div key={group.key} className="mb-1 last:mb-0">
                  <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                    {group.label}
                  </p>
                  {group.hits.map((hit) => {
                    const isActive = hit.title.id === activeId;
                    return (
                      <button
                        key={`${group.key}-${hit.title.id}`}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => openHit(hit)}
                        onMouseEnter={() => setActiveIndex(flatHits.findIndex((h) => h.title.id === hit.title.id))}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                          isActive ? 'bg-rose-500/10' : 'hover:bg-ink-850'
                        )}
                      >
                        <img
                          src={hit.title.coverImage || getFallbackCover(hit.title.title)}
                          alt=""
                          width={32}
                          height={44}
                          loading="lazy"
                          decoding="async"
                          className="h-11 w-8 flex-shrink-0 rounded object-cover"
                          onError={(event) => {
                            (event.target as HTMLImageElement).src = getFallbackCover(hit.title.title);
                          }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-ink-50">{hit.title.title}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-400">
                            <span>{CONTENT_TYPE_LABELS[hit.title.contentType]}</span>
                            {hit.title.releaseYear && <span>· {hit.title.releaseYear}</span>}
                            {hit.match === 'CREATOR' && (
                              <span className="inline-flex items-center gap-1 text-lavender-300">
                                <UserRound className="h-2.5 w-2.5" /> {hit.detail}
                              </span>
                            )}
                            {hit.match === 'ID' && (
                              <span className="inline-flex items-center gap-1 text-rose-300">
                                <Hash className="h-2.5 w-2.5" /> id match
                              </span>
                            )}
                            {hit.match === 'ALT_TITLE' && (
                              <span className="truncate text-ink-400">aka {hit.detail}</span>
                            )}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>

          <button
            onClick={goToSearch}
            className="flex w-full items-center justify-between border-t border-ink-800/80 px-3 py-2 text-[11px] text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-100"
          >
            <span>
              See all results for “{query.trim()}”
            </span>
            <span className="inline-flex items-center gap-1 text-ink-400">
              <CornerDownLeft className="h-3 w-3" /> Enter
            </span>
          </button>

          <div className="flex items-center justify-between border-t border-ink-800/80 px-3 py-1.5 text-[10px] text-ink-400">
            <span>↑ ↓ to move · Enter to open · Esc to close</span>
            <Link to="/settings" onClick={close} className="hover:text-ink-300">
              Content filter
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
