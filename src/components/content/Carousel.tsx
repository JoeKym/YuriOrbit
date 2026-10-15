import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ContentTitle } from '@/types/content';
import { ContentCard, ContentCardSkeleton } from './ContentCard';

interface CarouselProps {
  title: string;
  titles: ContentTitle[];
  loading?: boolean;
  viewAllLink?: string;
}

export function Carousel({ title: sectionTitle, titles, loading, viewAllLink }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.7;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (!loading && titles.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="section-title">{sectionTitle}</h2>
        <div className="flex items-center gap-2">
          {viewAllLink && (
            <Link to={viewAllLink} className="btn-ghost text-xs">
              View all
            </Link>
          )}
          <button
            onClick={() => scroll('left')}
            className="rounded-full bg-ink-800 p-1.5 text-ink-200 transition-colors hover:bg-ink-750 hover:text-ink-50"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="rounded-full bg-ink-800 p-1.5 text-ink-200 transition-colors hover:bg-ink-750 hover:text-ink-50"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-hide flex gap-3 overflow-x-auto scroll-smooth pb-2"
      >
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <ContentCardSkeleton key={i} />)
          : titles.map((t) => <ContentCard key={t.id} title={t} />)}
      </div>
    </section>
  );
}
