/**
 * Shared account-moderation helpers.
 *
 * The app polls /api/account while signed in so a ban/suspension applied from
 * the admin console shows up within seconds — and so lifting it is detected
 * without a manual reload.
 */

export type AccountModeration = {
  action: 'ban' | 'suspend' | string;
  reason: string;
  expiresAt: string | null;
};

export type StoredBlock = AccountModeration & { at: string };

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

/**
 * Fetches the caller's live moderation state.
 * Returns `null` for a clean account, or throws when the check itself failed
 * (so callers can keep a previously persisted block instead of lifting it).
 */
export async function fetchAccountModeration(accessToken: string): Promise<AccountModeration | null> {
  const res = await fetch('/api/account', {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`moderation check failed (HTTP ${res.status})`);
  const data = (await res.json().catch(() => null)) as
    | { moderation?: AccountModeration | null; degraded?: boolean }
    | null;
  // `degraded` means the server could not read moderation state. That is not
  // proof the account is clean, so don't clear a block because of it.
  if (data?.degraded) throw new Error('moderation state unavailable');
  return data?.moderation ?? null;
}
