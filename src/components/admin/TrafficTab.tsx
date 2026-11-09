import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, Loader2, RefreshCw, Shield, TrendingUp, Users } from 'lucide-react';
import { adminApi, type TrafficSnapshot } from '@/lib/admin/api';
import { LIBRARY_STATUS_LABELS, type LibraryStatus } from '@/types/content';
import { cn } from '@/lib/utils/format';

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-1.5 text-xs text-ink-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-1 font-display text-2xl font-semibold text-ink-50">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-ink-500">{sub}</p>}
    </div>
  );
}

function BarList({ title, items, empty }: { title: string; items: { label: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="card-surface p-5">
      <h3 className="mb-3 text-sm font-semibold text-ink-100">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-ink-400">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="truncate text-ink-300">{item.label}</span>
                <span className="ml-2 text-ink-400">{item.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-lavender-500"
                  style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TrafficTab() {
  const [data, setData] = useState<TrafficSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const res = await adminApi.traffic();
    if (res.ok && res.data) setData(res.data);
    else setError(res.error);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-ink-800 bg-ink-900 p-6 text-sm text-ink-300">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading traffic and activity…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="rounded-xl border border-error-500/30 bg-error-500/5 p-5 text-sm text-error-300">
        <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Could not load traffic data</p>
        <p className="mt-1 text-xs text-error-400/90">{error}</p>
        <button onClick={load} className="btn-secondary mt-3 text-xs">Retry</button>
      </div>
    );
  }

  const statusItems = Object.entries(data.library.byStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ label: LIBRARY_STATUS_LABELS[k as LibraryStatus] || k, value: v }));
  const kindItems = Object.entries(data.feedback.byKind).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v }));
  const categoryItems = Object.entries(data.feedback.byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k.replace(/_/g, ' '), value: v }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-100"><BarChart3 className="h-4 w-4 text-rose-400" /> Traffic & Activity</h2>
          <p className="text-xs text-ink-400">Generated {new Date(data.generatedAt).toLocaleString()}</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      {data.users.warning && (
        <div className="rounded-xl border border-warning-500/30 bg-warning-500/5 p-3 text-xs text-warning-400">{data.users.warning}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Accounts" value={data.users.total} sub={`+${data.users.last7d} in last 7 days`} icon={Users} />
        <StatCard label="Library activity (sampled)" value={data.library.total} sub="Recent tracked entries" icon={Activity} />
        <StatCard label="Open submissions" value={data.feedback.totalOpen} sub={`${data.feedback.recent7d} received in last 7 days`} icon={TrendingUp} />
        <StatCard label="Moderation actions" value={data.moderation.contentActions + data.moderation.usersWithNotes} sub={`${data.moderation.takedowns} takedowns • ${data.moderation.usersWithNotes} user notes`} icon={Shield} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={cn('card-surface p-4', data.maintenanceActive && 'border-warning-500/30')}>
          <div className="text-xs text-ink-400">Maintenance</div>
          <div className={cn('mt-1 text-sm font-semibold', data.maintenanceActive ? 'text-warning-400' : 'text-success-400')}>
            {data.maintenanceActive ? 'Active' : 'Off'}
          </div>
        </div>
        <div className="card-surface p-4">
          <div className="text-xs text-ink-400">Announcement</div>
          <div className={cn('mt-1 text-sm font-semibold', data.announcementActive ? 'text-rose-300' : 'text-ink-400')}>
            {data.announcementActive ? 'Live' : 'Off'}
          </div>
        </div>
        <div className="card-surface p-4">
          <div className="text-xs text-ink-400">Editor's Picks</div>
          <div className="mt-1 text-sm font-semibold text-ink-100">{data.featured}</div>
        </div>
        <div className="card-surface p-4">
          <div className="text-xs text-ink-400">Data source</div>
          <div className="mt-1 text-sm font-semibold text-ink-100">App activity</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title="Library entries by status" items={statusItems} empty="No library entries yet." />
        <BarList title="Submissions by kind" items={kindItems} empty="No submissions yet." />
        <BarList title="Submissions by category" items={categoryItems} empty="No category data yet." />
        <div className="card-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink-100">Most tracked titles</h3>
          {data.library.topTitles.length === 0 ? (
            <p className="text-xs text-ink-400">No tracked titles yet.</p>
          ) : (
            <ol className="space-y-2">
              {data.library.topTitles.map((row, i) => (
                <li key={row.titleId} className="flex items-center gap-2 text-xs">
                  <span className="w-4 text-ink-500">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-200">{row.title}</span>
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-ink-300">{row.count}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      <div className="card-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink-100">Recent admin audit events</h3>
        {data.recentAudit.length === 0 ? (
          <p className="text-xs text-ink-400">No audit events available.</p>
        ) : (
          <ul className="space-y-2">
            {data.recentAudit.map((entry) => {
              const e = entry as { id?: string; action?: string; actor_email?: string; created_at?: string; target?: string | null };
              return (
                <li key={e.id || `${e.action}-${e.created_at}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-ink-800/60 pb-2 text-xs last:border-0 last:pb-0">
                  <span className="font-medium text-ink-200">{e.action || 'event'}</span>
                  <span className="text-ink-400">{e.actor_email || '—'}</span>
                  {e.target && <span className="truncate text-ink-500">{e.target}</span>}
                  <span className="ml-auto text-[10px] text-ink-500">{e.created_at ? new Date(e.created_at).toLocaleString() : ''}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Notes</h3>
        <ul className="list-disc space-y-1 pl-5 text-xs text-ink-400">
          {data.notes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </div>
    </div>
  );
}
