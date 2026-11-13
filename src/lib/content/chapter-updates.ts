/**
 * How many chapters a saved title has picked up since the reader's progress.
 *
 * The library stores a snapshot (title, cover, progress), so "new chapters" can
 * only be answered by asking the provider what it hosts now. MangaDex serves the
 * whole set in one batched request, so the answer is cached per browser for a
 * few hours and only manga/manhwa entries are asked about — screen titles have
 * no chapter-level releases to compare against.
 *
 * Canonical catalogue ids keep the dominant upstream record, so most saved
 * entries hold an AniList id rather than the MangaDex uuid. Those are resolved
 * by name, exactly as the reader does, before the batched chapter lookup.
 */
import { mangadexFindMangaId, mangadexGetChapterProgress } from '@/lib/providers/mangadex';
import type { ContentType, LibraryEntry } from '@/types/content';

const CACHE_KEY = 'yuriorbit:chapter-progress:v2';
const TTL_MS = 3 * 60 * 60 * 1000;
/** MangaDex accepts 100 ids per request; a library larger than this is unusual. */
const MAX_IDS = 300;
/** Name searches are one request each, so only a few are attempted per visit. */
const MAX_RESOLVES = 12;

const READABLE: ContentType[] = ['MANGA', 'MANHWA', 'MANHUA', 'WEBTOON'];

export interface ChapterProgress {
  latestChapter?: number;
  updatedAt?: string;
}

interface CacheEntry {
  savedAt: number;
  /** MangaDex id behind the title; null means the name search found nothing. */
  mangaId?: string | null;
  latestChapter?: number;
  updatedAt?: string;
}

/** Keyed by `titleId`, so a renamed save and its title page agree. */
type Cache = Record<string, CacheEntry>;

function readCache(): Cache {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Cache;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: Cache): void {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or blocked: the caller still gets this visit's answer.
  }
}

/** Fresh entries only, pruned of anything past its TTL. */
function freshCache(cache: Cache): Cache {
  const now = Date.now();
  const fresh: Cache = {};
  for (const [titleId, entry] of Object.entries(cache)) {
    if (entry && Number.isFinite(entry.savedAt) && now - entry.savedAt <= TTL_MS) fresh[titleId] = entry;
  }
  return fresh;
}

/**
 * Chapters released beyond the reader's progress.
 * Fractions count only once a whole chapter is available, so 41.5 → 42 is one.
 */
export function countNewChapters(progress: number | undefined, latest: number | undefined): number {
  if (!progress || !latest) return 0;
  const delta = Math.floor(latest) - Math.floor(progress);
  return delta > 0 ? delta : 0;
}

/**
 * Latest chapter per saved title, keyed by `titleId`.
 * Entries the provider could not resolve are simply absent from the result.
 */
export type ChapterProgressLookup = Pick<LibraryEntry, 'titleId' | 'title' | 'contentType'> & {
  provider?: LibraryEntry['provider'];
  providerId?: string;
};

export async function loadChapterProgress(
  entries: ChapterProgressLookup[]
): Promise<Record<string, ChapterProgress>> {
  const tracked = entries
    .filter((entry) => READABLE.includes(entry.contentType) && entry.title)
    .slice(0, MAX_IDS);

  if (tracked.length === 0) return {};

  const cache = freshCache(readCache());
  const byTitle: Record<string, ChapterProgress> = {};
  /** MangaDex id → the title ids waiting on its chapter feed. */
  const waiting = new Map<string, string[]>();
  const unmatched: ChapterProgressLookup[] = [];

  for (const entry of tracked) {
    const cached = cache[entry.titleId];
    if (cached) {
      // A miss was cached too: a title with no numbered chapters upstream would
      // otherwise be asked about again on every visit.
      if (cached.latestChapter !== undefined) {
        byTitle[entry.titleId] = { latestChapter: cached.latestChapter, updatedAt: cached.updatedAt };
      }
      continue;
    }
    if (entry.provider === 'MANGADEX' && entry.providerId) {
      addWaiter(waiting, entry.providerId, entry.titleId);
    } else {
      unmatched.push(entry);
    }
  }

  for (const entry of unmatched.slice(0, MAX_RESOLVES)) {
    let mangaId: string | null = null;
    try {
      mangaId = await mangadexFindMangaId(entry.title);
    } catch {
      // Leave it uncached so a failing lookup is retried on the next visit.
      continue;
    }
    if (!mangaId) {
      cache[entry.titleId] = { savedAt: Date.now(), mangaId: null };
      continue;
    }
    addWaiter(waiting, mangaId, entry.titleId);
  }

  if (waiting.size > 0) {
    const fetched = await mangadexGetChapterProgress([...waiting.keys()]);
    const savedAt = Date.now();
    for (const [mangaId, titleIds] of waiting) {
      const progress = fetched.get(mangaId);
      for (const titleId of titleIds) {
        cache[titleId] = { savedAt, mangaId, ...progress };
        if (progress?.latestChapter !== undefined) {
          byTitle[titleId] = { latestChapter: progress.latestChapter, updatedAt: progress.updatedAt };
        }
      }
    }
  }

  writeCache(cache);
  return byTitle;
}

function addWaiter(waiting: Map<string, string[]>, mangaId: string, titleId: string): void {
  const ids = waiting.get(mangaId);
  if (ids) ids.push(titleId);
  else waiting.set(mangaId, [titleId]);
}
