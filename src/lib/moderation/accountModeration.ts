/**
 * Shared account-moderation helpers.
 *
 * The app polls the caller's moderation state while signed in so a ban or
 * suspension applied from the admin console shows up within seconds — and so
 * lifting it is detected without a manual reload.
 *
 * Reads go through the `get_my_moderation()` RPC (see the moderation_self_read
 * migration), which returns only the caller's entry plus their Auth
 * `banned_until`. Older deployments without that migration fall back to the
 * previously public site_settings row, and finally to Supabase Auth's own
 * "user is banned" response.
 */

import { supabase } from '@/lib/supabase';

export type AccountModeration = {
  action: 'ban' | 'suspend' | string;
  reason: string;
  expiresAt: string | null;
};

export type StoredBlock = AccountModeration & { at: string };

export const ACCOUNT_BLOCK_KEY = 'yuriorbit_account_block';

type ModerationEntry = {
  action?: string;
  durationHours?: number;
  reason?: string;
  updatedAt?: string;
};

type RpcModeration = {
  entry?: ModerationEntry | null;
  banned_until?: string | null;
};

// A missing RPC (migration not applied yet) is permanent for this page load;
// remember it so we do not fire a 404 every poll.
let rpcUnavailable = false;
// The banned-token probe is a fallback only, and costs an Auth round trip, so
// run it at most once a minute per tab.
let lastBannedProbe = 0;
const BANNED_PROBE_MS = 60_000;

export function readStoredBlock(): StoredBlock | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_BLOCK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBlock;
    if (!parsed || !parsed.action) return null;
    if (parsed.expiresAt && Date.parse(parsed.expiresAt) <= Date.now()) {
      localStorage.removeItem(ACCOUNT_BLOCK_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredBlock(moderation: AccountModeration): StoredBlock {
  const block: StoredBlock = {
    action: moderation.action,
    reason: moderation.reason || '',
    expiresAt: moderation.expiresAt || null,
    at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(ACCOUNT_BLOCK_KEY, JSON.stringify(block));
  } catch {}
  return block;
}

export function clearStoredBlock() {
  try {
    localStorage.removeItem(ACCOUNT_BLOCK_KEY);
  } catch {}
}

function normalizeModeration(entry: ModerationEntry | null | undefined): AccountModeration | null {
  if (!entry || !entry.action || entry.action === 'unban') return null;
  const updatedAt = entry.updatedAt ? Date.parse(entry.updatedAt) : NaN;
  const hours = Number(entry.durationHours) || 0;
  const expiresAt =
    Number.isFinite(updatedAt) && hours > 0 ? new Date(updatedAt + hours * 3600000).toISOString() : null;
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) return null;
  return {
    action: entry.action,
    reason: typeof entry.reason === 'string' ? entry.reason : '',
    expiresAt,
  };
}

/**
 * Primary path: one self-scoped RPC. It also surfaces Auth's `banned_until`, so
 * a ban is detected even when the best-effort moderation note is missing.
 * Returns `null` when the function is unavailable, so callers can fall back.
 */
async function readViaRpc(): Promise<{ moderation: AccountModeration | null } | null> {
  if (!supabase || rpcUnavailable) return null;

  let data: unknown = null;
  let error: { code?: string; message?: string } | null = null;
  try {
    const result = await supabase.rpc('get_my_moderation');
    data = result.data;
    error = result.error;
  } catch {
    return null;
  }
  if (error) {
    const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
    if (
      text.includes('pgrst202') ||
      text.includes('could not find the function') ||
      text.includes('schema cache')
    ) {
      rpcUnavailable = true;
    }
    return null;
  }

  const payload = (data ?? null) as RpcModeration | null;
  const fromNote = normalizeModeration(payload?.entry);
  if (fromNote) return { moderation: fromNote };

  const bannedUntil = payload?.banned_until ? Date.parse(payload.banned_until) : NaN;
  if (Number.isFinite(bannedUntil) && bannedUntil > Date.now()) {
    // Auth is authoritative; without a note we cannot know a human reason.
    return {
      moderation: {
        action: 'ban',
        reason: '',
        expiresAt: new Date(bannedUntil).toISOString(),
      },
    };
  }

  return { moderation: null };
}

/** Legacy path for deployments that have not applied the privacy migration. */
async function readViaSettings(userId: string): Promise<ModerationEntry | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'user_moderation')
    .maybeSingle();
  if (error) throw new Error(error.message);
  const value = data?.value;
  if (!value || typeof value !== 'object') return null;
  const map = value as Record<string, ModerationEntry>;
  return map[userId] ?? null;
}

/**
 * Last resort: Supabase Auth refuses a banned user's access token with a
 * "banned" error. That identifies the ban even if no moderation note exists.
 */
async function readViaBannedResponse(): Promise<AccountModeration | null> {
  if (!supabase) return null;
  if (Date.now() - lastBannedProbe < BANNED_PROBE_MS) return null;
  lastBannedProbe = Date.now();

  try {
    const { error } = await supabase.auth.getUser();
    if (!error) return null;
    const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
    if (text.includes('banned')) {
      return { action: 'ban', reason: '', expiresAt: null };
    }
  } catch {}
  return null;
}

/**
 * Returns the caller's live moderation state, or `null` when the account is
 * clean. Throws when every check failed for reasons other than "clean", so the
 * gate never lifts a persisted block because of a transient error.
 */
export async function fetchAccountModeration(userId: string): Promise<AccountModeration | null> {
  if (!supabase) throw new Error('Supabase is not configured');

  const rpc = await readViaRpc();
  if (rpc) return rpc.moderation;

  let settingsReadable = false;
  let entry: ModerationEntry | null | undefined;
  try {
    entry = await readViaSettings(userId);
    settingsReadable = true;
  } catch {
    entry = undefined;
  }

  const fromNote = normalizeModeration(entry);
  if (fromNote) return fromNote;

  const banned = await readViaBannedResponse();
  if (banned) return banned;

  // An empty settings row is a real "clean" answer only when we could read it.
  if (settingsReadable) return null;
  throw new Error('moderation state unavailable');
}
