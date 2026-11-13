import { useCallback, useEffect, useState } from 'react';
import { Ban, Clock3, Loader2, RefreshCw, Search, ShieldCheck, Trash2, UserMinus } from 'lucide-react';
import { adminApi, type AdminEntry, type AdminUser } from '@/lib/admin/api';
import { getTitleById } from '@/lib/providers';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils/format';

function isBanned(user: AdminUser): boolean {
  if (!user.bannedUntil) return false;
  return new Date(user.bannedUntil).getTime() > Date.now();
}

export function UsersTab() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 350);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [moderateFor, setModerateFor] = useState<AdminUser | null>(null);
  const [action, setAction] = useState<'ban' | 'suspend' | 'unban'>('suspend');
  const [durationHours, setDurationHours] = useState(24);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  const REASON_PRESETS = [
    'Violation of community guidelines',
    'Harassment or abusive behaviour',
    'Spam or advertising',
    'Hateful content',
  ];

  const perPage = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await adminApi.users({ q: debounced, page, perPage });
    if (result.ok && result.data) {
      setUsers(result.data.users);
      setTotal(result.data.total);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [debounced, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debounced]);

  const handlePurge = async (user: AdminUser) => {
    if (!window.confirm(`Delete every library entry for ${user.email ?? user.id}? This cannot be undone.`)) return;
    setBusyId(user.id);
    const result = await adminApi.purgeUserLibrary(user.id);
    setBusyId(null);
    if (result.ok) load(); else window.alert(result.error);
  };

  const handleDelete = async (user: AdminUser) => {
    if (!window.confirm(`Permanently delete the account ${user.email ?? user.id}?\n\nThis removes the user and all their library data.`)) return;
    setBusyId(user.id);
    const result = await adminApi.deleteUser(user.id);
    setBusyId(null);
    if (result.ok) load(); else window.alert(result.error);
  };

  const handleBackfillRefs = async (user: AdminUser) => {
    if (!window.confirm(`Backfill provider references for ${user.email ?? user.id}?\n\nThis resolves only entries that do not store an upstream reference yet.`)) {
      return;
    }

    setBusyId(user.id);
    try {
      const all: AdminEntry[] = [];
      for (let nextPage = 1; nextPage <= 100; nextPage += 1) {
        const result = await adminApi.library({ userId: user.id, page: nextPage, perPage: 100 });
        if (!result.ok || !result.data) {
          throw new Error(result.error || 'Could not load this library.');
        }
        all.push(...result.data.entries);
        if (all.length >= result.data.total || result.data.entries.length === 0) break;
      }

      const missing = all.filter((entry) => !entry.provider_id);
      if (missing.length === 0) {
        window.alert('All saved titles for this account already have provider references.');
        return;
      }

      const queue = [...missing];
      const refs: { titleId: string; provider: string; providerId: string }[] = [];
      let unresolved = 0;

      const worker = async () => {
        while (queue.length > 0) {
          const entry = queue.shift();
          if (!entry) continue;
          try {
            const title = await getTitleById(entry.title_id);
            if (title?.providerId) {
              refs.push({
                titleId: entry.title_id,
                provider: title.provider,
                providerId: title.providerId,
              });
            } else {
              unresolved += 1;
            }
          } catch {
            unresolved += 1;
          }
        }
      };

      await Promise.all(Array.from({ length: Math.min(4, queue.length) }, worker));

      if (refs.length === 0) {
        window.alert(`Could not resolve a provider reference for any of ${missing.length} entries.`);
        return;
      }

      const result = await adminApi.backfillLibraryRefs({ userId: user.id, refs });
      if (!result.ok || !result.data) {
        window.alert(result.error || 'Could not save provider references.');
        return;
      }

      const parts = [`Updated ${result.data.updated} of ${refs.length} resolved references.`];
      if (result.data.failed > 0) parts.push(`${result.data.failed} failed.`);
      if (unresolved > 0) parts.push(`${unresolved} could not be resolved.`);
      window.alert(parts.join(' '));
      load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not backfill provider references.');
    } finally {
      setBusyId(null);
    }
  };

  const openModeration = (user: AdminUser, nextAction: 'ban' | 'suspend' | 'unban') => {
    setModerateFor(user);
    setAction(nextAction);
    setDurationHours(nextAction === 'ban' ? 24 * 365 * 10 : 24);
    setReason('');
    setReasonError(null);
  };

  const submitModeration = async () => {
    if (!moderateFor) return;
    if (action !== 'unban' && !reason.trim()) {
      setReasonError('Add a reason — it is shown on the user\u2019s ban or suspension page.');
      return;
    }
    setReasonError(null);
    const label = action === 'unban' ? 'remove moderation restrictions from' : `${action}`;
    if (!window.confirm(`Confirm ${label} ${moderateFor.email ?? moderateFor.id}?`)) return;
    setBusyId(moderateFor.id);
    const result = await adminApi.moderateUser({
      action,
      userId: moderateFor.id,
      durationHours: action === 'unban' ? undefined : Math.max(1, Math.floor(durationHours)),
      reason: reason.trim() || undefined,
    });
    setBusyId(null);
    if (result.ok) {
      setModerateFor(null);
      load();
    } else {
      window.alert(result.error);
    }
  };

  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by email or user id…"
            className="input-field py-2 pl-9 text-xs"
          />
        </div>
        <span className="text-xs text-ink-400">{total} account{total === 1 ? '' : 's'}</span>
      </div>

      {error && <div className="rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">{error}</div>}

      {moderateFor && (
        <div className="card-surface border-warning-500/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink-100">User moderation</h3>
              <p className="text-xs text-ink-400">{moderateFor.email ?? moderateFor.id}</p>
            </div>
            <button onClick={() => setModerateFor(null)} className="btn-ghost px-2 py-1 text-xs">Close</button>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-micro text-ink-400">Action</label>
              <select value={action} onChange={(e) => setAction(e.target.value as typeof action)} className="input-field text-xs">
                <option value="suspend">Suspend (temporary)</option>
                <option value="ban">Ban (long duration)</option>
                <option value="unban">Unban / remove restrictions</option>
              </select>
            </div>
            {action !== 'unban' && (
              <div>
                <label className="mb-1 block text-micro text-ink-400">Duration (hours)</label>
                <input type="number" min={1} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value || 1))} className="input-field text-xs" />
                <div className="mt-1 text-micro text-ink-400">{action === 'ban' ? 'Use a long duration for bans (e.g. 87600 = 10 years).' : 'Common: 24 (1 day), 168 (7 days), 720 (30 days).'}</div>
              </div>
            )}
            <div className={action === 'unban' ? 'md:col-span-2' : ''}>
              <label className="mb-1 block text-micro text-ink-400">
                Reason {action !== 'unban' && <span className="text-rose-300">(required — shown to the user)</span>}
              </label>
              <input
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (reasonError) setReasonError(null);
                }}
                placeholder={action === 'unban' ? 'Optional note (audit only)' : 'e.g. Violation of community guidelines'}
                className={cn('input-field text-xs', reasonError && 'border-error-500/60')}
              />
              {action !== 'unban' && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => { setReason(preset); setReasonError(null); }}
                      className="rounded border border-ink-700 px-1.5 py-0.5 text-micro text-ink-400 transition-colors hover:border-ink-600 hover:text-ink-200"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
              {reasonError && <div className="mt-1 text-micro text-error-300">{reasonError}</div>}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={submitModeration} disabled={busyId === moderateFor.id} className={cn('btn-primary text-xs disabled:opacity-40', action === 'unban' && 'bg-success-600 hover:bg-success-500')}>
              {busyId === moderateFor.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : action === 'unban' ? <ShieldCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
              Apply {action}
            </button>
            <span className="text-micro text-ink-400">Enforcement uses Supabase Auth ban duration (best-effort for this app).</span>
          </div>
        </div>
      )}

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ink-800 bg-ink-850/60 text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Joined / Last sign-in</th>
                <th className="px-4 py-2.5 font-medium">Library</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-400"><Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading accounts…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-400">No accounts match this search.</td></tr>
              ) : (
                users.map((user) => {
                  const banned = isBanned(user);
                  return (
                    <tr key={user.id} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/40">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-ink-100">{user.email ?? '(no email)'}</p>
                        <p className="text-micro text-ink-400">
                          {user.id}
                          {!user.confirmed && <span className="ml-1.5 text-warning-400">unconfirmed</span>}
                        </p>
                        {(() => { const n = user.moderationNote; const reason = typeof n === 'string' ? n : n?.reason; return reason ? <p className="mt-0.5 max-w-[260px] truncate text-micro text-ink-400" title={reason}>Note: {reason}</p> : null; })()}
                      </td>
                      <td className="px-4 py-2.5">
                        {banned ? (
                          <span className="inline-flex items-center gap-1 rounded-md border border-error-500/30 bg-error-500/10 px-1.5 py-0.5 text-micro font-medium text-error-400"><Ban className="h-3 w-3" /> Restricted</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-success-500/30 bg-success-500/10 px-1.5 py-0.5 text-micro font-medium text-success-400"><ShieldCheck className="h-3 w-3" /> Active</span>
                        )}
                        {user.bannedUntil && banned && <div className="mt-1 flex items-center gap-1 text-micro text-ink-400"><Clock3 className="h-3 w-3" /> until {new Date(user.bannedUntil).toLocaleString()}</div>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-ink-400">
                        <div>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</div>
                        <div className="text-micro text-ink-400">{user.lastSignInAt ? `Last: ${new Date(user.lastSignInAt).toLocaleDateString()}` : 'never signed in'}</div>
                      </td>
                      <td className="px-4 py-2.5 text-ink-300">{user.libraryCount}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openModeration(user, 'suspend')} disabled={busyId === user.id} title="Suspend user" className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-warning-400 disabled:opacity-40"><Clock3 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => openModeration(user, 'ban')} disabled={busyId === user.id} title="Ban user" className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-error-400 disabled:opacity-40"><Ban className="h-3.5 w-3.5" /></button>
                          {banned && <button onClick={() => openModeration(user, 'unban')} disabled={busyId === user.id} title="Unban/remove restriction" className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-success-400 disabled:opacity-40"><ShieldCheck className="h-3.5 w-3.5" /></button>}
                          <button onClick={() => handleBackfillRefs(user)} disabled={busyId === user.id} title="Backfill this user's provider references" className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-rose-400 disabled:opacity-40">{busyId === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}</button>
                          <button onClick={() => handlePurge(user)} disabled={busyId === user.id} title="Delete this user's library entries" className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-warning-400 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDelete(user)} disabled={busyId === user.id} title="Delete this account" className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-error-400 disabled:opacity-40"><UserMinus className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>Page {page} of {lastPage}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Previous</button>
          <button onClick={() => setPage((p) => Math.min(lastPage, p + 1))} disabled={page >= lastPage || loading} className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
        </div>
      </div>
    </div>
  );
}
