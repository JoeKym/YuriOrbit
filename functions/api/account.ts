/**
 * YuriOrbit user account API — Cloudflare Pages Function.
 *
 * Routes (self-service, authenticated by the caller's Supabase access token):
 *   DELETE /api/account   — permanently deletes the caller's own account
 *
 * Uses the service role key server-side to call Supabase Auth Admin API.
 * The caller can ONLY delete their own account (verified from the token).
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

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const configProblem = setupError(env);
  if (configProblem) return fail(configProblem, 501);

  if (request.method !== 'DELETE') {
    return fail('Method not allowed.', 405);
  }

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return fail('Sign in to delete your account.', 401);

  let user: AuthUser | null = null;
  try {
    user = await verifyUser(env, token);
  } catch {
    user = null;
  }
  if (!user) return fail('Your session is invalid or has expired. Sign in again.', 401);

  const key = serviceKey(env) as string;

  // Best-effort cleanup of user-owned data before auth deletion.
  // library_entries and profiles have foreign keys/cascades in some setups; be defensive.
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
