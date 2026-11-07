import { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Trash2, Download, Upload, Info, CheckCircle2, BookOpen, Sliders } from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';

export function SettingsPage() {
  const { library, clearLibrary } = useLibrary();

  // Persistent settings state
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yuriorbit_reduced_motion') === 'true';
    } catch {
      return false;
    }
  });

  const [readerWidth, setReaderWidth] = useState<'narrow' | 'normal' | 'wide' | 'full'>(() => {
    try {
      return (localStorage.getItem('yuriorbit_reader_width') as 'narrow' | 'normal' | 'wide' | 'full') || 'normal';
    } catch {
      return 'normal';
    }
  });

  const [readerBg, setReaderBg] = useState<'dark' | 'sepia' | 'light'>(() => {
    try {
      return (localStorage.getItem('yuriorbit_reader_bg') as 'dark' | 'sepia' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const [dataSaver, setDataSaver] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yuriorbit_data_saver') === 'true';
    } catch {
      return false;
    }
  });

  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync reduced motion to document root
  useEffect(() => {
    try {
      localStorage.setItem('yuriorbit_reduced_motion', String(reducedMotion));
      if (reducedMotion) {
        document.documentElement.classList.add('motion-reduce');
      } else {
        document.documentElement.classList.remove('motion-reduce');
      }
    } catch {}
  }, [reducedMotion]);

  // Sync reader preferences
  useEffect(() => {
    try {
      localStorage.setItem('yuriorbit_reader_width', readerWidth);
    } catch {}
  }, [readerWidth]);

  useEffect(() => {
    try {
      localStorage.setItem('yuriorbit_reader_bg', readerBg);
    } catch {}
  }, [readerBg]);

  useEffect(() => {
    try {
      localStorage.setItem('yuriorbit_data_saver', String(dataSaver));
    } catch {}
  }, [dataSaver]);

  // Export JSON backup
  const handleExport = () => {
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      library,
      preferences: {
        reducedMotion,
        readerWidth,
        readerBg,
        dataSaver,
      },
    };
    const data = JSON.stringify(backup, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yuriorbit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFeedback('Library and preferences exported successfully.');
    setTimeout(() => setFeedback(null), 3000);
  };

  // Import JSON backup
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.preferences) {
          if (typeof parsed.preferences.reducedMotion === 'boolean') {
            setReducedMotion(parsed.preferences.reducedMotion);
          }
          if (parsed.preferences.readerWidth) {
            setReaderWidth(parsed.preferences.readerWidth);
          }
          if (parsed.preferences.readerBg) {
            setReaderBg(parsed.preferences.readerBg);
          }
          if (typeof parsed.preferences.dataSaver === 'boolean') {
            setDataSaver(parsed.preferences.dataSaver);
          }
        }
        if (Array.isArray(parsed.library)) {
          localStorage.setItem('yuriorbit_library', JSON.stringify(parsed.library));
        }
        setFeedback('Backup restored successfully. Refresh to see updated library items.');
        setTimeout(() => setFeedback(null), 4000);
      } catch {
        setFeedback('Failed to parse backup file. Please ensure it is a valid YuriOrbit JSON export.');
        setTimeout(() => setFeedback(null), 4000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-rose-400" />
        <h1 className="font-display text-3xl font-semibold text-ink-50">Settings</h1>
      </div>

      {feedback && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Appearance & Accessibility */}
        <section className="card-surface p-5">
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="h-4 w-4 text-rose-400" />
            <h2 className="text-lg font-semibold text-ink-50">Appearance & Motion</h2>
          </div>
          <p className="mb-4 text-xs text-ink-400">Personalize display style and interface animations.</p>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-300">Theme</label>
              <div className="flex items-center gap-2 text-xs text-ink-200">
                <span className="rounded-lg border border-rose-500/30 bg-ink-850 px-3 py-1.5 font-medium text-rose-300">
                  Dark Velvet (Default)
                </span>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
                className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-rose-500 focus:ring-rose-500"
              />
              <div>
                <span className="text-sm font-medium text-ink-200 block">Reduce animations and transitions</span>
                <span className="text-xs text-ink-400">Minimizes smooth scrolling and carousel movement</span>
              </div>
            </label>
          </div>
        </section>

        {/* Reader Preferences */}
        <section className="card-surface p-5">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-rose-400" />
            <h2 className="text-lg font-semibold text-ink-50">Reader Preferences</h2>
          </div>
          <p className="mb-4 text-xs text-ink-400">Default settings for the MangaDex chapter reader.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-300">Default Reading Width</label>
              <select
                value={readerWidth}
                onChange={(e) => setReaderWidth(e.target.value as 'narrow' | 'normal' | 'wide' | 'full')}
                className="input-field text-xs"
              >
                <option value="narrow">Narrow (Phone width)</option>
                <option value="normal">Normal (Tablet / standard)</option>
                <option value="wide">Wide (Desktop)</option>
                <option value="full">Full (Window width)</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink-300">Reader Background</label>
              <select
                value={readerBg}
                onChange={(e) => setReaderBg(e.target.value as 'dark' | 'sepia' | 'light')}
                className="input-field text-xs"
              >
                <option value="dark">Dark Canvas (OLED black)</option>
                <option value="sepia">Warm Sepia</option>
                <option value="light">Paper Light</option>
              </select>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-ink-800/80">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dataSaver}
                onChange={(e) => setDataSaver(e.target.checked)}
                className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-rose-500 focus:ring-rose-500"
              />
              <div>
                <span className="text-sm font-medium text-ink-200 block">Data Saver Mode</span>
                <span className="text-xs text-ink-400">Request compressed chapter images from MangaDex for faster loading</span>
              </div>
            </label>
          </div>
        </section>

        {/* Data Management */}
        <section className="card-surface p-5">
          <h2 className="mb-1 text-lg font-semibold text-ink-50">Data Management & Backup</h2>
          <p className="mb-4 text-xs text-ink-400">
            When signed in, your library is synced to your account and available across devices. When not signed in, data is stored locally in your browser.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json,application/json"
            className="hidden"
          />

          <div className="flex flex-wrap gap-2.5">
            <button onClick={handleExport} className="btn-secondary text-xs flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export Data Backup
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Upload className="h-3.5 w-3.5" /> Import Data Backup
            </button>
            <button
              onClick={() => {
                if (confirm('Clear all local library data? This will reset your saved bookmarks and reading progress.')) {
                  clearLibrary();
                  setFeedback('Local library data has been cleared.');
                  setTimeout(() => setFeedback(null), 3000);
                }
              }}
              className="btn-secondary text-xs text-error-400 hover:text-error-300 flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear Local Library
            </button>
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-ink-400">
            <span>Library Items: <strong className="text-ink-200">{library.length}</strong></span>
          </div>
        </section>

        {/* Storage Mode Notice */}
        <section className="card-surface p-5">
          <div className="flex gap-3">
            <Info className="h-5 w-5 flex-shrink-0 text-lavender-400" />
            <div>
              <h2 className="mb-1 text-sm font-semibold text-ink-50">Cloud-Synced Library</h2>
              <p className="text-xs text-ink-400 leading-relaxed">
                Sign in to sync your library across devices. Your saved titles, reading progress, ratings, and notes are stored securely in your account. When not signed in, data stays in your browser. Use Export to keep a backup.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
