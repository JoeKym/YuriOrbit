import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { fetchMyProfile, type Profile } from '@/lib/profiles';

/**
 * The signed-in user's own public profile (null when signed out, absent or
 * unavailable on this deployment).
 */
export function useMyProfile(): Profile | null {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setProfile(null);
      return;
    }

    let cancelled = false;

    const load = () => {
      fetchMyProfile(userId).then((result) => {
        if (!cancelled) setProfile(result.data);
      });
    };

    load();

    // Keep the navbar in sync when the profile is edited on /profile.
    const handleUpdate = () => load();
    window.addEventListener('yot:profile-updated', handleUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener('yot:profile-updated', handleUpdate);
    };
  }, [isAuthenticated, userId]);

  return profile;
}
