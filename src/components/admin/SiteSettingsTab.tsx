import { useCallback, useEffect, useState } from 'react';
import { Loader2, Megaphone, Save } from 'lucide-react';
import { adminApi, type Announcement } from '@/lib/admin/api';

const EMPTY: Announcement = {
  text: '',
  tone: 'info',
  active: false,
  linkLabel: '',
  linkHref: '',
};

export function SiteSettingsTab() {
  const [announcement, setAnnouncement] = useState<Announcement>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await adminApi.settings();
    if (result.ok && result.data) {
      const row = result.data.settings.find((s) => s.key === 'announcement');
      if (row && row.value && typeof row.value === 'object') {
        setAnnouncement({ ...EMPTY, ...(row.value as Announcement) });
      }
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await adminApi.saveSetting('announcement', announcement);
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error);
    }
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
            <label className="mb-1 block text-[11px] text-ink-400">Message</label>
            <textarea
              value={announcement.text}
              onChange={(e) => setAnnouncement({ ...announcement, text: e.target.value })}
              rows={2}
              maxLength={200}
              placeholder="Scheduled maintenance tonight at 22:00 UTC."
              className="input-field text-xs"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-ink-400">Tone</label>
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
              <label className="mb-1 block text-[11px] text-ink-400">Link label (optional)</label>
              <input
                value={announcement.linkLabel ?? ''}
                onChange={(e) => setAnnouncement({ ...announcement, linkLabel: e.target.value })}
                placeholder="Read more"
                className="input-field text-xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Link URL (optional)</label>
            <input
              value={announcement.linkHref ?? ''}
              onChange={(e) => setAnnouncement({ ...announcement, linkHref: e.target.value })}
              placeholder="/discover or https://…"
              className="input-field text-xs"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save banner
          </button>
          {saved && <span className="text-xs text-success-400">Saved.</span>}
        </div>

        {error && <p className="mt-3 text-xs text-error-400">{error}</p>}
      </div>

      <div className="card-surface p-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">Preview</h3>
        {announcement.text ? (
          <div className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${toneClasses}`}>
            <Megaphone className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1">{announcement.text}</span>
            {announcement.linkLabel && announcement.linkHref && (
              <span className="font-medium underline">{announcement.linkLabel}</span>
            )}
          </div>
        ) : (
          <p className="text-xs text-ink-500">Enter a message to preview it.</p>
        )}
        {!announcement.active && (
          <p className="mt-2 text-[11px] text-ink-500">Currently disabled — visitors will not see this.</p>
        )}
      </div>
    </div>
  );
}
