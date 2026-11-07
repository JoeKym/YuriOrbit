import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Loader2, UserRound, Mail, Lock, UserPlus, Settings, Image, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/format';
import { useAuth } from '@/lib/auth/AuthContext';

export function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup' | 'edit'>('signin');
  const [form, setForm] = useState<{ email: string; password: string; confirmPassword?: string; username?: string; displayName?: string; bio?: string }>({ email: '', password: '', confirmPassword: '', username: '', displayName: '', bio: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Compute avatar source: file preview or user avatar URL
  const avatarSrc = avatarFile ? URL.createObjectURL(avatarFile) : (user?.picture || user?.givenName || user?.email || '');

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => URL.revokeObjectURL(avatarSrc as string);
  }, [avatarSrc]);

  // Switch between modes
  const switchMode = (newMode: 'signin' | 'signup' | 'edit') => {
    setMode(newMode);
    setError(null);
    if (newMode !== 'edit') {
      setForm({ email: '', password: '', confirmPassword: '', username: '', displayName: '', bio: '' });
      setAvatarFile(null);
    }
  };

  // Handle avatar file change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Sign in
  const handleSignIn = () => {
    setSubmitting(true);
    setError(null);
    setTimeout(() => {
      setSubmitting(false);
      setMode('edit');
    }, 1000);
  };

  // Sign up
  const handleSignUp = () => {
    setSubmitting(true);
    setError(null);
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }
    setTimeout(() => {
      setSubmitting(false);
      setMode('edit');
    }, 1000);
  };

  // Save profile
  const handleSaveProfile = () => {
    setSaving(true);
    setSaved(false);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    }, 500);
  };

  // Form inputs
  const emailInput = (
    <input
      type="email"
      name="email"
      value={form.email}
      onChange={handleInputChange}
      placeholder="you@email.com"
      required
      className="input-field w-full"
    />
  );

  const passwordInput = (
    <input
      type="password"
      name="password"
      value={form.password}
      onChange={handleInputChange}
      placeholder="••••••••"
      required
      className="input-field w-full"
    />
  );

  const confirmPasswordInput = (
    <input
      type="password"
      name="confirmPassword"
      value={form.confirmPassword}
      onChange={handleInputChange}
      placeholder="••••••••"
      required
      className="input-field w-full"
    />
  );

  const usernameInput = (
    <input
      type="text"
      name="username"
      value={form.username}
      onChange={handleInputChange}
      placeholder="yourname"
      maxLength={20}
      className="input-field w-full"
    />
  );

  const displayNameInput = (
    <input
      type="text"
      name="displayName"
      value={form.displayName}
      onChange={handleInputChange}
      placeholder="Shown on your profile"
      maxLength={40}
      className="input-field w-full"
    />
  );

  const bioTextarea = (
    <textarea
      name="bio"
      value={form.bio}
      onChange={handleInputChange}
      rows={2}
      maxLength={280}
      placeholder="A few words about your taste in GL."
      className="input-field w-full"
    />
  );

  if (!isAuthenticated) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center py-12 px-4 bg-ink-950">
        <div className="w-full max-w-md space-y-6">
          {/* Mode tabs */}
          <div className="flex gap-1">
            <button
              onClick={() => setMode('signin')}
              className={cn('flex-1 rounded-lg border-2 border-ink-800 text-xs font-medium transition-colors', mode === 'signin' ? 'border-rose-500 text-rose-300 bg-rose-500/10' : 'text-ink-300 hover:bg-ink-850')}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode('signup')}
              className={cn('flex-1 rounded-lg border-2 border-ink-800 text-xs font-medium transition-colors', mode === 'signup' ? 'border-rose-500 text-rose-300 bg-rose-500/10' : 'text-ink-300 hover:bg-ink-850')}
            >
              Sign up
            </button>
          </div>

          {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
          {loading && <p className="text-sm text-ink-400">Loading…</p>}

          <div className="rounded-lg border border-ink-800 p-6 bg-ink-900">
            <form className="space-y-4">
              <div>
                {emailInput}
              </div>

              {mode === 'signup' && (
                <div>
                  {passwordInput}
                  {confirmPasswordInput}
                </div>
              )}

              <button
                type="button"
                onClick={mode === 'signin' ? handleSignIn : handleSignUp}
                disabled={submitting}
                className="w-full btn-primary text-xs flex items-center gap-2 justify-center"
              >
                {submitting ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </div>

          {/* Switch to edit mode link */}
          {mode !== 'edit' && (
            <p className="mt-4 text-xs text-ink-400 text-center">
              Have an account? <a href="javascript:void(0)" onClick={() => setMode('signin')} className="text-rose-400 hover:text-rose-300">Sign in</a>
            </p>
          )}

          {/* Edit profile mode */}
          {mode === 'edit' && (
            <div className="mt-6 p-6 bg-ink-900 rounded-lg border border-ink-800">
              <h2 className="mb-4 text-lg font-semibold text-ink-50">Edit profile</h2>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>{usernameInput}</div>
                <div>{displayNameInput}</div>
              </div>

              <div>{bioTextarea}</div>

              {/* Avatar upload - simplified */}
              <div className="mb-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-ink-900 bg-gradient-to-tr from-rose-500 to-lavender-500 text-2xl font-bold text-white">
                  {form.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <p className="text-xs text-ink-400">Add avatar (optional)</p>
              </div>

              <div className="flex gap-3">
                <button onClick={handleSaveProfile} disabled={saving} className="flex-1 btn-primary text-xs flex items-center gap-2 justify-center">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save profile
                </button>
                {saved && (
                  <span className="flex items-center gap-1 text-success-400">
                    <Check className="h-3.5 w-3.5" /> Saved
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Authenticated user view
  return (
    <section className="min-h-screen flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md space-y-4">
        <h2 className="text-2xl font-semibold text-ink-50">
          {user?.givenName || user?.email ? 'Profile' : 'Profile'}
        </h2>

        {isLoading && <p className="text-sm text-ink-400">Loading profile…</p>}

        {/* Profile summary */}
        {user?.id && (
          <div className="rounded-lg border border-ink-800 p-6 bg-ink-900 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-16 w-16 rounded-2xl object-cover">
                {/* Avatar would be rendered here via CSS or background-image */}
              </div>
              <div>
                <p className="text-lg font-medium text-ink-50">{user?.givenName || user?.email}</p>
                <p className="text-xs text-ink-400">Member since</p>
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setMode('edit')}
              className="w-full btn-primary text-xs flex items-center gap-2 justify-center mt-2"
            >
              Edit profile
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button className="flex-1 btn-primary text-sm">View public profile</button>
          <button className="flex-1 btn-ghost text-sm">Manage preferences</button>
        </div>
      </div>
    </section>
  );
}