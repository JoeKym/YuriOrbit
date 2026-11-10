/**
 * Shared account-moderation helpers.
 *
 * The app polls site_settings.user_moderation while signed in so a ban or
 * suspension applied from the admin console shows up within seconds — and so
 * lifting it is detected without a manual reload.
 */

export type AccountModeration = {
  action: 'ban' | 'suspend' | string;
  reason: string;
  expiresAt: string | null;
};

export type StoredBlock = AccountModeration & { at: string };

import { supabase } from '@/lib/supabase';

export const ACCOUNT_BLOCK_KEY = 'yuriorbit_account_block';

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

type ModerationEntry = { action?: string; durationHours?: number; reason?: string; updatedAt?: string };

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
 * Reads the caller's live moderation note straight from Supabase.
 *
 * This deliberately does NOT go through Supabase Auth: GoTrue rejects a banned
 * user's existing access token (`/auth/v1/user` → 403/401), which made the
 * previous /api/account check fail before it could ever report the ban. A
 * PostgREST read still accepts the token until it expires, so this is the one
 * check that keeps working the moment an admin applies a ban.
 *
 * Throws when the read itself fails, so callers never mistake an error for
 * "account is clean".
 */
export async function fetchAccountModeration(userId: string): Promise<AccountModeration | null> {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'user_moderation')
    .maybeSingle();
  if (error) throw new Error(error.message);
  const value = data?.value;
  if (!value || typeof value !== 'object') return null;
  const map = value as Record<string, ModerationEntry>;
  return normalizeModeration(map[userId]);
}
