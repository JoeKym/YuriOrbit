import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils/format';

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  /** One primary action (usually a link styled with `buttonClasses`). */
  action?: ReactNode;
  className?: string;
}

/**
 * One empty state for the whole app: quiet icon, a plain sentence, one way
 * forward. Replaces the per-page centred blocks that each used different sizes.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-800 px-6 py-16 text-center',
        className
      )}
    >
      {Icon && <Icon className="mb-3 h-10 w-10 text-ink-500" aria-hidden="true" />}
      <p className="text-base font-medium text-ink-100">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
