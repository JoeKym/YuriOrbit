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
    fetchMyProfile(userId).then((result) => {
      if (!cancelled) setProfile(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  return profile;
}
