import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/format';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button surfaces live in `index.css` as `.btn-*` component classes so they keep
 * working for `<Link>`s. These maps add the parts a class can't express: size
 * overrides (utilities beat the component layer), disabled/aria-pressed states,
 * and a consistent focus ring (global `:focus-visible` rule covers the ring).
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-error-500/30 bg-error-500/10 font-medium text-error-400 transition-all duration-200 hover:border-error-500/50 hover:bg-error-500/20 active:scale-[0.98]',
  link: 'inline-flex items-center gap-1.5 text-sm font-medium text-rose-300 transition-colors hover:text-rose-200 hover:underline underline-offset-2',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

/** Shared classes, for actions that have to be a router `<Link>` or `<a>`. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string
): string {
  return cn(
    VARIANTS[variant],
    SIZES[size],
    'disabled:pointer-events-none disabled:opacity-50 aria-pressed:ring-1 aria-pressed:ring-rose-500/40',
    className
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon rendered before the label. */
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, className, children, type = 'button', ...rest },
  ref
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
});

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  variant?: ButtonVariant;
  /** Required: an icon alone gives assistive tech nothing to announce. */
  'aria-label': string;
}

/** 44×44 target by default, per the touch-target rule. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', className, children, type = 'button', ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonClasses(variant, 'sm', className),
        'h-11 w-11 shrink-0 justify-center p-0'
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
