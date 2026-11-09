/**
 * Typed client for the privileged admin API (/api/admin/*).
 * Every call carries the signed-in user's Supabase access token; the server
 * decides whether they are an admin, so this layer never gates access itself.
 */
import { supabase } from '@/lib/supabase';

export interface AdminResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  needsSetup?: boolean;
}

export interface AdminStats {
  users: { total: number; last7d: number; warning: string | null };
  library: {
    sampled: number;
    total: number;
    byStatus: Record<string, number>;
    topTitles: { titleId: string; title: string; count: number }[];
  };
  featured: { total: number };
  announcement: Announcement | null;
  tables: Record<string, string>;
}

export interface AdminUser {
  id: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  confirmed: boolean;
  displayName: string | null;
  libraryCount: number;
}

export interface AdminEntry {
  id: string;
  user_id: string;
  title_id: string;
  title: string;
  cover_image: string | null;
  content_type: string;
  status: string;
  progress: number;
  total_progress?: number | null;
  rating: number | null;
  updated_at: string;
}

export interface FeaturedTitle {
  id: string;
  title_id: string;
  title: string;
  cover_image: string | null;
  note: string | null;
  position: number;
  created_at: string;
}

export interface Announcement {
  text: string;
  tone: 'info' | 'warning' | 'success';
  active: boolean;
  linkLabel?: string;
  linkHref?: string;
}

export interface AuditEntry {
  id: string;
  actor_email: string;
  action: string;
  target: string | null;
  detail: unknown;
  created_at: string;
}

async function adminRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<AdminResult<T>> {
  if (!supabase) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Authentication is not configured on this deployment.',
    };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, status: 401, data: null, error: 'Sign in to use the admin console.' };
  }

  try {
    const res = await fetch(`/api/admin${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(init.headers as Record<string, string> | undefined),
      },
    });

    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      const payload = parsed as { error?: string; needsSetup?: boolean } | null;
      return {
        ok: false,
        status: res.status,
        data: null,
        error: payload?.error || `Request failed (HTTP ${res.status}).`,
        needsSetup: payload?.needsSetup,
      };
    }

    return { ok: true, status: res.status, data: parsed as T, error: null };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Network error.',
    };
  }
}

export const adminApi = {
  me: () => adminRequest<{ isAdmin: boolean; email: string; userId: string; allowlist: string[] }>('/me'),
  stats: () => adminRequest<AdminStats>('/stats'),

  users: (params: { q?: string; page?: number; perPage?: number }) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.page) search.set('page', String(params.page));
    if (params.perPage) search.set('perPage', String(params.perPage));
    return adminRequest<{ users: AdminUser[]; total: number; page: number; perPage: number }>(
      `/users?${search.toString()}`
    );
  },
  purgeUserLibrary: (userId: string) =>
    adminRequest<{ ok: boolean }>('/users', {
      method: 'POST',
      body: JSON.stringify({ action: 'purge-library', userId }),
    }),
  deleteUser: (userId: string) =>
    adminRequest<{ ok: boolean }>('/users', {
      method: 'POST',
      body: JSON.stringify({ action: 'delete', userId }),
    }),

  library: (params: { q?: string; status?: string; userId?: string; page?: number; perPage?: number }) => {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.status) search.set('status', params.status);
    if (params.userId) search.set('userId', params.userId);
    if (params.page) search.set('page', String(params.page));
    if (params.perPage) search.set('perPage', String(params.perPage));
    return adminRequest<{ entries: AdminEntry[]; total: number; page: number; perPage: number }>(
      `/library?${search.toString()}`
    );
  },
  deleteLibraryEntry: (id: string, userId: string) =>
    adminRequest<{ ok: boolean }>(
      `/library?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    ),

  featured: () => adminRequest<{ featured: FeaturedTitle[] }>('/featured'),
  addFeatured: (input: {
    titleId: string;
    title: string;
    coverImage?: string;
    note?: string;
    contentType?: string;
  }) =>
    adminRequest<{ ok: boolean }>('/featured', { method: 'POST', body: JSON.stringify(input) }),
  removeFeatured: (id: string) =>
    adminRequest<{ ok: boolean }>(`/featured?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),

  settings: () => adminRequest<{ settings: { key: string; value: unknown; updated_at: string }[] }>('/settings'),
  saveSetting: (key: string, value: unknown) =>
    adminRequest<{ ok: boolean }>('/settings', { method: 'PUT', body: JSON.stringify({ key, value }) }),

  audit: () => adminRequest<{ entries: AuditEntry[] }>('/audit'),
};
