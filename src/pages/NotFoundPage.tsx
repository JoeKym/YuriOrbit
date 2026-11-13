import { Link } from 'react-router-dom';
import { Heart, Home, Compass, Search, Sparkles } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { PageHeader } from '@/components/layout/PageHeader';

export function NotFoundPage() {
  usePageMeta({
    title: 'Page Not Found',
    description: 'The page you requested could not be found on YuriOrbit.',
    path: undefined,
    noIndex: true,
  });

  return (
    <div className="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
      <div className="pointer-events-none absolute inset-0">
        <div className="animate-float-y-slow absolute left-[10%] top-20 h-28 w-28 rounded-full bg-rose-500/10 blur-2xl" />
        <div className="animate-drift-x absolute right-[12%] top-28 h-36 w-36 rounded-full bg-lavender-500/10 blur-3xl" />
        <div className="animate-float-y absolute bottom-16 left-1/3 h-24 w-24 rounded-full bg-rose-400/10 blur-2xl" />
      </div>

      <div className="relative animate-fade-up">
        <div className="relative mb-6 inline-flex items-center justify-center">
          <div className="animate-spin-slow absolute -inset-4 rounded-full border border-dashed border-rose-500/15" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-ink-800 bg-ink-900/80 shadow-card">
            <Heart className="h-10 w-10 animate-pulse-soft text-rose-400/50" />
            <span className="absolute inset-0 flex items-center justify-center font-display text-3xl font-semibold text-gradient">
              404
            </span>
          </div>
          <div className="animate-float-y absolute -right-3 -top-1 rounded-lg border border-ink-700 bg-ink-900 p-1.5 shadow-card">
            <Sparkles className="h-3.5 w-3.5 text-lavender-400" />
          </div>
        </div>

        <PageHeader
          eyebrow="404"
          title="Lost in"
          accent="orbit"
          description="The page you're looking for doesn't exist, moved, or isn't available right now. Let's get you back to discovering Girls' Love stories."
          align="center"
        />

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-secondary">
            <Home className="h-4 w-4" /> Home
          </Link>
          <Link to="/discover" className="btn-primary">
            <Compass className="h-4 w-4" /> Discover GL
          </Link>
          <Link to="/search" className="btn-secondary">
            <Search className="h-4 w-4" /> Search
          </Link>
        </div>

        <div className="mx-auto mt-8 max-w-md rounded-xl border border-ink-800 bg-ink-900/50 p-4 text-left">
          <p className="text-micro font-semibold uppercase tracking-wider text-ink-400">Try these</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              ['/trending', 'Trending'],
              ['/genres', 'Genres'],
              ['/manga', 'Manga'],
              ['/anime', 'Anime'],
              ['/appeals', 'Appeals'],
              ['/contact', 'Contact'],
            ].map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className="rounded-lg border border-ink-700 bg-ink-850 px-2.5 py-1 text-xs text-ink-300 transition-colors hover:border-rose-500/30 hover:text-rose-300"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
