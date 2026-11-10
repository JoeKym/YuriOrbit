import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, LogIn, LogOut, Send, ShieldAlert, Scale } from 'lucide-react';
import type { StoredBlock } from '@/lib/moderation/accountModeration';
import { submitFeedback } from '@/lib/feedback';
import { useAuth } from '@/lib/auth/AuthContext';

const MESSAGE_MAX = 2000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function InlineAppeal({ isBan }: { isBan: boolean }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setStatus('error');
      setError('Add an email address so we can reply.');
      return;
    }
    if (message.trim().length < 20) {
      setStatus('error');
      setError('Please explain your appeal in at least 20 characters.');
      return;
    }
    setStatus('submitting');
    setError(null);

    const result = await submitFeedback({
      kind: 'appeal',
      category: 'appeal_account',
      subject: `${isBan ? 'Ban' : 'Suspension'} appeal`,
      contactEmail: email.trim(),
      message: message.trim(),
      pageUrl: '/suspended',
      website: honeypot,
    });

    if (result.ok) {
      setStatus('success');
    } else {
      setStatus('error');
      setError(result.error);
    }
  };

  return (
    <section className="mt-8 w-full rounded-xl border border-ink-800 bg-ink-900/60 p-5 text-left md:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">Submit an appeal</h2>

      {status === 'success' ? (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-success-500/30 bg-success-500/5 p-3 text-xs text-success-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Your appeal was submitted. The admin team will review it and may follow up at {email.trim()}.
            You can sign in again once the moderation is lifted.
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />
          <div>
            <label htmlFor="appeal-email" className="mb-1 block text-[11px] uppercase tracking-wider text-ink-400">
              Your email (for reply)
            </label>
            <input
              id="appeal-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field text-sm"
            />
          </div>
          <div>
            <label htmlFor="appeal-message" className="mb-1 block text-[11px] uppercase tracking-wider text-ink-400">
              Explain why this should be lifted
            </label>
            <textarea
              id="appeal-message"
              rows={5}
              required
              maxLength={MESSAGE_MAX}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Explain why your ${isBan ? 'ban' : 'suspension'} should be lifted…`}
              className="input-field min-h-[110px] resize-y text-sm"
            />
            <div className="mt-1 text-right text-[10px] text-ink-500">
              {message.length}/{MESSAGE_MAX}
            </div>
          </div>

          {status === 'error' && error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={status === 'submitting'} className="btn-primary w-full justify-center">
            {status === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit appeal
          </button>
        </form>
      )}

      <p className="mt-3 text-center text-[11px] text-ink-500">
        Need more detail? Use the{' '}
        <Link to="/appeals" className="text-rose-300 hover:underline">full appeals form</Link>{' '}
        or <Link to="/contact" className="text-rose-300 hover:underline">contact us</Link>.
      </p>
    </section>
  );
}

export function AccountSuspendedScreen({
  block,
  isAuthenticated,
  onSignIn,
  onSignOut,
}: {
  block: StoredBlock;
  isAuthenticated: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const isBan = block.action === 'ban';

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-ink-950">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center px-4 py-12 md:py-16">
        <div
          className={
            isBan
              ? 'mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-error-500/40 bg-error-500/10'
              : 'mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-warning-500/40 bg-warning-500/10'
          }
        >
          <ShieldAlert className={isBan ? 'h-8 w-8 text-error-400' : 'h-8 w-8 text-warning-400'} />
        </div>

        <h1 className="text-center font-display text-3xl font-semibold uppercase tracking-[0.12em] text-ink-50 md:text-4xl">
          {isBan ? 'Account banned' : 'Account suspended'}
        </h1>

        <p className="mt-4 max-w-xl text-center text-sm leading-relaxed text-ink-300">
          {isBan
            ? 'Your account has been permanently banned for violating our community guidelines.'
            : 'Your account has been temporarily suspended and cannot use YuriOrbit right now.'}
        </p>
        {!isBan && block.expiresAt && (
          <p className="mt-2 flex items-center gap-1.5 text-center text-sm text-ink-400">
            Your suspension expires on <span className="font-medium text-ink-200">{formatDate(block.expiresAt)}</span>.
          </p>
        )}

        <div className="mt-7 w-full rounded-xl border border-ink-800 bg-ink-900/60 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">Reason</p>
          <p className="mt-2 text-sm text-ink-200">
            {block.reason?.trim() || (isBan ? 'Violation of community guidelines.' : 'Policy violation.')}
          </p>
        </div>

        <InlineAppeal isBan={isBan} />

        <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
          {isAuthenticated ? (
            <button type="button" onClick={onSignOut} className="btn-ghost text-xs">
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          ) : (
            <button type="button" onClick={onSignIn} className="btn-secondary text-xs">
              <LogIn className="h-3.5 w-3.5" /> Re-login
            </button>
          )}
          <Link to="/terms" className="btn-ghost text-xs">Terms</Link>
          <Link to="/privacy" className="btn-ghost text-xs">Privacy</Link>
        </div>

        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-500">
          <Scale className="h-3 w-3" />
          Submitting an appeal does not guarantee the decision will be reversed.
        </p>
      </div>
    </div>
  );
}
