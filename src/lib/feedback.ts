/**
 * Client for the public feedback endpoint (/api/feedback).
 *
 * Used by the /feedback form, the "Report incorrect information" control on
 * title pages, and the contact form at /contact. Submissions are stored
 * server-side and triaged in the admin console (Feedback and Contact tabs).
 */
import { supabase } from '@/lib/supabase';

export type FeedbackKind = 'feedback' | 'report' | 'contact';
export type FeedbackCategory = 'issue' | 'feature' | 'general' | 'metadata';

export interface FeedbackInput {
  kind: FeedbackKind;
  category: FeedbackCategory;
  message: string;
  contactEmail?: string;
  /** Sender name, used by contact messages. */
  name?: string;
  /** Subject line, used by contact messages. */
  subject?: string;
  pageUrl?: string;
  titleId?: string;
  titleName?: string;
  /** Honeypot field, populated by bots only. */
  website?: string;
}

export interface FeedbackResult {
  ok: boolean;
  error: string | null;
  needsSetup?: boolean;
}

export const FEEDBACK_FALLBACK_EMAIL = 'mail.jkyme@gmail.com';

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Attach the session when signed in so the report is linked to the account.
  if (supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
    } catch {
      // Anonymous submission is fine; ignore session lookup failures.
    }
  }

  const body = {
    ...input,
    message: input.message.trim(),
    contactEmail: input.contactEmail?.trim() || undefined,
    name: input.name?.trim() || undefined,
    subject: input.subject?.trim() || undefined,
    pageUrl: input.pageUrl ?? (typeof window !== 'undefined' ? window.location.pathname : undefined),
  };

  try {
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const payload = (await res.json().catch(() => null)) as
      | { error?: string; needsSetup?: boolean }
      | null;

    if (res.ok) return { ok: true, error: null };

    return {
      ok: false,
      error: payload?.error || `Could not submit right now (HTTP ${res.status}).`,
      needsSetup: payload?.needsSetup,
    };
  } catch {
    return { ok: false, error: 'Network error — please check your connection and try again.' };
  }
}
