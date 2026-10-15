import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContentCardGrid, ContentCardSkeleton } from '@/components/content/ContentCard';
import type { ContentTitle, ContentType } from '@/types/content';
import { getGLByContentType, getPopularGL } from '@/lib/providers';
import { GL_ALLOWED_CLASSIFICATIONS } from '@/lib/providers/classify';

interface CategoryPageProps {
  contentType: ContentType;
  title: string;
}

export function CategoryPage({ contentType, title }: CategoryPageProps) {
  const [titles, setTitles] = useState<ContentTitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(false);
      try {
        let result: ContentTitle[];
        if (contentType === 'MOVIE' || contentType === 'TV' || contentType === 'WEBTOON') {
          result = await getPopularGL(30);
        } else {
          result = await getGLByContentType(contentType, 30);
        }
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
  }, [contentType]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-6">
      <h1 className="mb-1 font-display text-3xl font-semibold text-ink-50">{title}</h1>
      <p className="mb-6 text-sm text-ink-400">
        {contentType === 'MOVIE' || contentType === 'TV'
          ? 'Film and television metadata requires TMDB configuration. Showing all GL content as fallback.'
          : `Browse ${title.toLowerCase()} from the AniList catalogue.`}
      </p>

      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
          {Array.from({ length: 14 }).map((_, i) => <ContentCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-ink-400 mb-4">Failed to load content. Please try again.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      ) : titles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium text-ink-200">No titles found</p>
          <p className="mt-1 text-sm text-ink-400">This category may not have enough classified GL content yet.</p>
          <Link to="/discover" className="btn-secondary mt-4">Browse all GL</Link>
        </div>
      ) : (
        <ContentCardGrid titles={titles} />
      )}
    </div>
  );
}
