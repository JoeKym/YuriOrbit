import { useEffect, useRef } from 'react';
import type { ComponentType, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils/format';

export interface TabItem {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  /** Trailing count, e.g. pending moderation items. */
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Names the tab list for assistive tech, e.g. "Settings sections". */
  label: string;
  /**
   * Keep the strip on one line and scroll it sideways instead of wrapping.
   * Use where the tabs are a long, fixed list — a ragged second row reads as
   * broken rather than intentional.
   */
  scrollable?: boolean;
  className?: string;
}

export const tabId = (id: string) => `tab-${id}`;
export const tabPanelId = (id: string) => `tabpanel-${id}`;

/** Spread onto the panel that belongs to the active tab. */
export function tabPanelProps(id: string) {
  return { role: 'tabpanel' as const, id: tabPanelId(id), 'aria-labelledby': tabId(id), tabIndex: 0 };
}

/**
 * In-page tab strip with the WAI-ARIA tabs pattern: roving tabindex, arrow/Home/
 * End keys, `aria-selected`, and `aria-controls` pointing at the caller's panel.
 *
 * URL-addressable sections (e.g. `/admin?tab=users`) should stay links with
 * `aria-current="page"` — that is navigation, not a tab widget.
 */
export function Tabs({ items, value, onChange, label, scrollable = false, className }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // A deep link can land on a tab that starts out of view in a scrolling strip.
  useEffect(() => {
    if (!scrollable) return;
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>(`#${tabId(value)}`);
    if (!list || !active) return;

    // Rect-based rather than offsetLeft: the strip is not positioned, so
    // offsetLeft would be measured from some unrelated ancestor.
    const listRect = list.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (activeRect.left < listRect.left) {
      list.scrollLeft -= listRect.left - activeRect.left + 8;
    } else if (activeRect.right > listRect.right) {
      list.scrollLeft += activeRect.right - listRect.right + 8;
    }
  }, [value, scrollable]);

  const focusTab = (index: number) => {
    const next = items[(index + items.length) % items.length];
    if (!next) return;
    onChange(next.id);
    listRef.current?.querySelector<HTMLButtonElement>(`#${tabId(next.id)}`)?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === value);
    if (index === -1) return;
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusTab(index + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusTab(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusTab(0);
        break;
      case 'End':
        event.preventDefault();
        focusTab(items.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex gap-1.5 border-b border-ink-800 pb-3',
        scrollable
          ? 'flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'flex-wrap',
        className
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={tabId(item.id)}
            aria-selected={selected}
            aria-controls={tabPanelId(item.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              selected ? 'bg-rose-500/15 text-rose-300' : 'text-ink-300 hover:bg-ink-850 hover:text-ink-100'
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {item.label}
            {item.count !== undefined && (
              <span className="rounded-full bg-ink-700/60 px-1.5 py-0.5 text-micro font-semibold leading-none text-ink-200">
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
