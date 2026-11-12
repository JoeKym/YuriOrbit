import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/format';

interface PageHeadingProps {
  /** Small uppercase kicker shown above the title, e.g. "Curated GL catalogue". */
  eyebrow?: string;
  title: string;
  /** Trailing part of the headline rendered with the rose→lavender gradient. */
  accent?: string;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}

/**
 * Page heading treatment borrowed from the "Cosmic Violet Media Orbit" design
 * language: an eyebrow label with a glowing status dot, a display headline whose
 * last phrase carries the brand gradient, and a muted supporting line.
 * Structure, spacing and routing stay exactly as they were.
 */
export function PageHeading({
  eyebrow,
  title,
  accent,
  description,
  align = 'left',
  className,
}: PageHeadingProps) {
  const centered = align === 'center';

  return (
    <div className={cn(centered ? 'text-center' : '', className)}>
      {eyebrow && (
        <p
          className={cn(
            'mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300/80',
            centered && 'justify-center'
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,142,0.85)]" />
          {eyebrow}
        </p>
      )}

      <h1
        className={cn(
          'font-display font-semibold leading-tight tracking-tight text-ink-50',
          centered ? 'text-4xl' : 'text-3xl md:text-4xl'
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
}
