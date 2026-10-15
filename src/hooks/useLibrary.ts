/**
 * useLibrary — local-first library management hook.
 * Stores data in IndexedDB (primary) with localStorage as fallback.
 * No authentication or Supabase required.
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import type { LibraryEntry, LibraryStatus, ContentTitle } from '@/types/content';

const DB_NAME = 'yuriorbit';
const DB_VERSION = 1;
const STORE_NAME = 'library';
const LS_KEY = 'yuriorbit:library';

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

// ─── localStorage helpers (fallback) ─────────────────────────────────────────

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
  } catch {
    // quota error — ignore
  }
}

// ─── IDB availability check ───────────────────────────────────────────────────

function isIDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

// ─── Migrate localStorage → IndexedDB on first load ──────────────────────────

async function migrateFromLS(): Promise<void> {
  try {
    const lsData = lsLoad();
    const entries = Object.values(lsData);
    if (entries.length === 0) return;

    const db = await openDB();
    const existing: LibraryEntry[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result as LibraryEntry[]);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });

    if (existing.length > 0) return; // Already migrated

    for (const entry of entries) {
      await idbPut(entry);
    }
    // Keep LS as backup, don't remove it
  } catch {
    // Migration not critical
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLibrary() {
  const [library, setLibrary] = useState<Record<string, LibraryEntry>>({});
  const [loaded, setLoaded] = useState(false);
  const useIDB = useRef(isIDBAvailable());

  // Initial load: try IDB first, fall back to localStorage
  useEffect(() => {
    async function init() {
      if (useIDB.current) {
        try {
          await migrateFromLS();
          const entries = await idbGetAll();
          const map: Record<string, LibraryEntry> = {};
          entries.forEach((e) => { map[e.id] = e; });
          setLibrary(map);
          setLoaded(true);
          return;
        } catch {
          useIDB.current = false;
        }
      }
      // Fallback to localStorage
      setLibrary(lsLoad());
      setLoaded(true);
    }
    init();
  }, []);

  // Persist changes: IDB primary, LS mirror
  const persist = useCallback(async (entry: LibraryEntry) => {
    if (useIDB.current) {
      try {
        await idbPut(entry);
      } catch {
        // fallthrough to LS
      }
    }
    // Always mirror to LS as backup
    const current = lsLoad();
    lsSave({ ...current, [entry.id]: entry });
  }, []);

  const persistDelete = useCallback(async (id: string) => {
    if (useIDB.current) {
      try {
        await idbDelete(id);
      } catch {
        // fallthrough
      }
    }
    const current = lsLoad();
    delete current[id];
    lsSave(current);
  }, []);

  // ─── Public methods ──────────────────────────────────────────────────────────

  const addToLibrary = useCallback((title: ContentTitle, status: LibraryStatus = 'CURRENT') => {
    setLibrary((prev) => {
      const existing = prev[title.id];
      const entry: LibraryEntry = existing
        ? { ...existing, status, updatedAt: new Date().toISOString() }
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
          };
      persist(entry);
      return { ...prev, [title.id]: entry };
    });
  }, [persist]);

  const removeFromLibrary = useCallback((titleId: string) => {
    setLibrary((prev) => {
      const next = { ...prev };
      delete next[titleId];
      persistDelete(titleId);
      return next;
    });
  }, [persistDelete]);

  const updateStatus = useCallback((titleId: string, status: LibraryStatus) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      const updated = { ...entry, status, updatedAt: new Date().toISOString() };
      persist(updated);
      return { ...prev, [titleId]: updated };
    });
  }, [persist]);

  const updateProgress = useCallback((titleId: string, progress: number) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      const updated = { ...entry, progress, updatedAt: new Date().toISOString() };
      persist(updated);
      return { ...prev, [titleId]: updated };
    });
  }, [persist]);

  const updateRating = useCallback((titleId: string, rating: number) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      const updated = { ...entry, rating, updatedAt: new Date().toISOString() };
      persist(updated);
      return { ...prev, [titleId]: updated };
    });
  }, [persist]);

  const updateNotes = useCallback((titleId: string, notes: string) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      const updated = { ...entry, notes, updatedAt: new Date().toISOString() };
      persist(updated);
      return { ...prev, [titleId]: updated };
    });
  }, [persist]);

  const clearLibrary = useCallback(async () => {
    setLibrary({});
    if (useIDB.current) {
      try { await idbClear(); } catch { /* ignore */ }
    }
    lsSave({});
  }, []);

  const isInLibrary = useCallback((titleId: string) => !!library[titleId], [library]);
  const getEntry = useCallback((titleId: string) => library[titleId], [library]);

  const entries = Object.values(library).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return {
    library: entries,
    libraryMap: library,
    loaded,
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
