import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Github,
  Instagram,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Send,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { FEEDBACK_FALLBACK_EMAIL, submitFeedback } from '@/lib/feedback';

export function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="text-center mb-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-lavender-600 mb-4 mx-auto">
          <Mail className="h-7 w-7 text-white" fill="white" />
        </div>
        <h1 className="font-display text-4xl font-semibold text-ink-50">Contact</h1>
        <p className="mt-2 text-lg text-ink-300">Get in touch with us</p>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-ink-300 leading-relaxed mb-6">
          YuriOrbit is built and maintained by JoeKym Labs. We welcome your feedback, questions, and reports.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-2xl mx-auto mb-10">

        <div className="card-surface p-5">
          <Mail className="h-6 w-6 text-rose-400 mb-2" fill="currentColor" />
          <h2 className="font-semibold text-ink-50">Email (Work)</h2>
          <div className="mt-1 text-sm text-ink-400">
            <a href="mailto:mail.jkyme@gmail.com" className="text-rose-300 hover:underline" rel="noopener noreferrer">
              mail.jkyme@gmail.com
            </a>
          </div>
        </div>

        <div className="card-surface p-5">
          <MessageCircle className="h-6 w-6 text-lavender-400 mb-2" fill="currentColor" />
          <h2 className="font-semibold text-ink-50">WhatsApp</h2>
          <div className="mt-1 text-sm text-ink-400">
            <a
              href="https://wa.me/254117412271"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-300 hover:underline"
            >
              254117412271
            </a>
          </div>
        </div>

        <div className="card-surface p-5">
          <Phone className="h-6 w-6 text-lavender-400 mb-2" fill="currentColor" />
          <h2 className="font-semibold text-ink-50">Phone</h2>
          <div className="mt-1 text-sm text-ink-400">
            <a href="tel:+254117412271" className="text-rose-300 hover:underline">
              254117412271
            </a>
          </div>
        </div>

        <div className="card-surface p-5">
          <Github className="h-6 w-6 text-rose-400 mb-2" fill="currentColor" />
          <h2 className="font-semibold text-ink-50">GitHub</h2>
          <div className="mt-1 text-sm text-ink-400">
            <a href="https://github.com/JoeKym" target="_blank" rel="noopener noreferrer" className="text-rose-300 hover:underline">
              github.com/JoeKym
            </a>
          </div>
        </div>

        <div className="card-surface p-5">
          <Instagram className="h-6 w-6 text-rose-400 mb-2" fill="currentColor" />
          <h2 className="font-semibold text-ink-50">Instagram</h2>
          <div className="mt-1 text-sm text-ink-400">
            <a href="https://instagram.com/ky.money223" target="_blank" rel="noopener noreferrer" className="text-rose-300 hover:underline">
              @ky.money223
            </a>
          </div>
        </div>

      </div>

      <ContactForm />

      <div className="mt-10 card-surface p-5 border-t pt-8">
        <p className="text-sm text-ink-400">
          <Link to="/discover" className="font-medium text-rose-300 hover:underline">Back to Discover</Link>
          your next GL title.
        </p>
      </div>
    </div>
  );
}

const MESSAGE_MAX = 4000;

function ContactForm() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  // The session resolves after mount, so fill in known details once it does.
  useEffect(() => {
    if (!user) return;
    setName((prev) => prev || user.givenName || '');
    setEmail((prev) => prev || user.email || '');
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = message.trim();
    if (trimmed.length < 3) {
      setStatus('error');
      setError('Please write a message of at least 3 characters.');
      return;
    }

    setStatus('submitting');
    setError(null);

    const result = await submitFeedback({
      kind: 'contact',
      category: 'general',
      message: trimmed,
      contactEmail: email.trim(),
      name: name.trim(),
      subject: subject.trim(),
      pageUrl: '/contact',
      website: honeypot,
    });

    if (result.ok) {
      setStatus('success');
      setMessage('');
      setSubject('');
    } else {
      setStatus('error');
      setError(result.error);
      setNeedsSetup(Boolean(result.needsSetup));
    }
  };

  if (status === 'success') {
    return (
      <section className="card-surface mx-auto max-w-2xl p-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-lavender-600 mb-3 mx-auto">
          <CheckCircle className="h-6 w-6 text-white" fill="white" />
        </div>
        <h2 className="font-display text-2xl font-semibold text-ink-50">Message sent</h2>
        <p className="mt-2 text-sm text-ink-300">
          Thanks{name.trim() ? `, ${name.trim()}` : ''} — your message is in the inbox and we'll
          reply to <span className="text-ink-100">{email.trim()}</span>.
        </p>
        <button type="button" onClick={() => setStatus('idle')} className="btn-secondary mt-5 text-xs">
          Send another message
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h2 className="font-display text-2xl font-semibold text-ink-50">Send us a message</h2>
      <p className="mt-1 text-sm text-ink-400">
        Prefer not to leave the site? Write to us here and it lands straight in the admin inbox.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {/* Honeypot — hidden from users and assistive tech, tempting to bots. */}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className="mb-1.5 block text-xs font-medium text-ink-200">
              Your name
            </label>
            <input
              id="contact-name"
              type="text"
              autoComplete="name"
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field text-sm"
              placeholder="Joe"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-xs font-medium text-ink-200">
              Email <span className="text-rose-400">*</span>
            </label>
            <input
              id="contact-email"
              type="email"
              required
              autoComplete="email"
              maxLength={320}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field text-sm"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-subject" className="mb-1.5 block text-xs font-medium text-ink-200">
            Subject
          </label>
          <input
            id="contact-subject"
            type="text"
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input-field text-sm"
            placeholder="What is this about?"
          />
        </div>

        <div>
          <label htmlFor="contact-message" className="mb-1.5 block text-xs font-medium text-ink-200">
            Message <span className="text-rose-400">*</span>
          </label>
          <textarea
            id="contact-message"
            rows={5}
            required
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="input-field min-h-[120px] resize-y text-sm"
            placeholder="How can we help?"
          />
          <p className="mt-1 text-right text-[11px] text-ink-500">
            {message.length}/{MESSAGE_MAX}
          </p>
        </div>

        {status === 'error' && error && (
          <div role="alert" className="rounded-lg border border-error-500/30 bg-error-500/5 p-3 text-xs text-error-300">
            <p className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {error}
                {needsSetup && (
                  <>
                    {' '}
                    You can also email{' '}
                    <a href={`mailto:${FEEDBACK_FALLBACK_EMAIL}`} className="underline hover:text-error-400">
                      {FEEDBACK_FALLBACK_EMAIL}
                    </a>
                    .
                  </>
                )}
              </span>
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" /> Send message
            </>
          )}
        </button>
      </form>
    </section>
  );
}
