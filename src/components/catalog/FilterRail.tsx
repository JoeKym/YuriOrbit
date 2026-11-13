import { Children, type ReactNode } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils/format';

export function FilterRow({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors',
        active
          ? 'border-rose-500/35 bg-rose-500/10 text-rose-200'
          : 'border-transparent text-ink-300 hover:border-ink-700 hover:bg-ink-850 hover:text-ink-100'
      )}
    >
      <span className="truncate">{label}</span>
      {typeof count === 'number' && (
        <span className={cn('shrink-0 text-[11px] tabular-nums', active ? 'text-rose-200/80' : 'text-ink-400')}>
          {count.toLocaleString()}
        </span>
      )}
    </button>
  );
}

export function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-200 transition-colors hover:border-rose-400/50 hover:bg-rose-500/15"
    >
      {label}
      <X className="h-3 w-3 opacity-70" />
      <span className="sr-only">Remove filter</span>
    </button>
  );
}

/** The "ACTIVE FILTERS" strip shown above a result grid. */
export function ActiveFilterBar({
  children,
  onClearAll,
  count,
  emptyLabel,
}: {
  children: ReactNode;
  onClearAll?: () => void;
  /** Number applied, shown as a badge so the strip still reads on small screens. */
  count?: number;
  /** Shown instead of the chips when nothing is applied. */
  emptyLabel?: ReactNode;
}) {
  const hasChips = Children.count(children) > 0;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-ink-800 bg-ink-900/40 px-3 py-2">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">
        Active filters
        {typeof count === 'number' && count > 0 && (
          <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-rose-200">
            {count}
          </span>
        )}
      </span>
      {hasChips ? (
        children
      ) : (
        <span className="text-[11px] text-ink-400">{emptyLabel ?? 'None applied'}</span>
      )}
      {hasChips && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="ml-auto text-[11px] font-medium text-ink-400 transition-colors hover:text-rose-300"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

export function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-ink-800/70 pt-3">
      <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

/** The sticky bordered card that groups the rail's sections. */
export function FilterPanel({
  onReset,
  children,
  note,
}: {
  onReset?: () => void;
  children: ReactNode;
  note?: string;
}) {
  return (
    <div className="overscroll-contain rounded-2xl border border-ink-800 bg-ink-900/60 p-4 backdrop-blur-sm lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
          <SlidersHorizontal className="h-3 w-3" /> Filter works
        </h2>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1 text-[11px] text-rose-300 transition-colors hover:text-rose-200"
          >
            <X className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {children}

      <p className="mt-3 border-t border-ink-800/70 pt-3 text-[10px] leading-relaxed text-ink-400">
        {note ?? 'Counts come from the live catalogue query and update as providers respond.'}
      </p>
    </div>
  );
}
