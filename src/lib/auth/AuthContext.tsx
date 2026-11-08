import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthUser {
  id: string;
  email: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
}

export interface AuthResult {
  error: string | null;
  /** Present after a successful sign-up; lets the caller claim a username. */
  userId?: string;
  /** True when Supabase requires the user to confirm their email first. */
  needsConfirmation?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, username?: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_UNAVAILABLE = 'Authentication is not configured for this deployment.';

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? '',
    givenName: meta.given_name ?? meta.name?.split(' ')[0],
    familyName: meta.family_name ?? meta.name?.split(' ').slice(1).join(' '),
    picture: meta.avatar_url ?? meta.picture,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setIsLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!supabase) return { error: AUTH_UNAVAILABLE };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const register = useCallback(async (email: string, password: string, username?: string) => {
    if (!supabase) return { error: AUTH_UNAVAILABLE };

    const cleanUsername = username?.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: cleanUsername ? { username: cleanUsername, display_name: cleanUsername } : undefined,
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/auth?next=/profile` : undefined,
      },
    });

    if (error) return { error: error.message };
    return {
      error: null,
      userId: data.user?.id,
      needsConfirmation: !data.session,
    };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return { error: AUTH_UNAVAILABLE };
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo:
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth?mode=reset`
          : undefined,
    });
    return { error: error?.message ?? null };
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return { error: AUTH_UNAVAILABLE };
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  }, []);

  const logout = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value: AuthContextValue = {
    user: mapUser(session?.user ?? null),
    session,
    isAuthenticated: !!session,
    isLoading,
    login,
    register,
    resetPassword,
    updatePassword,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
