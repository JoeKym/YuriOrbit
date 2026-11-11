/**
 * useLibrary — hybrid library management hook.
 * When authenticated, reads/writes to Supabase (cloud-synced).
 * When not authenticated, falls back to local IndexedDB/localStorage.
 * On first sign-in, offers to migrate local data to the cloud.
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import type { LibraryEntry, LibraryStatus, ContentTitle } from '@/types/content';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { rememberSavedRef, rememberSavedRefs } from '@/lib/content/saved-refs';
import { getTitleById } from '@/lib/providers';
import { slugifyTitle } from '@/lib/catalog/identity';
import { getCachedCanonicalSlug } from '@/lib/catalog/slug-redirects';

const DB_NAME = 'yuriorbit';
const DB_VERSION = 1;
const STORE_NAME = 'library';
const LS_KEY = 'yuriorbit:library';
const MIGRATION_FLAG_KEY = 'yuriorbit:library_migrated';
const REF_BACKFILL_SESSION_PREFIX = 'yuriorbit:ref-backfill:';

// sessionStorage normally carries the once-per-session claim; the in-memory
// set keeps private browsing/storage-disabled sessions from repeating it.
const claimedRefBackfills = new Set<string>();

function claimRefBackfillSession(userId: string | null): boolean {
  const key = `${REF_BACKFILL_SESSION_PREFIX}${userId ?? 'local'}`;
  if (claimedRefBackfills.has(key)) return false;
  try {
    if (sessionStorage.getItem(key) === '1') {
      claimedRefBackfills.add(key);
      return false;
    }
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage disabled: fall back to the in-memory claim below.
  }
  claimedRefBackfills.add(key);
  return true;
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(): Promise<LibraryEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as LibraryEntry[]);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbPut(entry: LibraryEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClear(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function lsLoad(): Record<string, LibraryEntry> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, LibraryEntry>;
  } catch {
    return {};
  }
}

function lsSave(lib: Record<string, LibraryEntry>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(lib));
  } catch {}
}

function isIDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

// ─── Supabase row ↔ LibraryEntry mapping ──────────────────────────────────────

interface DbRow {
  id: string;
  user_id: string;
  title_id: string;
  title: string;
  cover_image: string | null;
  content_type: string;
  status: string;
  progress: number;
  total_progress: number | null;
  rating: number | null;
  notes: string | null;
  provider: string;
  provider_id: string | null;
  added_at: string;
  updated_at: string;
}

function rowToEntry(row: DbRow): LibraryEntry {
  return {
    id: row.title_id,
    titleId: row.title_id,
    title: row.title,
    coverImage: row.cover_image ?? undefined,
    contentType: row.content_type as LibraryEntry['contentType'],
    status: row.status as LibraryStatus,
    progress: row.progress,
    totalProgress: row.total_progress ?? undefined,
    rating: row.rating ?? undefined,
    notes: row.notes ?? undefined,
    addedAt: row.added_at,
    updatedAt: row.updated_at,
    provider: row.provider as LibraryEntry['provider'],
    providerId: row.provider_id ?? undefined,
  };
}

/**
 * Older deployments may not have applied the provider_id migration yet. Keep
 * saving working there rather than failing the whole write.
 */
function isMissingProviderIdColumn(error: { code?: string; message?: string }): boolean {
  const message = error.message ?? '';
  return /provider_id/i.test(message) && (error.code === '42703' || error.code === 'PGRST204');
}

function entryToRow(entry: LibraryEntry, userId?: string) {
  return {
    ...(userId ? { user_id: userId } : {}),
    title_id: entry.titleId,
    title: entry.title,
    cover_image: entry.coverImage ?? null,
    content_type: entry.contentType,
    status: entry.status,
    progress: entry.progress,
    total_progress: entry.totalProgress ?? null,
    rating: entry.rating ?? null,
    notes: entry.notes ?? null,
    provider: entry.provider,
    provider_id: entry.providerId ?? null,
  };
}

/**
 * Save a reference discovered for an existing entry without touching its status,
 * progress or timestamps. Cloud rows get a targeted update; local rows update
 * both stores so the next load sees the value.
 */
async function persistBackfilledRef(
  entry: LibraryEntry,
  isAuthenticated: boolean,
  userId: string | null
): Promise<void> {
  if (isAuthenticated && userId && supabase) {
    const { error } = await supabase
      .from('library_entries')
      .update({ provider: entry.provider, provider_id: entry.providerId ?? null })
      .eq('user_id', userId)
      .eq('title_id', entry.titleId);
    if (!error) return;
    if (!isMissingProviderIdColumn(error)) return;

    // Pre-migration deployment: record at least the provider name.
    await supabase
      .from('library_entries')
      .update({ provider: entry.provider })
      .eq('user_id', userId)
      .eq('title_id', entry.titleId);
    return;
  }

  if (isIDBAvailable()) {
    try { await idbPut(entry); } catch {}
  }
  lsSave({ ...lsLoad(), [entry.id]: entry });
}

// ─── Local load (IDB first, LS fallback) ──────────────────────────────────────

async function loadLocal(): Promise<Record<string, LibraryEntry>> {
  if (isIDBAvailable()) {
    try {
      const entries = await idbGetAll();
      const map: Record<string, LibraryEntry> = {};
      entries.forEach((e) => { map[e.id] = e; });
      return map;
    } catch {}
  }
  return lsLoad();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLibrary(options: { backfillProviderRefs?: boolean } = {}) {
  const { backfillProviderRefs = false } = options;
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id ?? null;
  const [library, setLibrary] = useState<Record<string, LibraryEntry>>({});
  const [loaded, setLoaded] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const useIDB = useRef(isIDBAvailable());

  // Snapshot for the one-shot backfill below; a library update must not cancel
  // or restart the batch.
  const libraryRef = useRef(library);
  useEffect(() => {
    libraryRef.current = library;
  }, [library]);

  // Load library data — Supabase when authenticated, local when not
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoaded(false);
      setCloudError(null);

      if (isAuthenticated && userId && supabase) {
        try {
          // Scoped to this account on purpose: the public-profile policy lets
          // anyone read the library of a public profile, so an unfiltered select
          // would hand every signed-in user everyone else's entries.
          const { data, error } = await supabase
            .from('library_entries')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

          if (error) throw error;

          if (cancelled) return;
          const map: Record<string, LibraryEntry> = {};
          // Defensive: never render a row that belongs to another account, even
          // if a future policy or query change exposes one again.
          (data as DbRow[])
            .filter((row) => row.user_id === userId)
            .forEach((row) => {
              const entry = rowToEntry(row);
              map[entry.id] = entry;
            });
          rememberSavedRefs(Object.values(map));
          setLibrary(map);
          setLoaded(true);
          return;
        } catch (err) {
          if (cancelled) return;
          setCloudError(err instanceof Error ? err.message : 'Failed to load library');
          // Fall back to local data on error
          const local = await loadLocal();
          if (cancelled) return;
          rememberSavedRefs(Object.values(local));
          setLibrary(local);
          setLoaded(true);
          return;
        }
      }

      // Not authenticated — local only
      const local = await loadLocal();
      if (cancelled) return;
      rememberSavedRefs(Object.values(local));
      setLibrary(local);
      setLoaded(true);
    }

    init();
    return () => { cancelled = true; };
  }, [isAuthenticated, userId]);

  // Resolve references for entries saved before `provider_id` was recorded.
  // useLibrary is called by every content card, so only the app-level runner
  // opts in. A session claim makes that runner do the work once per signed-in
  // account, regardless of which page first loaded.
  useEffect(() => {
    if (!backfillProviderRefs || !loaded) return;

    const pending = Object.values(libraryRef.current).filter(
      (entry) =>
        !entry.providerId ||
        // Renamed titles can leave a saved entry on an old slug even though its
        // provider reference is already stored; resolving it seeds the alias.
        (getCachedCanonicalSlug(entry.titleId) === entry.titleId &&
          slugifyTitle(entry.title) !== entry.titleId)
    );
    if (pending.length === 0) return;
    if (!claimRefBackfillSession(userId)) return;

    const queue = [...pending];

    const worker = async () => {
      while (queue.length > 0) {
        const entry = queue.shift();
        if (!entry) continue;
        try {
          const title = await getTitleById(entry.titleId);
          if (!title?.providerId) continue;

          if (entry.providerId) {
            // getTitleById has already published any old-slug → canonical alias
            // while resolving this entry; nothing else needs persisting.
            continue;
          }

          const updated: LibraryEntry = {
            ...entry,
            provider: title.provider,
            providerId: title.providerId,
          };
          rememberSavedRef(updated);
          setLibrary((prev) => {
            const current = prev[entry.id];
            if (!current || current.providerId) return prev;
            return {
              ...prev,
              [entry.id]: { ...current, provider: title.provider, providerId: title.providerId },
            };
          });
          await persistBackfilledRef(updated, isAuthenticated, userId);
        } catch {
          // Best effort: an unresolvable title keeps its slug-based fallback.
        }
      }
    };

    // Deliberately not cancelled on unmount: the claim is already recorded for
    // this session, so aborting would leave the batch unfinished with no retry.
    void Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
  }, [backfillProviderRefs, loaded, isAuthenticated, userId]);

  // ─── Local persistence helpers ──────────────────────────────────────────────

  const persistLocal = useCallback(async (entry: LibraryEntry) => {
    if (useIDB.current) {
      try { await idbPut(entry); } catch {}
    }
    const current = lsLoad();
    lsSave({ ...current, [entry.id]: entry });
  }, []);

  const persistDeleteLocal = useCallback(async (id: string) => {
    if (useIDB.current) {
      try { await idbDelete(id); } catch {}
    }
    const current = lsLoad();
    delete current[id];
    lsSave(current);
  }, []);

  // ─── Cloud persistence helpers ──────────────────────────────────────────────

  const upsertCloud = useCallback(async (entry: LibraryEntry) => {
    if (!supabase) throw new Error('Cloud sync is not configured.');
    if (!userId) throw new Error('Not signed in.');
    const row = entryToRow(entry, userId);
    const { error } = await supabase
      .from('library_entries')
      .upsert(row, { onConflict: 'user_id,title_id' });
    if (error && isMissingProviderIdColumn(error)) {
      const { provider_id: _unused, ...legacyRow } = row;
      const retry = await supabase
        .from('library_entries')
        .upsert(legacyRow, { onConflict: 'user_id,title_id' });
      if (retry.error) throw retry.error;
      return;
    }
    if (error) throw error;
  }, [userId]);

  const deleteCloud = useCallback(async (titleId: string) => {
    if (!supabase) throw new Error('Cloud sync is not configured.');
    if (!userId) throw new Error('Not signed in.');
    const { error } = await supabase
      .from('library_entries')
      .delete()
      .eq('title_id', titleId)
      .eq('user_id', userId);
    if (error) throw error;
  }, [userId]);

  // ─── Public methods ─────────────────────────────────────────────────────────

  const addToLibrary = useCallback((title: ContentTitle, status: LibraryStatus = 'CURRENT') => {
    setLibrary((prev) => {
      const existing = prev[title.id];
      const entry: LibraryEntry = existing
        ? {
            ...existing,
            status,
            provider: title.provider,
            providerId: title.providerId,
            updatedAt: new Date().toISOString(),
          }
        : {
            id: title.id,
            titleId: title.id,
            title: title.title,
            coverImage: title.coverImage,
            contentType: title.contentType,
            status,
            progress: 0,
            totalProgress: title.chapters || title.episodes,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            provider: title.provider,
            providerId: title.providerId,
          };
      rememberSavedRef(entry);
      if (isAuthenticated) {
        upsertCloud(entry).catch((e) => setCloudError(e instanceof Error ? e.message : 'Sync failed'));
      } else {
        persistLocal(entry);
      }
      return { ...prev, [title.id]: entry };
    });
  }, [isAuthenticated, upsertCloud, persistLocal]);

  const removeFromLibrary = useCallback((titleId: string) => {
    setLibrary((prev) => {
      const next = { ...prev };
      delete next[titleId];
      if (isAuthenticated) {
        deleteCloud(titleId).catch((e) => setCloudError(e instanceof Error ? e.message : 'Sync failed'));
      } else {
        persistDeleteLocal(titleId);
      }
      return next;
    });
  }, [isAuthenticated, deleteCloud, persistDeleteLocal]);

  const updateStatus = useCallback((titleId: string, status: LibraryStatus) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      const updated = { ...entry, status, updatedAt: new Date().toISOString() };
      if (isAuthenticated) {
        upsertCloud(updated).catch((e) => setCloudError(e instanceof Error ? e.message : 'Sync failed'));
      } else {
        persistLocal(updated);
      }
      return { ...prev, [titleId]: updated };
    });
  }, [isAuthenticated, upsertCloud, persistLocal]);

  const updateProgress = useCallback((titleId: string, progress: number) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      const updated = { ...entry, progress, updatedAt: new Date().toISOString() };
      if (isAuthenticated) {
        upsertCloud(updated).catch((e) => setCloudError(e instanceof Error ? e.message : 'Sync failed'));
      } else {
        persistLocal(updated);
      }
      return { ...prev, [titleId]: updated };
    });
  }, [isAuthenticated, upsertCloud, persistLocal]);

  const updateRating = useCallback((titleId: string, rating: number) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      const updated = { ...entry, rating, updatedAt: new Date().toISOString() };
      if (isAuthenticated) {
        upsertCloud(updated).catch((e) => setCloudError(e instanceof Error ? e.message : 'Sync failed'));
      } else {
        persistLocal(updated);
      }
      return { ...prev, [titleId]: updated };
    });
  }, [isAuthenticated, upsertCloud, persistLocal]);

  const updateNotes = useCallback((titleId: string, notes: string) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      const updated = { ...entry, notes, updatedAt: new Date().toISOString() };
      if (isAuthenticated) {
        upsertCloud(updated).catch((e) => setCloudError(e instanceof Error ? e.message : 'Sync failed'));
      } else {
        persistLocal(updated);
      }
      return { ...prev, [titleId]: updated };
    });
  }, [isAuthenticated, upsertCloud, persistLocal]);

  const clearLibrary = useCallback(async () => {
    setLibrary({});
    if (isAuthenticated && userId && supabase) {
      const { error } = await supabase.from('library_entries').delete().eq('user_id', userId);
      if (error) setCloudError(error.message);
    } else {
      if (useIDB.current) { try { await idbClear(); } catch {} }
      lsSave({});
    }
  }, [isAuthenticated, userId]);

  const isInLibrary = useCallback((titleId: string) => !!library[titleId], [library]);
  const getEntry = useCallback((titleId: string) => library[titleId], [library]);

  const entries = Object.values(library).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    library: entries,
    libraryMap: library,
    loaded,
    cloudError,
    isAuthenticated,
    addToLibrary,
    removeFromLibrary,
    updateStatus,
    updateProgress,
    updateRating,
    updateNotes,
    isInLibrary,
    getEntry,
    clearLibrary,
  };
}

// ─── Migration helper: import local library to cloud on first sign-in ────────

export async function migrateLocalToCloud(): Promise<{ imported: number; error: string | null }> {
  if (!supabase) return { imported: 0, error: 'Cloud sync is not configured.' };
  const local = await loadLocal();
  const localEntries = Object.values(local);
  if (localEntries.length === 0) return { imported: 0, error: null };

  const rows = localEntries.map((entry) => entryToRow(entry));
  let { error } = await supabase
    .from('library_entries')
    .upsert(rows, { onConflict: 'user_id,title_id' });

  if (error && isMissingProviderIdColumn(error)) {
    const legacyRows = rows.map(({ provider_id: _unused, ...row }) => row);
    const retry = await supabase
      .from('library_entries')
      .upsert(legacyRows, { onConflict: 'user_id,title_id' });
    error = retry.error;
  }

  if (error) return { imported: 0, error: error.message };

  try { localStorage.setItem(MIGRATION_FLAG_KEY, 'true'); } catch {}
  return { imported: localEntries.length, error: null };
}

export function hasLocalLibraryData(): boolean {
  if (isIDBAvailable()) {
    try {
      const ls = lsLoad();
      return Object.keys(ls).length > 0;
    } catch {}
  }
  return Object.keys(lsLoad()).length > 0;
}

export function hasMigratedLocal(): boolean {
  try { return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true'; } catch { return false; }
}
