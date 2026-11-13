import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Loader2, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils/format';
import {
  PROFILE_SETUP_HINT,
  normalizeUsername,
  saveMyProfile,
  validateUsername,
  type Profile,
} from '@/lib/profiles';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const AVATAR_SIZE = 256;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That file is not a readable image.'));
    image.src = src;
  });
}

/** Downscale in the browser so avatars stay small enough to store on the profile row. */
async function toAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file (JPG, PNG, WebP or GIF).');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('That image is larger than 5 MB. Pick a smaller one.');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const scale = Math.min(1, AVATAR_SIZE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return dataUrl;

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

interface ProfileEditorProps {
  userId: string;
  profile: Profile | null;
  initialNeedsSetup?: boolean;
  onSaved: (profile: Profile) => void;
  onCancel?: () => void;
}

export function ProfileEditor({ userId, profile, initialNeedsSetup, onSaved, onCancel }: ProfileEditorProps) {
  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? '');
  const [isPublic, setIsPublic] = useState(profile?.isPublic ?? true);

  const [saving, setSaving] = useState(false);
  const [processingAvatar, setProcessingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(Boolean(initialNeedsSetup));
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUsername(profile?.username ?? '');
    setDisplayName(profile?.displayName ?? '');
    setBio(profile?.bio ?? '');
    setAvatarUrl(profile?.avatarUrl ?? '');
    setIsPublic(profile?.isPublic ?? true);
  }, [profile]);

  const previewInitial = (displayName || username || 'Y').charAt(0).toUpperCase();

  const handleAvatarPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    setProcessingAvatar(true);
    setError(null);
    try {
      const dataUrl = await toAvatarDataUrl(file);
      setAvatarUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that image.');
    } finally {
      setProcessingAvatar(false);
    }
  };

  const handleSave = async () => {
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
      avatarUrl,
      isPublic,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error);
      setNeedsSetup(result.needsSetup);
      return;
    }

    setNeedsSetup(false);
    setSaved(true);
    onSaved({
      id: userId,
      username: clean,
      displayName: displayName.trim() || null,
      bio: bio.trim() || null,
      avatarUrl: avatarUrl || null,
      isPublic,
      createdAt: profile?.createdAt ?? new Date().toISOString(),
      watchRegion: profile?.watchRegion ?? null,
    });
  };

  return (
    <div className="card-surface p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-50">Edit profile</h2>
          <p className="text-xs text-ink-400">Your public page updates as soon as you save.</p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-850 hover:text-ink-100" aria-label="Close editor">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {needsSetup && (
        <div className="mb-4 rounded-lg border border-warning-500/30 bg-warning-500/5 p-3 text-xs text-warning-400">
          {PROFILE_SETUP_HINT}
        </div>
      )}

      {/* Avatar */}
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="relative h-20 w-20 flex-shrink-0">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar preview" width={80} height={80} loading="lazy" decoding="async" className="h-20 w-20 rounded-2xl border-2 border-ink-800 object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-ink-800 bg-gradient-to-tr from-rose-500 to-lavender-500 text-2xl font-bold text-white">
              {previewInitial}
            </div>
          )}
          {processingAvatar && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-ink-950/70">
              <Loader2 className="h-5 w-5 animate-spin text-rose-300" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarPick} className="hidden" />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processingAvatar}
              className="btn-secondary text-xs"
            >
              <Camera className="h-3.5 w-3.5" /> Upload avatar
            </button>
            {avatarUrl && (
              <button type="button" onClick={() => setAvatarUrl('')} className="btn-ghost text-xs text-error-400 hover:text-error-300">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            )}
          </div>
          <p className="text-[11px] text-ink-400">JPG, PNG, WebP or GIF up to 5 MB. Resized automatically.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">Username</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-400">@</span>
              <input
                value={username}
                onChange={(event) => setUsername(normalizeUsername(event.target.value))}
                placeholder="yourname"
                maxLength={20}
                className="input-field pl-8 text-sm"
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-400">Lowercase letters, numbers and underscores.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-300">Display name</label>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Shown on your profile"
              maxLength={40}
              className="input-field text-sm"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-300">Bio</label>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={3}
            maxLength={280}
            placeholder="A few words about your taste in GL."
            className="input-field text-sm"
          />
          <p className="mt-1 text-right text-[11px] text-ink-400">{bio.length}/280</p>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-800 bg-ink-900/60 p-3">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-ink-600 bg-ink-800 text-rose-500 focus:ring-rose-500"
          />
          <span>
            <span className="block text-sm font-medium text-ink-200">Public profile</span>
            <span className="text-xs text-ink-400">
              Anyone with your link can see your profile and library. Turn this off to keep both private.
            </span>
          </span>
        </label>

        {error && <p className="text-xs text-error-400">{error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleSave} disabled={saving} className={cn('btn-primary text-sm', saving && 'opacity-70')}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save profile
          </button>
          {onCancel && (
            <button onClick={onCancel} className="btn-ghost text-sm">
              Cancel
            </button>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-xs text-success-400">
              <Check className="h-3.5 w-3.5" /> Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
