import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/utils/format';

export interface SettingsSectionProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: ReactNode;
  /** Scope or state marker beside the title, e.g. "Synced to your account". */
  badge?: ReactNode;
  /** Render-level actions aligned with the title. */
  actions?: ReactNode;
  /** Actions pinned below the content, past a divider. */
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * One settings panel: icon chip, title with optional badge, supporting line, then
 * the controls. Every tab uses this so section rhythm and heading level are the
 * same throughout the page.
 */
export function SettingsSection({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  footer,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <section className={cn('card-surface p-5', className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10">
          <Icon className="h-4 w-4 text-rose-400" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold leading-8 text-ink-50">
            {title}
            {badge}
          </h2>
          {description && <p className="mt-1 text-xs leading-relaxed text-ink-400">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {children && <div className="mt-4">{children}</div>}

      {footer && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-800/80 pt-4">
          {footer}
        </div>
      )}
    </section>
  );
}

export interface SettingRowProps {
  label: ReactNode;
  description?: ReactNode;
  /** The input or select, sized by the caller. */
  control: ReactNode;
  htmlFor?: string;
  className?: string;
}

/** Label and description on the left, one control on the right. */
export function SettingRow({ label, description, control, htmlFor, className }: SettingRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        className
      )}
    >
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-200">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-ink-400">{description}</p>}
      </div>
      <div className="shrink-0 sm:max-w-[17rem]">{control}</div>
    </div>
  );
}
