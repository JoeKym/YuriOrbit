import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Trash2,
  Download,
  Upload,
  Info,
  CheckCircle2,
  BookOpen,
  Sliders,
  Pencil,
  UserRound,
  ShieldAlert,
  Lock,
  AlertTriangle,
  RotateCcw,
  Globe,
  Palette,
  UserX,
  Loader2,
} from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import { useMaturity } from '@/hooks/useMaturity';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchMyProfile, saveWatchRegion } from '@/lib/profiles';
import {
  REGION_OPTIONS,
  readStoredWatchRegion,
  regionName,
  writeStoredWatchRegion,
} from '@/lib/content/watch-region';
import { tmdbPreferredRegion } from '@/lib/providers';
import { supabase } from '@/lib/supabase';
import type { MaturityLevel } from '@/types/content';
import { MATURITY_DESCRIPTIONS, MATURITY_LABELS, MATURITY_LEVELS } from '@/types/content';
import { maturityRank, requiresAdultConfirmation } from '@/lib/content/maturity';
import { resetMaturityPreference } from '@/lib/content/maturity-preference';
import { THEMES, type ThemeId, getStoredTheme, applyTheme, THEME_STORAGE_KEY } from '@/lib/theme/themes';
import { usePageMeta } from '@/hooks/usePageMeta';
import { cn } from '@/lib/utils/format';

export function SettingsPage() {
  usePageMeta({
    title: 'Settings',
    description: 'Manage your YuriOrbit appearance, content filter, reader preferences, and account data.',
    path: '/settings',
  });

  const navigate = useNavigate();
  const { library, clearLibrary } = useLibrary();
  const { level: maturityLevel, adultAcknowledged, setLevel, acknowledge } = useMaturity();
  const { isAuthenticated, user, logout } = useAuth();
  const [pendingLevel, setPendingLevel] = useState<MaturityLevel | null>(null);
  const [theme, setTheme] = useState<ThemeId>(() => getStoredTheme());
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  const [watchRegion, setWatchRegion] = useState<string | null>(() => readStoredWatchRegion());

  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<'success' | 'error'>('success');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string, tone: 'success' | 'error' = 'success', ms = 3500) => {
    setFeedbackTone(tone);
    setFeedback(msg);
    setTimeout(() => setFeedback(null), ms);
  };

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

  // Match the region the rest of the site is using, including profile sync.
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    let cancelled = false;

    fetchMyProfile(user.id)
      .then(({ data }) => {
        if (cancelled) return;
        const stored = data?.watchRegion;
        if (!stored || !/^[A-Z]{2}$/.test(stored)) return;
        setWatchRegion(stored);
        writeStoredWatchRegion(stored);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const handleThemeChange = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
  };

  const handleWatchRegionChange = (value: string) => {
    const next = value === 'auto' ? null : value;
    setWatchRegion(next);
    writeStoredWatchRegion(next);

    if (!isAuthenticated || !user?.id) return;
    saveWatchRegion(user.id, next).then((result) => {
      if (result.error) showFeedback(result.error, 'error');
    });
  };

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
        theme,
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
    showFeedback('Library and preferences exported successfully.');
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
          if (parsed.preferences.theme && THEMES.some((t) => t.id === parsed.preferences.theme)) {
            handleThemeChange(parsed.preferences.theme as ThemeId);
          }
        }
        if (Array.isArray(parsed.library)) {
          localStorage.setItem('yuriorbit_library', JSON.stringify(parsed.library));
        }
        showFeedback('Backup restored successfully. Refresh to see updated library items.', 'success', 4500);
      } catch {
        showFeedback('Failed to parse backup file. Please ensure it is a valid YuriOrbit JSON export.', 'error', 4500);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearLocalSettingsState = () => {
    try {
      localStorage.removeItem('yuriorbit_reduced_motion');
      localStorage.removeItem('yuriorbit_reader_width');
      localStorage.removeItem('yuriorbit_reader_bg');
      localStorage.removeItem('yuriorbit_data_saver');
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {}
    setReducedMotion(false);
    setReaderWidth('normal');
    setReaderBg('dark');
    setDataSaver(false);
    handleThemeChange('velvet');
    resetMaturityPreference();
    setPendingLevel(null);
  };

  const handleResetSettings = () => {
    if (
      !confirm(
        'Reset all settings to defaults? This restores appearance, theme, reader, data saver, and content filter preferences. Your library data will not be affected.'
      )
    ) {
      return;
    }
    clearLocalSettingsState();
    showFeedback('Settings have been reset to defaults.');
  };

  const handleClearAllLocalData = () => {
    if (
      !confirm(
        'Clear all local data on this device? This removes your local library and resets all settings to defaults. If you are signed in, cloud-synced library data remains in your account.'
      )
    ) {
      return;
    }
    try {
      localStorage.removeItem('yuriorbit_library');
    } catch {}
    clearLibrary();
    clearLocalSettingsState();
    showFeedback('All local data has been cleared and settings reset to defaults.', 'success', 4500);
  };

  const handleDeleteAccount = async () => {
    if (!isAuthenticated || !supabase) {
      showFeedback('Sign in to delete your account.', 'error');
      return;
    }
    const typed = window.prompt(
      'This will permanently delete your account and cloud library data. This cannot be undone.\n\nType DELETE to confirm:'
    );
    if (typed !== 'DELETE') {
      if (typed !== null) showFeedback('Account deletion cancelled (confirmation did not match).', 'error');
      return;
    }

    setDeletingAccount(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showFeedback('Your session has expired. Sign in again to delete your account.', 'error');
        setDeletingAccount(false);
        return;
      }

      const res = await fetch('/api/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok || !body.ok) {
        showFeedback(body.error || `Could not delete account (HTTP ${res.status}).`, 'error', 6000);
        setDeletingAccount(false);
        return;
      }

      try {
        localStorage.removeItem('yuriorbit_library');
      } catch {}
      clearLibrary();
      clearLocalSettingsState();
      await logout().catch(() => {});
      navigate('/', { replace: true });
    } catch (err) {
      showFeedback(err instanceof Error ? err.message : 'Network error while deleting account.', 'error', 6000);
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <div className="mb-6 flex items-center gap-3">
        <SettingsIcon className="h-6 w-6 text-rose-400" />
        <h1 className="font-display text-3xl font-semibold text-ink-50">Settings</h1>
      </div>

      {feedback && (
        <div
          className={cn(
            'mb-6 flex items-center gap-2 rounded-xl border p-3.5 text-xs font-medium',
            feedbackTone === 'error'
              ? 'border-error-500/20 bg-error-500/10 text-error-300'
              : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
          )}
        >
          {feedbackTone === 'error' ? (
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-error-400" />
          ) : (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
          )}
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

          <div className="space-y-5">
            <div>
              <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-300">
                <Palette className="h-3.5 w-3.5 text-rose-400" /> Theme
              </label>
              <p className="mb-3 text-[11px] text-ink-500">GL-aligned color themes. Saved on this device.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {THEMES.map((t) => {
                  const selected = t.id === theme;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleThemeChange(t.id)}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-3 text-left transition-colors',
                        selected
                          ? 'border-rose-500/50 bg-rose-500/10'
                          : 'border-ink-800 bg-ink-900/60 hover:border-ink-700 hover:bg-ink-850'
                      )}
                      aria-pressed={selected}
                    >
                      <span className="mt-0.5 flex shrink-0 -space-x-1">
                        {t.swatches.map((c, i) => (
                          <span
                            key={i}
                            className="inline-block h-4 w-4 rounded-full ring-2 ring-ink-900"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-ink-100">
                          {t.name}
                          {selected && <CheckCircle2 className="h-3.5 w-3.5 text-rose-400" />}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-400">{t.description}</span>
                      </span>
                    </button>
                  );
                })}
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

        {/* Content filter */}
        <section className="card-surface p-5">
          <div className="mb-1 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <h2 className="text-lg font-semibold text-ink-50">Content filter</h2>
          </div>
          <p className="mb-4 text-xs text-ink-400">
            The highest rating you want to see anywhere on YuriOrbit — home, search, every format page.
            Anything above it is hidden, and explicit titles need a one-time 18+ confirmation.
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {MATURITY_LEVELS.map((option) => {
              const selected = option === maturityLevel;
              const locked = requiresAdultConfirmation(option) && !adultAcknowledged;
              return (
                <button
                  key={option}
                  onClick={() => {
                    if (locked) {
                      setPendingLevel(option);
                      return;
                    }
                    setLevel(option);
                  }}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition-colors',
                    selected
                      ? 'border-rose-500/50 bg-rose-500/10'
                      : 'border-ink-800 bg-ink-900/60 hover:border-ink-700 hover:bg-ink-850'
                  )}
                  aria-pressed={selected}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-ink-100">
                    {locked && <Lock className="h-3 w-3 text-ink-500" />}
                    {MATURITY_LABELS[option]}
                    {requiresAdultConfirmation(option) && (
                      <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">18+</span>
                    )}
                    {selected && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-rose-400" />}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-400">
                    {MATURITY_DESCRIPTIONS[option]}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-[11px] text-ink-500">
            Currently showing:{' '}
            <span className="text-ink-300">
              {MATURITY_LEVELS.slice(0, maturityRank(maturityLevel) + 1).join(', ').toLowerCase()}
            </span>
          </p>

          {pendingLevel && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
              <p className="text-sm font-medium text-ink-100">This unlocks 18+ content</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-300">
                Choosing {MATURITY_LABELS[pendingLevel]} shows sexually explicit titles from every provider, and can
                surface them in search and on the home page. Confirm you are 18 or older to continue.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="btn-primary text-xs"
                  onClick={() => {
                    acknowledge();
                    setLevel(pendingLevel);
                    setPendingLevel(null);
                  }}
                >
                  I am 18 or older
                </button>
                <button className="btn-secondary text-xs" onClick={() => setPendingLevel(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
            The filter is a browsing preference, not a verification of your age. Clear this site's storage to reset it.
          </p>
        </section>

        {/* Public profile — edited on /profile */}
        <section className="card-surface p-5">
          <div className="mb-1 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-rose-400" />
            <h2 className="text-lg font-semibold text-ink-50">Public profile</h2>
          </div>
          <p className="mb-4 text-xs text-ink-400">
            Username, display name, bio, avatar and visibility live on your profile page.
          </p>
          <Link to="/profile" className="btn-secondary text-xs">
            <Pencil className="h-3.5 w-3.5" /> Go to profile
          </Link>
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

        {/* Streaming availability */}
        <section className="card-surface p-5">
          <div className="mb-1 flex items-center gap-2">
            <Globe className="h-4 w-4 text-rose-400" />
            <h2 className="text-lg font-semibold text-ink-50">Streaming availability</h2>
          </div>
          <p className="mb-4 text-xs text-ink-400">
            Which country's streaming services appear under Where to Watch and on Discover and
            Search cards.
            {isAuthenticated
              ? ' Synced to your profile.'
              : ' Saved in this browser until you sign in.'}
          </p>

          <div className="max-w-md">
            <label
              className="mb-1.5 block text-xs font-medium text-ink-300"
              htmlFor="settings-watch-region"
            >
              Region
            </label>
            <select
              id="settings-watch-region"
              value={watchRegion ?? 'auto'}
              onChange={(e) => handleWatchRegionChange(e.target.value)}
              className="input-field text-xs"
            >
              <option value="auto">Detect automatically ({regionName(tmdbPreferredRegion())})</option>
              {(watchRegion && !REGION_OPTIONS.some((option) => option.code === watchRegion)
                ? [{ code: watchRegion, name: regionName(watchRegion) }, ...REGION_OPTIONS]
                : REGION_OPTIONS
              ).map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] text-ink-500">
              Availability comes from TMDB's watch-provider data. Choosing a region turns off the
              US fallback, so an empty list means nothing is streaming there.
            </p>
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
                  showFeedback('Local library data has been cleared.');
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

        {/* Danger Zone */}
        <section className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.03] p-5">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <h2 className="text-lg font-semibold text-ink-50">Danger zone</h2>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-ink-400">
            Irreversible actions for data on this device and, when signed in, your account. Export a backup first if you might need it later.
          </p>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 rounded-xl border border-ink-800/80 bg-ink-950/30 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-100">Reset settings to defaults</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  Restores appearance, theme, reader preferences, data saver, and content filter. Does not touch your library.
                </p>
              </div>
              <button
                onClick={handleResetSettings}
                className="btn-secondary shrink-0 text-xs border-rose-500/30 text-rose-300 hover:border-rose-500/50 hover:text-rose-200 flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset settings
              </button>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-ink-800/80 bg-ink-950/30 p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-100">Clear local library</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  Removes saved titles and reading progress stored in this browser. Cloud-synced data (if signed in) is not deleted.
                </p>
              </div>
              <button
                onClick={() => {
                  if (confirm('Clear all local library data? This will reset your saved bookmarks and reading progress.')) {
                    clearLibrary();
                    showFeedback('Local library data has been cleared.');
                  }
                }}
                className="btn-secondary shrink-0 text-xs text-error-400 hover:text-error-300 border-rose-500/30 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear library
              </button>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-100">Clear all local data</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  Removes local library and resets all settings on this device. Export a backup first if needed.
                </p>
              </div>
              <button
                onClick={handleClearAllLocalData}
                className="btn-secondary shrink-0 text-xs border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all local data
              </button>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-error-500/30 bg-error-500/[0.06] p-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-100">Delete account</p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {isAuthenticated
                    ? 'Permanently deletes your account and cloud library data. You will be signed out. This cannot be undone.'
                    : 'Sign in to permanently delete your account and associated cloud data.'}
                </p>
              </div>
              {isAuthenticated ? (
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  className="btn-secondary shrink-0 text-xs border-error-500/50 bg-error-500/10 text-error-200 hover:bg-error-500/20 disabled:opacity-60 flex items-center gap-1.5"
                >
                  {deletingAccount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                  {deletingAccount ? 'Deleting…' : 'Delete account'}
                </button>
              ) : (
                <Link to="/auth?next=/settings" className="btn-secondary shrink-0 text-xs flex items-center gap-1.5">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
