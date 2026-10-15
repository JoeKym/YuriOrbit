import { Link } from 'react-router-dom';
import { Shield, Lock, ExternalLink, UserCheck, KeyRound, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useIsAdmin } from '@/lib/auth/admin';

export function AdminPage() {
  const { user, isAuthenticated, isLoading, login, logout } = useKindeAuth();
  const { isAdmin, isCheckingAdmin } = useIsAdmin();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-lavender-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-50">Administration & Management</h1>
          <p className="text-sm text-ink-400">Powered by Kinde Auth & Access Control</p>
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
                Sign in with your Kinde account to access administration, role-based controls, and user management for YuriOrbit.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => login()}
              className="btn-primary flex items-center gap-2"
            >
              <KeyRound className="h-4 w-4" />
              <span>Sign in with Kinde</span>
            </button>
            <Link to="/" className="btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      ) : !isAdmin ? (
        /* Regular Authenticated User - Not an Admin */
        <div className="card-surface p-8">
          <div className="flex gap-4 mb-6">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink-50">Admin Access Restricted</h2>
              <p className="mt-1 text-sm text-ink-300 leading-relaxed">
                You are currently signed in as <span className="font-semibold text-rose-300">{user?.email}</span>, but this account does not have administrator privileges.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-ink-800 bg-ink-850 p-4 mb-6 text-xs text-ink-400 space-y-2">
            <p className="font-medium text-ink-200">How to authorize an Administrator:</p>
            <ol className="list-decimal ml-4 space-y-1">
              <li>Open your Kinde Admin Console at <a href="https://yuriverse.kinde.com/admin" target="_blank" rel="noopener noreferrer" className="text-rose-400 underline">yuriverse.kinde.com/admin</a>.</li>
              <li>Go to <strong>Users</strong> &rarr; find your user account &rarr; assign the <strong>admin</strong> role or permission.</li>
              <li>Alternatively, set <code className="bg-ink-900 px-1.5 py-0.5 rounded text-ink-200">VITE_ADMIN_EMAILS={user?.email}</code> in your environment variables.</li>
            </ol>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/" className="btn-primary">
              Return to Homepage
            </Link>
            <button
              onClick={() => logout()}
              className="btn-secondary"
            >
              Sign out
            </button>
          </div>
        </div>
      ) : (
        /* Verified Administrator View */
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
                </div>
              </div>

              <button
                onClick={() => logout()}
                className="btn-secondary text-xs"
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Management Console Link */}
          <div className="card-surface p-6">
            <h3 className="text-base font-semibold text-ink-50 mb-2">Website Management Console</h3>
            <p className="text-sm text-ink-400 mb-4 leading-relaxed">
              You can manage all registered users, define roles (Admin, Moderator, Curators), inspect login activity, and manage SSO settings directly in your Kinde organization dashboard:
            </p>

            <a
              href="https://yuriorbit.kinde.com/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-ink-800 px-4 py-2.5 text-sm font-semibold text-ink-50 hover:bg-ink-750 border border-ink-700 transition-colors"
            >
              <span>Open Kinde Admin Dashboard</span>
              <ExternalLink className="h-4 w-4 text-ink-400" />
            </a>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-ink-300">
              <div className="rounded-lg border border-ink-800 bg-ink-850 p-3.5 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-ink-100 block mb-0.5">User Directory</span>
                  Search, ban, or invite team members and readers.
                </div>
              </div>
              <div className="rounded-lg border border-ink-800 bg-ink-850 p-3.5 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-ink-100 block mb-0.5">Roles & Permissions</span>
                  Assign 'admin' or custom roles to grant exclusive features.
                </div>
              </div>
              <div className="rounded-lg border border-ink-800 bg-ink-850 p-3.5 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-ink-100 block mb-0.5">Social Connections</span>
                  Enable Google, Discord, Apple, or GitHub login with 1 click.
                </div>
              </div>
              <div className="rounded-lg border border-ink-800 bg-ink-850 p-3.5 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-ink-100 block mb-0.5">Free 7,500 MAU</span>
                  Generous free tier with no unexpected paywalls.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
