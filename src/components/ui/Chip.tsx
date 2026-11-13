import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/format';

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Toggle state. Rendered as `aria-pressed` so the state is announced. */
  selected?: boolean;
  /** Trailing count, e.g. "New chapters 3". */
  count?: number;
  icon?: ReactNode;
}

/**
 * A filter/toggle chip. Static labels and chip-shaped links keep using `.chip`
 * directly; this adds the pressed state and the count pill.
 */
export function Chip({ selected = false, count, icon, className, children, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        'chip transition-colors',
        selected && 'chip-active',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...rest}
    >
      {icon}
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-micro font-semibold leading-none',
            selected ? 'bg-rose-500/25 text-rose-100' : 'bg-ink-700/60 text-ink-200'
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
