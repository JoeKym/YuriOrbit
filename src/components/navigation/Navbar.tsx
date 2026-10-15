import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  Menu,
  X,
  BookOpen,
  LogOut,
  Shield,
  ChevronDown,
  Sparkles,
  Flame,
  Tags,
  Compass,
  Film,
  BookMarked,
  Settings,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils/format';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import { useIsAdmin } from '@/lib/auth/admin';

const FORMAT_ITEMS = [
  { to: '/manga', label: 'Manga', desc: 'Japanese Girls\' Love comics' },
  { to: '/manhwa', label: 'Manhwa', desc: 'Korean colored GL series' },
  { to: '/manhua', label: 'Manhua', desc: 'Chinese baihe comics' },
  { to: '/webtoons', label: 'Webtoons', desc: 'Vertical-scroll GL webtoons' },
  { to: '/novels', label: 'Novels', desc: 'Light novels & web fiction' },
  { to: '/movies', label: 'Movies', desc: 'Animated & live-action films' },
  { to: '/dramas', label: 'Dramas', desc: 'Live-action series & GL shows' },
];

export function Navbar() {
  const { login, register, logout, user, isAuthenticated, isLoading } = useKindeAuth();
  const { isAdmin } = useIsAdmin();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [formatsOpen, setFormatsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const formatsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on route change
  useEffect(() => {
    setFormatsOpen(false);
    setUserMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  // Click outside to close menus
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (formatsRef.current && !formatsRef.current.contains(e.target as Node)) {
        setFormatsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileOpen(false);
    }
  };

  const isFormatActive = FORMAT_ITEMS.some((f) => location.pathname === f.to);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between gap-4 px-4 md:px-6">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
          <img
            src="/apple-touch-icon.png"
            alt="YuriOrbit"
            className="h-9 w-9 rounded-xl shadow-md shadow-rose-500/20 transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold tracking-tight text-ink-50 transition-colors group-hover:text-rose-200">
              YuriOrbit
            </span>
          </div>
        </Link>

        {/* Primary Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-1.5 ml-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive ? 'bg-rose-500/10 text-rose-400 font-semibold' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
              )
            }
          >
            Home
          </NavLink>

          <NavLink
            to="/discover"
            className={({ isActive }) =>
              cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive ? 'bg-rose-500/10 text-rose-400 font-semibold' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
              )
            }
          >
            Discover
          </NavLink>

          {/* Formats Dropdown */}
          <div className="relative" ref={formatsRef}>
            <button
              onClick={() => setFormatsOpen(!formatsOpen)}
              onMouseEnter={() => setFormatsOpen(true)}
              className={cn(
                'flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isFormatActive || formatsOpen
                  ? 'bg-rose-500/10 text-rose-400 font-semibold'
                  : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
              )}
            >
              <span>Formats</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', formatsOpen && 'rotate-180')} />
            </button>

            {formatsOpen && (
              <div
                onMouseLeave={() => setFormatsOpen(false)}
                className="absolute left-0 mt-2 w-64 rounded-xl border border-ink-800 bg-ink-900/95 p-2 shadow-2xl backdrop-blur-xl animate-fade-in-fast z-50"
              >
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  Girls' Love Formats
                </div>
                <div className="mt-1 space-y-0.5">
                  {FORMAT_ITEMS.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        'flex flex-col rounded-lg px-2.5 py-1.5 transition-colors',
                        location.pathname === item.to
                          ? 'bg-rose-500/15 text-rose-300'
                          : 'text-ink-200 hover:bg-ink-800 hover:text-ink-50'
                      )}
                    >
                      <span className="text-sm font-medium">{item.label}</span>
                      <span className="text-[11px] text-ink-400">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <NavLink
            to="/trending"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive ? 'bg-rose-500/10 text-rose-400 font-semibold' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
              )
            }
          >
            <Flame className="h-3.5 w-3.5 text-rose-400" />
            <span>Trending</span>
          </NavLink>

          <NavLink
            to="/genres"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isActive ? 'bg-rose-500/10 text-rose-400 font-semibold' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
              )
            }
          >
            <Tags className="h-3.5 w-3.5 text-lavender-400" />
            <span>Genres</span>
          </NavLink>
        </nav>

        {/* Right Controls: Search, Library & Auth */}
        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="hidden sm:block">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search GL titles..."
                className="w-44 md:w-56 lg:w-64 rounded-full border border-ink-800 bg-ink-900/80 py-1.5 pl-8 pr-3 text-xs text-ink-50 placeholder:text-ink-400 transition-all duration-200 focus:border-rose-500/50 focus:bg-ink-850 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
              />
            </div>
          </form>

          {/* Library Link */}
          <Link
            to="/library"
            className={cn(
              'rounded-xl p-2 text-ink-200 transition-colors hover:bg-ink-850 hover:text-ink-50',
              location.pathname === '/library' && 'bg-rose-500/10 text-rose-400'
            )}
            title="My Library"
            aria-label="My Library"
          >
            <BookOpen className="h-5 w-5" />
          </Link>

          {/* User / Auth Section */}
          {!isLoading && (
            isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-full border border-ink-700/80 bg-ink-900/90 py-1 pl-1 pr-2.5 transition-all hover:border-ink-600 hover:bg-ink-850"
                  aria-label="User menu"
                >
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.givenName || 'User'}
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-rose-500/40"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-lavender-500 text-[11px] font-bold text-white">
                      {(user?.givenName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-medium text-ink-200 max-w-[90px] truncate">
                    {user?.givenName || user?.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-ink-400" />
                </button>

                {/* User Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-ink-800 bg-ink-900/95 p-2 shadow-2xl backdrop-blur-xl animate-fade-in-fast z-50">
                    <div className="px-3 py-2 border-b border-ink-800/80 mb-1">
                      <p className="text-xs font-semibold text-ink-100 truncate">
                        {user?.givenName ? `${user.givenName} ${user?.familyName || ''}`.trim() : user?.email}
                      </p>
                      <p className="text-[11px] text-ink-400 truncate">{user?.email}</p>
                    </div>

                    <div className="space-y-0.5">
                      <Link
                        to="/library"
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-200 hover:bg-ink-800 hover:text-ink-50 transition-colors"
                      >
                        <BookMarked className="h-3.5 w-3.5 text-rose-400" />
                        <span>My Library</span>
                      </Link>

                      <Link
                        to="/settings"
                        className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-200 hover:bg-ink-800 hover:text-ink-50 transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5 text-ink-400" />
                        <span>Settings</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <Shield className="h-3.5 w-3.5 text-rose-400" />
                          <span>Admin Console</span>
                        </Link>
                      )}

                      <button
                        onClick={() => logout()}
                        className="w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => login()}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-200 hover:bg-ink-850 hover:text-ink-50 transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => register()}
                  className="rounded-lg bg-gradient-to-r from-rose-500 to-lavender-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-rose-600 hover:to-lavender-700 transition-all shadow-rose-500/20"
                >
                  Sign up
                </button>
              </div>
            )
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-xl p-2 text-ink-200 transition-colors hover:bg-ink-850 hover:text-ink-50 lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-ink-800 bg-ink-950/98 px-4 py-4 backdrop-blur-xl animate-fade-in-fast">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="mb-4 sm:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search GL titles..."
                className="w-full rounded-xl border border-ink-800 bg-ink-900 py-2 pl-9 pr-3 text-sm text-ink-50 placeholder:text-ink-400 focus:border-rose-500/50 focus:outline-none"
              />
            </div>
          </form>

          {/* Primary Mobile Links */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <NavLink
              to="/"
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-rose-500/10 text-rose-400' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
                )
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/discover"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-rose-500/10 text-rose-400' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
                )
              }
            >
              Discover
            </NavLink>
            <NavLink
              to="/trending"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-rose-500/10 text-rose-400' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
                )
              }
            >
              Trending
            </NavLink>
            <NavLink
              to="/genres"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive ? 'bg-rose-500/10 text-rose-400' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
                )
              }
            >
              Genres
            </NavLink>
          </div>

          {/* Formats Section */}
          <div className="pt-3 border-t border-ink-800/80 mb-3">
            <span className="px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Browse by Format
            </span>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {FORMAT_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    location.pathname === item.to
                      ? 'bg-rose-500/15 text-rose-300'
                      : 'text-ink-300 hover:bg-ink-850 hover:text-ink-50'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Auth Footer in Mobile Menu */}
          {!isLoading && (
            <div className="pt-3 border-t border-ink-800/80">
              {isAuthenticated ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {user?.picture ? (
                      <img
                        src={user.picture}
                        alt={user.givenName || 'User'}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-lavender-500 text-xs font-bold text-white">
                        {(user?.givenName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-ink-100">
                        {user?.givenName || user?.email?.split('@')[0]}
                      </p>
                      <p className="text-[11px] text-ink-400">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-lg p-2 text-ink-300 hover:bg-ink-800 hover:text-ink-100 transition-colors"
                        title="Admin Dashboard"
                      >
                        <Shield className="h-4 w-4 text-rose-400" />
                      </Link>
                    )}
                    <button
                      onClick={() => logout()}
                      className="rounded-lg p-2 text-ink-400 hover:bg-ink-800 hover:text-rose-400 transition-colors"
                      title="Sign out"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      login();
                      setMobileOpen(false);
                    }}
                    className="flex-1 rounded-xl border border-ink-700 bg-ink-900 py-2.5 text-center text-xs font-semibold text-ink-100 hover:bg-ink-850 transition-colors"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => {
                      register();
                      setMobileOpen(false);
                    }}
                    className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-lavender-600 py-2.5 text-center text-xs font-semibold text-white shadow-sm hover:from-rose-600 hover:to-lavender-700 transition-all"
                  >
                    Sign up
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
