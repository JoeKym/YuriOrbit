import { useState } from 'react';
import { Settings as SettingsIcon, Trash2, Download, Info } from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';

export function SettingsPage() {
  const { library, clearLibrary } = useLibrary();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [autoLoad, setAutoLoad] = useState(true);

  const handleExport = () => {
    const data = JSON.stringify({ library, preferences: { theme, reducedMotion, autoLoad } }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yuriverse-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-rose-400" />
        <h1 className="font-display text-3xl font-semibold text-ink-50">Settings</h1>
      </div>

      <div className="space-y-6">
        <section className="card-surface p-5">
          <h2 className="mb-1 text-lg font-semibold text-ink-50">Appearance</h2>
          <p className="mb-4 text-sm text-ink-400">Customize how YuriVerse looks.</p>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-300">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'dark' | 'light')}
                className="input-field"
              >
                <option value="dark">Dark (default)</option>
                <option value="light">Light (coming soon)</option>
              </select>
            </div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-rose-500 focus:ring-rose-500"
              />
              <span className="text-sm text-ink-200">Reduce animations and transitions</span>
            </label>
          </div>
        </section>

        <section className="card-surface p-5">
          <h2 className="mb-1 text-lg font-semibold text-ink-50">Content</h2>
          <p className="mb-4 text-sm text-ink-400">Control how content is loaded.</p>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={autoLoad}
              onChange={(e) => setAutoLoad(e.target.checked)}
              className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-rose-500 focus:ring-rose-500"
            />
            <span className="text-sm text-ink-200">Automatically load images</span>
          </label>
        </section>

        <section className="card-surface p-5">
          <h2 className="mb-1 text-lg font-semibold text-ink-50">Data Management</h2>
          <p className="mb-4 text-sm text-ink-400">Your library and preferences are stored locally in your browser.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExport} className="btn-secondary">
              <Download className="h-4 w-4" /> Export data
            </button>
            <button
              onClick={() => { if (confirm('Remove all local data? This will delete your library and preferences.')) clearLibrary(); }}
              className="btn-secondary text-error-400"
            >
              <Trash2 className="h-4 w-4" /> Clear local data
            </button>
          </div>
          <p className="mt-3 text-xs text-ink-400">Library items: {library.length}</p>
        </section>

        <section className="card-surface p-5">
          <div className="flex gap-3">
            <Info className="h-5 w-5 flex-shrink-0 text-lavender-400" />
            <div>
              <h2 className="mb-1 text-sm font-semibold text-ink-50">Local Storage Mode</h2>
              <p className="text-sm text-ink-400">
                YuriVerse stores your library, favourites, and preferences locally in your browser using IndexedDB (with localStorage as a backup). No account or sign-in is needed. Export your data regularly to avoid losing it if you clear browser storage.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
