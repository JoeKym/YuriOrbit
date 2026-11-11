import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import type { ContentModerationItem } from '@/lib/moderation/contentModeration';
import {
  acknowledgeRestricted,
  isRestrictedAcknowledged,
} from '@/lib/moderation/restrictedAck';

/**
 * Shown on a title, watch, or reader page that is flagged `restricted`.
 * Restricted titles are hidden from browse/search but direct links still open.
 * The first visit in a session shows a blocking notice; once dismissed the
 * notice stays as an inline banner and does not gate again this session.
 */
export function RestrictedNotice({ moderation }: { moderation: ContentModerationItem | null }) {
  const [, setVersion] = useState(0);
  const titleId = moderation?.action === 'restricted' ? moderation.titleId : null;
  const acknowledged = titleId ? isRestrictedAcknowledged(titleId) : true;

  // Keep the page behind the notice from scrolling while it is unacknowledged.
  useEffect(() => {
    if (!titleId || acknowledged) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [titleId, acknowledged]);

  if (!moderation || moderation.action !== 'restricted') return null;

  const reason = moderation.reason?.trim() || 'This title has been flagged by moderation.';

  const acknowledge = () => {
    if (titleId) acknowledgeRestricted(titleId);
    setVersion((v) => v + 1);
  };

  if (!acknowledged) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restricted-notice-heading"
      >
        <div className="w-full max-w-md rounded-2xl border border-warning-500/30 bg-ink-900 p-6 text-left shadow-xl">
          <div className="mb-3 flex items-center gap-2 text-warning-400">
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
            <h2 id="restricted-notice-heading" className="font-display text-lg font-semibold">
              Restricted content
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-ink-300">{reason}</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-400">
            This title is hidden from browse and search. You can still open it directly, and you
            will only see this notice once per session.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Link to="/discover" className="btn-secondary justify-center text-xs">
              Back to Discover
            </Link>
            <button type="button" onClick={acknowledge} className="btn-primary justify-center text-xs">
              Continue to content
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning-500/30 bg-warning-500/5 p-3 text-xs text-warning-200">
      <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-400" />
      <div>
        <p className="font-semibold">Restricted content</p>
        <p className="mt-0.5 leading-relaxed text-warning-200/80">{reason}</p>
      </div>
    </div>
  );
}
