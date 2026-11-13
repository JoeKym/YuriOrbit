import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, RotateCcw, Save, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/admin/api';
import { getTitleById } from '@/lib/providers';
import { cn } from '@/lib/utils/format';
import {
  clearAllRestrictedAcknowledgments,
  clearRestrictedAcknowledgment,
} from '@/lib/moderation/restrictedAck';

type Action = 'takedown' | 'suspended' | 'restricted';

interface Item {
  titleId: string;
  title?: string;
  action: Action;
  reason?: string;
  note?: string;
  /** ISO timestamp; suspensions restore automatically once this passes. */
  expiresAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

type MapValue = Record<string, Item>;

export function ContentModerationTab() {
  const [items, setItems] = useState<MapValue>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [lookupId, setLookupId] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [draft, setDraft] = useState<Item>({ titleId: '', action: 'takedown', reason: '', note: '' });
  const [durationHours, setDurationHours] = useState(24);
  const [gateNotice, setGateNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminApi.settings();
    if (res.ok && res.data) {
      const row = res.data.settings.find((s) => s.key === 'content_moderation');
      setItems(row?.value && typeof row.value === 'object' ? (row.value as MapValue) : {});
    } else {
      setError(res.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveAll = async (next: MapValue) => {
    setSaving(true);
    setError(null);
    const res = await adminApi.saveSetting('content_moderation', next);
    setSaving(false);
    if (res.ok) setItems(next);
    else setError(res.error);
  };

  const handleLookup = async () => {
    const id = lookupId.trim();
    if (!id) return;
    setLookupBusy(true);
    try {
      const title = await getTitleById(id);
      setDraft((d) => ({ ...d, titleId: id, title: title?.title || d.title || id }));
    } catch {
      setDraft((d) => ({ ...d, titleId: id }));
    } finally {
      setLookupBusy(false);
    }
  };

  const upsert = async () => {
    const titleId = draft.titleId.trim();
    if (!titleId) { setError('Title ID is required.'); return; }
    const reason = (draft.reason || '').trim();
    if (!reason) {
      setError('A reason is required — it is shown to users when they open the title.');
      return;
    }
    const expiresAt = draft.action === 'suspended'
      ? new Date(Date.now() + Math.max(1, Math.floor(durationHours)) * 3_600_000).toISOString()
      : undefined;
    const next: MapValue = {
      ...items,
      [titleId]: { ...draft, reason, expiresAt, titleId, updatedAt: new Date().toISOString() },
    };
    await saveAll(next);
    setError(null);
    setDraft({ titleId: '', action: 'takedown', reason: '', note: '' });
    setDurationHours(24);
    setLookupId('');
  };

  const clear = async (titleId: string) => {
    if (!window.confirm(`Remove moderation action for ${titleId}?`)) return;
    const next = { ...items };
    delete next[titleId];
    await saveAll(next);
  };

  const flashGateNotice = (message: string) => {
    setGateNotice(message);
    window.setTimeout(() => {
      setGateNotice((current) => (current === message ? null : current));
    }, 3000);
  };

  const resetGate = (titleId: string) => {
    clearRestrictedAcknowledgment(titleId);
    flashGateNotice(
      `Restricted notice reset for ${titleId}. It will show again on its next visit in this browser.`
    );
  };

  const resetAllGates = () => {
    const count = clearAllRestrictedAcknowledgments();
    flashGateNotice(
      count > 0
        ? `Reset ${count} restricted notice${count === 1 ? '' : 's'} in this browser.`
        : 'No restricted notices are acknowledged in this browser.'
    );
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(items)
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      .filter((i) => !q || `${i.titleId} ${i.title || ''} ${i.reason || ''} ${i.action}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-100"><ShieldAlert className="h-4 w-4 text-rose-400" /> Content moderation</h2>
        <p className="mb-4 text-xs text-ink-400">Apply <strong>takedown</strong>, <strong>suspension</strong>, or <strong>restriction</strong> actions to content by title ID. All three hide the title from browse and search. Takedowns/suspensions also block direct links and show an appeal page; suspensions restore automatically. Restricted titles still open by direct link with a warning.</p>
        {error && <div className="mb-3 rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">{error}</div>}
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Title ID (e.g. anilist:123, mal:456, mangadex:...)</label>
            <div className="flex gap-2">
              <input value={lookupId} onChange={(e) => { setLookupId(e.target.value); setDraft((d) => ({ ...d, titleId: e.target.value })); }} placeholder="Paste title ID" className="input-field text-xs" />
              <button type="button" onClick={handleLookup} disabled={lookupBusy} className="btn-secondary shrink-0 text-xs">{lookupBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Lookup</button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Action</label>
            <select value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value as Action })} className="input-field text-xs">
              <option value="takedown">Takedown (hide/remove listing)</option>
              <option value="suspended">Suspended (temporarily hidden)</option>
              <option value="restricted">Restricted (hidden from browse; direct links show a warning)</option>
            </select>
          </div>
          {draft.action === 'suspended' && (
            <div>
              <label className="mb-1 block text-[11px] text-ink-400">Suspension duration (hours)</label>
              <input type="number" min={1} value={durationHours} onChange={(e) => setDurationHours(Number(e.target.value || 1))} className="input-field text-xs" />
              <div className="mt-1 text-[10px] text-ink-400">Common: 24 (1 day), 72 (3 days), 168 (7 days). Auto-restores on expiry.</div>
            </div>
          )}
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Title (optional)</label>
            <input value={draft.title || ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Auto-filled on lookup or enter manually" className="input-field text-xs" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">
              Reason <span className="text-rose-300">(required — shown to users)</span>
            </label>
            <input value={draft.reason || ''} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="e.g. valid rights request, policy violation, incorrect/unsafe listing" className="input-field text-xs" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] text-ink-400">Internal note (optional)</label>
            <textarea value={draft.note || ''} onChange={(e) => setDraft({ ...draft, note: e.target.value })} rows={2} className="input-field text-xs" placeholder="Internal context, ticket/reference, dates…" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={upsert} disabled={saving || !draft.titleId.trim()} className="btn-primary text-xs disabled:opacity-40">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save action</button>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-800 p-4">
          <h3 className="text-sm font-semibold text-ink-100">Active content actions</h3>
          <button
            type="button"
            onClick={resetAllGates}
            disabled={!list.some((i) => i.action === 'restricted')}
            className="btn-secondary text-xs disabled:opacity-40"
            title="Clear restricted-content acknowledgments stored in this browser"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset gates
          </button>
          <div className="relative ml-auto min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter actions…" className="input-field py-2 pl-9 text-xs" />
          </div>
          {gateNotice && (
            <div className="basis-full rounded-lg border border-ink-700 bg-ink-850/60 p-2 text-[11px] text-ink-300">
              {gateNotice}
            </div>
          )}
        </div>
        {loading ? (
          <div className="flex items-center gap-2 p-6 text-sm text-ink-300"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-6 text-xs text-ink-400">No content moderation actions.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-ink-800 bg-ink-850/60 text-ink-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="px-4 py-2.5 font-medium">Action</th>
                  <th className="px-4 py-2.5 font-medium">Reason</th>
                  <th className="px-4 py-2.5 font-medium">Updated</th>
                  <th className="px-4 py-2.5 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((item) => (
                  <tr key={item.titleId} className="border-b border-ink-800/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink-100">{item.title || item.titleId}</p>
                      <p className="text-[10px] text-ink-400">{item.titleId}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase', item.action === 'takedown' ? 'border-error-500/30 bg-error-500/10 text-error-400' : item.action === 'suspended' ? 'border-warning-500/30 bg-warning-500/10 text-warning-400' : 'border-ink-700 bg-ink-850 text-ink-300')}>{item.action}</span>
                      {item.action === 'suspended' && item.expiresAt && (
                        <div className="mt-1 text-[10px] text-ink-400">
                          {Date.parse(item.expiresAt) > Date.now()
                            ? `Until ${new Date(item.expiresAt).toLocaleString()}`
                            : 'Expired'}
                        </div>
                      )}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-2.5 text-ink-400" title={item.reason}>{item.reason || '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-ink-400">{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      {item.action === 'restricted' && (
                        <button
                          onClick={() => resetGate(item.titleId)}
                          className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-warning-400"
                          title="Reset the restricted-content notice in this browser"
                          aria-label={`Reset restricted notice for ${item.title || item.titleId}`}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => clear(item.titleId)} disabled={saving} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-800 hover:text-error-400 disabled:opacity-40" title="Remove action"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-warning-500/20 bg-warning-500/5 p-4 text-xs text-warning-300/90">
        <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> Takedown/suspension enforcement in the UI is best-effort and depends on client fetch/caching. For legal/urgent requests, also follow your operational process and document actions in audit/notes.</p>
        <p className="mt-2 flex items-start gap-2"><RotateCcw className="mt-0.5 h-4 w-4 flex-shrink-0" /> Restricted-content acknowledgments are stored per browser session, so resetting a gate only affects this browser — useful for previewing the notice. Other visitors' acknowledgments cannot be reset from here.</p>
      </div>
    </div>
  );
}
