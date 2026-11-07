import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Loader2, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  PROFILE_SETUP_HINT,
  fetchMyProfile,
  normalizeUsername,
  saveMyProfile,
  validateUsername,
} from '@/lib/profiles';

export function ProfileSettings() {
  const { user } = useAuth();
  const userId = user?.id;

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetchMyProfile(userId).then((result) => {
      if (cancelled) return;
      if (result.needsSetup) setNeedsSetup(true);
      if (result.data) {
        setUsername(result.data.username);
        setDisplayName(result.data.displayName ?? '');
        setBio(result.data.bio ?? '');
        setAvatarUrl(result.data.avatarUrl ?? '');
        setIsPublic(result.data.isPublic);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleSave = async () => {
    if (!userId) return;

    const clean = normalizeUsername(username);
    const validation = validateUsername(clean);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await saveMyProfile(userId, {
      username: clean,
      displayName: displayName.trim(),
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim(),
      isPublic,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error);
      setNeedsSetup(result.needsSetup);
      return;
    }

    setUsername(clean);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  };

  const profileUrl = username ? `${window.location.origin}/user/${username}` : '';

  const handleCopy = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  if (!userId) {
    return (
      <section className="card-surface p-5">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-ink-50">
          <UserRound className="h-4 w-4 text-rose-400" /> Public profile
        </h2>
        <p className="text-xs text-ink-400">
          <Link to="/auth" className="text-rose-400 hover:text-rose-300">
            Sign in
          </Link>{' '}
          to claim a username and share your library.
        </p>
      </section>
    );
  }

  return (
    <section className="card-surface p-5">
      <div className="mb-1 flex items-center gap-2">
        <UserRound className="h-4 w-4 text-rose-400" />
        <h2 className="text-lg font-semibold text-ink-50">Public profile</h2>
      </div>
      <p className="mb-4 text-xs text-ink-400">
        Claim a username to get a shareable page at <code className="text-ink-300">/user/yourname</code>.
      </p>

      {needsSetup && (
        <div className="mb-4 rounded-lg border border-warning-500/30 bg-warning-500/5 p-3 text-xs text-warning-400">
          {PROFILE_SETUP_HINT}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-ink-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading profile…
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-ink-400">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="yourname"
                maxLength={20}
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-ink-400">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Shown on your profile"
                maxLength={40}
                className="input-field text-xs"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={280}
              placeholder="A few words about your taste in GL."
              className="input-field text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Avatar URL (optional)</label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              className="input-field text-xs"
            />
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-ink-600 bg-ink-800 text-rose-500 focus:ring-rose-500"
            />
            <span className="text-xs text-ink-300">
              Show my profile and library to anyone with the link
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-xs">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save profile
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-xs text-success-400">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            {profileUrl && (
              <button onClick={handleCopy} className="btn-ghost text-xs">
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy profile link'}
              </button>
            )}
            {username && (
              <Link to={`/user/${username}`} className="text-xs text-rose-400 hover:text-rose-300">
                View public page →
              </Link>
            )}
          </div>

          {error && <p className="text-xs text-error-400">{error}</p>}
        </div>
      )}
    </section>
  );
}
