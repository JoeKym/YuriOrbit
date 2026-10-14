import { useState, useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

/**
 * Hook to determine if a logged-in Kinde user has Administrator privileges.
 * Matches:
 *  - Specific emails configured in VITE_ADMIN_EMAILS
 *  - Kinde permissions matching 'admin'
 *  - Kinde roles matching 'admin', 'admin-role', 'admin_role', 'administrator' (by key, name, or id)
 */
const ADMIN_EMAILS_CONFIG = (import.meta as { env?: Record<string, string> }).env?.VITE_ADMIN_EMAILS || '';

function matchesAdminString(val?: unknown): boolean {
  if (typeof val !== 'string') return false;
  const s = val.toLowerCase().trim();
  return s === 'admin' || s === 'admin-role' || s === 'admin_role' || s === 'administrator' || s.startsWith('admin');
}

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

      // 1. Check if email matches configured admin list in .env or starts with owner
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

      // 3. Check Kinde roles claim
      try {
        const rolesClaim = await getClaim('roles');
        const val = rolesClaim?.value;
        if (Array.isArray(val)) {
          const hasAdminRole = val.some((r: unknown) => {
            if (typeof r === 'string') return matchesAdminString(r);
            if (typeof r === 'object' && r !== null) {
              const obj = r as { key?: string; name?: string; id?: string };
              return matchesAdminString(obj.key) || matchesAdminString(obj.name) || matchesAdminString(obj.id);
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
