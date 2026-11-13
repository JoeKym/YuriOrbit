import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/format';

export type BadgeVariant = 'neutral' | 'accent' | 'update' | 'success' | 'warning' | 'danger' | 'cap';

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'border-ink-700/60 bg-ink-800 text-ink-300',
  accent: 'border-rose-500/30 bg-rose-500/15 text-rose-200',
  /** New chapters / new releases: the one accent that means "unread". */
  update: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  success: 'border-success-500/30 bg-success-500/10 text-success-400',
  warning: 'border-warning-500/30 bg-warning-500/10 text-warning-400',
  danger: 'border-error-500/30 bg-error-500/10 text-error-400',
  /** Marks a provider count that stopped at its own cap ("5,000+"). */
  cap: 'border-ink-600/60 bg-ink-800 text-ink-300',
};

const SIZES = {
  sm: 'px-2 py-0.5 text-micro',
  md: 'px-2.5 py-1 text-caption',
} as const;

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: keyof typeof SIZES;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Badge({ variant = 'neutral', size = 'sm', icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-semibold leading-none',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
    >
      {icon}
      {children}
    </span>
  );
}
