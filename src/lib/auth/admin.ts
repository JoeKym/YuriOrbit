import { useState, useEffect } from 'react';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';

/**
 * Built-in recognized administrator emails for YuriOrbit.
 * Joe Kym (project creator & repository owner) is always recognized as administrator,
 * plus any additional emails configured in VITE_ADMIN_EMAILS.
 */
const DEFAULT_ADMIN_EMAILS = ['mail.jkyme@gmail.com'];

const ADMIN_EMAILS_CONFIG = (import.meta as { env?: Record<string, string> }).env?.VITE_ADMIN_EMAILS || '';

function matchesAdminString(val?: unknown): boolean {
  if (typeof val !== 'string') return false;
  const s = val.toLowerCase().trim();
  return (
    s === 'admin' ||
    s === 'administrator' ||
    s === 'admin-role' ||
    s === 'admin_role' ||
    s === 'superadmin' ||
    s === 'owner' ||
    s === 'yuriverse-admin' ||
    s.startsWith('admin')
  );
}

export function useIsAdmin() {
  const kinde = useKindeAuth();
  const { user, isAuthenticated, isLoading } = kinde;

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && user?.email) {
        return localStorage.getItem(`yuriorbit_is_admin_${user.email.toLowerCase().trim()}`) === 'true';
      }
    } catch {
      // ignore
    }
    return false;
  });

  const [isCheckingAdmin, setIsCheckingAdmin] = useState<boolean>(true);
  const [adminReason, setAdminReason] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function evaluateAdmin() {
      if (!isAuthenticated || !user || !user.email) {
        if (isMounted) {
          setIsAdmin(false);
          setIsCheckingAdmin(false);
          setAdminReason('');
        }
        return;
      }

      const email = user.email.toLowerCase().trim();

      // 1. Check known project creator email and VITE_ADMIN_EMAILS configuration
      const allowedEmails = [
        ...DEFAULT_ADMIN_EMAILS,
        ...ADMIN_EMAILS_CONFIG.split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean),
      ];

      if (allowedEmails.includes(email)) {
        if (isMounted) {
          setIsAdmin(true);
          setIsCheckingAdmin(false);
          setAdminReason(`Authorized Admin Email (${email})`);
          try {
            localStorage.setItem(`yuriorbit_is_admin_${email}`, 'true');
          } catch {}
        }
        return;
      }

      // 2. Check Kinde getRoles() SDK method
      try {
        if (typeof kinde.getRoles === 'function') {
          const roles = await kinde.getRoles();
          if (Array.isArray(roles)) {
            const hasAdminRole = roles.some((r: any) => {
              if (typeof r === 'string') return matchesAdminString(r);
              if (typeof r === 'object' && r !== null) {
                return (
                  matchesAdminString(r.key) ||
                  matchesAdminString(r.name) ||
                  matchesAdminString(r.id)
                );
              }
              return false;
            });
            if (hasAdminRole) {
              if (isMounted) {
                setIsAdmin(true);
                setIsCheckingAdmin(false);
                setAdminReason('Kinde Role: admin');
                try {
                  localStorage.setItem(`yuriorbit_is_admin_${email}`, 'true');
                } catch {}
              }
              return;
            }
          }
        }
      } catch {
        // continue
      }

      // 3. Check Kinde getPermission('admin') and getPermissions()
      try {
        if (typeof kinde.getPermission === 'function') {
          const perm = await kinde.getPermission('admin');
          if (perm?.isGranted) {
            if (isMounted) {
              setIsAdmin(true);
              setIsCheckingAdmin(false);
              setAdminReason('Kinde Permission: admin');
              try {
                localStorage.setItem(`yuriorbit_is_admin_${email}`, 'true');
              } catch {}
            }
            return;
          }
        }
      } catch {}

      try {
        if (typeof kinde.getPermissions === 'function') {
          const perms = await kinde.getPermissions();
          const list = perms?.permissions || [];
          if (Array.isArray(list) && list.some((p: any) => matchesAdminString(p))) {
            if (isMounted) {
              setIsAdmin(true);
              setIsCheckingAdmin(false);
              setAdminReason('Kinde Permission List');
              try {
                localStorage.setItem(`yuriorbit_is_admin_${email}`, 'true');
              } catch {}
            }
            return;
          }
        }
      } catch {}

      // 4. Check Kinde token claims across accessToken and idToken
      const tokenTypes: ('accessToken' | 'idToken')[] = ['accessToken', 'idToken'];
      for (const tokenType of tokenTypes) {
        try {
          if (typeof kinde.getClaim === 'function') {
            const rolesClaim = await kinde.getClaim('roles', tokenType);
            const val = rolesClaim?.value;
            if (Array.isArray(val)) {
              const hasAdminRole = val.some((r: unknown) => {
                if (typeof r === 'string') return matchesAdminString(r);
                if (typeof r === 'object' && r !== null) {
                  const obj = r as { key?: string; name?: string; id?: string };
                  return (
                    matchesAdminString(obj.key) ||
                    matchesAdminString(obj.name) ||
                    matchesAdminString(obj.id)
                  );
                }
                return false;
              });
              if (hasAdminRole) {
                if (isMounted) {
                  setIsAdmin(true);
                  setIsCheckingAdmin(false);
                  setAdminReason(`Kinde ${tokenType} roles claim`);
                  try {
                    localStorage.setItem(`yuriorbit_is_admin_${email}`, 'true');
                  } catch {}
                }
                return;
              }
            }
          }
        } catch {}

        try {
          if (typeof kinde.getClaims === 'function') {
            const claims = (await kinde.getClaims(tokenType)) as Record<string, unknown> | null;
            if (claims) {
              const candidate =
                claims.roles ||
                claims['x-kinde-roles'] ||
                claims.permissions ||
                claims['x-kinde-permissions'] ||
                claims.role;

              if (Array.isArray(candidate)) {
                const match = candidate.some((c) => {
                  if (typeof c === 'string') return matchesAdminString(c);
                  if (typeof c === 'object' && c !== null) {
                    const obj = c as { key?: string; name?: string; id?: string };
                    return (
                      matchesAdminString(obj.key) ||
                      matchesAdminString(obj.name) ||
                      matchesAdminString(obj.id)
                    );
                  }
                  return false;
                });
                if (match) {
                  if (isMounted) {
                    setIsAdmin(true);
                    setIsCheckingAdmin(false);
                    setAdminReason(`Kinde ${tokenType} token claims`);
                    try {
                      localStorage.setItem(`yuriorbit_is_admin_${email}`, 'true');
                    } catch {}
                  }
                  return;
                }
              } else if (typeof candidate === 'string' && matchesAdminString(candidate)) {
                if (isMounted) {
                  setIsAdmin(true);
                  setIsCheckingAdmin(false);
                  setAdminReason(`Kinde ${tokenType} role (${candidate})`);
                  try {
                    localStorage.setItem(`yuriorbit_is_admin_${email}`, 'true');
                  } catch {}
                }
                return;
              }
            }
          }
        } catch {}
      }

      // 5. Check user object directly
      const rawUser = user as unknown as Record<string, unknown>;
      if (rawUser?.roles && Array.isArray(rawUser.roles)) {
        if (rawUser.roles.some((r) => matchesAdminString(r))) {
          if (isMounted) {
            setIsAdmin(true);
            setIsCheckingAdmin(false);
            setAdminReason('User Profile roles');
            try {
              localStorage.setItem(`yuriorbit_is_admin_${email}`, 'true');
            } catch {}
          }
          return;
        }
      }

      if (isMounted) {
        setIsAdmin(false);
        setIsCheckingAdmin(false);
        setAdminReason('');
        try {
          localStorage.removeItem(`yuriorbit_is_admin_${email}`);
        } catch {}
      }
    }

    if (!isLoading) {
      evaluateAdmin();
    }

    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, isLoading, kinde]);

  return { isAdmin, isCheckingAdmin, adminReason };
}
