/**
 * YuriOrbit public feedback endpoint — Cloudflare Pages Function.
 *
 * Routes:
 *   POST /api/feedback
 *     { kind, category, message, contactEmail?, name?, subject?, pageUrl?, titleId?, titleName? }
 *
 * Used by the /feedback form, the "Report incorrect information" control on
 * title pages, and the on-site contact form at /contact (kind: 'contact').
 * Rows land in `feedback_reports` and are triaged in the admin console
 * (Feedback and Contact tabs).
 *
 * Security model: this route is public by design, so it only ever INSERTs, and
 * it does so with the service role key (which never reaches the browser). Input
 * is length-limited and allowlisted; failures return generic messages.
 */

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_SECRET_KEY?: string;
}

const KINDS = new Set(['feedback', 'report', 'contact']);
const CATEGORIES = new Set(['issue', 'feature', 'general', 'metadata']);

const LIMITS = {
  messageMin: 3,
  message: 4000,
  email: 320,
  pageUrl: 500,
  titleId: 200,
  titleName: 300,
  name: 120,
  subject: 200,
};

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

interface FeedbackBody {
  kind?: string;
  category?: string;
  message?: string;
  contactEmail?: string;
  name?: string;
  subject?: string;
  pageUrl?: string;
  titleId?: string;
  titleName?: string;
  /** Honeypot: real users never fill this hidden field. */
  website?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function fail(error: string, status: number, extra: Record<string, unknown> = {}): Response {
  return json({ error, ...extra }, status);
}

function serviceKey(env: Env): string | null {
  return env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || null;
}

function svcHeaders(env: Env, extra: Record<string, string> = {}): Record<string, string> {
  const key = serviceKey(env) as string;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/** Optional: tie the submission to a signed-in account when a token is sent. */
async function resolveUser(
  env: Env,
  token: string
): Promise<{ id: string; email: string | null } | null> {
  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: serviceKey(env) as string, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as { id?: string; email?: string };
    if (!user?.id) return null;
    return { id: user.id, email: user.email ?? null };
  } catch {
    return null;
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.SUPABASE_URL || !serviceKey(env)) {
    return fail(
      'Messages are not configured on this deployment yet. Please email mail.jkyme@gmail.com instead.',
      501,
      { needsSetup: true }
    );
  }

  let body: FeedbackBody;
  try {
    body = (await request.json()) as FeedbackBody;
  } catch {
    return fail('Invalid request body.', 400);
  }

  // Silent success for honeypot hits so bots do not learn they were caught.
  if (typeof body.website === 'string' && body.website.trim()) {
    return json({ ok: true });
  }

  const kind = typeof body.kind === 'string' ? body.kind : 'feedback';
  if (!KINDS.has(kind)) return fail('Unknown feedback kind.', 400);

  const category = typeof body.category === 'string' ? body.category : 'general';
  if (!CATEGORIES.has(category)) return fail('Unknown feedback category.', 400);

  const message = clean(body.message, LIMITS.message);
  if (!message || message.length < LIMITS.messageMin) {
    const what = kind === 'contact' ? 'your message' : 'it';
    return fail(`Please write ${what} in at least ${LIMITS.messageMin} characters.`, 400);
  }

  const contactEmail = clean(body.contactEmail, LIMITS.email);
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return fail('That contact email does not look valid.', 400);
  }
  // Contact messages are answered by email, so a reply address is required.
  if (kind === 'contact' && !contactEmail) {
    return fail('Please add an email address so we can reply.', 400);
  }

  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const user = token ? await resolveUser(env, token) : null;

  const row = {
    kind,
    category,
    message,
    contact_email: contactEmail,
    contact_name: clean(body.name, LIMITS.name),
    subject: clean(body.subject, LIMITS.subject),
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
    page_url: clean(body.pageUrl, LIMITS.pageUrl),
    title_id: clean(body.titleId, LIMITS.titleId),
    title_name: clean(body.titleName, LIMITS.titleName),
  };

  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/feedback_reports`, {
      method: 'POST',
      headers: svcHeaders(env, { Prefer: 'return=minimal' }),
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      console.error('[feedback] insert failed', res.status, await res.text());
      return fail('Could not send your message right now. Please try again shortly.', 502);
    }
  } catch (err) {
    console.error('[feedback] insert error', err);
    return fail('Could not send your message right now. Please try again shortly.', 502);
  }

  return json({ ok: true });
};

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'POST') return onRequestPost(context);
  return fail('Use POST to submit feedback.', 405);
};
