import { Link } from 'react-router-dom';
import { Heart, Home, Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-6">
        <Heart className="h-16 w-16 text-ink-700" />
        <span className="absolute inset-0 flex items-center justify-center font-display text-2xl font-semibold text-rose-400">
          404
        </span>
      </div>
      <h1 className="font-display text-3xl font-semibold text-ink-50">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-ink-400">
        The page you're looking for doesn't exist or may have moved. Let's get you back to discovering GL content.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/" className="btn-secondary">
          <Home className="h-4 w-4" /> Home
        </Link>
        <Link to="/discover" className="btn-primary">
          <Compass className="h-4 w-4" /> Discover GL
        </Link>
      </div>
    </div>
  );
}
