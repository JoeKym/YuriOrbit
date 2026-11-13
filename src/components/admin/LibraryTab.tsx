import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminEntry } from '@/lib/admin/api';
import { useDebounce } from '@/hooks/useDebounce';
import type { LibraryStatus } from '@/types/content';
import { getLibraryStatusFilterLabel, getLibraryStatusLabel } from '@/lib/utils/status';
import { getFallbackCover } from '@/lib/utils/format';

const STATUS_FILTERS: (LibraryStatus | '')[] = [
  '',
  'CURRENT',
  'PLANNED',
  'COMPLETED',
  'FAVOURITE',
  'ON_HOLD',
  'DROPPED',
];

export function LibraryTab() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 350);
  const [status, setStatus] = useState<LibraryStatus | ''>('');
  const [page, setPage] = useState(1);
  const [entries, setEntries] = useState<AdminEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const perPage = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await adminApi.library({ q: debounced, status, page, perPage });
    if (result.ok && result.data) {
      setEntries(result.data.entries);
      setTotal(result.data.total);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [debounced, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debounced, status]);

  const handleDelete = async (entry: AdminEntry) => {
    if (!window.confirm(`Remove "${entry.title}" from this user's library?`)) return;
    const result = await adminApi.deleteLibraryEntry(entry.title_id, entry.user_id);
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
            placeholder="Search tracked titles…"
            className="input-field py-2 pl-9 text-xs"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as LibraryStatus | '')}
          className="rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-xs text-ink-50 focus:outline-none"
        >
          {STATUS_FILTERS.map((value) => (
            <option key={value || 'all'} value={value}>
              {value ? getLibraryStatusFilterLabel(value) : 'All statuses'}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-400">{total} entries</span>
      </div>

      {error && (
        <div className="rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">{error}</div>
      )}

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-ink-800 bg-ink-850/60 text-ink-400">
              <tr>
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Provider ref</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Progress</th>
                <th className="px-4 py-2.5 font-medium">Rating</th>
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-400">
                    <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" /> Loading entries…
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-400">
                    No library entries match these filters.
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr
                    key={`${entry.user_id}:${entry.title_id}`}
                    className="border-b border-ink-800/60 last:border-0 hover:bg-ink-850/40"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        {entry.cover_image && (
                          <img
                            src={entry.cover_image || getFallbackCover(entry.title)}
                            alt=""
                            width={24}
                            height={36}
                            loading="lazy"
                            decoding="async"
                            className="h-9 w-6 rounded bg-ink-850 object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getFallbackCover(entry.title);
                            }}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-100">{entry.title}</p>
                          <p className="text-[10px] text-ink-400">{entry.title_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      {entry.provider ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-ink-300">{entry.provider}</span>
                          <span
                            className="font-mono text-[10px] text-ink-400"
                            title={entry.provider_id || 'No provider id stored'}
                          >
                            {entry.provider_id || 'no id'}
                          </span>
                        </div>
                      ) : (
                        <span
                          className="text-[10px] text-amber-400"
                          title="Saved before provider references were recorded"
                        >
                          legacy
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-300">
                      {getLibraryStatusLabel(entry.status as LibraryStatus, entry.content_type as string | undefined)}
                    </td>
                    <td className="px-4 py-2.5 text-ink-400">
                      {entry.progress}
                      {entry.total_progress ? `/${entry.total_progress}` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-ink-400">{entry.rating ? `${entry.rating}/10` : '—'}</td>
                    <td className="px-4 py-2.5 text-[10px] text-ink-400">{entry.user_id.slice(0, 8)}…</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/title/${entry.title_id}`}
                          title="Open title"
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(entry)}
                          title="Remove entry"
                          className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-error-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
