import { Search, Heart, Menu, X, BookOpen } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils/format';

const NAV_LINKS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/discover', label: 'Discover' },
  { to: '/manga', label: 'Manga' },
  { to: '/manhwa', label: 'Manhwa' },
  { to: '/manhua', label: 'Manhua' },
  { to: '/webtoons', label: 'Webtoons' },
  { to: '/novels', label: 'Novels' },
  { to: '/movies', label: 'Movies' },
  { to: '/dramas', label: 'Dramas' },
  { to: '/trending', label: 'Trending' },
  { to: '/genres', label: 'Genres' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileOpen(false);
    }
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative px-1 py-2 text-sm font-medium transition-colors duration-200',
      isActive ? 'text-rose-400' : 'text-ink-200 hover:text-ink-50'
    );

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800 bg-ink-950/90 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-4 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-lavender-600">
            <Heart className="h-4 w-4 text-white" fill="white" />
          </div>
          <span className="font-display text-xl font-semibold text-ink-50 hidden sm:inline">
            YuriVerse
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-5 ml-2">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={linkClass}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <form onSubmit={handleSearch} className="hidden md:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search GL titles..."
                className="w-40 lg:w-56 rounded-lg border border-ink-700 bg-ink-850 py-2 pl-9 pr-3 text-sm text-ink-50 placeholder:text-ink-400 transition-all duration-200 focus:w-60 lg:focus:w-64 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
              />
            </div>
          </form>

          <Link
            to="/library"
            className="rounded-lg p-2 text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50"
            aria-label="Library"
          >
            <BookOpen className="h-5 w-5" />
          </Link>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50 lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-ink-800 bg-ink-950 animate-fade-in-fast">
          <div className="px-4 py-3">
            <form onSubmit={handleSearch} className="mb-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search GL titles..."
                  className="w-full rounded-lg border border-ink-700 bg-ink-850 py-2.5 pl-9 pr-3 text-sm text-ink-50 placeholder:text-ink-400 focus:border-rose-500/50 focus:outline-none"
                />
              </div>
            </form>
            <nav className="grid grid-cols-2 gap-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.exact}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-rose-500/10 text-rose-400' : 'text-ink-200 hover:bg-ink-800 hover:text-ink-50'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <NavLink
                to="/library"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive ? 'bg-rose-500/10 text-rose-400' : 'text-ink-200 hover:bg-ink-800 hover:text-ink-50'
                  )
                }
              >
                Library
              </NavLink>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
