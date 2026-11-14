import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
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
  BookMarked,
  LogOut,
} from 'lucide-react';
import { useLibrary } from '@/hooks/useLibrary';
import { useMaturity } from '@/hooks/useMaturity';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchMyProfile, saveChapterUpdatePrefs, saveWatchRegion } from '@/lib/profiles';
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
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  Dialog,
  SettingRow,
  SettingsSection,
  Switch,
  Tabs,
  buttonClasses,
  tabPanelProps,
} from '@/components/ui';
import { useChapterUpdatePrefs, type ChapterUpdatePrefs } from '@/lib/content/chapter-update-prefs';
import { clearChapterProgressCache } from '@/lib/content/chapter-updates';

const SETTINGS_TABS = [
  { id: 'appearance', label: 'Appearance', icon: Sliders },
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'library', label: 'Library', icon: BookMarked },
  { id: 'content', label: 'Content', icon: ShieldAlert },
  { id: 'account', label: 'Account', icon: UserRound },
];

type ConfirmAction = 'reset' | 'clear-library' | 'clear-all' | 'delete-account';

const CONFIRM_COPY: Record<
  ConfirmAction,
  { title: string; description: string; confirmLabel: string; danger: boolean }
> = {
  reset: {
    title: 'Reset settings to defaults?',
    description:
      'Restores appearance, theme, reader preferences, data saver and the content filter. Your library is not affected.',
    confirmLabel: 'Reset settings',
    danger: false,
  },
  'clear-library': {
    title: 'Clear this device’s library?',
    description:
      'Removes saved titles and reading progress stored in this browser. Cloud-synced data is not deleted.',
    confirmLabel: 'Clear library',
    danger: true,
  },
  'clear-all': {
    title: 'Clear all local data?',
    description:
      'Removes the local library and resets every setting on this device. Cloud-synced library data stays in your account.',
    confirmLabel: 'Clear all local data',
    danger: true,
  },
  'delete-account': {
    title: 'Delete your account?',
    description:
      'Permanently deletes your account and cloud library data, then signs you out. This cannot be undone.',
    confirmLabel: 'Delete account',
    danger: true,
  },
};

/** Device-local vs account-synced marker for sections that also write to a profile. */
function ScopeBadge({ synced }: { synced: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-micro font-semibold',
        synced ? 'bg-lavender-500/15 text-lavender-300' : 'bg-ink-700/60 text-ink-300'
      )}
    >
      {synced ? 'Synced to your account' : 'This device'}
    </span>
  );
}

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
  const [signingOut, setSigningOut] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [chapterPrefs, updateChapterPrefs] = useChapterUpdatePrefs();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = SETTINGS_TABS.some((item) => item.id === tabParam) ? (tabParam as string) : 'appearance';
  const handleTabChange = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: true });
  };

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
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = (msg: string, tone: 'success' | 'error' = 'success', ms = 3500) => {
    setFeedbackTone(tone);
    setFeedback(msg);
    // One timer at a time: a newer message must not be cleared by an older one.
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimer.current = null;
    }, ms);
  };

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    []
  );

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

  const handleChapterPrefsChange = (patch: Partial<ChapterUpdatePrefs>) => {
    updateChapterPrefs(patch);

    if (!isAuthenticated || !user?.id) return;
    saveChapterUpdatePrefs(user.id, { ...chapterPrefs, ...patch }).then((result) => {
      if (result.error) showFeedback(result.error, 'error');
    });
  };

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
      version: 2,
      exportedAt: new Date().toISOString(),
      library,
      preferences: {
        reducedMotion,
        readerWidth,
        readerBg,
        dataSaver,
        theme,
        maturityLevel,
        adultAcknowledged,
        chapterPrefs,
        watchRegion,
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
    showFeedback('Library and preferences exported to a JSON backup.');
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
          if (parsed.preferences.watchRegion !== undefined) {
            const nextRegion =
              typeof parsed.preferences.watchRegion === 'string' ? parsed.preferences.watchRegion : null;
            handleWatchRegionChange(nextRegion ?? 'auto');
          }
          const importedChapterPrefs = parsed.preferences.chapterPrefs;
          if (importedChapterPrefs && typeof importedChapterPrefs === 'object') {
            const patch: Partial<ChapterUpdatePrefs> = {};
            if (typeof importedChapterPrefs.showBadges === 'boolean') {
              patch.showBadges = importedChapterPrefs.showBadges;
            }
            if (typeof importedChapterPrefs.onlyReading === 'boolean') {
              patch.onlyReading = importedChapterPrefs.onlyReading;
            }
            if (Object.keys(patch).length > 0) handleChapterPrefsChange(patch);
          }
          const importedLevel = parsed.preferences.maturityLevel;
          if (typeof importedLevel === 'string' && (MATURITY_LEVELS as readonly string[]).includes(importedLevel)) {
            const level = importedLevel as MaturityLevel;
            const needsAck = requiresAdultConfirmation(level) && !adultAcknowledged;
            if (!needsAck || parsed.preferences.adultAcknowledged === true) {
              if (needsAck) acknowledge();
              setLevel(level);
            }
          }
        }
        if (Array.isArray(parsed.library)) {
          localStorage.setItem('yuriorbit_library', JSON.stringify(parsed.library));
        }
        showFeedback('Backup restored. Library and preferences updated — refresh to see library changes.', 'success', 4500);
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
    clearLocalSettingsState();
    showFeedback('Settings have been reset to defaults.');
  };

  const handleClearLocalLibrary = () => {
    clearLibrary();
    showFeedback('Local library data has been cleared.');
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await logout().catch(() => {});
    setSigningOut(false);
    showFeedback('Signed out. Your settings stay saved on this device.');
  };

  const handleClearAllLocalData = () => {
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

  const closeConfirm = () => {
    setConfirmAction(null);
    setDeleteConfirmText('');
  };

  const runConfirmedAction = () => {
    const action = confirmAction;
    closeConfirm();
    if (action === 'reset') handleResetSettings();
    else if (action === 'clear-library') handleClearLocalLibrary();
    else if (action === 'clear-all') handleClearAllLocalData();
    else if (action === 'delete-account') void handleDeleteAccount();
  };

  const confirmCopy = confirmAction ? CONFIRM_COPY[confirmAction] : null;
  const confirmBlocked =
    confirmAction === 'delete-account' &&
    (deletingAccount || deleteConfirmText.trim() !== 'DELETE');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 lg:max-w-5xl">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Appearance, reading, library, content and account. Most preferences stay on this device; your watch region and chapter updates sync when you're signed in."
        className="mb-6"
      />

      {feedback && (
        <div
          role={feedbackTone === 'error' ? 'alert' : 'status'}
          aria-live={feedbackTone === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
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

      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start lg:gap-8">
        <Tabs
          items={SETTINGS_TABS}
          value={tab}
          onChange={handleTabChange}
          label="Settings sections"
          className="mb-6 lg:hidden"
        />

        <nav aria-label="Settings sections" className="hidden lg:sticky lg:top-24 lg:block">
          <ul className="space-y-0.5">
            {SETTINGS_TABS.map((item) => {
              const Icon = item.icon;
              const selected = item.id === tab;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleTabChange(item.id)}
                    aria-current={selected ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      selected
                        ? 'bg-rose-500/15 text-rose-200'
                        : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">

      {tab === 'appearance' && (
        <div {...tabPanelProps('appearance')} className="space-y-6">
          <SettingsSection
            icon={Sliders}
            title="Appearance & Motion"
            description="Personalize display style and interface animations."
          >
            <div className="space-y-5">
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-300">
                  <Palette className="h-3.5 w-3.5 text-rose-400" /> Theme
                </label>
                <p className="mb-3 text-micro text-ink-400">GL-aligned color themes. Saved on this device.</p>
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
                            ? 'border-rose-500/50 bg-rose-500/10 ring-1 ring-rose-500/40'
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
                          <span className="mt-0.5 block text-micro leading-relaxed text-ink-400">{t.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-ink-800/60">
                <Switch
                  checked={reducedMotion}
                  onChange={setReducedMotion}
                  label="Reduce animations and transitions"
                  description="Minimizes smooth scrolling and carousel movement."
                />
              </div>
            </div>
          </SettingsSection>
        </div>
      )}

      {tab === 'reading' && (
        <div {...tabPanelProps('reading')} className="space-y-6">
          <SettingsSection
            icon={BookOpen}
            title="Reader Preferences"
            description="Default settings for the MangaDex chapter reader. Saved on this device."
          >
            <div className="divide-y divide-ink-800/60">
              <SettingRow
                label="Default Reading Width"
                description="How wide chapter pages render by default."
                htmlFor="settings-reader-width"
                control={
                  <select
                    id="settings-reader-width"
                    value={readerWidth}
                    onChange={(e) => setReaderWidth(e.target.value as 'narrow' | 'normal' | 'wide' | 'full')}
                    className="input-field w-full text-xs sm:w-60"
                  >
                    <option value="narrow">Narrow (Phone width)</option>
                    <option value="normal">Normal (Tablet / standard)</option>
                    <option value="wide">Wide (Desktop)</option>
                    <option value="full">Full (Window width)</option>
                  </select>
                }
              />
              <SettingRow
                label="Reader Background"
                description="Canvas colour behind chapter pages."
                htmlFor="settings-reader-bg"
                control={
                  <select
                    id="settings-reader-bg"
                    value={readerBg}
                    onChange={(e) => setReaderBg(e.target.value as 'dark' | 'sepia' | 'light')}
                    className="input-field w-full text-xs sm:w-60"
                  >
                    <option value="dark">Dark Canvas (OLED black)</option>
                    <option value="sepia">Warm Sepia</option>
                    <option value="light">Paper Light</option>
                  </select>
                }
              />
              <Switch
                checked={dataSaver}
                onChange={setDataSaver}
                label="Data Saver Mode"
                description="Request compressed chapter images from MangaDex for faster loading."
              />
            </div>
          </SettingsSection>

          <SettingsSection
            icon={Globe}
            title="Streaming availability"
            badge={<ScopeBadge synced={isAuthenticated} />}
            description="Which country's streaming services appear under Where to Watch and on Discover and Search cards."
          >
            <SettingRow
              label="Region"
              description="Availability comes from TMDB's watch-provider data. Choosing a region turns off the US fallback, so an empty list means nothing is streaming there."
              htmlFor="settings-watch-region"
              control={
                <select
                  id="settings-watch-region"
                  value={watchRegion ?? 'auto'}
                  onChange={(e) => handleWatchRegionChange(e.target.value)}
                  className="input-field w-full text-xs sm:w-64"
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
              }
            />
          </SettingsSection>
        </div>
      )}

      {tab === 'library' && (
        <div {...tabPanelProps('library')} className="space-y-6">
          <SettingsSection
            icon={Info}
            title="Library storage"
            badge={<ScopeBadge synced={isAuthenticated} />}
            description={
              isAuthenticated
                ? 'Saved titles, reading progress, ratings and notes sync across your devices. Export a backup before making destructive changes.'
                : 'Without an account, saved titles and reading progress stay in this browser only. Sign in to sync them across devices, or export a backup.'
            }
          />

          <SettingsSection
            icon={BookMarked}
            title="Chapter updates"
            badge={<ScopeBadge synced={isAuthenticated} />}
            description="What the library’s “New chapters” badge tracks. Only manga, manhwa, manhua and webtoons have numbered releases to compare against."
            footer={
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    clearChapterProgressCache();
                    showFeedback('Chapter data will be refreshed on your next library visit.');
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Refresh chapter data
                </Button>
                {chapterPrefs.showBadges && (
                  <Link to="/library?filter=UPDATES" className={buttonClasses('ghost', 'sm')}>
                    <BookMarked className="h-3.5 w-3.5" /> Open new chapters
                  </Link>
                )}
              </>
            }
          >
            <div className="divide-y divide-ink-800/60">
              <Switch
                checked={chapterPrefs.showBadges}
                onChange={(showBadges) => handleChapterPrefsChange({ showBadges })}
                label="Show new-chapter badges"
                description="Adds the “N new chapters” chip to library cards and the New chapters filter."
              />
              <Switch
                checked={chapterPrefs.onlyReading}
                onChange={(onlyReading) => handleChapterPrefsChange({ onlyReading })}
                label="Only flag what I’m reading"
                description="Skips Completed, Planned, On Hold and Dropped titles when checking for new releases."
              />
            </div>
          </SettingsSection>

          <SettingsSection
            icon={Download}
            title="Data Management & Backup"
            description="Export your library and preferences as a JSON file, or restore one. Restoring replaces the library stored in this browser."
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".json,application/json"
              className="hidden"
            />

            <div className="flex flex-wrap gap-2.5">
              <Button variant="secondary" size="sm" onClick={handleExport} className="flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export data backup
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" /> Import data backup
              </Button>
            </div>

            <p className="mt-3 text-micro leading-relaxed text-ink-400">
              Removing this device&rsquo;s saved titles is in{' '}
              <Link to="/settings?tab=account" className="text-rose-300 underline-offset-2 hover:underline">
                Account &rarr; Danger zone
              </Link>
              .
            </p>

            <p className="mt-4 border-t border-ink-800/60 pt-3 text-xs text-ink-400">
              Library items: <strong className="text-ink-200">{library.length}</strong>
            </p>
          </SettingsSection>
        </div>
      )}

      {tab === 'content' && (
        <div {...tabPanelProps('content')} className="space-y-6">
          <SettingsSection
            icon={ShieldAlert}
            title="Content filter"
            description="The highest rating you want to see anywhere on YuriOrbit — home, search, every format page. Anything above it is hidden, and explicit titles need a one-time 18+ confirmation."
          >
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
                      {locked && <Lock className="h-3 w-3 text-ink-400" />}
                      {MATURITY_LABELS[option]}
                      {requiresAdultConfirmation(option) && (
                        <span className="rounded bg-rose-500/15 px-1.5 py-0.5 text-micro font-semibold text-rose-300">18+</span>
                      )}
                      {selected && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-rose-400" />}
                    </span>
                    <span className="mt-0.5 block text-micro leading-relaxed text-ink-400">
                      {MATURITY_DESCRIPTIONS[option]}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-micro text-ink-400">
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
                  <Button variant="primary" size="sm" onClick={() => { acknowledge(); setLevel(pendingLevel); setPendingLevel(null); }}>
                    I am 18 or older
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setPendingLevel(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <p className="mt-3 text-micro leading-relaxed text-ink-400">
              The filter is a browsing preference, not a verification of your age. Clear this site's storage to reset it.
            </p>
          </SettingsSection>
        </div>
      )}

      {tab === 'account' && (
        <div {...tabPanelProps('account')} className="space-y-6">
          {/* Identity */}
          <SettingsSection
            icon={UserRound}
            title="Account"
            description="Your session on this device. Profile details live on your public profile page."
          >
            {isAuthenticated ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover ring-1 ring-ink-700"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-sm font-semibold uppercase text-rose-200"
                    >
                      {(user?.email || '?').slice(0, 2)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-100">{user?.email || 'Signed in'}</p>
                    <p className="text-xs text-ink-400">
                      Library, watch region and chapter updates sync to this account.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/profile" className={buttonClasses('secondary', 'sm', 'flex items-center gap-1.5')}>
                    <Pencil className="h-3.5 w-3.5" /> Edit public profile
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex items-center gap-1.5"
                  >
                    {signingOut ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LogOut className="h-3.5 w-3.5" />
                    )}
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-xs leading-relaxed text-ink-400">
                  You&rsquo;re browsing as a guest, so your library and preferences stay in this browser.
                  Sign in to sync them across devices and to edit a public profile.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/auth?next=${encodeURIComponent('/settings?tab=account')}`}
                    className={buttonClasses('primary', 'sm')}
                  >
                    Sign in to sync
                  </Link>
                </div>
              </>
            )}
          </SettingsSection>

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
                <Button variant="secondary" size="sm" onClick={() => setConfirmAction('reset')} className="shrink-0 border-rose-500/30 text-rose-300 hover:border-rose-500/50 hover:text-rose-200 flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset settings
                </Button>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-ink-800/80 bg-ink-950/30 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-100">Clear local library</p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    Removes saved titles and reading progress stored in this browser. Cloud-synced data (if signed in) is not deleted.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setConfirmAction('clear-library')} className="shrink-0 text-error-400 hover:text-error-300 border-rose-500/30 flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Clear library
                </Button>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-100">Clear all local data</p>
                  <p className="mt-0.5 text-xs text-ink-400">
                    Removes local library and resets all settings on this device. Export a backup first if needed.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setConfirmAction('clear-all')} className="shrink-0 border-rose-500/40 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15 flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Clear all local data
                </Button>
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
                  <Button variant="secondary" size="sm" onClick={() => setConfirmAction('delete-account')} disabled={deletingAccount} className="shrink-0 border-error-500/50 bg-error-500/10 text-error-200 hover:bg-error-500/20 disabled:opacity-60 flex items-center gap-1.5">
                    {deletingAccount ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                    {deletingAccount ? 'Deleting…' : 'Delete account'}
                  </Button>
                ) : (
                  <Link to={`/auth?next=${encodeURIComponent('/settings?tab=account')}`} className={buttonClasses('secondary', 'sm', 'shrink-0 flex items-center gap-1.5')}>
                    Sign in
                  </Link>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

        </div>
      </div>

      {confirmCopy && (
        <Dialog
          open
          onClose={closeConfirm}
          title={confirmCopy.title}
          description={confirmCopy.description}
          tone={confirmCopy.danger ? 'danger' : 'default'}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={closeConfirm}>
                Cancel
              </Button>
              <Button
                variant={confirmCopy.danger ? 'danger' : 'primary'}
                size="sm"
                onClick={runConfirmedAction}
                disabled={confirmBlocked}
              >
                {confirmCopy.confirmLabel}
              </Button>
            </>
          }
        >
          {confirmAction === 'delete-account' && (
            <div>
              <label
                htmlFor="delete-account-confirm"
                className="block text-xs font-medium text-ink-300"
              >
                Type DELETE to confirm
              </label>
              <input
                id="delete-account-confirm"
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="input-field mt-1.5 w-full text-sm"
              />
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
