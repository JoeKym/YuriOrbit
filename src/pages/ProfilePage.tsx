import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  ExternalLink,
  Heart,
  Loader2,
  LogOut,
  Pencil,
  ShieldCheck,
  Star,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useLibrary } from '@/hooks/useLibrary';
import { fetchMyProfile, type Profile } from '@/lib/profiles';
import { ProfileEditor } from '@/components/profile/ProfileEditor';
import { getLibraryStatusLabel } from '@/lib/utils/status';
import { getFallbackCover } from '@/lib/utils/format';
import { usePageMeta } from '@/hooks/usePageMeta';

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <div className="skeleton h-40 w-full rounded-2xl" />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function ProfilePage() {
  usePageMeta({ title: 'Profile', description: 'Manage your YuriOrbit profile and account details.', path: '/profile', noIndex: true });

  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { library } = useLibrary();

  const userId = user?.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [editing, setEditing] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    const result = await fetchMyProfile(userId);
    setNeedsSetup(Boolean(result.needsSetup));
    setProfile(result.data);
    setLoadingProfile(false);
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Signed-out visitors belong on /auth, not on a broken-looking profile page.
  if (isLoading) return <ProfileSkeleton />;
  if (!isAuthenticated) return <Navigate to="/auth?next=/profile" replace />;

  const displayName = profile?.displayName || profile?.username || user?.givenName || user?.email?.split('@')[0] || 'YuriOrbit member';
  const initial = displayName.charAt(0).toUpperCase();
  const joinedYear = profile?.createdAt ? new Date(profile.createdAt).getFullYear() : null;
  const favourites = library.filter((entry) => entry.status === 'FAVOURITE');
  const completed = library.filter((entry) => entry.status === 'COMPLETED');
  const recent = library.slice(0, 12);

  const handleSaved = (next: Profile) => {
    setProfile(next);
    setEditing(false);
    window.dispatchEvent(new Event('yot:profile-updated'));
  };

  const handleSignOut = async () => {
    await logout();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold text-ink-50">Your profile</h1>
        <div className="flex items-center gap-2">
          {profile?.username && (
            <Link to={`/user/${profile.username}`} className="btn-ghost text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> View public page
            </Link>
          )}
          <button onClick={handleSignOut} className="btn-ghost text-xs text-ink-400 hover:text-rose-300">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </div>

      {loadingProfile ? (
        <div className="skeleton h-44 w-full rounded-2xl" />
      ) : (
        <div className="card-surface overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-rose-500/25 via-lavender-500/20 to-transparent" />
          <div className="px-5 pb-6 md:px-8">
            <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    className="h-20 w-20 rounded-2xl border-4 border-ink-900 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-ink-900 bg-gradient-to-tr from-rose-500 to-lavender-500 text-2xl font-bold text-white">
                    {initial}
                  </div>
                )}
                <div className="pb-1">
                  <h2 className="font-display text-2xl font-semibold text-ink-50">{displayName}</h2>
                  <p className="text-sm text-ink-400">
                    {profile?.username ? `@${profile.username}` : user?.email}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pb-1">
                {profile ? (
                  <span className="chip">
                    <ShieldCheck className="h-3 w-3" /> {profile.isPublic ? 'Public' : 'Private'}
                  </span>
                ) : (
                  <span className="chip">
                    <UserRound className="h-3 w-3" /> Username not claimed
                  </span>
                )}
                {joinedYear && (
                  <span className="chip">
                    <Calendar className="h-3 w-3" /> Joined {joinedYear}
                  </span>
                )}
                <button onClick={() => setEditing((prev) => !prev)} className="btn-secondary text-xs">
                  <Pencil className="h-3.5 w-3.5" /> {editing ? 'Close editor' : 'Edit profile'}
                </button>
              </div>
            </div>

            {profile?.bio && (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-300">{profile.bio}</p>
            )}

            {!profile && !editing && (
              <p className="mt-4 max-w-2xl text-sm text-ink-300">
                Claim a username to get a shareable page at{' '}
                <code className="rounded bg-ink-850 px-1.5 py-0.5 text-ink-200">/user/yourname</code> and show off
                your library.
              </p>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-ink-800 bg-ink-850 p-3">
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <BookOpen className="h-3.5 w-3.5" /> Tracked
                </div>
                <p className="mt-1 font-display text-2xl font-semibold text-ink-50">{library.length}</p>
              </div>
              <div className="rounded-xl border border-ink-800 bg-ink-850 p-3">
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Heart className="h-3.5 w-3.5" /> Favourites
                </div>
                <p className="mt-1 font-display text-2xl font-semibold text-ink-50">{favourites.length}</p>
              </div>
              <div className="rounded-xl border border-ink-800 bg-ink-850 p-3">
                <div className="flex items-center gap-1.5 text-xs text-ink-400">
                  <Star className="h-3.5 w-3.5" /> Completed
                </div>
                <p className="mt-1 font-display text-2xl font-semibold text-ink-50">{completed.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {(editing || (!loadingProfile && !profile)) && (
        <div className="mt-6">
          <ProfileEditor
            userId={userId as string}
            profile={profile}
            initialNeedsSetup={needsSetup}
            onSaved={handleSaved}
            onCancel={profile ? () => setEditing(false) : undefined}
          />
        </div>
      )}

      {needsSetup && !editing && profile && (
        <p className="mt-4 text-xs text-warning-400">
          The profiles table is not migrated on this deployment yet — changes cannot be saved.
        </p>
      )}

      {loadingProfile ? (
        <div className="mt-6 flex items-center gap-2 text-xs text-ink-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading your library…
        </div>
      ) : recent.length > 0 ? (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-title">Recently updated</h2>
            <Link to="/library" className="btn-ghost text-xs">
              Open library
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {recent.map((entry) => (
              <Link key={entry.id} to={`/title/${entry.titleId}`} className="group">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-ink-850 transition-all duration-300 group-hover:ring-1 group-hover:ring-rose-500/20">
                  <img
                    src={entry.coverImage || getFallbackCover(entry.title)}
                    alt={entry.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(event) => {
                      (event.target as HTMLImageElement).src = getFallbackCover(entry.title);
                    }}
                  />
                  <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink-950/85 px-1.5 py-0.5 text-[10px] font-medium text-ink-200 backdrop-blur-sm">
                    {getLibraryStatusLabel(entry.status, entry.contentType)}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-ink-200 group-hover:text-rose-300">{entry.title}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-ink-800 p-8 text-center">
          <p className="text-sm text-ink-300">Your library is empty.</p>
          <Link to="/discover" className="btn-primary mt-4 text-xs">
            Discover titles
          </Link>
        </div>
      )}
    </div>
  );
}
