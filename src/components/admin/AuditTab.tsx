import { useEffect, useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { adminApi, type AuditEntry } from '@/lib/admin/api';

const ACTION_LABELS: Record<string, string> = {
  'user.purge_library': 'Purged a user library',
  'user.delete': 'Deleted a user account',
  'library.delete_entry': 'Removed a library entry',
  'featured.add': 'Featured a title',
  'featured.remove': 'Unfeatured a title',
  'settings.update': 'Updated site settings',
  'feedback.update_status': 'Triaged a feedback submission',
  'feedback.delete': 'Deleted a feedback submission',
};

export function AuditTab() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi.audit().then((result) => {
      if (cancelled) return;
      if (result.ok && result.data) setEntries(result.data.entries);
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
        <Loader2 className="h-4 w-4 animate-spin" /> Loading audit log…
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">{error}</div>;
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-800 bg-ink-850/60 px-4 py-2.5 text-xs text-ink-400">
        <Activity className="h-3.5 w-3.5" /> Most recent 50 privileged actions
      </div>
      {entries.length === 0 ? (
        <p className="p-6 text-xs text-ink-400">No admin actions recorded yet.</p>
      ) : (
        <ul className="divide-y divide-ink-800">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-xs">
              <span className="font-medium text-ink-100">{ACTION_LABELS[entry.action] || entry.action}</span>
              {entry.target && <span className="text-[10px] text-ink-500">{entry.target}</span>}
              <span className="ml-auto text-[10px] text-ink-500">
                {entry.actor_email} · {new Date(entry.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
