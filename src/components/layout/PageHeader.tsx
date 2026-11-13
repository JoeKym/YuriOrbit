import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/format';

export type PageHeaderVariant = 'display' | 'page' | 'compact';

export interface PageHeaderProps {
  /** Small uppercase kicker shown above the title, e.g. "Curated GL catalogue". */
  eyebrow?: string;
  title: string;
  /** Trailing part of the headline rendered with the rose→lavender gradient. */
  accent?: string;
  description?: ReactNode;
  align?: 'left' | 'center';
  /**
   * `display` for marketing/about pages, `page` for catalogue and utility
   * routes, `compact` where vertical space is tight (sticky headers, admin).
   */
  variant?: PageHeaderVariant;
  /** Render-level actions (filters toggle, sort, export) aligned with the title. */
  actions?: ReactNode;
  className?: string;
}

const TITLE_SIZES: Record<PageHeaderVariant, string> = {
  display: 'text-4xl md:text-5xl',
  page: 'text-3xl md:text-4xl',
  compact: 'text-2xl',
};

/**
 * The one page-heading treatment: an eyebrow with a glowing status dot, a display
 * headline whose last phrase carries the brand gradient, and a muted supporting
 * line. Every route uses this instead of its own `<h1>` block, so heading size,
 * spacing and the accent gradient stay identical across the site.
 */
export function PageHeader({
  eyebrow,
  title,
  accent,
  description,
  align = 'left',
  variant = 'page',
  actions,
  className,
}: PageHeaderProps) {
  const centered = align === 'center';

  const heading = (
    <div className={cn(centered ? 'text-center' : '', 'min-w-0')}>
      {eyebrow && (
        <p
          className={cn(
            'mb-2 flex items-center gap-2 text-micro font-semibold uppercase tracking-[0.18em] text-rose-300/80',
            centered && 'justify-center'
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,142,0.85)]" />
          {eyebrow}
        </p>
      )}

      <h1
        className={cn(
          'font-display font-semibold leading-tight tracking-tight text-ink-50 text-balance',
          TITLE_SIZES[variant],
          centered && 'mx-auto'
        )}
      >
        {title}
        {accent && (
          <>
            {' '}
            <span className="text-gradient">{accent}</span>
          </>
        )}
      </h1>

      {description && (
        <p
          className={cn(
            'mt-2 text-sm leading-relaxed text-ink-400',
            centered && 'mx-auto max-w-2xl text-ink-300'
          )}
        >
          {description}
        </p>
      )}
    </div>
  );

  if (!actions) return <div className={className}>{heading}</div>;

  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      {heading}
      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </div>
  );
}
