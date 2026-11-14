import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle2, Megaphone, RefreshCw, Sparkles, Users } from 'lucide-react';
import { adminApi, type AdminStats } from '@/lib/admin/api';
import { LIBRARY_STATUS_LABELS, type LibraryStatus } from '@/types/content';
import { Button } from '@/components/ui';
import { StatTile } from '@/components/admin/StatTile';

export type AdminQueueCounts = Partial<Record<'appeals' | 'moderation' | 'feedback', number>>;

interface OverviewTabProps {
  onNavigate: (tab: 'users' | 'library' | 'featured' | 'settings') => void;
  /** Open-work counts owned by the console shell, so both read the same numbers. */
  counts?: AdminQueueCounts;
  /** Ask the shell to refresh those counts alongside the stats. */
  onRefreshCounts?: () => void;
}

const ATTENTION_ROWS = [
  {
    key: 'appeals' as const,
    label: 'Open appeals',
    hint: 'Account and content appeals awaiting a decision',
    to: '/admin?tab=appeals',
  },
  {
    key: 'moderation' as const,
    label: 'Flagged content',
    hint: 'Takedowns, suspensions and restrictions',
    to: '/admin?tab=moderation',
  },
  {
    key: 'feedback' as const,
    label: 'Unresolved feedback',
    hint: 'Feedback, reports and contact messages',
    to: '/admin?tab=feedback',
  },
];

/** The queues that block other people, surfaced before any vanity metric. */
function NeedsAttention({ counts }: { counts: AdminQueueCounts }) {
  // Count queues rather than summing: open feedback also contains the appeals,
  // so a raw total would double-count them.
  const openQueues = Object.values(counts).filter((value) => (value ?? 0) > 0).length;
  const clear = openQueues === 0;

  return (
    <section aria-labelledby="needs-attention" className="card-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="needs-attention"
          className="flex items-center gap-2 text-sm font-semibold text-ink-100"
        >
          {clear ? (
            <CheckCircle2 className="h-4 w-4 text-success-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-warning-400" />
          )}
          Needs attention
        </h2>
        <span
          className={
            clear
              ? 'rounded-full bg-success-500/15 px-2 py-0.5 text-micro font-semibold text-success-400'
              : 'rounded-full bg-warning-500/15 px-2 py-0.5 text-micro font-semibold text-warning-400'
          }
        >
          {clear ? 'All clear' : `${openQueues} queue${openQueues === 1 ? '' : 's'} to review`}
        </span>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {ATTENTION_ROWS.map((row) => {
          const count = counts[row.key];
          return (
            <li key={row.key}>
              <Link
                to={row.to}
                className="flex h-full items-center justify-between gap-3 rounded-xl border border-ink-800 bg-ink-950/30 px-3.5 py-3 transition-colors hover:border-ink-700 focus-visible:ring-2 focus-visible:ring-rose-500/60"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink-100">{row.label}</span>
                  <span className="mt-0.5 block text-micro leading-relaxed text-ink-400">{row.hint}</span>
                </span>
                <span
                  className={
                    count && count > 0
                      ? 'shrink-0 rounded-full bg-warning-500/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-warning-300'
                      : 'shrink-0 rounded-full bg-ink-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-300'
                  }
                >
                  {typeof count === 'number' ? count : '—'}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading site metrics…</span>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="card-surface animate-pulse p-4">
            <div className="h-3 w-24 rounded bg-ink-800" />
            <div className="mt-3 h-7 w-16 rounded bg-ink-800" />
            <div className="mt-2 h-2.5 w-32 rounded bg-ink-800/70" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="card-surface animate-pulse p-5">
            <div className="h-3 w-32 rounded bg-ink-800" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((__, row) => (
                <div key={row} className="h-2.5 w-full rounded bg-ink-800/70" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OverviewTab({ onNavigate, counts, onRefreshCounts }: OverviewTabProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState<string | null>(null);

  const load = useCallback(async (cancelled?: { value: boolean }) => {
    setLoading(true);
    setError(null);
    const result = await adminApi.stats();
    if (cancelled?.value) return;
    if (result.ok && result.data) {
      setStats(result.data);
      setAsOf(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const cancelled = { value: false };
    void load(cancelled);
    return () => {
      cancelled.value = true;
    };
  }, [load]);

  if (loading) return <OverviewSkeleton />;

  if (error || !stats) {
    return (
      <div role="alert" className="rounded-xl border border-error-500/30 bg-error-500/5 p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-error-300">
          <AlertTriangle className="h-4 w-4" /> Could not load metrics
        </p>
        <p className="mt-1 text-xs text-error-400/90">{error || 'The stats endpoint returned no data.'}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void load()}
          className="mt-3 flex items-center gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    );
  }

  const statusRows = Object.entries(stats.library.byStatus).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink-100">Site metrics</h2>
        <div className="flex items-center gap-2 text-micro text-ink-400">
          {asOf && <span>Updated {asOf}</span>}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void load();
              onRefreshCounts?.();
            }}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {counts && Object.values(counts).some((value) => typeof value === 'number') && (
        <NeedsAttention counts={counts} />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Users}
          label="Accounts"
          value={stats.users.total}
          hint={`+${stats.users.last7d} in the last 7 days`}
          to="/admin?tab=users"
        />
        <StatTile
          icon={BookOpen}
          label="Library entries"
          value={stats.library.total}
          hint="Across all accounts"
          to="/admin?tab=library"
        />
        <StatTile
          icon={Sparkles}
          label="Editor's Picks"
          value={stats.featured.total}
          hint="Manage featured titles"
          to="/admin?tab=featured"
        />
        <StatTile
          icon={Megaphone}
          label="Announcement banner"
          value={stats.announcement?.active ? 'Live' : 'Off'}
          hint={stats.announcement?.active ? 'Visible on every page' : 'No banner is showing'}
          tone={stats.announcement?.active ? 'success' : 'default'}
          to="/admin?tab=settings"
        />
      </div>

      {stats.users.warning && (
        <div
          role="status"
          className="rounded-xl border border-warning-500/30 bg-warning-500/5 p-4 text-xs text-warning-400"
        >
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
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 text-micro tabular-nums text-ink-300">
                    {row.count}
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-micro text-ink-400">
            Based on the {stats.library.sampled} most recently updated entries.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          onClick={() => onNavigate('users')}
          className="card-surface p-4 text-left transition-colors hover:border-ink-700 focus-visible:ring-2 focus-visible:ring-rose-500/60"
        >
          <p className="text-sm font-medium text-ink-100">Manage users</p>
          <p className="mt-0.5 text-xs text-ink-400">Inspect accounts, purge or remove data.</p>
        </button>
        <button
          onClick={() => onNavigate('library')}
          className="card-surface p-4 text-left transition-colors hover:border-ink-700 focus-visible:ring-2 focus-visible:ring-rose-500/60"
        >
          <p className="text-sm font-medium text-ink-100">Review library entries</p>
          <p className="mt-0.5 text-xs text-ink-400">Search every tracked title.</p>
        </button>
        <button
          onClick={() => onNavigate('settings')}
          className="card-surface p-4 text-left transition-colors hover:border-ink-700 focus-visible:ring-2 focus-visible:ring-rose-500/60"
        >
          <p className="text-sm font-medium text-ink-100">Site settings</p>
          <p className="mt-0.5 text-xs text-ink-400">Announcement banner and messaging.</p>
        </button>
      </div>
    </div>
  );
}
