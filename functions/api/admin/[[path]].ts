/**
 * YuriOrbit admin API — Cloudflare Pages Function.
 *
 * One self-contained catch-all handler mounted at /api/admin/* so that shared
 * helpers live in the same module (Pages Functions turns every other file under
 * /functions into a public route).
 *
 * Routes:
 *   GET    /api/admin/me
 *   GET    /api/admin/stats
 *   GET    /api/admin/users?q=&page=&perPage=
 *   POST   /api/admin/users            { action: 'purge-library' | 'delete', userId }
 *   GET    /api/admin/library?q=&status=&userId=&page=&perPage=
 *   DELETE /api/admin/library?id=&userId=
 *   GET    /api/admin/featured
 *   POST   /api/admin/featured         { titleId, title, coverImage?, note? }
 *   DELETE /api/admin/featured?id=
 *   GET    /api/admin/settings
 *   PUT    /api/admin/settings         { key, value }
 *   GET    /api/admin/audit
 *
 * Security model:
 *   1. The caller's Supabase access token is verified against /auth/v1/user.
 *   2. Their email must appear in the server-side ADMIN_EMAILS allowlist.
 *   3. Only then are privileged operations performed, using the service role key
 *      (which bypasses RLS). The service key never leaves the server.
 */

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
  ADMIN_EMAILS?: string;
}

interface AuthUser {
  id: string;
  email: string | null;
}

// Mirrors src/lib/auth/admin.ts so the existing owner account is admin without extra setup.
const DEFAULT_ADMIN_EMAILS = ['mail.jkyme@gmail.com'];

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function fail(error: string, status: number, extra: Record<string, unknown> = {}): Response {
  return json({ error, ...extra }, status);
}

function adminEmails(env: Env): string[] {
  const configured = (env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...configured].map((e) => e.toLowerCase())));
}

function serviceKey(env: Env): string | null {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || null;
}

function setupError(env: Env): string | null {
  if (!env.SUPABASE_URL) return 'SUPABASE_URL is not set for this deployment.';
  if (!serviceKey(env)) {
    return 'Neither SUPABASE_SERVICE_ROLE_KEY nor SUPABASE_SECRET_KEY is set for this deployment.';
  }
  return null;
}

/** Headers for privileged Supabase requests. */
function svcHeaders(env: Env, extra: Record<string, string> = {}): Record<string, string> {
  const key = serviceKey(env) as string;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

async function rest(
  env: Env,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: svcHeaders(env, (init.headers as Record<string, string>) || {}),
  });
}

async function readJson<T>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

/** Exact row count via PostgREST's Content-Range header. */
async function countRows(env: Env, table: string, query = ''): Promise<number | null> {
  const res = await rest(env, `${table}?select=id${query}`, {
    headers: { Prefer: 'count=exact', Range: '0-0' },
  });
  if (!res.ok) return null;
  const range = res.headers.get('content-range') || '';
  const total = range.split('/')[1];
  const parsed = total ? Number.parseInt(total, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

async function verifyUser(env: Env, token: string): Promise<AuthUser | null> {
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: serviceKey(env) as string,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  const user = await readJson<{ id?: string; email?: string }>(res);
  if (!user?.id) return null;
  return { id: user.id, email: user.email ?? null };
}

interface AdminContext {
  env: Env;
  actorEmail: string;
  actorId: string;
}

async function audit(ctx: AdminContext, action: string, target: string | null, detail: unknown) {
  await rest(ctx.env, 'admin_audit_log', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      actor_email: ctx.actorEmail,
      action,
      target,
      detail,
    }),
  }).catch(() => undefined);
}

/* ─────────────────────────────── handlers ─────────────────────────────────── */

async function handleMe(ctx: AdminContext): Promise<Response> {
  return json({
    isAdmin: true,
    email: ctx.actorEmail,
    userId: ctx.actorId,
    allowlist: adminEmails(ctx.env),
  });
}

async function handleStats(ctx: AdminContext): Promise<Response> {
  const { env } = ctx;

  const [usersRes, entriesRes, featuredRes, settingsRes] = await Promise.all([
    fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=1000`, {
      headers: svcHeaders(env),
    }),
    rest(env, 'library_entries?select=title_id,title,status,updated_at&order=updated_at.desc&limit=2000'),
    countRows(env, 'featured_titles'),
    rest(env, 'site_settings?select=key,value'),
  ]);

  let totalUsers = 0;
  let newUsers7d = 0;
  let usersError: string | null = null;

  if (usersRes.ok) {
    const payload = await readJson<{ users?: { created_at?: string }[]; total?: number }>(usersRes);
    const users = payload?.users ?? [];
    totalUsers = typeof payload?.total === 'number' ? payload.total : users.length;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    newUsers7d = users.filter((u) => u.created_at && new Date(u.created_at).getTime() >= cutoff).length;
  } else {
    usersError = `Could not list users (HTTP ${usersRes.status}). Check the service role key.`;
  }

  const entries = entriesRes.ok ? ((await readJson<{ title_id: string; title: string; status: string }[]>(entriesRes)) ?? []) : [];
  const byStatus = entries.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const titleCounts = new Map<string, { title: string; count: number }>();
  for (const row of entries) {
    const current = titleCounts.get(row.title_id);
    if (current) current.count += 1;
    else titleCounts.set(row.title_id, { title: row.title, count: 1 });
  }
  const topTitles = Array.from(titleCounts.entries())
    .map(([titleId, value]) => ({ titleId, title: value.title, count: value.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const settings = settingsRes.ok ? ((await readJson<{ key: string; value: unknown }[]>(settingsRes)) ?? []) : [];
  const announcement = settings.find((s) => s.key === 'announcement')?.value ?? null;

  return json({
    users: { total: totalUsers, last7d: newUsers7d, warning: usersError },
    library: { sampled: entries.length, total: entries.length, byStatus, topTitles },
    featured: { total: featuredRes ?? 0 },
    announcement,
    tables: {
      profiles: 'unknown',
    },
  });
}

async function handleUsers(ctx: AdminContext, url: URL): Promise<Response> {
  const { env } = ctx;
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const perPage = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('perPage') || '25', 10) || 25));

  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
    headers: svcHeaders(env),
  });

  if (!res.ok) {
    return fail(`Could not list users (HTTP ${res.status}).`, 502);
  }

  const payload = await readJson<{
    users?: {
      id: string;
      email?: string;
      created_at?: string;
      last_sign_in_at?: string;
      email_confirmed_at?: string;
      user_metadata?: Record<string, unknown>;
    }[];
    total?: number;
  }>(res);

  let users = payload?.users ?? [];
  if (q) {
    users = users.filter(
      (u) => (u.email || '').toLowerCase().includes(q) || u.id.toLowerCase().includes(q)
    );
  }

  // One extra query to attach library sizes for the users on this page.
  const libraryCounts: Record<string, number> = {};
  if (users.length > 0) {
    const ids = users.map((u) => u.id).join(',');
    const entriesRes = await rest(env, `library_entries?select=user_id&user_id=in.(${ids})&limit=5000`);
    if (entriesRes.ok) {
      const rows = (await readJson<{ user_id: string }[]>(entriesRes)) ?? [];
      for (const row of rows) {
        libraryCounts[row.user_id] = (libraryCounts[row.user_id] || 0) + 1;
      }
    }
  }

  return json({
    page,
    perPage,
    total: payload?.total ?? users.length,
    users: users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      createdAt: u.created_at ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
      confirmed: Boolean(u.email_confirmed_at),
      displayName:
        (u.user_metadata?.given_name as string | undefined) ||
        (u.user_metadata?.full_name as string | undefined) ||
        null,
      libraryCount: libraryCounts[u.id] ?? 0,
    })),
  });
}

async function handleUserAction(ctx: AdminContext, request: Request): Promise<Response> {
  const body = await readJson<{ action?: string; userId?: string }>(request);
  const action = body?.action;
  const userId = body?.userId;

  if (!userId) return fail('userId is required.', 400);

  if (action === 'purge-library') {
    const res = await rest(ctx.env, `library_entries?user_id=eq.${userId}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
    if (!res.ok) return fail(`Could not purge library (HTTP ${res.status}).`, 502);
    await audit(ctx, 'user.purge_library', userId, {});
    return json({ ok: true });
  }

  if (action === 'delete') {
    if (userId === ctx.actorId) {
      return fail('You cannot delete your own admin account.', 400);
    }
    const res = await fetch(`${ctx.env.SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: svcHeaders(ctx.env),
    });
    if (!res.ok) return fail(`Could not delete user (HTTP ${res.status}).`, 502);
    await audit(ctx, 'user.delete', userId, {});
    return json({ ok: true });
  }

  return fail('Unknown action.', 400);
}

async function handleLibrary(ctx: AdminContext, url: URL): Promise<Response> {
  const { env } = ctx;
  const q = (url.searchParams.get('q') || '').trim();
  const status = url.searchParams.get('status') || '';
  const userId = url.searchParams.get('userId') || '';
  const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
  const perPage = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('perPage') || '25', 10) || 25));

  const filters: string[] = ['select=*', 'order=updated_at.desc'];
  if (q) filters.push(`title=ilike.*${encodeURIComponent(q)}*`);
  if (status) filters.push(`status=eq.${encodeURIComponent(status)}`);
  if (userId) filters.push(`user_id=eq.${encodeURIComponent(userId)}`);

  const from = (page - 1) * perPage;
  const res = await rest(env, `library_entries?${filters.join('&')}`, {
    headers: {
      Prefer: 'count=exact',
      Range: `${from}-${from + perPage - 1}`,
    },
  });

  if (!res.ok) {
    return fail(`Could not load library entries (HTTP ${res.status}).`, 502);
  }

  const rows = (await readJson<Record<string, unknown>[]>(res)) ?? [];
  const range = res.headers.get('content-range') || '';
  const total = Number.parseInt(range.split('/')[1] || '', 10);

  return json({ page, perPage, total: Number.isFinite(total) ? total : rows.length, entries: rows });
}

async function handleLibraryDelete(ctx: AdminContext, url: URL): Promise<Response> {
  const id = url.searchParams.get('id');
  const userId = url.searchParams.get('userId');
  if (!id || !userId) return fail('id and userId are required.', 400);

  const res = await rest(
    ctx.env,
    `library_entries?title_id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(userId)}`,
    { method: 'DELETE', headers: { Prefer: 'return=minimal' } }
  );
  if (!res.ok) return fail(`Could not delete entry (HTTP ${res.status}).`, 502);
  await audit(ctx, 'library.delete_entry', `${userId}:${id}`, {});
  return json({ ok: true });
}

async function handleFeatured(ctx: AdminContext, request: Request): Promise<Response> {
  const { env } = ctx;

  if (request.method === 'GET') {
    const res = await rest(env, 'featured_titles?select=*&order=position.asc,created_at.asc');
    if (!res.ok) {
      return fail(
        `Could not load featured titles (HTTP ${res.status}). Has the migration been applied?`,
        502
      );
    }
    return json({ featured: (await readJson(res)) ?? [] });
  }

  if (request.method === 'DELETE') {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return fail('id is required.', 400);
    const res = await rest(env, `featured_titles?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
    if (!res.ok) return fail(`Could not remove featured title (HTTP ${res.status}).`, 502);
    await audit(ctx, 'featured.remove', id, {});
    return json({ ok: true });
  }

  const body = await readJson<{
    titleId?: string;
    title?: string;
    coverImage?: string;
    note?: string;
    contentType?: string;
  }>(request);
  if (!body?.titleId || !body?.title) return fail('titleId and title are required.', 400);

  // Append to the end of the rail.
  const positionRes = await rest(env, 'featured_titles?select=position&order=position.desc&limit=1');
  const existing = positionRes.ok
    ? await readJson<{ position: number }[]>(positionRes)
    : null;
  const nextPosition = (existing?.[0]?.position ?? 0) + 1;

  const res = await rest(env, 'featured_titles', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      title_id: body.titleId,
      title: body.title,
      cover_image: body.coverImage ?? null,
      note: body.note ?? null,
      content_type: body.contentType ?? 'MANGA',
      position: nextPosition,
      created_by: ctx.actorEmail,
    }),
  });

  if (!res.ok) {
    const detail = await readJson<{ code?: string; message?: string }>(res);
    if (detail?.code === '23505') {
      return fail('That title is already featured.', 409);
    }
    return fail(detail?.message || `Could not feature title (HTTP ${res.status}).`, 502);
  }

  await audit(ctx, 'featured.add', body.titleId, { title: body.title });
  return json({ ok: true, featured: (await readJson(res)) ?? [] });
}

async function handleSettings(ctx: AdminContext, request: Request): Promise<Response> {
  const { env } = ctx;

  if (request.method === 'GET') {
    const res = await rest(env, 'site_settings?select=key,value,updated_at');
    if (!res.ok) {
      return fail(
        `Could not load settings (HTTP ${res.status}). Has the migration been applied?`,
        502
      );
    }
    return json({ settings: (await readJson(res)) ?? [] });
  }

  const body = await readJson<{ key?: string; value?: unknown }>(request);
  if (!body?.key) return fail('key is required.', 400);

  const res = await rest(env, 'site_settings?on_conflict=key', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({
      key: body.key,
      value: body.value ?? {},
      updated_at: new Date().toISOString(),
      updated_by: ctx.actorEmail,
    }),
  });

  if (!res.ok) return fail(`Could not save setting (HTTP ${res.status}).`, 502);
  await audit(ctx, 'settings.update', body.key, { value: body.value });
  return json({ ok: true });
}

async function handleAudit(ctx: AdminContext): Promise<Response> {
  const res = await rest(
    ctx.env,
    'admin_audit_log?select=*&order=created_at.desc&limit=50'
  );
  if (!res.ok) {
    return fail(`Could not load audit log (HTTP ${res.status}).`, 502);
  }
  return json({ entries: (await readJson(res)) ?? [] });
}

/* ─────────────────────────────── entrypoint ───────────────────────────────── */

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const configurationProblem = setupError(env);
  if (configurationProblem) {
    return fail(configurationProblem, 501, { needsSetup: true });
  }

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return fail('Sign in to use the admin console.', 401);
  }

  let user: AuthUser | null = null;
  try {
    user = await verifyUser(env, token);
  } catch {
    user = null;
  }

  if (!user) {
    return fail('Your session is invalid or has expired. Sign in again.', 401);
  }

  const email = (user.email || '').toLowerCase();
  if (!email || !adminEmails(env).includes(email)) {
    return fail('This account is not authorised for the admin console.', 403, {
      email,
      allowlist: adminEmails(env),
    });
  }

  const ctx: AdminContext = { env, actorEmail: email, actorId: user.id };
  const url = new URL(request.url);
  const segments = Array.isArray(context.params.path)
    ? (context.params.path as string[])
    : context.params.path
      ? [context.params.path as string]
      : [];
  const route = segments.filter(Boolean).join('/') || 'me';
  const method = request.method.toUpperCase();

  try {
    if (route === 'me' && method === 'GET') return await handleMe(ctx);
    if (route === 'stats' && method === 'GET') return await handleStats(ctx);
    if (route === 'users' && method === 'GET') return await handleUsers(ctx, url);
    if (route === 'users' && method === 'POST') return await handleUserAction(ctx, request);
    if (route === 'library' && method === 'GET') return await handleLibrary(ctx, url);
    if (route === 'library' && method === 'DELETE') return await handleLibraryDelete(ctx, url);
    if (route === 'featured' && (method === 'GET' || method === 'POST' || method === 'DELETE')) {
      return await handleFeatured(ctx, request);
    }
    if (route === 'settings' && (method === 'GET' || method === 'PUT' || method === 'POST')) {
      return await handleSettings(ctx, request);
    }
    if (route === 'audit' && method === 'GET') return await handleAudit(ctx);

    return fail(`Unknown admin route: ${method} /${route}`, 404);
  } catch (err) {
    console.error('[admin] unhandled error', route, err);
    return fail(err instanceof Error ? err.message : 'Unexpected admin error.', 500);
  }
};
