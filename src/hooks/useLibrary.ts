import { useCallback, useEffect, useState } from 'react';
import type { LibraryEntry, LibraryStatus, ContentTitle, ContentType } from '@/types/content';

const STORAGE_KEY = 'yuriverse:library';

function loadLibrary(): Record<string, LibraryEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, LibraryEntry>;
  } catch {
    return {};
  }
}

function saveLibrary(lib: Record<string, LibraryEntry>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
  } catch {
    // ignore quota errors
  }
}

export function useLibrary() {
  const [library, setLibrary] = useState<Record<string, LibraryEntry>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLibrary(loadLibrary());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveLibrary(library);
  }, [library, loaded]);

  const addToLibrary = useCallback((title: ContentTitle, status: LibraryStatus = 'CURRENT') => {
    const entry: LibraryEntry = {
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
    setLibrary((prev) => {
      const existing = prev[title.id];
      return {
        ...prev,
        [title.id]: existing ? { ...existing, status, updatedAt: new Date().toISOString() } : entry,
      };
    });
  }, []);

  const removeFromLibrary = useCallback((titleId: string) => {
    setLibrary((prev) => {
      const next = { ...prev };
      delete next[titleId];
      return next;
    });
  }, []);

  const updateStatus = useCallback((titleId: string, status: LibraryStatus) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      return { ...prev, [titleId]: { ...entry, status, updatedAt: new Date().toISOString() } };
    });
  }, []);

  const updateProgress = useCallback((titleId: string, progress: number) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      return { ...prev, [titleId]: { ...entry, progress, updatedAt: new Date().toISOString() } };
    });
  }, []);

  const updateRating = useCallback((titleId: string, rating: number) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      return { ...prev, [titleId]: { ...entry, rating, updatedAt: new Date().toISOString() } };
    });
  }, []);

  const updateNotes = useCallback((titleId: string, notes: string) => {
    setLibrary((prev) => {
      const entry = prev[titleId];
      if (!entry) return prev;
      return { ...prev, [titleId]: { ...entry, notes, updatedAt: new Date().toISOString() } };
    });
  }, []);

  const isInLibrary = useCallback((titleId: string) => !!library[titleId], [library]);

  const getEntry = useCallback((titleId: string) => library[titleId], [library]);

  const entries = Object.values(library).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const clearLibrary = useCallback(() => {
    setLibrary({});
  }, []);

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
