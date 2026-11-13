import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CircleSlash,
  Flag,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Reply,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi, type FeedbackReport, type FeedbackStatus } from '@/lib/admin/api';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils/format';

interface FeedbackTabProps {
  /**
   * 'feedback' lists feedback submissions and content reports.
   * 'contact' lists messages sent from the on-site contact form.
   */
  mode?: 'feedback' | 'contact';
}

type StatusFilter = FeedbackStatus | '';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: '', label: 'All' },
];

const CATEGORY_LABELS: Record<string, string> = {
  issue: 'Bug / issue',
  feature: 'Feature request',
  general: 'General feedback',
  metadata: 'Incorrect metadata',
};

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  open: 'border-warning-500/30 bg-warning-500/10 text-warning-400',
  resolved: 'border-success-500/30 bg-success-500/10 text-success-400',
  dismissed: 'border-ink-700 bg-ink-850 text-ink-400',
};

export function FeedbackTab({ mode = 'feedback' }: FeedbackTabProps) {
  const isContact = mode === 'contact';
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 350);
  const [status, setStatus] = useState<StatusFilter>('open');
  const [kind, setKind] = useState<'feedback' | 'report'>('feedback');
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
    const result = await adminApi.feedback({
      q: debounced,
      status,
      kind: isContact ? 'contact' : kind,
      page,
      perPage,
    });
    if (result.ok && result.data) {
      setReports(result.data.reports);
      setTotal(result.data.total);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, [debounced, status, kind, page, isContact]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debounced, status, kind]);

  const changeStatus = async (report: FeedbackReport, next: FeedbackStatus) => {
    setBusyId(report.id);
    const result = await adminApi.updateFeedbackStatus(report.id, next);
    setBusyId(null);
    if (result.ok) load();
    else window.alert(result.error);
  };

  const handleDelete = async (report: FeedbackReport) => {
    const what = isContact ? 'message' : 'submission';
    if (!window.confirm(`Delete this ${what} permanently?`)) return;
    setBusyId(report.id);
    const result = await adminApi.deleteFeedback(report.id);
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
            placeholder={
              isContact ? 'Search subject, name, email or message…' : 'Search message, contact or title…'
            }
            className="input-field py-2 pl-9 text-xs"
          />
        </div>
        {!isContact && (
          <div className="flex rounded-lg border border-ink-700 bg-ink-850 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setKind('feedback')}
              className={cn(
                'rounded-md px-2.5 py-1.5 transition-colors',
                kind === 'feedback' ? 'bg-ink-700 text-ink-50' : 'text-ink-300 hover:text-ink-100'
              )}
            >
              Feedback
            </button>
            <button
              type="button"
              onClick={() => setKind('report')}
              className={cn(
                'rounded-md px-2.5 py-1.5 transition-colors',
                kind === 'report' ? 'bg-ink-700 text-ink-50' : 'text-ink-300 hover:text-ink-100'
              )}
            >
              Content reports
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={load}
          disabled={loading}
          title="Refresh"
          className="btn-secondary px-2.5 py-2 text-xs disabled:opacity-40"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </button>
        <span className="text-xs text-ink-400">
          {total} {isContact ? 'messages' : 'submissions'}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value || 'all'}
            type="button"
            onClick={() => setStatus(filter.value)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              status === filter.value
                ? 'bg-rose-500/15 text-rose-300'
                : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-ink-800 bg-ink-900 p-6 text-sm text-ink-300">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading {isContact ? 'messages' : 'submissions'}…
        </div>
      ) : reports.length === 0 ? (
        <div className="card-surface p-6 text-xs text-ink-400">
          {status === 'open'
            ? `No open ${isContact ? 'messages' : 'submissions'}. Nice and quiet.`
            : `No ${isContact ? 'messages' : 'submissions'} match these filters.`}
        </div>
      ) : (
        <ul className="space-y-2">
          {reports.map((report) => {
            const KindIcon = report.kind === 'report' ? Flag : isContact ? Mail : MessageSquare;
            const busy = busyId === report.id;
            return (
              <li key={report.id} className="card-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-micro font-medium',
                      report.kind === 'report'
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                        : 'border-lavender-500/30 bg-lavender-500/10 text-lavender-300'
                    )}
                  >
                    <KindIcon className="h-3 w-3" />
                    {report.kind === 'report' ? 'Content report' : isContact ? 'Contact' : 'Feedback'}
                  </span>
                  {!isContact && (
                    <span className="text-micro text-ink-400">
                      {CATEGORY_LABELS[report.category] || report.category}
                    </span>
                  )}
                  <span
                    className={cn(
                      'rounded-md border px-1.5 py-0.5 text-micro font-medium capitalize',
                      STATUS_STYLES[report.status]
                    )}
                  >
                    {report.status}
                  </span>
                  <span className="ml-auto text-micro text-ink-400">
                    {new Date(report.created_at).toLocaleString()}
                  </span>
                </div>

                {isContact && report.subject && (
                  <p className="mt-2 text-sm font-medium text-ink-100">{report.subject}</p>
                )}

                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink-200">
                  {report.message}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-micro text-ink-400">
                  {isContact && report.contact_name && (
                    <span className="text-ink-200">{report.contact_name}</span>
                  )}

                  {report.title_id ? (
                    <Link
                      to={`/title/${report.title_id}`}
                      className="inline-flex items-center gap-1 text-rose-300 hover:underline"
                    >
                      <Flag className="h-3 w-3" />
                      {report.title_name || report.title_id}
                    </Link>
                  ) : (
                    report.page_url && !isContact && <span className="text-ink-400">from {report.page_url}</span>
                  )}

                  {report.contact_email && (
                    <a
                      href={`mailto:${report.contact_email}?subject=${encodeURIComponent(
                        report.subject ? `Re: ${report.subject}` : 'Re: your message to YuriOrbit'
                      )}`}
                      className="inline-flex items-center gap-1 hover:text-ink-100"
                    >
                      <Mail className="h-3 w-3" />
                      {report.contact_email}
                    </a>
                  )}

                  {report.user_email && report.user_email !== report.contact_email && (
                    <span>account: {report.user_email}</span>
                  )}

                  {report.resolved_by && (
                    <span className="text-ink-400">
                      {report.status} by {report.resolved_by}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {report.contact_email && (
                    <a
                      href={`mailto:${report.contact_email}?subject=${encodeURIComponent(
                        report.subject ? `Re: ${report.subject}` : 'Re: your message to YuriOrbit'
                      )}`}
                      className="btn-secondary px-2.5 py-1 text-micro"
                    >
                      <Reply className="h-3 w-3" /> Reply
                    </a>
                  )}
                  {report.status === 'open' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => changeStatus(report, 'resolved')}
                        disabled={busy}
                        className="btn-secondary px-2.5 py-1 text-micro disabled:opacity-40"
                      >
                        <Check className="h-3 w-3" /> Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => changeStatus(report, 'dismissed')}
                        disabled={busy}
                        className="btn-ghost px-2.5 py-1 text-micro disabled:opacity-40"
                      >
                        <CircleSlash className="h-3 w-3" /> Dismiss
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => changeStatus(report, 'open')}
                      disabled={busy}
                      className="btn-secondary px-2.5 py-1 text-micro disabled:opacity-40"
                    >
                      <RotateCcw className="h-3 w-3" /> Reopen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(report)}
                    disabled={busy}
                    className="btn-ghost px-2.5 py-1 text-micro text-ink-400 hover:text-error-400 disabled:opacity-40"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-400" />}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>
          Page {page} of {lastPage}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
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
