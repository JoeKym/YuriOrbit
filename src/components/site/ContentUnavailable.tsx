import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import type { ContentModerationItem } from '@/lib/moderation/contentModeration';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export function ContentUnavailable({
  moderation,
  heading = 'This title is unavailable',
  backTo,
}: {
  moderation: ContentModerationItem;
  heading?: string;
  backTo?: { to: string; label: string };
}) {
  const isTakedown = moderation.action === 'takedown';
  const expiresAt = moderation.expiresAt ? Date.parse(moderation.expiresAt) : NaN;

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center md:px-6">
      <div
        className={
          isTakedown
            ? 'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-error-500/30 bg-error-500/10'
            : 'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-warning-500/30 bg-warning-500/10'
        }
      >
        <ShieldAlert className={isTakedown ? 'h-7 w-7 text-error-400' : 'h-7 w-7 text-warning-400'} />
      </div>
      <p
        className={
          isTakedown
            ? 'mb-1 text-[11px] uppercase tracking-wider text-error-300/90'
            : 'mb-1 text-[11px] uppercase tracking-wider text-warning-300/90'
        }
      >
        Content {isTakedown ? 'takedown' : 'temporarily suspended'}
      </p>
      <h1 className="font-display text-2xl font-semibold text-ink-50">{heading}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-300">
        This page is currently restricted due to a moderation action
        {Number.isFinite(expiresAt) ? (
          <>
            {' '}and will return on{' '}
            <span className="font-medium text-ink-200">{formatDate(moderation.expiresAt!)}</span>.
          </>
        ) : (
          '.'
        )}
      </p>

      <div className="mt-6 w-full rounded-xl border border-ink-800 bg-ink-900/60 p-4 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink-400">Reason</p>
        <p className="mt-1.5 text-sm text-ink-200">
          {moderation.reason?.trim() || 'No reason was provided.'}
        </p>
      </div>

      <p className="mt-4 max-w-md text-xs text-ink-400">
        If you believe this is a mistake, you can submit an appeal for review.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link to="/appeals" className="btn-primary">Submit an appeal</Link>
        <Link to="/contact" className="btn-secondary">Contact</Link>
        {backTo ? (
          <Link to={backTo.to} className="btn-ghost">{backTo.label}</Link>
        ) : (
          <Link to="/discover" className="btn-ghost">Back to Discover</Link>
        )}
      </div>
    </div>
  );
}
