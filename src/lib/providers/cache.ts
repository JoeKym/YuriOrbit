/**
 * Fast client-side cache for YuriOrbit provider queries.
 * Speeds up page transitions across Trending, Discover, and Home,
 * preventing slow repeated upstream API round-trips.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

export function getCached<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const now = Date.now();

  // 1. In-memory check
  const inMem = memoryCache.get(key);
  if (inMem && now - inMem.timestamp < ttl) {
    return inMem.data as T;
  }

  // 2. SessionStorage check (persists within user session across tab navigations)
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const raw = sessionStorage.getItem(`yo_cache_${key}`);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheEntry<T>;
        if (parsed && now - parsed.timestamp < ttl) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export function setCached<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      sessionStorage.setItem(`yo_cache_${key}`, JSON.stringify(entry));
    } catch {
      // Session storage quota or private browsing
    }
  }
}

export function clearProviderCache(): void {
  memoryCache.clear();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('yo_cache_')) keys.push(k);
      }
      keys.forEach((k) => sessionStorage.removeItem(k));
    } catch {}
  }
}
