import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { ContentCardGrid, ContentCardSkeleton } from '@/components/content/ContentCard';
import type { ContentTitle } from '@/types/content';
import { searchGLTitles } from '@/lib/providers';
import { GL_ALLOWED_CLASSIFICATIONS } from '@/lib/providers/classify';

export function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [titles, setTitles] = useState<ContentTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!query.trim()) {
        setTitles([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(false);
      try {
        const result = await searchGLTitles({ query }, 1, 30);
        if (cancelled) return;
        setTitles(result.items.filter((t) => GL_ALLOWED_CLASSIFICATIONS.includes(t.glClassification)));
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [query]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <h1 className="mb-1 font-display text-3xl font-semibold text-ink-50">
        {query ? `Results for "${query}"` : 'Search'}
      </h1>
      <p className="mb-6 text-sm text-ink-400">
        {titles.length > 0 && !loading ? `${titles.length} title${titles.length !== 1 ? 's' : ''} found` : 'Search across GL manga, manhwa, novels, and more.'}
      </p>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 14 }).map((_, i) => <ContentCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-ink-400 mb-4">Search failed. Please try again.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      ) : titles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="mb-4 h-12 w-12 text-ink-600" />
          <p className="text-lg font-medium text-ink-200">{query ? 'No titles found' : 'Start searching'}</p>
          <p className="mt-1 text-sm text-ink-400">
            {query ? 'Try different keywords or browse the catalogue.' : 'Use the search bar above to find GL titles.'}
          </p>
        </div>
      ) : (
        <ContentCardGrid titles={titles} />
      )}
    </div>
  );
}
