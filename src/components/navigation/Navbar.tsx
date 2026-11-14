import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  BookMarked,
  BookOpen,
  ChevronDown,
  ExternalLink,
  Flame,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  Tags,
  UserRound,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils/format';
import { useAuth } from '@/lib/auth/AuthContext';
import { useIsAdmin } from '@/lib/auth/admin';
import { useMyProfile } from '@/hooks/useMyProfile';
import { SearchCommand } from '@/components/search/SearchCommand';

const FORMAT_GROUPS = [
  {
    label: 'Reading',
    items: [
      { to: '/manga', label: 'Manga', desc: "Japanese Girls' Love comics" },
      { to: '/manhwa', label: 'Manhwa', desc: 'Korean colored GL series' },
      { to: '/manhua', label: 'Manhua', desc: 'Chinese baihe comics' },
      { to: '/webtoons', label: 'Webtoons', desc: 'Vertical-scroll GL webtoons' },
      { to: '/novels', label: 'Novels', desc: 'Light novels & web fiction' },
    ],
  },
  {
    label: 'Screen',
    items: [
      { to: '/anime', label: 'Anime', desc: 'TV series, OVAs & films' },
      { to: '/movies', label: 'Movies', desc: 'Animated & live-action films' },
      { to: '/dramas', label: 'Dramas', desc: 'Live-action series & GL shows' },
    ],
  },
];

const FORMAT_ITEMS = FORMAT_GROUPS.flatMap((group) => group.items);

export function Navbar() {
  const { logout, user, isAuthenticated, isLoading } = useAuth();
  const { isAdmin } = useIsAdmin();
  const myProfile = useMyProfile();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [formatsOpen, setFormatsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const location = useLocation();

  const formatsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on route change (including back/forward).
  useEffect(() => {
    setFormatsOpen(false);
    setUserMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  // Click outside to close dropdowns.
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

  // Escape closes whichever menu is open.
  useEffect(() => {
    if (!formatsOpen && !userMenuOpen && !mobileOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setFormatsOpen(false);
      setUserMenuOpen(false);
      setMobileOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [formatsOpen, userMenuOpen, mobileOpen]);

  const isFormatActive = FORMAT_ITEMS.some((f) => location.pathname === f.to);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
      isActive ? 'bg-rose-500/10 font-semibold text-rose-400' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
    );

  return (
    <header className="sticky top-0 z-50 border-b border-ink-800/80 bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between gap-3 px-4 md:px-6">
        {/* Brand */}
        <Link to="/" className="group flex flex-shrink-0 items-center gap-2.5">
          <img
            src="/apple-touch-icon.png"
            alt="YuriOrbit"
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl shadow-md shadow-rose-500/20 transition-transform duration-200 group-hover:scale-105"
          />
          <span className="font-display text-xl font-bold tracking-tight text-ink-50 transition-colors group-hover:text-rose-200">
            YuriOrbit
          </span>
        </Link>

        {/* Primary nav: compact at md (key destinations), full at lg */}
        <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={({ isActive }) => cn(navLinkClass({ isActive }), 'hidden lg:inline-flex')}>
            Home
          </NavLink>

          <NavLink to="/discover" className={navLinkClass}>
            Discover
          </NavLink>

          <div className="relative hidden lg:block" ref={formatsRef}>
            <button
              type="button"
              onClick={() => setFormatsOpen((open) => !open)}
              onMouseEnter={() => setFormatsOpen(true)}
              aria-expanded={formatsOpen}
              aria-controls="formats-menu"
              aria-haspopup="true"
              className={cn(
                'flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                isFormatActive || formatsOpen
                  ? 'bg-rose-500/10 font-semibold text-rose-400'
                  : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
              )}
            >
              <span>Formats</span>
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', formatsOpen && 'rotate-180')} />
            </button>

            {formatsOpen && (
              <div
                id="formats-menu"
                onMouseLeave={() => setFormatsOpen(false)}
                className="absolute left-0 z-50 mt-2 w-[22rem] rounded-xl border border-ink-800 bg-ink-900/95 p-3 shadow-2xl backdrop-blur-xl animate-fade-in-fast"
              >
                <div className="grid grid-cols-2 gap-3">
                  {FORMAT_GROUPS.map((group) => (
                    <div key={group.label}>
                      <div className="px-2 pb-1 text-micro font-semibold uppercase tracking-wider text-ink-400">
                        {group.label}
                      </div>
                      <div className="space-y-0.5">
                        {group.items.map((item) => (
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
                            <span className="text-micro text-ink-400">{item.desc}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
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
                isActive ? 'bg-rose-500/10 font-semibold text-rose-400' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
              )
            }
          >
            <Flame className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
            <span>Trending</span>
          </NavLink>

          <NavLink
            to="/genres"
            className={({ isActive }) =>
              cn(
                'hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors lg:flex',
                isActive ? 'bg-rose-500/10 font-semibold text-rose-400' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50'
              )
            }
          >
            <Tags className="h-3.5 w-3.5 text-lavender-400" aria-hidden="true" />
            <span>Genres</span>
          </NavLink>
        </nav>

        {/* Right controls: search, library, account */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <div className="hidden sm:block">
            <SearchCommand />
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-2 text-ink-200 transition-colors hover:bg-ink-850 hover:text-ink-50 sm:hidden"
            aria-label="Search"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            <Search className="h-5 w-5" />
          </button>

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

          {!isLoading &&
            (isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full border border-ink-700/80 bg-ink-900/90 py-1 pl-1 pr-2.5 transition-all hover:border-ink-600 hover:bg-ink-850"
                  aria-label="User menu"
                  aria-expanded={userMenuOpen}
                  aria-controls="user-menu"
                  aria-haspopup="true"
                >
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt=""
                      width={24}
                      height={24}
                      decoding="async"
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-rose-500/40"
                    />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-lavender-500 text-micro font-bold text-white">
                      {(user?.givenName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <span className="hidden max-w-[90px] truncate text-xs font-medium text-ink-200 sm:inline">
                    {user?.givenName || user?.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-ink-400" aria-hidden="true" />
                </button>

                {userMenuOpen && (
                  <div
                    id="user-menu"
                    className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-ink-800 bg-ink-900/95 p-2 shadow-2xl backdrop-blur-xl animate-fade-in-fast"
                  >
                    <div className="mb-1 border-b border-ink-800/80 px-3 py-2">
                      <p className="truncate text-xs font-semibold text-ink-100">
                        {user?.givenName ? `${user.givenName} ${user?.familyName || ''}`.trim() : user?.email}
                      </p>
                      <p className="truncate text-micro text-ink-400">{user?.email}</p>
                    </div>

                    <div className="space-y-0.5">
                      <Link to="/profile" className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50">
                        <UserRound className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                        <span>Your profile</span>
                      </Link>

                      {myProfile?.username && (
                        <Link to={`/user/${myProfile.username}`} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50">
                          <ExternalLink className="h-3.5 w-3.5 text-lavender-400" aria-hidden="true" />
                          <span>Public profile</span>
                        </Link>
                      )}

                      <Link to="/library" className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50">
                        <BookMarked className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                        <span>My Library</span>
                      </Link>

                      <Link to="/settings" className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50">
                        <Settings className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
                        <span>Settings</span>
                      </Link>

                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/10">
                          <Shield className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                          <span>Admin Console</span>
                        </Link>
                      )}

                      <button
                        onClick={() => logout()}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-ink-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                      >
                        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/auth"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-200 transition-colors hover:bg-ink-850 hover:text-ink-50"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth?mode=signup"
                  className="rounded-lg bg-gradient-to-r from-rose-500 to-lavender-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/20 transition-all hover:from-rose-600 hover:to-lavender-700"
                >
                  Sign up
                </Link>
              </div>
            ))}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-xl p-2 text-ink-200 transition-colors hover:bg-ink-850 hover:text-ink-50 lg:hidden"
            aria-label="Menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet drawer */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-ink-800 bg-ink-950/98 px-4 py-4 backdrop-blur-xl animate-fade-in-fast lg:hidden"
        >
          <div className="mb-4 sm:hidden">
            <SearchCommand variant="mobile" onNavigate={() => setMobileOpen(false)} />
          </div>

          <div className="mb-3 grid grid-cols-2 gap-1.5">
            <NavLink to="/" end onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-rose-500/10 text-rose-400' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50')}>
              Home
            </NavLink>
            <NavLink to="/discover" onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-rose-500/10 text-rose-400' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50')}>
              Discover
            </NavLink>
            <NavLink to="/trending" onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-rose-500/10 text-rose-400' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50')}>
              Trending
            </NavLink>
            <NavLink to="/genres" onClick={() => setMobileOpen(false)} className={({ isActive }) => cn('rounded-lg px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-rose-500/10 text-rose-400' : 'text-ink-200 hover:bg-ink-850 hover:text-ink-50')}>
              Genres
            </NavLink>
          </div>

          <div className="mb-3 border-t border-ink-800/80 pt-3">
            <span className="px-2 text-micro font-semibold uppercase tracking-wider text-ink-400">Browse by format</span>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {FORMAT_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    location.pathname === item.to ? 'bg-rose-500/15 text-rose-300' : 'text-ink-300 hover:bg-ink-850 hover:text-ink-50'
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {!isLoading && (
            <div className="border-t border-ink-800/80 pt-3">
              {isAuthenticated ? (
                <div>
                  <div className="mb-3 flex items-center gap-2.5 px-1">
                    {user?.picture ? (
                      <img src={user.picture} alt="" width={32} height={32} decoding="async" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-lavender-500 text-xs font-bold text-white">
                        {(user?.givenName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink-100">{user?.givenName || user?.email?.split('@')[0]}</p>
                      <p className="truncate text-micro text-ink-400">{user?.email}</p>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <Link to="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-200 transition-colors hover:bg-ink-850 hover:text-ink-50">
                      <UserRound className="h-4 w-4 text-rose-400" aria-hidden="true" />
                      <span>Your profile</span>
                    </Link>
                    {myProfile?.username && (
                      <Link to={`/user/${myProfile.username}`} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-200 transition-colors hover:bg-ink-850 hover:text-ink-50">
                        <ExternalLink className="h-4 w-4 text-lavender-400" aria-hidden="true" />
                        <span>Public profile</span>
                      </Link>
                    )}
                    <Link to="/library" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-200 transition-colors hover:bg-ink-850 hover:text-ink-50">
                      <BookMarked className="h-4 w-4 text-rose-400" aria-hidden="true" />
                      <span>My Library</span>
                    </Link>
                    <Link to="/settings" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-ink-200 transition-colors hover:bg-ink-850 hover:text-ink-50">
                      <Settings className="h-4 w-4 text-ink-400" aria-hidden="true" />
                      <span>Settings</span>
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/10">
                        <Shield className="h-4 w-4 text-rose-400" aria-hidden="true" />
                        <span>Admin Console</span>
                      </Link>
                    )}
                    <button
                      onClick={() => logout()}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    to="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 rounded-xl border border-ink-700 bg-ink-900 py-2.5 text-center text-xs font-semibold text-ink-100 transition-colors hover:bg-ink-850"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/auth?mode=signup"
                    onClick={() => setMobileOpen(false)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-lavender-600 py-2.5 text-center text-xs font-semibold text-white shadow-sm transition-all hover:from-rose-600 hover:to-lavender-700"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
