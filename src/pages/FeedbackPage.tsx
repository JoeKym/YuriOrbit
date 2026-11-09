import { useState } from 'react'; import { Link } from 'react-router-dom';
import { Flag, Shield, Mail, Send, AlertCircle, CheckCircle, FileText, CloudDownload, Clock } from 'lucide-react';

export function FeedbackPage() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    setMessage('');

    // In a real implementation, this would send to an API endpoint
    // For now, we'll simulate the submission
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setStatus('success');
    setMessage('Thank you for your feedback! We have received your report.');
  };

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-lavender-600 mb-4 mx-auto">
            <CheckCircle className="h-7 w-7 text-white" fill="white" />
          </div>
          <h1 className="font-display text-4xl font-semibold text-ink-50">Thank You</h1>
          <p className="mt-2 text-lg text-ink-300">Your feedback has been submitted</p>
        </div>

        <div className="prose prose-invert max-w-none">
          <p className="text-ink-300 leading-relaxed">
            We appreciate you taking the time to share your thoughts. Your feedback helps us improve YuriOrbit for the community.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link to="/discover" className="btn-primary">Back to Discover</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="text-center mb-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-lavender-600 mb-4 mx-auto">
          <Send className="h-7 w-7 text-white" fill="white" />
        </div>
        <h1 className="font-display text-4xl font-semibold text-ink-50">Feedback & Reports</h1>
        <p className="mt-2 text-lg text-ink-300">Help us improve YuriOrbit</p>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-ink-300 leading-relaxed mb-8">
          We value your input on YuriOrbit. Please use the form below to report issues, suggest features, or share general feedback.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto" aria-labelledby="feedback-heading">
        <input type="hidden" name="form-type" value="feedback" readOnly />

        <div>
          <label className="block text-sm font-medium text-ink-50 mb-2">Report Type</label>
          <select
            className="mt-1 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          >
            <option value="issue">Issue / Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="general">General Feedback</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-50 mb-2">Description</label>
          <textarea
            rows={4}            className="mt-1 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-3 text-sm text-ink-300 resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            placeholder="Describe the issue, feature request, or feedback..."
            required
          ></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-50 mb-2">Contact (optional)</label>
          <input
            type="email"
            className="mt-1 block w-full rounded-md border border-ink-700 bg-ink-950 px-3 py-3 text-sm text-ink-300 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            placeholder="Your email if you'd like a response"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full rounded-lg bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>

      {status === 'error' && (
        <div className="mt-6 card-surface p-6 bg-rose-500/10 text-rose-300">
          <p className="text-sm">
            <AlertCircle className="h-4 w-4 mr-2" fill="currentColor" />
            There was an error submitting your feedback. Please try again later.
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