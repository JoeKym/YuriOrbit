import { useCallback, useEffect, useState } from 'react';
import { Check, CircleSlash, Loader2, RefreshCw, RotateCcw, Scale, Search, Trash2 } from 'lucide-react';
import { adminApi, type FeedbackReport, type FeedbackStatus } from '@/lib/admin/api';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils/format';

type StatusFilter = FeedbackStatus | '';

const CATEGORY_LABELS: Record<string, string> = {
  appeal: 'General appeal',
  appeal_account: 'Account appeal',
  appeal_content: 'Content appeal',
  takedown: 'Takedown/rights review',
};

export function AppealsTab() {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 350);
  const [status, setStatus] = useState<StatusFilter>('open');
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const perPage = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await adminApi.feedback({ q: debounced, status, kind: 'appeal', page, perPage });
    if (result.ok && result.data) {
      setReports(result.data.reports);
      setTotal(result.data.total);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [debounced, status, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [debounced, status]);

  const changeStatus = async (id: string, next: FeedbackStatus) => {
    setBusyId(id);
    const result = await adminApi.updateFeedbackStatus(id, next);
    setBusyId(null);
    if (result.ok) load(); else window.alert(result.error);
  };
  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this appeal permanently?')) return;
    setBusyId(id);
    const result = await adminApi.deleteFeedback(id);
    setBusyId(null);
    if (result.ok) load(); else window.alert(result.error);
  };

  const lastPage = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search appeals…" className="input-field py-2 pl-9 text-xs" />
        </div>
        <button type="button" onClick={load} disabled={loading} className="btn-secondary px-2.5 py-2 text-xs disabled:opacity-40"><RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /></button>
        <span className="text-xs text-ink-400">{total} appeals</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(['open', 'resolved', 'dismissed', ''] as StatusFilter[]).map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={cn('rounded-lg px-3 py-1.5 text-xs font-medium', status === s ? 'bg-rose-500/15 text-rose-300' : 'text-ink-300 hover:bg-ink-850')}>
            {s || 'All'}
          </button>
        ))}
      </div>
      {error && <div className="rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">{error}</div>}
      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-ink-800 bg-ink-900 p-6 text-sm text-ink-300"><Loader2 className="h-4 w-4 animate-spin" /> Loading appeals…</div>
      ) : reports.length === 0 ? (
        <div className="card-surface p-6 text-xs text-ink-400">No appeals match these filters.</div>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id} className="card-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md border border-warning-500/30 bg-warning-500/10 px-1.5 py-0.5 text-[10px] font-medium text-warning-300"><Scale className="h-3 w-3" /> {CATEGORY_LABELS[r.category] || r.category}</span>
                <span className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize', r.status === 'open' ? 'border-warning-500/30 bg-warning-500/10 text-warning-400' : r.status === 'resolved' ? 'border-success-500/30 bg-success-500/10 text-success-400' : 'border-ink-700 bg-ink-850 text-ink-400')}>{r.status}</span>
                <span className="ml-auto text-[10px] text-ink-500">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              {r.subject && <p className="mt-2 text-sm font-medium text-ink-100">{r.subject}</p>}
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-200">{r.message}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
                {r.contact_name && <span className="text-ink-200">{r.contact_name}</span>}
                {r.contact_email && <a className="text-rose-300 hover:underline" href={`mailto:${r.contact_email}?subject=${encodeURIComponent(r.subject ? `Re: ${r.subject}` : 'Re: your appeal to YuriOrbit')}`}>{r.contact_email}</a>}
                {r.user_email && r.user_email !== r.contact_email && <span>account: {r.user_email}</span>}
                {r.resolved_by && <span className="text-ink-500">{r.status} by {r.resolved_by}</span>}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {r.contact_email && <a href={`mailto:${r.contact_email}?subject=${encodeURIComponent(r.subject ? `Re: ${r.subject}` : 'Re: your appeal to YuriOrbit')}`} className="btn-secondary px-2.5 py-1 text-[11px]">Reply</a>}
                {r.status === 'open' ? (
                  <>
                    <button onClick={() => changeStatus(r.id, 'resolved')} disabled={busyId === r.id} className="btn-secondary px-2.5 py-1 text-[11px] disabled:opacity-40"><Check className="h-3 w-3" /> Resolve</button>
                    <button onClick={() => changeStatus(r.id, 'dismissed')} disabled={busyId === r.id} className="btn-ghost px-2.5 py-1 text-[11px] disabled:opacity-40"><CircleSlash className="h-3 w-3" /> Dismiss</button>
                  </>
                ) : (
                  <button onClick={() => changeStatus(r.id, 'open')} disabled={busyId === r.id} className="btn-secondary px-2.5 py-1 text-[11px] disabled:opacity-40"><RotateCcw className="h-3 w-3" /> Reopen</button>
                )}
                <button onClick={() => handleDelete(r.id)} disabled={busyId === r.id} className="btn-ghost px-2.5 py-1 text-[11px] text-ink-400 hover:text-error-400 disabled:opacity-40"><Trash2 className="h-3 w-3" /> Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
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
