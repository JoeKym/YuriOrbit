/**
 * Public profiles (client-side, protected by Row Level Security).
 * Reads are open to anyone when `is_public` is true; writes are restricted to
 * the row's owner by the policies in the profiles migration.
 */
import { supabase } from '@/lib/supabase';
import type { LibraryEntry } from '@/types/content';

export interface Profile {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  isPublic: boolean;
  createdAt: string | null;
  /** ISO 3166-1 alpha-2 country for streaming availability; null = auto-detect. */
  watchRegion: string | null;
}

export const PROFILE_SETUP_HINT =
  'The profile tables are not set up on this deployment yet. Run the Supabase migration to enable public profiles.';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

export function validateUsername(input: string): string | null {
  if (!input) return 'Choose a username.';
  if (!USERNAME_PATTERN.test(input)) {
    return 'Usernames must be 3–20 characters: lowercase letters, numbers and underscores only.';
  }
  return null;
}

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string | null;
  watch_region: string | null;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    isPublic: row.is_public,
    createdAt: row.created_at,
    watchRegion: row.watch_region ?? null,
  };
}

/** PostgREST signals a missing table/column with these codes. */
function isMissingSchema(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /does not exist|schema cache/i.test(error.message || '')
  );
}

export interface ProfileResult<T> {
  data: T | null;
  error: string | null;
  needsSetup: boolean;
}

export async function fetchProfileByUsername(username: string): Promise<ProfileResult<Profile>> {
  if (!supabase) return { data: null, error: 'Profiles are unavailable on this deployment.', needsSetup: true };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: isMissingSchema(error) ? PROFILE_SETUP_HINT : error.message,
      needsSetup: isMissingSchema(error),
    };
  }

  return { data: data ? rowToProfile(data as ProfileRow) : null, error: null, needsSetup: false };
}

export async function fetchMyProfile(userId: string): Promise<ProfileResult<Profile>> {
  if (!supabase) return { data: null, error: null, needsSetup: true };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: isMissingSchema(error) ? PROFILE_SETUP_HINT : error.message,
      needsSetup: isMissingSchema(error),
    };
  }

  return { data: data ? rowToProfile(data as ProfileRow) : null, error: null, needsSetup: false };
}

export async function saveMyProfile(
  userId: string,
  input: { username: string; displayName?: string; bio?: string; avatarUrl?: string; isPublic: boolean }
): Promise<ProfileResult<null>> {
  if (!supabase) return { data: null, error: 'Profiles are unavailable on this deployment.', needsSetup: true };

  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      username: input.username,
      display_name: input.displayName || null,
      bio: input.bio || null,
      avatar_url: input.avatarUrl || null,
      is_public: input.isPublic,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    if (error.code === '23505' || /duplicate key|unique/i.test(error.message)) {
      return { data: null, error: 'That username is already taken.', needsSetup: false };
    }
    return {
      data: null,
      error: isMissingSchema(error) ? PROFILE_SETUP_HINT : error.message,
      needsSetup: isMissingSchema(error),
    };
  }

  return { data: null, error: null, needsSetup: false };
}

/** Persist the visitor's streaming region on their own profile row. */
export async function saveWatchRegion(
  userId: string,
  region: string | null
): Promise<ProfileResult<null>> {
  if (!supabase) return { data: null, error: null, needsSetup: true };

  const { error } = await supabase
    .from('profiles')
    .update({ watch_region: region, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    return {
      data: null,
      error: isMissingSchema(error) ? PROFILE_SETUP_HINT : error.message,
      needsSetup: isMissingSchema(error),
    };
  }

  return { data: null, error: null, needsSetup: false };
}

/**
 * The library's chapter-update switches, stored on the profile so they follow the
 * account rather than the browser.
 */
export interface ChapterUpdateProfilePrefs {
  showBadges: boolean;
  onlyReading: boolean;
}

/**
 * Read those switches, or `null` when they cannot be read at all — a signed-out
 * visitor, or a deployment that has not applied the 20261113120000 migration. A
 * `null` answer leaves the browser-local preferences in charge instead of
 * failing the page.
 */
export async function fetchChapterUpdatePrefs(userId: string): Promise<ChapterUpdateProfilePrefs | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('chapter_badges, chapter_updates_reading_only')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as { chapter_badges?: boolean | null; chapter_updates_reading_only?: boolean | null };
  return {
    showBadges: row.chapter_badges ?? true,
    onlyReading: row.chapter_updates_reading_only ?? false,
  };
}

/** Persist those switches on the visitor's own profile row. */
export async function saveChapterUpdatePrefs(
  userId: string,
  prefs: ChapterUpdateProfilePrefs
): Promise<ProfileResult<null>> {
  if (!supabase) return { data: null, error: null, needsSetup: true };

  const { error } = await supabase
    .from('profiles')
    .update({
      chapter_badges: prefs.showBadges,
      chapter_updates_reading_only: prefs.onlyReading,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    // A deployment without the migration keeps these switches local; that is a
    // fallback, not an error worth interrupting the toggle for.
    if (isMissingSchema(error)) return { data: null, error: null, needsSetup: true };
    return { data: null, error: error.message, needsSetup: false };
  }

  return { data: null, error: null, needsSetup: false };
}

/**
 * Columns a public profile may show. `notes` is private and must never be
 * requested here — the public-library view does not expose it either.
 */
const PUBLIC_LIBRARY_COLUMNS =
  'title_id,title,cover_image,content_type,status,progress,total_progress,rating,provider,added_at,updated_at';

/** Library entries visible for a profile (public profiles, plus your own). */
export async function fetchPublicLibrary(
  userId: string,
  limit = 60
): Promise<ProfileResult<LibraryEntry[]>> {
  if (!supabase) return { data: null, error: 'Profiles are unavailable on this deployment.', needsSetup: true };

  // Preferred path: the column-limited view from
  // 20261108120000_public_profile_library_view.sql.
  let { data, error } = await supabase
    .from('public_profile_libraries')
    .select(PUBLIC_LIBRARY_COLUMNS)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  // Older deployments without the view: read the table directly, but still
  // project only public-safe columns so private notes never leave the database.
  if (error && isMissingSchema(error)) {
    const fallback = await supabase
      .from('library_entries')
      .select(PUBLIC_LIBRARY_COLUMNS)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return {
      data: null,
      error: isMissingSchema(error) ? PROFILE_SETUP_HINT : error.message,
      needsSetup: isMissingSchema(error),
    };
  }

  const entries = ((data as Record<string, unknown>[]) || []).map((row) => ({
    id: String(row.title_id),
    titleId: String(row.title_id),
    title: String(row.title),
    coverImage: (row.cover_image as string | null) ?? undefined,
    contentType: row.content_type as LibraryEntry['contentType'],
    status: row.status as LibraryEntry['status'],
    progress: Number(row.progress ?? 0),
    totalProgress: row.total_progress == null ? undefined : Number(row.total_progress),
    rating: row.rating == null ? undefined : Number(row.rating),
    // Public reads never include notes; undefined is the correct value here.
    notes: undefined,
    addedAt: String(row.added_at),
    updatedAt: String(row.updated_at),
    provider: row.provider as LibraryEntry['provider'],
  }));

  return { data: entries, error: null, needsSetup: false };
}
