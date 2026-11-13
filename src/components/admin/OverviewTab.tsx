import { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Loader2, Sparkles, Users } from 'lucide-react';
import { adminApi, type AdminStats } from '@/lib/admin/api';
import { LIBRARY_STATUS_LABELS, type LibraryStatus } from '@/types/content';

interface OverviewTabProps {
  onNavigate: (tab: 'users' | 'library' | 'featured' | 'settings') => void;
}

export function OverviewTab({ onNavigate }: OverviewTabProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    adminApi.stats().then((result) => {
      if (cancelled) return;
      if (result.ok) setStats(result.data);
      else setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-ink-800 bg-ink-900 p-6 text-sm text-ink-300">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading site metrics…
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-xl border border-error-500/30 bg-error-500/5 p-5 text-sm text-error-300">
        <p className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" /> Could not load metrics
        </p>
        <p className="mt-1 text-xs text-error-400/90">{error}</p>
      </div>
    );
  }

  const statusRows = Object.entries(stats.library.byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-surface p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-400">
            <Users className="h-3.5 w-3.5" /> Accounts
          </div>
          <p className="mt-1 font-display text-3xl font-semibold text-ink-50">{stats.users.total}</p>
          <p className="mt-0.5 text-[11px] text-ink-400">+{stats.users.last7d} in the last 7 days</p>
        </div>
        <div className="card-surface p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-400">
            <BookOpen className="h-3.5 w-3.5" /> Library entries
          </div>
          <p className="mt-1 font-display text-3xl font-semibold text-ink-50">{stats.library.total}</p>
          <p className="mt-0.5 text-[11px] text-ink-400">across all accounts</p>
        </div>
        <div className="card-surface p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-400">
            <Sparkles className="h-3.5 w-3.5" /> Editor's Picks
          </div>
          <p className="mt-1 font-display text-3xl font-semibold text-ink-50">{stats.featured.total}</p>
          <button onClick={() => onNavigate('featured')} className="mt-1 text-[11px] text-rose-400 hover:text-rose-300">
            Manage picks
          </button>
        </div>
        <div className="card-surface p-4">
          <div className="flex items-center gap-1.5 text-xs text-ink-400">Announcement</div>
          <p className="mt-1 font-display text-lg font-semibold text-ink-50">
            {stats.announcement?.active ? 'Live' : 'Off'}
          </p>
          <button onClick={() => onNavigate('settings')} className="mt-1 text-[11px] text-rose-400 hover:text-rose-300">
            Edit banner
          </button>
        </div>
      </div>

      {stats.users.warning && (
        <div className="rounded-xl border border-warning-500/30 bg-warning-500/5 p-4 text-xs text-warning-400">
          {stats.users.warning}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-100">Entries by status</h2>
          {statusRows.length === 0 ? (
            <p className="text-xs text-ink-400">No library entries yet.</p>
          ) : (
            <div className="space-y-2">
              {statusRows.map(([status, count]) => {
                const label = LIBRARY_STATUS_LABELS[status as LibraryStatus] || status;
                const max = statusRows[0][1] || 1;
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-ink-300">{label}</span>
                      <span className="text-ink-400">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-lavender-500"
                        style={{ width: `${Math.max(4, (count / max) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card-surface p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-100">Most tracked titles</h2>
          {stats.library.topTitles.length === 0 ? (
            <p className="text-xs text-ink-400">No tracked titles yet.</p>
          ) : (
            <ol className="space-y-2">
              {stats.library.topTitles.map((row, index) => (
                <li key={row.titleId} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-ink-400">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-200">{row.title}</span>
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-ink-300">
                    {row.count}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-[10px] text-ink-400">
            Based on the {stats.library.sampled} most recently updated entries.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={() => onNavigate('users')} className="card-surface p-4 text-left transition-colors hover:border-ink-700">
          <p className="text-sm font-medium text-ink-100">Manage users</p>
          <p className="mt-0.5 text-xs text-ink-400">Inspect accounts, purge or remove data.</p>
        </button>
        <button onClick={() => onNavigate('library')} className="card-surface p-4 text-left transition-colors hover:border-ink-700">
          <p className="text-sm font-medium text-ink-100">Review library entries</p>
          <p className="mt-0.5 text-xs text-ink-400">Search every tracked title.</p>
        </button>
        <button onClick={() => onNavigate('settings')} className="card-surface p-4 text-left transition-colors hover:border-ink-700">
          <p className="text-sm font-medium text-ink-100">Site settings</p>
          <p className="mt-0.5 text-xs text-ink-400">Announcement banner and messaging.</p>
        </button>
      </div>
    </div>
  );
}
