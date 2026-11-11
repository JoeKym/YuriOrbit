/**
 * A small local index of provider references for saved titles.
 *
 * The library already stores `provider`/`providerId`, but deep links only carry
 * the YuriOrbit slug. Keeping a slug → reference map on the device lets
 * `getTitleById` fetch the exact upstream record instead of re-searching by
 * name, which is what produced "Title not found" on older saved entries.
 */
import type { ContentType, LibraryEntry, SourceProvider } from '@/types/content';

const REFS_KEY = 'yuriorbit:saved_refs';
const MAX_REFS = 500;

export interface SavedTitleRef {
  provider: SourceProvider;
  providerId: string;
  contentType: ContentType;
  updatedAt: string;
}

type RefMap = Record<string, SavedTitleRef>;

function loadRefs(): RefMap {
  try {
    const raw = localStorage.getItem(REFS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as RefMap;
  } catch {
    return {};
  }
}

function saveRefs(refs: RefMap): void {
  try {
    localStorage.setItem(REFS_KEY, JSON.stringify(refs));
  } catch {
    /* Private mode or quota: the library itself still works. */
  }
}

export function rememberSavedRef(
  entry: Pick<LibraryEntry, 'titleId' | 'provider' | 'providerId' | 'contentType' | 'updatedAt'>
): void {
  if (!entry.providerId) return;

  const refs = loadRefs();
  refs[entry.titleId] = {
    provider: entry.provider,
    providerId: entry.providerId,
    contentType: entry.contentType,
    updatedAt: entry.updatedAt,
  };

  const trimmed = Object.entries(refs)
    .sort((a, b) => new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime())
    .slice(0, MAX_REFS);
  saveRefs(Object.fromEntries(trimmed));
}

export function rememberSavedRefs(entries: LibraryEntry[]): void {
  const withRefs = entries.filter((entry) => entry.providerId);
  if (withRefs.length === 0) return;

  const refs = loadRefs();
  for (const entry of withRefs) {
    refs[entry.titleId] = {
      provider: entry.provider,
      providerId: entry.providerId as string,
      contentType: entry.contentType,
      updatedAt: entry.updatedAt,
    };
  }

  const trimmed = Object.entries(refs)
    .sort((a, b) => new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime())
    .slice(0, MAX_REFS);
  saveRefs(Object.fromEntries(trimmed));
}

export function getSavedRef(titleId: string): SavedTitleRef | null {
  return loadRefs()[titleId] ?? null;
}
