import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  Heart,
  KeyRound,
  Loader2,
  Lock,
  LogIn,
  Mail,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { migrateLocalToCloud, hasLocalLibraryData, hasMigratedLocal } from '@/hooks/useLibrary';
import { normalizeUsername, saveMyProfile, validateUsername } from '@/lib/profiles';
import { cn } from '@/lib/utils/format';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset';

const MODE_COPY: Record<Mode, { title: string; subtitle: string }> = {
  signin: { title: 'Welcome back', subtitle: 'Sign in to sync your library across devices' },
  signup: { title: 'Create your account', subtitle: 'Claim a username and start your GL library' },
  forgot: { title: 'Reset your password', subtitle: "We'll email you a secure reset link" },
  reset: { title: 'Choose a new password', subtitle: 'Pick something you have not used before' },
};

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon: typeof Mail;
  autoComplete?: string;
  hint?: string;
  minLength?: number;
}

function Field({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoComplete,
  hint,
  minLength,
}: FieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-ink-300">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          id={id}
          type={isPassword && visible ? 'text' : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          minLength={minLength}
          className="input-field pl-9 pr-10 text-sm"
          required
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((prev) => !prev)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-200"
            aria-label={visible ? 'Hide password' : 'Show password'}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-ink-500">{hint}</p>}
    </div>
  );
}

export function AuthPage() {
  const { login, register, resetPassword, updatePassword, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const nextPath = useMemo(() => {
    const raw = searchParams.get('next') || '';
    // Never redirect off-site.
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/profile';
  }, [searchParams]);

  const initialMode: Mode = searchParams.get('mode') === 'signup'
    ? 'signup'
    : searchParams.get('mode') === 'reset'
      ? 'reset'
      : 'signin';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Migration prompt for browsers that saved a library before signing in.
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    if (mode === 'reset') return;

    if (hasLocalLibraryData() && !hasMigratedLocal()) {
      setShowMigrationPrompt(true);
      return;
    }

    navigate(nextPath, { replace: true });
  }, [isAuthenticated, isLoading, mode, navigate, nextPath]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSuccess(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate(nextPath, { replace: true });
  };

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanUsername = normalizeUsername(username);
    const usernameProblem = validateUsername(cleanUsername);
    if (usernameProblem) {
      setError(usernameProblem);
      return;
    }
    if (password.length < 6) {
      setError('Passwords need at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Those passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await register(email.trim(), password, cleanUsername);

    if (result.error) {
      setSubmitting(false);
      setError(result.error);
      return;
    }

    if (result.userId) {
      // Claim the public username straight away; a missing profiles table is
      // non-fatal (the /profile page will offer to finish the setup).
      await saveMyProfile(result.userId, { username: cleanUsername, isPublic: true });
    }

    setSubmitting(false);

    if (result.needsConfirmation) {
      switchMode('signin');
      setSuccess('Account created. Check your inbox to confirm your email, then sign in.');
      return;
    }

    navigate(nextPath, { replace: true });
  };

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Enter the email on your account.');
      return;
    }

    setSubmitting(true);
    const result = await resetPassword(email.trim());
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess('Reset link sent. Open the email and follow the link to choose a new password.');
  };

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('Passwords need at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Those passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess('Password updated. Redirecting…');
    window.setTimeout(() => navigate(nextPath, { replace: true }), 800);
  };

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrationResult(null);
    const result = await migrateLocalToCloud();
    setMigrating(false);
    if (result.error) {
      setMigrationResult(`Import failed: ${result.error}`);
    } else {
      setMigrationResult(`Imported ${result.imported} title${result.imported === 1 ? '' : 's'} into your account.`);
      setShowMigrationPrompt(false);
      window.setTimeout(() => navigate(nextPath, { replace: true }), 1200);
    }
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
          <p className="mb-6 text-sm leading-relaxed text-ink-300">
            We found titles saved in this browser before you signed in. Import them into your
            account so they follow you across devices?
          </p>

          {migrationResult && (
            <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              {migrationResult}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <button onClick={handleMigrate} disabled={migrating} className="btn-primary flex items-center justify-center gap-2 text-sm">
              {migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {migrating ? 'Importing…' : 'Import my titles'}
            </button>
            <button onClick={() => navigate(nextPath, { replace: true })} disabled={migrating} className="btn-ghost text-sm">
              Start with an empty library
            </button>
          </div>
        </div>
      </div>
    );
  }

  const copy = MODE_COPY[mode];

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1.05fr_1fr] md:px-6 md:py-16">
      {/* Brand / value panel */}
      <aside className="hidden flex-col justify-center md:flex">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/5 px-3 py-1 text-xs font-medium text-rose-300 w-fit">
          <Heart className="h-3.5 w-3.5" /> Girls&rsquo; Love, organised
        </div>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-tight text-ink-50">
          Your whole GL world,<br />in one orbit.
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ink-300">
          Track what you read and watch, rate your favourites, and share a public profile that
          updates everywhere you sign in.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-ink-300">
          {[
            'Cloud-synced library and reading progress',
            'Public profile at /user/yourname',
            'One account for manga, anime, novels and dramas',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </aside>

      <div className="card-surface p-6 sm:p-8">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-lavender-600">
            {mode === 'signin' ? (
              <LogIn className="h-5 w-5 text-white" />
            ) : mode === 'signup' ? (
              <UserPlus className="h-5 w-5 text-white" />
            ) : (
              <KeyRound className="h-5 w-5 text-white" />
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-50">{copy.title}</h1>
            <p className="text-xs text-ink-400">{copy.subtitle}</p>
          </div>
        </div>

        {(mode === 'signin' || mode === 'signup') && (
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-ink-800 bg-ink-900 p-1">
            {(['signin', 'signup'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => switchMode(value)}
                className={cn(
                  'rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                  mode === value
                    ? 'bg-rose-500/15 text-rose-300'
                    : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100'
                )}
              >
                {value === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>
        )}

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

        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="space-y-4">
            <Field
              id="signin-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              icon={Mail}
              autoComplete="email"
            />
            <Field
              id="signin-password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Your password"
              icon={Lock}
              autoComplete="current-password"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="text-[11px] font-medium text-rose-400 transition-colors hover:text-rose-300"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="btn-primary flex w-full items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <Field
              id="signup-email"
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              icon={Mail}
              autoComplete="email"
            />
            <Field
              id="signup-username"
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="yourname"
              icon={AtSign}
              autoComplete="username"
              hint="3–20 characters. Lowercase letters, numbers and underscores. This becomes /user/yourname."
            />
            <Field
              id="signup-password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              icon={Lock}
              autoComplete="new-password"
              minLength={6}
            />
            <Field
              id="signup-confirm"
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat your password"
              icon={Lock}
              autoComplete="new-password"
              minLength={6}
            />

            <button
              type="submit"
              disabled={submitting || isLoading}
              className="btn-primary flex w-full items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Creating account…' : 'Create account'}
            </button>

            <p className="text-center text-[11px] text-ink-500">
              By signing up you agree to the{' '}
              <Link to="/terms" className="text-ink-300 underline-offset-2 hover:underline">terms</Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-ink-300 underline-offset-2 hover:underline">privacy policy</Link>.
            </p>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <Field
              id="forgot-email"
              label="Account email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              icon={Mail}
              autoComplete="email"
            />
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex w-full items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Sending link…' : 'Send reset link'}
            </button>
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="btn-ghost w-full text-sm"
            >
              Back to sign in
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            <Field
              id="reset-password"
              label="New password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              icon={Lock}
              autoComplete="new-password"
              minLength={6}
            />
            <Field
              id="reset-confirm"
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repeat your new password"
              icon={Lock}
              autoComplete="new-password"
              minLength={6}
            />
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex w-full items-center justify-center gap-2 text-sm disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Updating…' : 'Update password'}
            </button>
            <button type="button" onClick={() => switchMode('signin')} className="btn-ghost w-full text-sm">
              Back to sign in
            </button>
          </form>
        )}

        <div className="mt-5 border-t border-ink-800 pt-4 text-center">
          <p className="text-xs text-ink-400">
            {mode === 'signin' ? (
              <>
                New to YuriOrbit?{' '}
                <button onClick={() => switchMode('signup')} className="font-medium text-rose-400 transition-colors hover:text-rose-300">
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => switchMode('signin')} className="font-medium text-rose-400 transition-colors hover:text-rose-300">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-ink-400 transition-colors hover:text-ink-200">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
