import { useEffect, useState } from 'react';
import {
  Activity,
  BookOpen,
  Compass,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth/AuthContext';
import { adminApi } from '@/lib/admin/api';
import { cn } from '@/lib/utils/format';
import { OverviewTab } from '@/components/admin/OverviewTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { LibraryTab } from '@/components/admin/LibraryTab';
import { FeaturedTab } from '@/components/admin/FeaturedTab';
import { SiteSettingsTab } from '@/components/admin/SiteSettingsTab';
import { AuditTab } from '@/components/admin/AuditTab';

type TabKey = 'overview' | 'users' | 'library' | 'featured' | 'settings' | 'audit';

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'library', label: 'Library entries', icon: ListChecks },
  { key: 'featured', label: "Editor's Picks", icon: Sparkles },
  { key: 'settings', label: 'Site settings', icon: Megaphone },
  { key: 'audit', label: 'Audit log', icon: Activity },
];

export function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const [checking, setChecking] = useState(true);
  const [authorised, setAuthorised] = useState(false);
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [problem, setProblem] = useState<{ message: string; status: number; needsSetup: boolean } | null>(null);
  const [tab, setTab] = useState<TabKey>('overview');

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setChecking(false);
      setAuthorised(false);
      setProblem(null);
      return;
    }

    let cancelled = false;
    setChecking(true);

    adminApi.me().then((result) => {
      if (cancelled) return;
      if (result.ok && result.data) {
        setAuthorised(true);
        setAllowlist(result.data.allowlist);
        setProblem(null);
      } else {
        setAuthorised(false);
        setProblem({
          message: result.error || 'Admin access denied.',
          status: result.status,
          needsSetup: Boolean(result.needsSetup),
        });
      }
      setChecking(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isLoading]);

  if (isLoading || checking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <div className="card-surface p-8 text-center text-sm text-ink-300">Checking admin access…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="card-surface p-8">
          <div className="mb-6 flex gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-ink-800 text-warning-400">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink-50">Authentication required</h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-400">
                Sign in with an authorised administrator account to open the console.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/auth" className="btn-primary flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Sign in
            </Link>
            <Link to="/" className="btn-secondary">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!authorised) {
    const isSetupProblem = problem?.needsSetup || problem?.status === 501;

    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="card-surface p-8">
          <div className="mb-6 flex gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-ink-50">
                {isSetupProblem ? 'Admin console not configured' : 'Admin access restricted'}
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-300">
                {problem?.message || 'This account does not have administrator privileges.'}
              </p>
              {!isSetupProblem && user?.email && (
                <p className="mt-2 text-xs text-ink-400">
                  Signed in as <span className="font-semibold text-rose-300">{user.email}</span>
                </p>
              )}
            </div>
          </div>

          {isSetupProblem ? (
            <div className="mb-6 space-y-2 rounded-lg border border-ink-800 bg-ink-850 p-4 text-xs text-ink-400">
              <p className="font-medium text-ink-200">Add these to your Cloudflare Pages project:</p>
              <ul className="ml-4 list-disc space-y-1">
                <li>
                  <code className="rounded bg-ink-900 px-1.5 py-0.5 text-ink-200">SUPABASE_URL</code> — your
                  project URL
                </li>
                <li>
                  <code className="rounded bg-ink-900 px-1.5 py-0.5 text-ink-200">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
                  — the secret key, server-side only
                </li>
                <li>
                  <code className="rounded bg-ink-900 px-1.5 py-0.5 text-ink-200">ADMIN_EMAILS</code> —
                  comma-separated admin emails (optional)
                </li>
              </ul>
              <p className="pt-1">
                Never expose the service role key with a <code>VITE_</code> prefix; it must stay server-side.
              </p>
            </div>
          ) : (
            <div className="mb-6 rounded-lg border border-ink-800 bg-ink-850 p-4 text-xs text-ink-400">
              <p className="font-medium text-ink-200">Authorised admin accounts:</p>
              <p className="mt-1 break-words text-rose-300">
                {allowlist.length > 0 ? allowlist.join(', ') : 'none configured'}
              </p>
              <p className="mt-2">
                Add your email to the <code className="rounded bg-ink-900 px-1.5 py-0.5 text-ink-200">ADMIN_EMAILS</code>{' '}
                variable in Cloudflare, then redeploy.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="btn-primary">
              Return to homepage
            </Link>
            <Link to="/library" className="btn-secondary">
              <BookOpen className="h-4 w-4" /> My library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-lavender-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-50">Admin console</h1>
            <p className="text-xs text-ink-400">
              Signed in as <span className="text-rose-300">{user?.email}</span>
            </p>
          </div>
        </div>
        <Link to="/" className="btn-ghost text-xs">
          <Compass className="h-3.5 w-3.5" /> View site
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-ink-800 pb-3">
        {TABS.map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-rose-500/15 text-rose-300'
                  : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
        <span className="ml-auto hidden items-center gap-1.5 text-[11px] text-ink-500 sm:flex">
          <Star className="h-3 w-3" /> Changes are recorded in the audit log
        </span>
      </div>

      {tab === 'overview' && <OverviewTab onNavigate={setTab} />}
      {tab === 'users' && <UsersTab />}
      {tab === 'library' && <LibraryTab />}
      {tab === 'featured' && <FeaturedTab />}
      {tab === 'settings' && <SiteSettingsTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}
