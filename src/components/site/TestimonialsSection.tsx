import { useEffect, useState } from 'react';
import { Quote, Star } from 'lucide-react';
import { fetchApprovedReviews, type SiteReview } from '@/lib/reviews';
import { cn } from '@/lib/utils/format';

function Stars({ rating = 5 }: { rating?: number }) {
  const n = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <div className="flex items-center gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={cn('h-3.5 w-3.5', i < n ? 'fill-amber-400 text-amber-400' : 'text-ink-700')} />
      ))}
    </div>
  );
}

export function TestimonialsSection({
  title = 'Loved by GL readers',
  subtitle = 'Real feedback from people using YuriOrbit to discover and track Girls’ Love stories.',
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const [reviews, setReviews] = useState<SiteReview[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchApprovedReviews().then((rows) => {
      if (cancelled) return;
      setReviews(rows);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || reviews.length === 0) return null;

  const items = compact ? reviews.slice(0, 3) : reviews;

  return (
    <section className={cn('mx-auto max-w-page px-4 md:px-6', compact ? 'py-8' : 'py-12')}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink-50 md:text-3xl">{title}</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-400">{subtitle}</p>
        </div>
      </div>
      <div className={cn('grid gap-3', compact ? 'md:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3')}>
        {items.map((review) => (
          <figure
            key={review.id}
            className="card-surface relative overflow-hidden p-5 transition-colors hover:border-ink-700"
          >
            <Quote className="absolute right-4 top-4 h-5 w-5 text-rose-500/15" />
            <Stars rating={review.rating ?? 5} />
            <blockquote className="mt-3 text-sm leading-relaxed text-ink-200">“{review.quote.trim()}”</blockquote>
            <figcaption className="mt-4 border-t border-ink-800 pt-3">
              <div className="text-sm font-medium text-ink-100">{review.name || 'YuriOrbit user'}</div>
              {review.role && <div className="text-micro text-ink-400">{review.role}</div>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
