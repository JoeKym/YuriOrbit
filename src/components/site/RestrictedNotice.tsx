import { ShieldAlert } from 'lucide-react';
import type { ContentModerationItem } from '@/lib/moderation/contentModeration';

/**
 * Shown on a title, watch, or reader page that is flagged `restricted`.
 * Restricted titles are hidden from browse/search but direct links still open,
 * so visitors get this notice instead of a hard block.
 */
export function RestrictedNotice({ moderation }: { moderation: ContentModerationItem | null }) {
  if (!moderation || moderation.action !== 'restricted') return null;

  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-warning-500/30 bg-warning-500/5 p-3 text-xs text-warning-200">
      <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning-400" />
      <div>
        <p className="font-semibold">Restricted content</p>
        <p className="mt-0.5 leading-relaxed text-warning-200/80">
          {moderation.reason?.trim() || 'This title has been flagged by moderation.'}
        </p>
      </div>
    </div>
  );
}
