import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, LogIn, UserPlus, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { migrateLocalToCloud, hasLocalLibraryData, hasMigratedLocal } from '@/hooks/useLibrary';

export function AuthPage() {
  const { login, register, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isSignUp = location.pathname === '/auth' && new URLSearchParams(location.search).get('mode') === 'signup';
  const [mode, setMode] = useState<'signin' | 'signup'>(isSignUp ? 'signup' : 'signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Migration prompt state
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      if (hasLocalLibraryData() && !hasMigratedLocal()) {
        setShowMigrationPrompt(true);
      } else {
        navigate('/library', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    const result = mode === 'signin'
      ? await login(email.trim(), password)
      : await register(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === 'signup') {
      setSuccess('Account created! You can now sign in.');
      setMode('signin');
      setPassword('');
    }
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrationResult(null);
    const result = await migrateLocalToCloud();
    setMigrating(false);
    if (result.error) {
      setMigrationResult(`Import failed: ${result.error}`);
    } else {
      setMigrationResult(`Imported ${result.imported} title${result.imported !== 1 ? 's' : ''} into your account.`);
      setShowMigrationPrompt(false);
      setTimeout(() => navigate('/library', { replace: true }), 1500);
    }
  };

  const handleSkipMigration = () => {
    setShowMigrationPrompt(false);
    navigate('/library', { replace: true });
  };

  if (showMigrationPrompt) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="card-surface p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
              <CheckCircle2 className="h-5 w-5 text-rose-400" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink-50">Welcome back!</h1>
          </div>
          <p className="mb-6 text-sm text-ink-300 leading-relaxed">
            We found titles saved in your browser from before you signed in. Would you like to import them into your account so they're synced across devices?
          </p>

          {migrationResult && (
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              {migrationResult}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="btn-primary text-sm flex items-center justify-center gap-2"
            >
              {migrating ? 'Importing...' : 'Import my titles'}
            </button>
            <button
              onClick={handleSkipMigration}
              disabled={migrating}
              className="btn-ghost text-sm"
            >
              Start with an empty library
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-12">
      <div className="card-surface p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-lavender-600">
            {mode === 'signin' ? <LogIn className="h-5 w-5 text-white" /> : <UserPlus className="h-5 w-5 text-white" />}
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-50">
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </h1>
            <p className="text-xs text-ink-400">
              {mode === 'signin' ? 'Access your synced library' : 'Start building your GL library'}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-error-500/20 bg-error-500/10 p-3 text-xs text-error-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="input-field pl-9 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">Password</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
                className="input-field pl-9 text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="btn-primary w-full text-sm flex items-center justify-center gap-2"
          >
            {submitting ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-5 border-t border-ink-800 pt-4 text-center">
          <p className="text-xs text-ink-400">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setSuccess(null); }}
              className="font-medium text-rose-400 hover:text-rose-300 transition-colors"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-ink-400 hover:text-ink-200 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
