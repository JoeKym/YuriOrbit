/**
 * How many chapters a saved title has picked up since the reader's progress.
 *
 * The library stores a snapshot (title, cover, progress), so "new chapters" can
 * only be answered by asking the provider what it hosts now. MangaDex serves the
 * whole set in one batched request, so the answer is cached per browser for a
 * few hours and only manga/manhwa entries are asked about — AniList titles have
 * no chapter-level releases to compare against.
 */
import { mangadexGetChapterProgress } from '@/lib/providers/mangadex';
import type { LibraryEntry } from '@/types/content';

const CACHE_KEY = 'yuriorbit:chapter-progress:v1';
const TTL_MS = 3 * 60 * 60 * 1000;
/** MangaDex accepts 100 ids per request; a library larger than this is unusual. */
const MAX_IDS = 300;

export interface ChapterProgress {
  latestChapter?: number;
  updatedAt?: string;
}

type Cache = Record<string, ChapterProgress & { savedAt: number }>;

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
  for (const [id, entry] of Object.entries(cache)) {
    if (entry && Number.isFinite(entry.savedAt) && now - entry.savedAt <= TTL_MS) fresh[id] = entry;
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
 * Entries without a MangaDex reference, or that the provider could not resolve,
 * are simply absent from the result.
 */
export async function loadChapterProgress(
  entries: LibraryEntry[]
): Promise<Record<string, ChapterProgress>> {
  const tracked = entries
    .filter((entry) => entry.provider === 'MANGADEX' && entry.providerId)
    .slice(0, MAX_IDS);

  if (tracked.length === 0) return {};

  const cache = freshCache(readCache());
  const missing = tracked.filter((entry) => !cache[entry.providerId!]);

  if (missing.length > 0) {
    const fetched = await mangadexGetChapterProgress(missing.map((entry) => entry.providerId!));
    const savedAt = Date.now();
    for (const [mangaId, progress] of fetched) {
      // Cache a miss too: a title with no numbered chapters upstream would
      // otherwise be asked about again on every visit.
      cache[mangaId] = { ...progress, savedAt };
    }
    writeCache(cache);
  }

  const byTitle: Record<string, ChapterProgress> = {};
  for (const entry of tracked) {
    const cached = cache[entry.providerId!];
    if (!cached || cached.latestChapter === undefined) continue;
    byTitle[entry.titleId] = { latestChapter: cached.latestChapter, updatedAt: cached.updatedAt };
  }
  return byTitle;
}
