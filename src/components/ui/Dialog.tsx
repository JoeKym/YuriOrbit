import { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/format';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Action row; the caller owns button order and variants. */
  footer?: ReactNode;
  /** Destructive dialogs get the error accent on the title rule. */
  tone?: 'default' | 'danger';
  className?: string;
}

/**
 * The app's single modal: labelled, focus-trapped, Esc-closable, and it restores
 * focus to whatever opened it. Replaces `window.confirm` so destructive actions
 * can explain consequences and be styled.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  tone = 'default',
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  // Modal is only mounted while open, so the ref is always the live panel.
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    document.addEventListener('keydown', handleKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm animate-fade-in-fast"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative w-full max-w-md rounded-2xl border border-ink-700 bg-ink-850 p-5 shadow-card-hover animate-fade-in-fast focus:outline-none',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id={titleId}
            className={cn(
              'font-display text-xl font-semibold text-ink-50',
              tone === 'danger' && 'text-error-400'
            )}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {description && (
          <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-ink-300">
            {description}
          </p>
        )}

        {children && <div className="mt-4">{children}</div>}

        {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
