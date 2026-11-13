import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import {
  FEEDBACK_FALLBACK_EMAIL,
  submitFeedback,
  type FeedbackCategory,
} from '@/lib/feedback';
import { PageHeader } from '@/components/layout/PageHeader';

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: 'issue', label: 'Issue / Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'general', label: 'General Feedback' },
  { value: 'review', label: 'Review / Testimonial (admin approval)' },
];

const MESSAGE_MAX = 4000;

export function FeedbackPage() {
  usePageMeta({ title: 'Feedback', description: 'Share feedback, report an issue, or submit a review/testimonial for admin approval.', path: '/feedback' });

  const { user } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory>('issue');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState(user?.email ?? '');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  // The session resolves after mount, so fill the contact field once it does.
  useEffect(() => {
    if (user?.email) setContact((prev) => prev || user.email);
  }, [user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = message.trim();
    if (trimmed.length < 3) {
      setStatus('error');
      setError('Please describe it in at least 3 characters.');
      return;
    }

    setStatus('submitting');
    setError(null);

    const isReview = category === 'review' || category === 'testimonial';
    const result = await submitFeedback({
      kind: isReview ? 'review' : 'feedback',
      category,
      message: trimmed,
      contactEmail: contact.trim() || undefined,
      name: undefined,
      subject: isReview ? 'User review/testimonial' : undefined,
      pageUrl: '/feedback',
      website: honeypot,
    });

    if (result.ok) {
      setStatus('success');
    } else {
      setStatus('error');
      setError(result.error);
      setNeedsSetup(Boolean(result.needsSetup));
    }
  };

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-prose px-4 py-12 md:px-6">
        <PageHeader
          eyebrow="Feedback"
          title="Thank you"
          description={category === 'review' || category === 'testimonial' ? 'Your review/testimonial was submitted.' : 'Your feedback has been submitted.'}
          align="center"
          className="mb-10"
        />

        <div className="prose prose-invert max-w-none">
          <p className="text-ink-300 leading-relaxed">
            {category === 'review' || category === 'testimonial'
              ? 'Thank you for sharing your experience. Your review/testimonial was sent for admin approval and will only appear publicly if it is approved.'
              : 'We appreciate you taking the time to share your thoughts. Your submission is now in the review queue and is visible to the admin team.'}
          </p>
          {contact.trim() && (
            <p className="text-ink-400 leading-relaxed text-sm">
              You left <span className="text-ink-200">{contact.trim()}</span>, so we can follow up if
              we need more detail.
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/discover" className="btn-primary">
            Back to Discover
          </Link>
          <button
            type="button"
            onClick={() => {
              setStatus('idle');
              setMessage('');
              setError(null);
            }}
            className="btn-ghost text-xs"
          >
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-prose px-4 py-12 md:px-6">
      <PageHeader
        eyebrow="Support"
        title="Feedback &"
        accent="Reports"
        description="Help us improve YuriOrbit."
        align="center"
        className="mb-10"
      />

      <div className="prose prose-invert max-w-none">
        <p className="text-ink-300 leading-relaxed mb-2">
          Share bug reports, feature ideas, general feedback, or a review/testimonial. Submissions go to the admin review queue.
        </p>
        <p className="text-sm text-ink-400 leading-relaxed mb-8">
          Need to appeal an account or content moderation action? Use the{' '}
          <Link to="/appeals" className="text-rose-300 hover:underline">Appeals page</Link>.
          Reviews/testimonials are <span className="text-ink-200">published only after admin approval</span>.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 max-w-2xl mx-auto"
        aria-labelledby="feedback-heading"
      >
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

        <div>
          <label htmlFor="feedback-category" className="block text-sm font-medium text-ink-50 mb-2">
            Report Type
          </label>
          <select
            id="feedback-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
            className="mt-1 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="feedback-message" className="block text-sm font-medium text-ink-50 mb-2">
            Description
          </label>
          <textarea
            id="feedback-message"
            rows={5}
            required
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-3 text-sm text-ink-300 resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            placeholder="Describe the issue, request, feedback, or your review/testimonial..."
          />
          <p className="mt-1 text-right text-micro text-ink-400">
            {message.length}/{MESSAGE_MAX}
          </p>
        </div>

        <div>
          <label htmlFor="feedback-contact" className="block text-sm font-medium text-ink-50 mb-2">
            Contact (optional)
          </label>
          <input
            id="feedback-contact"
            type="email"
            autoComplete="email"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            className="mt-1 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-3 text-sm text-ink-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            placeholder="Your email if you'd like a response"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {status === 'submitting' ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…
            </>
          ) : (
            'Submit Feedback'
          )}
        </button>
      </form>

      {status === 'error' && error && (
        <div
          role="alert"
          className="mt-6 card-surface p-4 bg-rose-500/10 text-rose-300"
        >
          <p className="flex items-start gap-2 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              {error}
              {needsSetup && (
                <>
                  {' '}
                  You can also email{' '}
                  <a
                    href={`mailto:${FEEDBACK_FALLBACK_EMAIL}`}
                    className="underline hover:text-rose-200"
                  >
                    {FEEDBACK_FALLBACK_EMAIL}
                  </a>
                  .
                </>
              )}
            </span>
          </p>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/discover" className="text-rose-300 hover:underline">
          Back to Discover GL Titles
        </Link>
      </div>
    </div>
  );
}
