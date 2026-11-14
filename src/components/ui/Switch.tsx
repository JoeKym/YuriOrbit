import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/format';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/**
 * A settings row that toggles. The whole row is the hit target, so the label and
 * description are part of the control and `role="switch"` + `aria-checked` give
 * assistive tech the state without a visually hidden input.
 */
export function Switch({ checked, onChange, label, description, disabled, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-start justify-between gap-4 rounded-lg py-3 text-left transition-colors hover:bg-ink-850/40 disabled:pointer-events-none disabled:opacity-60',
        className
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-200">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-ink-400">{description}</span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 motion-reduce:transition-none',
          checked ? 'border-rose-400/60 bg-rose-500' : 'border-ink-700 bg-ink-800'
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 h-3.5 w-3.5 rounded-full bg-ink-50 shadow-sm transition-transform duration-200 motion-reduce:transition-none',
            checked ? 'translate-x-4' : 'translate-x-0'
          )}
        />
      </span>
    </button>
  );
}
