/**
 * The headline "titles catalogued" figure, cached for a day per browser.
 *
 * It is the sum of each format's *exact* provider count, so `count` is only
 * meaningful together with `exactFormats` / `flooredFormats`: a format whose
 * provider stops at its own ceiling contributes nothing rather than an estimate.
 *
 * Provider queries are built from the visitor's maturity preference, so the
 * number is only valid for the level it was measured at — callers that change
 * that preference must call `clearCatalogCount()`.
 */
const STORAGE_KEY = 'yuriorbit:catalog-title-count:v2';
const TTL_MS = 24 * 60 * 60 * 1000;

export interface CatalogCount {
  /** Sum of exact per-format counts. */
  count: number;
  /** How many formats contributed an exact figure. */
  exactFormats: number;
  /** How many formats were skipped because the source caps its total. */
  flooredFormats: number;
}

interface StoredCount extends CatalogCount {
  savedAt: number;
}

let cached: StoredCount | null = null;
/** Whether the localStorage read has happened yet this session. */
let restored = false;

const isFresh = (savedAt: number) => Date.now() - savedAt <= TTL_MS;

function readStore(): StoredCount | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCount>;
    const count = Number(parsed?.count);
    const exactFormats = Number(parsed?.exactFormats);
    const flooredFormats = Number(parsed?.flooredFormats);
    const savedAt = Number(parsed?.savedAt);
    if (!Number.isFinite(count) || count <= 0 || !Number.isFinite(savedAt)) return null;
    if (!isFresh(savedAt)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      count,
      exactFormats: Number.isFinite(exactFormats) ? exactFormats : 0,
      flooredFormats: Number.isFinite(flooredFormats) ? flooredFormats : 0,
      savedAt,
    };
  } catch {
    // Private mode, blocked storage or a legacy plain-number value: re-query.
    return null;
  }
}

/** Cached count if one exists and is still within the daily window. */
export function readCachedCatalogCount(): CatalogCount | null {
  if (!restored) {
    cached = readStore();
    restored = true;
  }
  if (!cached) return null;
  if (!isFresh(cached.savedAt)) {
    clearCatalogCount();
    return null;
  }
  return { count: cached.count, exactFormats: cached.exactFormats, flooredFormats: cached.flooredFormats };
}

export function storeCatalogCount(value: CatalogCount): void {
  cached = { ...value, savedAt: Date.now() };
  restored = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Storage is a nicety; the in-memory copy still covers this page view.
  }
}

/** Drops both the memory copy and the stored one. */
export function clearCatalogCount(): void {
  cached = null;
  restored = true;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clean up.
  }
}
