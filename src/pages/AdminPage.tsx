import { Link } from 'react-router-dom';
import { Shield, Lock, UserCheck, ShieldAlert, KeyRound, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useIsAdmin } from '@/lib/auth/admin';

export function AdminPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { isAdmin, isCheckingAdmin, adminReason } = useIsAdmin();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-lavender-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-50">Administration & Management</h1>
          <p className="text-sm text-ink-400">Access Control & Site Management</p>
        </div>
      </div>

      {(isLoading || (isAuthenticated && isCheckingAdmin)) ? (
        <div className="card-surface p-8 text-center text-ink-300">
          Loading authentication status...
        </div>
      ) : !isAuthenticated ? (
        <div className="card-surface p-8">
          <div className="flex gap-4 mb-6">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-ink-800 text-warning-400">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink-50">Authentication Required</h2>
              <p className="mt-1 text-sm text-ink-400 leading-relaxed">
                Sign in to your YuriOrbit account to access the administration console.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/auth" className="btn-primary flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              <span>Sign in</span>
            </Link>
            <Link to="/" className="btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      ) : !isAdmin ? (
        <div className="card-surface p-8">
          <div className="flex gap-4 mb-6">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink-50">Admin Access Restricted</h2>
              <p className="mt-1 text-sm text-ink-300 leading-relaxed">
                You are signed in as <span className="font-semibold text-rose-300">{user?.email}</span>, but this account does not have administrator privileges.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-ink-800 bg-ink-850 p-4 mb-6 text-xs text-ink-400 space-y-2">
            <p className="font-medium text-ink-200">How to authorize an Administrator:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Set <code className="bg-ink-900 px-1.5 py-0.5 rounded text-ink-200">VITE_ADMIN_EMAILS={user?.email}</code> in your environment variables.</li>
              <li>Redeploy the application for the change to take effect.</li>
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="btn-primary">
              Return to Homepage
            </Link>
            <button onClick={() => logout()} className="btn-secondary">
              Sign out
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Profile Card */}
          <div className="card-surface p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.givenName || 'Admin'}
                    className="h-12 w-12 rounded-full object-cover border border-rose-500/30"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-lavender-500 text-lg font-bold text-white">
                    {(user?.givenName?.[0] || user?.email?.[0] || 'A').toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-ink-50">
                      {user?.givenName ? `${user.givenName} ${user?.familyName || ''}`.trim() : user?.email}
                    </h2>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                      <UserCheck className="h-3 w-3" />
                      Administrator
                    </span>
                  </div>
                  <p className="text-xs text-ink-400">{user?.email}</p>
                  {adminReason && (
                    <p className="text-[11px] text-ink-400 mt-0.5">Authorization: <span className="text-rose-300">{adminReason}</span></p>
                  )}
                </div>
              </div>

              <button onClick={() => logout()} className="btn-secondary text-xs">
                Sign out
              </button>
            </div>
          </div>

          {/* Management Console */}
          <div className="card-surface p-6">
            <h3 className="text-base font-semibold text-ink-50 mb-2">Website Management</h3>
            <p className="text-sm text-ink-400 mb-4 leading-relaxed">
              As an administrator, you have access to the full management console. User accounts, authentication, and library data are managed through Supabase.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-ink-300">
              <div className="rounded-lg border border-ink-800 bg-ink-850 p-3.5 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-ink-100 block mb-0.5">User Accounts</span>
                  Managed through Supabase Auth — email/password sign-in with session management.
                </div>
              </div>
              <div className="rounded-lg border border-ink-800 bg-ink-850 p-3.5 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-ink-100 block mb-0.5">Synced Libraries</span>
                  Each user's library is stored in the database, protected by row-level security.
                </div>
              </div>
              <div className="rounded-lg border border-ink-800 bg-ink-850 p-3.5 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-ink-100 block mb-0.5">Admin Access</span>
                  Controlled by an allowlist of authorized emails in the environment configuration.
                </div>
              </div>
              <div className="rounded-lg border border-ink-800 bg-ink-850 p-3.5 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-ink-100 block mb-0.5">Data Security</span>
                  Row-level security ensures users can only access their own library entries.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
