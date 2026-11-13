import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Quote, Save, Star, Trash2, X } from 'lucide-react';
import { adminApi, type FeedbackReport } from '@/lib/admin/api';
import { cn } from '@/lib/utils/format';

interface ReviewItem {
  id: string;
  name: string;
  role?: string;
  quote: string;
  rating?: number;
  featured?: boolean;
  approved?: boolean;
  sourceId?: string;
  createdAt: string;
}

function newId() {
  return `rev_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function ReviewsTab() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [submissions, setSubmissions] = useState<FeedbackReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ReviewItem>>({ name: '', quote: '', rating: 5, approved: true, featured: false, role: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [settingsRes, feedbackRes] = await Promise.all([
      adminApi.settings(),
      adminApi.feedback({ kind: 'review', status: 'open', perPage: 20, page: 1 }),
    ]);
    if (settingsRes.ok && settingsRes.data) {
      const row = settingsRes.data.settings.find((s) => s.key === 'reviews');
      setReviews(Array.isArray(row?.value) ? (row!.value as ReviewItem[]) : []);
    } else {
      setError(settingsRes.error);
    }
    if (feedbackRes.ok && feedbackRes.data) setSubmissions(feedbackRes.data.reports);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (next: ReviewItem[]) => {
    setSaving(true);
    setError(null);
    const res = await adminApi.saveSetting('reviews', next);
    setSaving(false);
    if (res.ok) setReviews(next);
    else setError(res.error);
  };

  const addManual = async () => {
    if (!draft.quote?.trim() || !draft.name?.trim()) { setError('Name and quote are required.'); return; }
    const item: ReviewItem = {
      id: newId(),
      name: draft.name.trim(),
      role: draft.role?.trim() || undefined,
      quote: draft.quote.trim(),
      rating: Math.max(1, Math.min(5, Number(draft.rating) || 5)),
      approved: Boolean(draft.approved),
      featured: Boolean(draft.featured),
      createdAt: new Date().toISOString(),
    };
    await save([item, ...reviews]);
    setDraft({ name: '', quote: '', rating: 5, approved: true, featured: false, role: '' });
  };

  const approveFromSubmission = async (report: FeedbackReport) => {
    const item: ReviewItem = {
      id: newId(),
      sourceId: report.id,
      name: report.contact_name || report.user_email?.split('@')[0] || 'YuriOrbit user',
      quote: report.message.trim().slice(0, 500),
      rating: 5,
      approved: true,
      featured: false,
      createdAt: new Date().toISOString(),
    };
    await save([item, ...reviews]);
    await adminApi.updateFeedbackStatus(report.id, 'resolved');
    load();
  };

  const toggle = async (id: string, key: 'approved' | 'featured') => {
    await save(reviews.map((r) => (r.id === id ? { ...r, [key]: !r[key] } : r)));
  };
  const remove = async (id: string) => {
    if (!window.confirm('Remove this review?')) return;
    await save(reviews.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-100"><Quote className="h-4 w-4 text-rose-400" /> Reviews & testimonials</h2>
        <p className="mb-4 text-xs text-ink-400">Approved reviews can be displayed on the site as social proof. Feature top reviews to prioritize them.</p>
        {error && <div className="mb-3 rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">{error}</div>}
        <div className="grid gap-3 md:grid-cols-2">
          <input value={draft.name || ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className="input-field text-xs" />
          <input value={draft.role || ''} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="Role/context (optional, e.g. Manga reader)" className="input-field text-xs" />
          <div className="md:col-span-2">
            <textarea value={draft.quote || ''} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} rows={3} placeholder="Review quote" className="input-field text-xs" />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-300">
            <label className="flex items-center gap-1.5">Rating
              <select value={draft.rating || 5} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })} className="input-field w-20 py-1 text-xs">
                {[5,4,3,2,1].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!draft.approved} onChange={(e) => setDraft({ ...draft, approved: e.target.checked })} /> Approved</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!draft.featured} onChange={(e) => setDraft({ ...draft, featured: e.target.checked })} /> Featured</label>
          </div>
          <div className="flex items-center md:justify-end">
            <button onClick={addManual} disabled={saving} className="btn-primary text-xs disabled:opacity-40">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Add review</button>
          </div>
        </div>
      </div>

      {submissions.length > 0 && (
        <div className="card-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink-100">Open review submissions</h3>
          <ul className="space-y-2">
            {submissions.map((r) => (
              <li key={r.id} className="rounded-lg border border-ink-800 bg-ink-900/40 p-3">
                <p className="text-sm text-ink-200">“{r.message}”</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-micro text-ink-400">
                  <span>{r.contact_name || r.user_email || r.contact_email || 'Anonymous'} • {new Date(r.created_at).toLocaleDateString()}</span>
                  <button onClick={() => approveFromSubmission(r)} disabled={saving} className="btn-secondary px-2.5 py-1 text-micro disabled:opacity-40"><Check className="h-3 w-3" /> Approve & publish</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink-100">Managed reviews ({reviews.length})</h3>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-ink-300"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : reviews.length === 0 ? (
          <p className="text-xs text-ink-400">No reviews yet. Add one manually or approve a submission.</p>
        ) : (
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border border-ink-800 bg-ink-900/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-ink-100">{r.name}</span>
                  {r.role && <span className="text-micro text-ink-400">• {r.role}</span>}
                  <span className="ml-auto flex items-center gap-0.5 text-amber-400">{Array.from({length: Math.max(1, Math.min(5, r.rating || 5))}).map((_,i)=><Star key={i} className="h-3 w-3 fill-amber-400" />)}</span>
                </div>
                <p className="mt-1 text-sm text-ink-300">“{r.quote}”</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button onClick={() => toggle(r.id, 'approved')} className={cn('rounded-md border px-2 py-0.5 text-micro', r.approved ? 'border-success-500/30 bg-success-500/10 text-success-400' : 'border-ink-700 bg-ink-850 text-ink-400')}>{r.approved ? 'Approved' : 'Hidden'}</button>
                  <button onClick={() => toggle(r.id, 'featured')} className={cn('rounded-md border px-2 py-0.5 text-micro', r.featured ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-ink-700 bg-ink-850 text-ink-400')}>{r.featured ? 'Featured' : 'Not featured'}</button>
                  <button onClick={() => remove(r.id)} className="ml-auto btn-ghost px-2 py-0.5 text-micro text-ink-400 hover:text-error-400"><Trash2 className="h-3 w-3" /> Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
