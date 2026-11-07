import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

const DEFAULT_ADMIN_EMAILS = ['mail.jkyme@gmail.com'];

const ADMIN_EMAILS_CONFIG = (import.meta as { env?: Record<string, string> }).env?.VITE_ADMIN_EMAILS || '';

function getAdminEmails(): string[] {
  return [
    ...DEFAULT_ADMIN_EMAILS,
    ...ADMIN_EMAILS_CONFIG.split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  ];
}

export function useIsAdmin() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const isAdmin = isAuthenticated && !!user?.email && getAdminEmails().includes(user.email.toLowerCase().trim());

  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    if (!isLoading) setIsCheckingAdmin(false);
  }, [isLoading]);

  const adminReason = isAdmin ? `Authorized Admin Email (${user?.email?.toLowerCase().trim()})` : '';

  return { isAdmin, isCheckingAdmin, adminReason };
}
