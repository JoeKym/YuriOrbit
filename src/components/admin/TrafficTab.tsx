import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Eye, Loader2, MousePointerClick, RefreshCw, Users } from 'lucide-react';
import { adminApi, type TrafficAnalytics } from '@/lib/admin/api';
import { cn } from '@/lib/utils/format';

type RangeKey = '24h' | 'today' | 'yesterday' | '7d' | '14d' | '30d' | '90d' | 'month';

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '24h', label: 'Last 24 Hours' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 Days' },
  { key: '14d', label: 'Last 14 Days' },
  { key: '30d', label: 'Last 30 Days' },
  { key: '90d', label: 'Last 90 Days' },
  { key: 'month', label: 'This Month' },
];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function rangeBounds(key: RangeKey): { since: Date; until: Date; bucket: 'hour' | 'day' } {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  switch (key) {
    case '24h':
      return { since: new Date(now.getTime() - day), until: now, bucket: 'hour' };
    case 'today':
      return { since: startOfDay(now), until: now, bucket: 'hour' };
    case 'yesterday': {
      const start = startOfDay(now);
      return { since: new Date(start.getTime() - day), until: start, bucket: 'hour' };
    }
    case '7d':
      return { since: new Date(startOfDay(now).getTime() - 6 * day), until: now, bucket: 'day' };
    case '14d':
      return { since: new Date(startOfDay(now).getTime() - 13 * day), until: now, bucket: 'day' };
    case '30d':
      return { since: new Date(startOfDay(now).getTime() - 29 * day), until: now, bucket: 'day' };
    case '90d':
      return { since: new Date(startOfDay(now).getTime() - 89 * day), until: now, bucket: 'day' };
    case 'month':
      return { since: new Date(now.getFullYear(), now.getMonth(), 1), until: now, bucket: 'day' };
  }
}

function bucketKey(date: Date, bucket: 'hour' | 'day'): string {
  const d = new Date(date);
  if (bucket === 'hour') d.setMinutes(0, 0, 0);
  else d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${bucket === 'hour' ? d.getHours() : 0}`;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-400">
        <Icon className="h-4 w-4 text-rose-400/80" /> {label}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-ink-50">{value}</p>
    </div>
  );
}

function TrafficChart({
  data,
  since,
  until,
  bucket,
}: {
  data: TrafficAnalytics;
  since: Date;
  until: Date;
  bucket: 'hour' | 'day';
}) {
  const width = 800;
  const height = 240;
  const padX = 34;
  const padY = 24;

  const points = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of data.series) counts.set(bucketKey(new Date(row.t), bucket), row.views);

    const out: { at: Date; value: number }[] = [];
    const cursor = new Date(since);
    if (bucket === 'hour') cursor.setMinutes(0, 0, 0);
    else cursor.setHours(0, 0, 0, 0);

    while (cursor <= until && out.length < 200) {
      out.push({ at: new Date(cursor), value: counts.get(bucketKey(cursor, bucket)) ?? 0 });
      if (bucket === 'hour') cursor.setHours(cursor.getHours() + 1);
      else cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [data.series, since, until, bucket]);

  const max = Math.max(4, ...points.map((p) => p.value));
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const xy = points.map((p, i) => ({
    x: padX + i * stepX,
    y: padY + innerH - (p.value / max) * innerH,
  }));
  const line = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = xy.length
    ? `${line} L${xy[xy.length - 1].x.toFixed(1)},${padY + innerH} L${xy[0].x.toFixed(1)},${padY + innerH} Z`
    : '';
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Traffic over time">
        <defs>
          <linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(244 63 94)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(244 63 94)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => {
          const y = padY + innerH * t;
          const value = Math.round(max * (1 - t));
          return (
            <g key={t}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="rgb(39 39 42)"
                strokeWidth="1"
                strokeDasharray="2 4"
              />
              <text x={padX - 8} y={y + 3} textAnchor="end" className="fill-ink-500" fontSize="10">
                {value}
              </text>
            </g>
          );
        })}

        {xy.length > 1 && (
          <>
            <path d={area} fill="url(#traffic-fill)" />
            <path d={line} fill="none" stroke="rgb(251 113 133)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={xy[xy.length - 1].x} cy={xy[xy.length - 1].y} r="3.5" fill="rgb(251 113 133)" />
          </>
        )}

        {points.map((p, i) => {
          if (i % labelEvery !== 0 && i !== points.length - 1) return null;
          const label =
            bucket === 'hour'
              ? p.at.toLocaleTimeString([], { hour: 'numeric' })
              : p.at.toLocaleDateString([], { month: 'short', day: 'numeric' });
          return (
            <text
              key={`${p.at.toISOString()}-label`}
              x={padX + i * stepX}
              y={height - 4}
              textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
              className="fill-ink-500"
              fontSize="10"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {data.pageviews === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="text-xs text-ink-500">No page views recorded in this range yet.</p>
        </div>
      )}
    </div>
  );
}

function BarList({
  title,
  items,
  empty,
}: {
  title: string;
  items: { label: string; value: number }[];
  empty: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
      <h3 className="text-sm font-semibold text-ink-100">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-ink-400">{empty}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-ink-200" title={item.label}>{item.label}</span>
                <span className="shrink-0 text-ink-400">{item.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-lavender-400"
                  style={{ width: `${Math.max(3, (item.value / max) * 100)}%` }}
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
  const [range, setRange] = useState<RangeKey>('24h');
  const [data, setData] = useState<TrafficAnalytics | null>(null);
  const [bounds, setBounds] = useState(() => rangeBounds('24h'));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMissing, setSetupMissing] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      const b = rangeBounds(range);
      setBounds(b);
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setSetupMissing(false);

      const res = await adminApi.analytics({
        since: b.since.toISOString(),
        until: b.until.toISOString(),
        bucket: b.bucket,
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });

      if (res.ok && res.data) {
        setData(res.data);
      } else {
        setError(res.error);
        setSetupMissing(/not installed|migration|admin_traffic_stats/i.test(res.error || ''));
      }
      setLoading(false);
      setRefreshing(false);
    },
    [range]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load(true);
    }, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const topPages = data?.topPages.map((p) => ({ label: p.path, value: p.views })) ?? [];
  const sources = data?.sources.map((s) => ({ label: s.source, value: s.visits })) ?? [];
  const devices = data?.devices ?? [];
  const deviceTotal = Math.max(1, devices.reduce((sum, d) => sum + d.visits, 0));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink-100">Traffic</h2>
          <p className="text-xs text-ink-400">
            First-party analytics — no external trackers. Page views are recorded by this app.
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary text-xs">
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-xl border border-ink-800 bg-ink-900/60 p-2">
        <span className="px-2 py-1 text-[11px] text-ink-500">Time Range:</span>
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors',
              range === r.key
                ? 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/30'
                : 'text-ink-400 hover:bg-ink-850 hover:text-ink-200'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-ink-800 bg-ink-900 p-6 text-sm text-ink-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading traffic…
        </div>
      ) : setupMissing ? (
        <div className="rounded-xl border border-warning-500/30 bg-warning-500/5 p-5 text-sm text-warning-200">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Traffic analytics is not installed</p>
          <p className="mt-1 text-xs text-warning-200/80">
            Apply <code className="rounded bg-ink-900 px-1">supabase/migrations/20261110140000_traffic_analytics.sql</code>{' '}
            to create the events table and aggregation function, then reload. This tab will start filling in as visitors browse.
          </p>
          <button onClick={() => load()} className="btn-secondary mt-3 text-xs">Retry</button>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-error-500/30 bg-error-500/5 p-5 text-sm text-error-300">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Could not load traffic data</p>
          <p className="mt-1 text-xs text-error-400/90">{error}</p>
          <button onClick={() => load()} className="btn-secondary mt-3 text-xs">Retry</button>
        </div>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Visitors" value={data.visitors.toLocaleString()} icon={Users} />
            <StatCard label="Pageviews" value={data.pageviews.toLocaleString()} icon={Eye} />
            <StatCard label="Views per visit" value={data.viewsPerVisit.toFixed(2)} icon={Activity} />
            <StatCard label="Bounce rate" value={`${data.bounceRate}%`} icon={MousePointerClick} />
          </div>

          <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-100">
              Traffic overview
            </h3>
            <p className="mb-4 text-[11px] text-ink-500">
              {RANGES.find((r) => r.key === range)?.label}
            </p>
            <TrafficChart data={data} since={bounds.since} until={bounds.until} bucket={bounds.bucket} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <BarList title="Top pages" items={topPages} empty="No page views yet." />
            <BarList title="Traffic sources" items={sources} empty="No referrers yet." />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
              <h3 className="text-sm font-semibold text-ink-100">Devices</h3>
              {devices.length === 0 ? (
                <p className="mt-3 text-xs text-ink-400">No device data yet.</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {devices.map((device) => {
                    const pct = Math.round((device.visits / deviceTotal) * 100);
                    return (
                      <div key={device.device}>
                        <div className="flex items-baseline justify-between">
                          <span className="font-display text-xl font-semibold text-ink-50">{pct}%</span>
                          <span className="text-[11px] text-ink-400">{device.visits} visits</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-ink-300">
                          <span>{device.device}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-lavender-400" style={{ width: `${Math.max(3, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-ink-100">Live visitors</h3>
                <span className="inline-flex items-center gap-1.5 text-[11px] text-success-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-400" />
                  {data.live.length} active now
                </span>
              </div>
              {data.live.length === 0 ? (
                <p className="mt-3 text-xs text-ink-400">No activity in the last 5 minutes.</p>
              ) : (
                <table className="mt-4 w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-ink-500">
                    <tr>
                      <th className="pb-2 font-medium">Session</th>
                      <th className="pb-2 font-medium">Page</th>
                      <th className="pb-2 text-right font-medium">Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.live.map((row) => (
                      <tr key={row.session} className="border-t border-ink-800/60">
                        <td className="py-2 font-mono text-[11px] text-ink-300">{row.session.slice(0, 12)}</td>
                        <td className="max-w-[160px] truncate py-2 text-ink-300" title={row.path}>{row.path}</td>
                        <td className="py-2 text-right text-ink-400">
                          {new Date(row.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <p className="text-[11px] text-ink-500">
            Time range uses this browser&rsquo;s timezone. Sessions are anonymous per-tab ids; no IP addresses or external trackers are used.
          </p>
        </>
      ) : null}
    </div>
  );
}
