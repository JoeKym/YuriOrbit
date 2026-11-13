import { Link } from 'react-router-dom';
import { Code2, ExternalLink, Heart } from 'lucide-react';

const FOOTER_SECTIONS = [
  {
    title: 'Discover',
    links: [
      { to: '/discover', label: 'All GL Content' },
      { to: '/trending', label: 'Trending' },
      { to: '/genres', label: 'Genres' },
      { to: '/search', label: 'Search' },
    ],
  },
  {
    title: 'Formats',
    links: [
      { to: '/manga', label: 'Manga' },
      { to: '/manhwa', label: 'Manhwa' },
      { to: '/manhua', label: 'Manhua' },
      { to: '/webtoons', label: 'Webtoons' },
      { to: '/novels', label: 'Novels' },
    ],
  },
  {
    title: 'Screen',
    links: [
      { to: '/anime', label: 'Anime' },
      { to: '/movies', label: 'Movies' },
      { to: '/dramas', label: 'Dramas & Series' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/library', label: 'My Library' },
      { to: '/settings', label: 'Settings' },
      { to: '/about', label: 'About YuriOrbit' },
    ],
  },
  {
    title: 'Support',
    links: [
      { to: '/faq', label: 'FAQ' },
      { to: '/contact', label: 'Contact Us' },
      { to: '/feedback', label: 'Send Feedback' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms of Use' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-20 border-t border-ink-800/80 bg-ink-950">
      {/* Subtle top accent */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-24 w-[min(48rem,90%)] -translate-x-1/2 bg-gradient-to-b from-rose-500/[0.07] to-transparent blur-2xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-page px-4 pt-12 pb-8 md:px-6 md:pt-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-4">
            <Link to="/" className="group inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-lavender-600 shadow-glow transition-transform duration-200 group-hover:scale-[1.03]">
                <Heart className="h-4.5 w-4.5 text-white" fill="white" aria-hidden="true" />
              </div>
              <span className="font-display text-2xl font-semibold tracking-tight text-ink-50">
                YuriOrbit
              </span>
            </Link>

            <p className="mt-4 max-w-sm text-body-sm leading-relaxed text-ink-400">
              Your world of Girls&apos; Love. Discover and track yuri manga, manhwa, webtoons, novels,
              anime, movies, and dramas from across the globe.
            </p>

            <a
              href="https://joekymlabs.pages.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="group mt-5 inline-flex items-center gap-2 rounded-xl border border-ink-800 bg-ink-900/50 px-3.5 py-2 text-xs text-ink-300 transition-all duration-200 hover:border-rose-500/40 hover:bg-ink-850 hover:text-ink-100"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ink-800 text-rose-400 transition-colors group-hover:bg-rose-500/15">
                <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span>
                Developed by{' '}
                <strong className="font-semibold text-ink-100 transition-colors group-hover:text-rose-300">
                  JoeKym Labs
                </strong>
              </span>
              <ExternalLink className="h-3 w-3 text-ink-500 transition-colors group-hover:text-ink-300" aria-hidden="true" />
            </a>
          </div>

          {/* Link groups */}
          <nav
            aria-label="Footer"
            className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:col-span-8 lg:grid-cols-6"
          >
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-micro font-semibold uppercase tracking-[0.18em] text-ink-300">
                  {section.title}
                </h3>
                <ul className="mt-3 space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm text-ink-400 transition-colors duration-200 hover:text-rose-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-ink-800/80 pt-6 text-xs text-ink-400 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl leading-relaxed">
            Powered by AniList, MangaDex &amp; TMDB. YuriOrbit is a discovery platform and does not host
            copyrighted media.
          </p>
          <p className="shrink-0 text-ink-400">
            &copy; {year} YuriOrbit <span className="mx-1.5 text-ink-600" aria-hidden="true">·</span>{' '}
            Built with care by{' '}
            <a
              href="https://joekymlabs.pages.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink-300 underline decoration-ink-700 underline-offset-2 transition-colors hover:text-rose-400 hover:decoration-rose-500/40"
            >
              JoeKym Labs
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
