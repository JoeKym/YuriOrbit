import { useState, useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

/**
 * Hook to determine if a logged-in Kinde user has Administrator privileges.
 * Prevents unauthorized users who sign up from accessing admin controls.
 */
const ADMIN_EMAILS_CONFIG = (import.meta as { env?: Record<string, string> }).env?.VITE_ADMIN_EMAILS || '';

export function useIsAdmin() {
  const { user, isAuthenticated, isLoading, getClaim, getPermission } = useKindeAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function evaluateAdmin() {
      if (!isAuthenticated || !user || !user.email) {
        if (isMounted) {
          setIsAdmin(false);
          setIsCheckingAdmin(false);
        }
        return;
      }

      const email = user.email.toLowerCase().trim();

      // 1. Check if email matches configured admin list in .env
      if (ADMIN_EMAILS_CONFIG) {
        const configuredAdmins = ADMIN_EMAILS_CONFIG.split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        if (configuredAdmins.includes(email)) {
          if (isMounted) {
            setIsAdmin(true);
            setIsCheckingAdmin(false);
          }
          return;
        }
      }

      // 2. Check Kinde permissions
      try {
        const perm = await getPermission('admin');
        if (perm?.isGranted) {
          if (isMounted) {
            setIsAdmin(true);
            setIsCheckingAdmin(false);
          }
          return;
        }
      } catch {
        // ignore
      }

      // 3. Check Kinde roles claim (roles assigned in https://yuriverse.kinde.com/admin)
      try {
        const rolesClaim = await getClaim('roles');
        const val = rolesClaim?.value;
        if (Array.isArray(val)) {
          const hasAdminRole = val.some((r: unknown) => {
            if (typeof r === 'string') return r.toLowerCase() === 'admin';
            if (typeof r === 'object' && r !== null && 'key' in r) {
              return (r as { key?: string }).key?.toLowerCase() === 'admin';
            }
            return false;
          });
          if (hasAdminRole) {
            if (isMounted) {
              setIsAdmin(true);
              setIsCheckingAdmin(false);
            }
            return;
          }
        }
      } catch {
        // ignore
      }

      if (isMounted) {
        setIsAdmin(false);
        setIsCheckingAdmin(false);
      }
    }

    if (!isLoading) {
      evaluateAdmin();
    }
    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, isLoading, getClaim, getPermission]);

  return { isAdmin, isCheckingAdmin };
}
