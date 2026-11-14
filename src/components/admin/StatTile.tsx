import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils/format';

export interface StatTileProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  /** Where the tile goes; renders a router link instead of a plain card. */
  to?: string;
  onClick?: () => void;
  tone?: 'default' | 'success' | 'warning';
}

const TONES = {
  default: 'border-ink-800',
  success: 'border-success-500/30',
  warning: 'border-warning-500/30',
};

/**
 * One KPI tile. Every metric uses the same type scale, icon chip and padding, so
 * a row of them scans as one unit instead of a set of unrelated cards.
 */
export function StatTile({ icon: Icon, label, value, hint, to, onClick, tone = 'default' }: StatTileProps) {
  const interactive = Boolean(to || onClick);
  const className = cn(
    'card-surface block p-4 transition-colors focus-visible:ring-2 focus-visible:ring-rose-500/60',
    TONES[tone],
    interactive && 'hover:border-ink-600'
  );

  const body = (
    <>
      <span className="flex items-center gap-2 text-xs text-ink-400">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink-800/70">
          <Icon className="h-3.5 w-3.5 text-rose-300" />
        </span>
        {label}
      </span>
      <span className="mt-2 block font-display text-3xl font-semibold leading-none text-ink-50">{value}</span>
      {hint && <span className="mt-1.5 block text-micro leading-relaxed text-ink-400">{hint}</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(className, 'text-left')}>
        {body}
      </button>
    );
  }

  return <div className={className}>{body}</div>;
}
