/**
 * Client-side catalog registry.
 *
 * Slug ids are only resolvable if we remember what a slug pointed at, so every
 * title the app renders is stored here (memory + localStorage). Visiting
 * `/title/<slug>` directly still works: the registry misses, then the catalog
 * re-resolves the slug through the providers (see `getTitleById`).
 */
import type { ContentTitle } from '@/types/content';

const STORAGE_KEY = 'yot:catalog:v1';
const MAX_ENTRIES = 500;
const TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

interface StoredTitle {
  title: ContentTitle;
  at: number;
}

type Store = Record<string, StoredTitle>;

let store: Store = {};
let hydrated = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;

  const storage = safeLocalStorage();
  if (!storage) return;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Store;
    if (parsed && typeof parsed === 'object') store = parsed;
  } catch {
    store = {};
  }
}

function scheduleFlush(): void {
  const storage = safeLocalStorage();
  if (!storage) return;

  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      const now = Date.now();
      const entries = Object.entries(store).filter(([, record]) => now - record.at < TTL_MS);

      if (entries.length > MAX_ENTRIES) {
        entries.sort((a, b) => b[1].at - a[1].at);
        entries.length = MAX_ENTRIES;
      }

      store = Object.fromEntries(entries);
      storage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Quota exceeded or storage blocked — the in-memory cache still works.
    }
  }, 200);
}

export function registerTitle(title: ContentTitle): void {
  if (!title?.id) return;
  hydrate();
  store[title.id] = { title, at: Date.now() };
  scheduleFlush();
}

export function registerTitles(titles: ContentTitle[]): void {
  if (titles.length === 0) return;
  hydrate();
  const now = Date.now();
  for (const title of titles) {
    if (title?.id) store[title.id] = { title, at: now };
  }
  scheduleFlush();
}

export function getRegisteredTitle(id: string): ContentTitle | null {
  if (!id) return null;
  hydrate();
  const record = store[id];
  if (!record) return null;
  if (Date.now() - record.at > TTL_MS) {
    delete store[id];
    return null;
  }
  return record.title;
}

/** Find a registered title whose title string matches loosely (slug fallbacks). */
export function findRegisteredBySlug(slug: string): ContentTitle | null {
  hydrate();
  const direct = getRegisteredTitle(slug);
  if (direct) return direct;

  const target = slug.replace(/-/g, '');
  for (const record of Object.values(store)) {
    if (Date.now() - record.at > TTL_MS) continue;
    if (record.title.id.replace(/-/g, '') === target) return record.title;
  }
  return null;
}
