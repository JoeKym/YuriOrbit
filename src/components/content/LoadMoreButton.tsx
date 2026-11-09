import { ChevronDown, Loader2 } from 'lucide-react';

interface LoadMoreButtonProps {
  onClick: () => void;
  loading: boolean;
  hasMore: boolean;
  count: number;
  label?: string;
}

export function LoadMoreButton({ onClick, loading, hasMore, count, label = 'title' }: LoadMoreButtonProps) {
  if (count === 0) return null;

  return (
    <div className="mt-10 flex flex-col items-center gap-2">
      {hasMore ? (
        <button
          type="button"
          onClick={onClick}
          disabled={loading}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
          {loading ? 'Loading…' : 'Load more'}
        </button>
      ) : (
        <p className="text-xs text-ink-500">
          You've reached the end — {count} {label}
          {count === 1 ? '' : 's'} shown.
        </p>
      )}
    </div>
  );
}
