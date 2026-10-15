import { useEffect, useState } from 'react';
import { ContentCardGrid, ContentCardSkeleton } from '@/components/content/ContentCard';
import type { ContentTitle } from '@/types/content';
import { getTrendingGL } from '@/lib/providers';
import { GL_ALLOWED_CLASSIFICATIONS } from '@/lib/providers/classify';

export function TrendingPage() {
  const [titles, setTitles] = useState<ContentTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const result = await getTrendingGL(40);
        if (cancelled) return;
        setTitles(result.filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification)));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <h1 className="mb-1 font-display text-3xl font-semibold text-ink-50">Trending GL</h1>
      <p className="mb-6 text-sm text-ink-400">The most popular Girls' Love titles right now.</p>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 14 }).map((_, i) => <ContentCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-ink-400 mb-4">Failed to load trending titles.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      ) : (
        <ContentCardGrid titles={titles} />
      )}
    </div>
  );
}
