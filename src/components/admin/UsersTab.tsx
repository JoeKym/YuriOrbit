import { useCallback, useEffect, useState } from 'react';
import { Loader2, Search, Trash2, UserMinus } from 'lucide-react';
import { adminApi, type AdminUser } from '@/lib/admin/api';
import { useDebounce } from '@/hooks/useDebounce';

export function UsersTab() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 350);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const handlePurge = async (user: AdminUser) => {
    if (!window.confirm(`Delete every library entry for ${user.email ?? user.id}? This cannot be undone.`)) return;
    setBusyId(user.id);
    const result = await adminApi.purgeUserLibrary(user.id);
    setBusyId(null);
    if (result.ok) load();
    else window.alert(result.error);
  };

  const handleDelete = async (user: AdminUser) => {
    if (
      !window.confirm(
        `Permanently delete the account ${user.email ?? user.id}?\n\nThis removes the user and all their library data.`
      )
    ) {
      return;
    }
    setBusyId(user.id);
    const result = await adminApi.deleteUser(user.id);
    setBusyId(null);
    if (result.ok) load();
    else window.alert(result.error);
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

      {error && (
        <div className="rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">{error}</div>
      )}

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ink-800 bg-ink-850/60 text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 font-medium">Last sign-in</th>
                <th className="px-4 py-2.5 font-medium">Library</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-400">
                    <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading accounts…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-400">
                    No accounts match this search.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/40">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink-100">{user.email ?? '(no email)'}</p>
                      <p className="text-[10px] text-ink-500">
                        {user.id}
                        {!user.confirmed && <span className="ml-1.5 text-warning-400">unconfirmed</span>}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-400">
                      {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleDateString() : 'never'}
                    </td>
                    <td className="px-4 py-2.5 text-ink-300">{user.libraryCount}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePurge(user)}
                          disabled={busyId === user.id}
                          title="Delete this user's library entries"
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-warning-400 disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={busyId === user.id}
                          title="Delete this account"
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-error-400 disabled:opacity-40"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>
          Page {page} of {lastPage}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage || loading}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
