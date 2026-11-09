import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookOpen, Calendar, Heart, Lock, Star, UserX } from 'lucide-react';
import type { LibraryEntry } from '@/types/content';
import { LIBRARY_STATUS_LABELS } from '@/types/content';
import { fetchProfileByUsername, fetchPublicLibrary, type Profile } from '@/lib/profiles';
import { cn, getFallbackCover } from '@/lib/utils/format';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePageMeta } from '@/hooks/usePageMeta';

export function UserProfilePage() {
  const { username = '' } = useParams<{ username: string }>();
  const { user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  usePageMeta({
    title: profile?.displayName || profile?.username ? `@${profile?.username || username}` : (loading ? 'Loading profile…' : 'Profile'),
    description: profile?.bio
      ? profile.bio.replace(/\s+/g, ' ').slice(0, 160)
      : profile
        ? `View ${profile.displayName || profile.username || 'this user'}'s public profile on YuriOrbit.`
        : 'View a YuriOrbit user profile.',
    path: username ? `/user/${username}` : undefined,
    noIndex: !profile?.isPublic,
  });


  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNeedsSetup(false);

      const result = await fetchProfileByUsername(username);
      if (cancelled) return;

      if (result.needsSetup) {
        setNeedsSetup(true);
        setLoading(false);
        return;
      }

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setProfile(result.data);

      if (result.data && (result.data.isPublic || result.data.id === user?.id)) {
        const library = await fetchPublicLibrary(result.data.id);
        if (!cancelled && library.data) setEntries(library.data);
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username, user?.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="skeleton h-28 w-full rounded-2xl" />
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[3/4] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <UserX className="mx-auto mb-4 h-10 w-10 text-ink-600" />
        <h1 className="font-display text-2xl font-semibold text-ink-50">Profiles aren't enabled yet</h1>
        <p className="mt-2 text-sm text-ink-400">
          This deployment does not have the profile tables yet. Apply the Supabase migration to switch
          public profiles on.
        </p>
        <Link to="/discover" className="btn-primary mt-6">
          Back to Discover
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink-50">Could not load profile</h1>
        <p className="mt-2 text-sm text-ink-400">{error}</p>
        <Link to="/discover" className="btn-secondary mt-6">
          Back to Discover
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-ink-50">@{username} not found</h1>
        <p className="mt-2 text-sm text-ink-400">
          No YuriOrbit member has claimed that username, or their profile is private.
        </p>
        <Link to="/discover" className="btn-primary mt-6">
          Back to Discover
        </Link>
      </div>
    );
  }

  const isOwner = profile.id === user?.id;
  const favourites = entries.filter((e) => e.status === 'FAVOURITE');
  const completed = entries.filter((e) => e.status === 'COMPLETED');
  const visible = profile.isPublic || isOwner ? entries : [];
  const joined = profile.createdAt ? new Date(profile.createdAt).getFullYear() : null;
  const displayName = profile.displayName || profile.username;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-6">
      <div className="card-surface overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-rose-500/25 via-lavender-500/20 to-transparent" />
        <div className="px-5 pb-6 md:px-8">
          <div className="-mt-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {profile.avatarUrl ? (
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
                <h1 className="font-display text-2xl font-semibold text-ink-50">{displayName}</h1>
                <p className="text-sm text-ink-400">@{profile.username}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pb-1">
              {!profile.isPublic && (
                <span className="chip">
                  <Lock className="h-3 w-3" /> Private
                </span>
              )}
              {joined && (
                <span className="chip">
                  <Calendar className="h-3 w-3" /> Joined {joined}
                </span>
              )}
              {isOwner && (
                <Link to="/profile" className="btn-secondary text-xs">
                  Edit profile
                </Link>
              )}
            </div>
          </div>

          {profile.bio && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-300">{profile.bio}</p>}

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-ink-800 bg-ink-850 p-3">
              <div className="flex items-center gap-1.5 text-xs text-ink-400">
                <BookOpen className="h-3.5 w-3.5" /> Tracked
              </div>
              <p className="mt-1 font-display text-2xl font-semibold text-ink-50">{visible.length}</p>
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

      <div className="mt-8">
        <h2 className="section-title mb-3">
          {isOwner ? 'Your library' : `${displayName}'s library`}
        </h2>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink-800 p-8 text-center">
            <p className="text-sm text-ink-400">
              {profile.isPublic
                ? 'Nothing tracked yet.'
                : 'This profile is private, so its library is hidden.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {visible.map((entry) => (
              <Link key={entry.id} to={`/title/${entry.titleId}`} className="group">
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-ink-850 transition-all duration-300 group-hover:ring-1 group-hover:ring-rose-500/20">
                  <img
                    src={entry.coverImage || getFallbackCover(entry.title)}
                    alt={entry.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = getFallbackCover(entry.title);
                    }}
                  />
                  <span
                    className={cn(
                      'absolute bottom-1.5 left-1.5 rounded-md bg-ink-950/85 px-1.5 py-0.5 text-[10px] font-medium text-ink-200 backdrop-blur-sm'
                    )}
                  >
                    {LIBRARY_STATUS_LABELS[entry.status]}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-ink-200 group-hover:text-rose-300">
                  {entry.title}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
