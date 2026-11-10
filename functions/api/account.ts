/**
 * YuriOrbit user account API — Cloudflare Pages Function.
 *
 * Routes (self-service, authenticated by the caller's Supabase access token):
 *   GET    /api/account   — returns the caller's moderation status (for in-app enforcement)
 *   DELETE /api/account   — permanently deletes the caller's own account
 *
 * Uses the service role key server-side. The caller can ONLY access/delete their own account.
 */

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
}

interface AuthUser {
  id: string;
  email: string | null;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function fail(error: string, status: number): Response {
  return json({ error }, status);
}

function serviceKey(env: Env): string | null {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || null;
}

function setupError(env: Env): string | null {
  if (!env.SUPABASE_URL) return 'SUPABASE_URL is not set for this deployment.';
  if (!serviceKey(env)) return 'Service role key is not configured for this deployment.';
  return null;
}

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

async function verifyUser(env: Env, token: string): Promise<AuthUser | null> {
  const key = serviceKey(env) as string;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await readJson<{ id?: string; email?: string }>(res);
  if (!user?.id) return null;
  return { id: user.id, email: user.email ?? null };
}

type ModerationEntry = { action?: string; durationHours?: number; reason?: string; updatedAt?: string };

function normalizeModeration(entry: ModerationEntry | null | undefined) {
  if (!entry || !entry.action || entry.action === 'unban') return null;
  const updatedAt = entry.updatedAt ? Date.parse(entry.updatedAt) : NaN;
  const hours = Number(entry.durationHours) || 0;
  const expiresAt = Number.isFinite(updatedAt) && hours > 0 ? new Date(updatedAt + hours * 3600000).toISOString() : null;
  const active = !expiresAt || Date.parse(expiresAt) > Date.now();
  if (!active) return null;
  return {
    action: entry.action,
    reason: typeof entry.reason === 'string' ? entry.reason : '',
    expiresAt,
    active: true,
  };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const configProblem = setupError(env);
  // GET status should fail open if not configured (don't lock users out due to config), but DELETE needs config.
  if (request.method === 'GET') {
    if (configProblem) return json({ ok: true, moderation: null, degraded: true });
  } else if (configProblem) {
    return fail(configProblem, 501);
  }

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return request.method === 'GET' ? json({ ok: true, moderation: null }) : fail('Sign in to delete your account.', 401);

  let user: AuthUser | null = null;
  try {
    user = await verifyUser(env, token);
  } catch {
    user = null;
  }
  // For GET, report this as a failure (401) rather than "clean": an invalid
  // session must not be treated as proof that the account is not moderated.
  if (!user) {
    return request.method === 'GET'
      ? json({ ok: false, error: 'invalid_session', moderation: null }, 401)
      : fail('Your session is invalid or has expired. Sign in again.', 401);
  }

  const key = serviceKey(env) as string;

  if (request.method === 'GET') {
    // Two sources of truth, so a partial admin action still results in enforcement:
    //   1. site_settings.user_moderation — carries the human-readable action/reason.
    //   2. Supabase Auth banned_until — authoritative for whether the account is banned.
    let moderation = null as ReturnType<typeof normalizeModeration>;
    let degraded = false;

    try {
      const res = await fetch(`${env.SUPABASE_URL}/rest/v1/site_settings?select=value&key=eq.user_moderation`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const rows = (await readJson<{ value?: unknown }[]>(res)) ?? [];
        const map = rows[0]?.value && typeof rows[0].value === 'object' ? (rows[0].value as Record<string, ModerationEntry>) : {};
        moderation = normalizeModeration(map[user.id]);
      } else {
        degraded = true;
      }
    } catch {
      degraded = true;
    }

    // Check the Auth record even when the settings note is missing/stale.
    try {
      const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        const record = await readJson<{ banned_until?: string | null }>(res);
        const bannedUntil = record?.banned_until ? Date.parse(record.banned_until) : NaN;
        if (Number.isFinite(bannedUntil) && bannedUntil > Date.now()) {
          const expiresAt = new Date(bannedUntil).toISOString();
          // Auth says banned but settings has no/expired note — still enforce.
          if (!moderation) {
            moderation = { action: 'ban', reason: '', expiresAt, active: true };
          } else if (!moderation.expiresAt) {
            moderation = { ...moderation, expiresAt };
          }
        }
      } else {
        degraded = true;
      }
    } catch {
      degraded = true;
    }

    return json({ ok: true, moderation, degraded });
  }

  if (request.method !== 'DELETE') {
    return fail('Method not allowed.', 405);
  }

  // Best-effort cleanup of user-owned data before auth deletion.
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/library_entries?user_id=eq.${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
    });
  } catch {}
  try {
    await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
    });
  } catch {}

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });

  if (!res.ok) {
    const detail = await readJson<{ msg?: string; message?: string; error_description?: string }>(res);
    return fail(
      detail?.message || detail?.msg || detail?.error_description || `Could not delete account (HTTP ${res.status}).`,
      502
    );
  }

  return json({ ok: true });
};
