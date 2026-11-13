import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle, Loader2, Send, ShieldAlert } from 'lucide-react';
import { submitFeedback, FEEDBACK_FALLBACK_EMAIL } from '@/lib/feedback';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useAuth } from '@/lib/auth/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';

type AppealCategory = 'appeal' | 'appeal_account' | 'appeal_content' | 'takedown';

export function AppealsPage() {
  usePageMeta({
    title: 'Appeals & Moderation Review',
    description: 'Submit an appeal for an account or content moderation decision, or request a review related to a takedown/restriction on YuriOrbit.',
    path: '/appeals',
  });

  const { user } = useAuth();
  const [category, setCategory] = useState<AppealCategory>('appeal');
  const [subject, setSubject] = useState('');
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim()) {
      setError('Please add an email address so we can reply to your appeal.');
      setStatus('error');
      return;
    }
    if (message.trim().length < 20) {
      setError('Please provide enough detail for review (at least 20 characters).');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setError(null);

    const composed = [
      reference.trim() ? `Reference/ID/URL: ${reference.trim()}` : null,
      '',
      message.trim(),
    ]
      .filter((v) => v !== null)
      .join('\n');

    const result = await submitFeedback({
      kind: 'appeal',
      category,
      subject: subject.trim() || undefined,
      name: name.trim() || undefined,
      contactEmail: contactEmail.trim(),
      message: composed,
      pageUrl: '/appeals',
      website: honeypot,
    });

    if (result.ok) {
      setStatus('success');
      setSubject('');
      setReference('');
      setMessage('');
      setHoneypot('');
    } else {
      setStatus('error');
      setError(result.needsSetup ? `Appeals are not configured yet. Please email ${FEEDBACK_FALLBACK_EMAIL}.` : result.error);
    }
  };

  return (
    <div className="mx-auto max-w-prose px-4 py-12 md:px-6">
      <PageHeader
        eyebrow="Moderation"
        title="Appeals &"
        accent="Moderation Review"
        description="Submit an appeal if you believe an account or content moderation action was made in error. Appeals are reviewed by the admin team. Submitting an appeal does not guarantee reversal."
        align="center"
        className="mb-8"
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="card-surface p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-ink-100">
            <ShieldAlert className="h-4 w-4 text-warning-400" /> What to include
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-400">
            <li>Username/email or affected title URL/ID</li>
            <li>What action you’re appealing</li>
            <li>Why you believe it was incorrect</li>
            <li>Any supporting context or evidence</li>
          </ul>
        </div>
        <div className="card-surface p-4">
          <div className="mb-1 text-sm font-medium text-ink-100">Related policies</div>
          <p className="mt-2 text-xs leading-relaxed text-ink-400">
            See <Link to="/terms" className="text-rose-300 hover:underline">Terms</Link> for moderation/appeals and{' '}
            <Link to="/privacy" className="text-rose-300 hover:underline">Privacy</Link> for how submissions are handled.
            For copyright/rights requests, you can also use <Link to="/contact" className="text-rose-300 hover:underline">Contact</Link>.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card-surface space-y-4 p-5 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Appeal type</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as AppealCategory)} className="input-field text-sm">
              <option value="appeal">General moderation appeal</option>
              <option value="appeal_account">Account ban/suspension appeal</option>
              <option value="appeal_content">Content restriction/takedown appeal</option>
              <option value="takedown">Rights/takedown review request</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Email (required for reply)</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field text-sm"
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Name (optional)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input-field text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-ink-400">Subject (optional)</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Appeal regarding…" className="input-field text-sm" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-ink-400">Reference (username, title, URL, or ID)</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. @username, /title/123, or a report/URL"
            className="input-field text-sm"
          />
        </div>

        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="appeals-website">Website</label>
          <input id="appeals-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-[11px] text-ink-400">Appeal details (required)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={7}
            maxLength={4000}
            placeholder="Explain the situation clearly. Include what happened, why you’re appealing, and any relevant context."
            className="input-field text-sm"
            required
          />
          <div className="mt-1 text-right text-[10px] text-ink-400">{message.length}/4000</div>
        </div>

        {status === 'error' && (
          <div className="flex items-start gap-2 rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {status === 'success' && (
          <div className="flex items-start gap-2 rounded-lg border border-success-500/30 bg-success-500/5 p-3 text-xs text-success-300">
            <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Your appeal was submitted. The admin team will review it and may follow up by email.</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={status === 'submitting'} className="btn-primary">
            {status === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit appeal
          </button>
          <Link to="/faq" className="btn-ghost text-xs">Read FAQ</Link>
        </div>
      </form>
    </div>
  );
}
