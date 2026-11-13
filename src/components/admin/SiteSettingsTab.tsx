import { useCallback, useEffect, useState } from 'react';
import { Construction, Loader2, Megaphone, Save, Power, Clock } from 'lucide-react';
import { adminApi, type Announcement } from '@/lib/admin/api';
import { cn } from '@/lib/utils/format';

const EMPTY_ANNOUNCEMENT: Announcement = {
  text: '',
  tone: 'info',
  active: false,
  linkLabel: '',
  linkHref: '',
};

interface MaintenanceState {
  active: boolean;
  message: string;
  eta: string;
}

const EMPTY_MAINTENANCE: MaintenanceState = {
  active: false,
  message: '',
  eta: '',
};

export function SiteSettingsTab() {
  const [announcement, setAnnouncement] = useState<Announcement>(EMPTY_ANNOUNCEMENT);
  const [maintenance, setMaintenance] = useState<MaintenanceState>(EMPTY_MAINTENANCE);
  const [loading, setLoading] = useState(true);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAnnouncement, setSavedAnnouncement] = useState(false);
  const [savedMaintenance, setSavedMaintenance] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await adminApi.settings();
    if (result.ok && result.data) {
      const announcementRow = result.data.settings.find((s) => s.key === 'announcement');
      if (announcementRow && announcementRow.value && typeof announcementRow.value === 'object') {
        setAnnouncement({ ...EMPTY_ANNOUNCEMENT, ...(announcementRow.value as Announcement) });
      }
      const maintenanceRow = result.data.settings.find((s) => s.key === 'maintenance');
      if (maintenanceRow && maintenanceRow.value && typeof maintenanceRow.value === 'object') {
        const v = maintenanceRow.value as Partial<MaintenanceState>;
        setMaintenance({
          active: Boolean(v.active),
          message: typeof v.message === 'string' ? v.message : '',
          eta: typeof v.eta === 'string' ? v.eta : '',
        });
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clearMaintenanceCache = () => {
    try {
      sessionStorage.removeItem('yuriorbit:maintenance_cache');
    } catch {}
  };

  const handleSaveAnnouncement = async () => {
    setSavingAnnouncement(true);
    setError(null);
    setSavedAnnouncement(false);
    const result = await adminApi.saveSetting('announcement', announcement);
    setSavingAnnouncement(false);
    if (result.ok) {
      setSavedAnnouncement(true);
      window.setTimeout(() => setSavedAnnouncement(false), 3000);
    } else {
      setError(result.error);
    }
  };

  const handleSaveMaintenance = async (next?: MaintenanceState) => {
    const payload = next ?? maintenance;
    setSavingMaintenance(true);
    setError(null);
    setSavedMaintenance(false);
    const result = await adminApi.saveSetting('maintenance', {
      active: payload.active,
      message: payload.message.trim(),
      eta: payload.eta.trim(),
      startedAt: payload.active ? new Date().toISOString() : undefined,
    });
    setSavingMaintenance(false);
    if (result.ok) {
      clearMaintenanceCache();
      setSavedMaintenance(true);
      window.setTimeout(() => setSavedMaintenance(false), 3000);
    } else {
      setError(result.error);
    }
  };

  const toggleMaintenance = async () => {
    const next = { ...maintenance, active: !maintenance.active };
    setMaintenance(next);
    await handleSaveMaintenance(next);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-ink-800 bg-ink-900 p-6 text-sm text-ink-300">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading site settings…
      </div>
    );
  }

  const toneClasses =
    announcement.tone === 'warning'
      ? 'border-warning-500/30 bg-warning-500/10 text-warning-400'
      : announcement.tone === 'success'
        ? 'border-success-500/30 bg-success-500/10 text-success-400'
        : 'border-rose-500/25 bg-rose-500/10 text-rose-300';

  return (
    <div className="space-y-5">
      {/* Maintenance mode */}
      <div
        className={cn(
          'card-surface p-5',
          maintenance.active && 'border-warning-500/40 bg-warning-500/[0.04]'
        )}
      >
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-100">
            <Construction className="h-4 w-4 text-warning-400" /> Maintenance mode
          </h2>
          <button
            onClick={toggleMaintenance}
            disabled={savingMaintenance}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60',
              maintenance.active
                ? 'bg-success-500/15 text-success-300 border border-success-500/30 hover:bg-success-500/25'
                : 'bg-warning-500/15 text-warning-300 border border-warning-500/30 hover:bg-warning-500/25'
            )}
          >
            {savingMaintenance ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
            {maintenance.active ? 'Disable maintenance' : 'Enable maintenance'}
          </button>
        </div>
        <p className="mb-4 text-xs text-ink-400">
          When enabled, the site shows a full maintenance screen to visitors. Admin and sign-in routes remain accessible so you can turn it off.
        </p>

        {maintenance.active && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning-500/30 bg-warning-500/10 px-3 py-2 text-xs text-warning-300">
            <Construction className="h-3.5 w-3.5 flex-shrink-0" />
            Maintenance mode is <strong>active</strong>. Visitors see the maintenance page.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-micro text-ink-400">Maintenance message (shown to visitors)</label>
            <textarea
              value={maintenance.message}
              onChange={(e) => setMaintenance({ ...maintenance, message: e.target.value })}
              rows={3}
              maxLength={400}
              placeholder="We’re performing scheduled maintenance to improve YuriOrbit. Thanks for your patience."
              className="input-field text-xs"
            />
          </div>
          <div>
            <label className="mb-1 block text-micro text-ink-400">
              ETA (optional) — shown as &quot;Estimated return&quot;
            </label>
            <div className="relative">
              <Clock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                value={maintenance.eta}
                onChange={(e) => setMaintenance({ ...maintenance, eta: e.target.value })}
                placeholder="e.g. 22:00 UTC, ~30 minutes, or 2026-11-10 14:00 UTC"
                className="input-field pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => handleSaveMaintenance()}
            disabled={savingMaintenance}
            className="btn-primary text-xs"
          >
            {savingMaintenance ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save maintenance settings
          </button>
          {savedMaintenance && <span className="text-xs text-success-400">Saved.</span>}
        </div>

        <div className="mt-4 rounded-xl border border-ink-800 bg-ink-950/40 p-4">
          <h3 className="mb-2 text-micro font-semibold uppercase tracking-wider text-ink-400">Visitor preview</h3>
          <div className="rounded-lg border border-ink-800 bg-ink-900 p-4 text-center">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-warning-500/30 bg-warning-500/10 px-2.5 py-0.5 text-micro font-medium text-warning-400">
              <Construction className="h-3 w-3" /> Maintenance in progress
            </div>
            <p className="font-display text-lg font-semibold text-ink-50">We'll be right back</p>
            <p className="mt-1 text-xs text-ink-300">
              {maintenance.message.trim() || 'YuriOrbit is temporarily down for maintenance.'}
            </p>
            {maintenance.eta.trim() && (
              <p className="mt-2 text-micro text-ink-400">
                Estimated return: <span className="text-ink-200">{maintenance.eta.trim()}</span>
              </p>
            )}
          </div>
          <p className="mt-2 text-micro text-ink-400">
            The live maintenance page also sets its own metadata (title/description/noindex) while active.
          </p>
        </div>
      </div>

      {/* Announcement banner */}
      <div className="card-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink-100">
          <Megaphone className="h-4 w-4 text-rose-400" /> Site announcement banner
        </h2>
        <p className="mb-4 text-xs text-ink-400">
          Shown across the top of every page. Users can dismiss it for their session.
        </p>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={announcement.active}
              onChange={(e) => setAnnouncement({ ...announcement, active: e.target.checked })}
              className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-rose-500 focus:ring-rose-500"
            />
            <span className="text-sm text-ink-200">Show the banner on the site</span>
          </label>

          <div>
            <label className="mb-1 block text-micro text-ink-400">Message</label>
            <textarea
              value={announcement.text}
              onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
              rows={2}
              maxLength={200}
              placeholder="New GL titles added this week."
              className="input-field text-xs"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-micro text-ink-400">Tone</label>
              <select
                value={announcement.tone}
                onChange={(e) =>
                  setAnnouncement({ ...announcement, tone: e.target.value as Announcement['tone'] })
                }
                className="input-field text-xs"
              >
                <option value="info">Info (rose)</option>
                <option value="warning">Warning (amber)</option>
                <option value="success">Success (green)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-micro text-ink-400">Link label (optional)</label>
              <input
                value={announcement.linkLabel ?? ''}
                onChange={(e) => setAnnouncement({ ...announcement, linkLabel: e.target.value })}
                placeholder="Read more"
                className="input-field text-xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-micro text-ink-400">Link URL (optional)</label>
            <input
              value={announcement.linkHref ?? ''}
              onChange={(e) => setAnnouncement({ ...announcement, linkHref: e.target.value })}
              placeholder="/discover or https://…"
              className="input-field text-xs"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleSaveAnnouncement} disabled={savingAnnouncement} className="btn-primary text-xs">
            {savingAnnouncement ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save banner
          </button>
          {savedAnnouncement && <span className="text-xs text-success-400">Saved.</span>}
        </div>

        {error && <p className="mt-3 text-xs text-error-400">{error}</p>}
      </div>

      <div className="card-surface p-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Banner preview</h3>
        {announcement.text ? (
          <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${toneClasses}`}>
            <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1">{announcement.text}</span>
            {announcement.linkLabel && announcement.linkHref && (
              <span className="font-medium underline">{announcement.linkLabel}</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-ink-400">Enter a message to preview it.</p>
        )}
        {!announcement.active && (
          <p className="mt-2 text-micro text-ink-400">Currently disabled — visitors will not see this.</p>
        )}
      </div>
    </div>
  );
}
