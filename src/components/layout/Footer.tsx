import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

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
      { to: '/movies', label: 'Movies' },
      { to: '/dramas', label: 'Dramas & Series' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/library', label: 'My Library' },
      { to: '/settings', label: 'Settings' },
      { to: '/about', label: 'About YuriVerse' },
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
  return (
    <footer className="mt-16 border-t border-ink-800 bg-ink-950">
      <div className="mx-auto max-w-[1600px] px-4 py-12 md:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-lavender-600">
                <Heart className="h-4 w-4 text-white" fill="white" />
              </div>
              <span className="font-display text-xl font-semibold text-ink-50">YuriVerse</span>
            </Link>
            <p className="text-sm text-ink-400 max-w-xs leading-relaxed">
              Your world of Girls' Love. Discover yuri manga, manhwa, webtoons, novels, movies, and dramas from across the world.
            </p>
          </div>
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-sm font-semibold text-ink-200">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="text-sm text-ink-400 transition-colors hover:text-rose-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-ink-800 pt-6 sm:flex-row">
          <p className="text-xs text-ink-400">
            Metadata provided by AniList. YuriVerse is a discovery platform and does not host copyrighted content.
          </p>
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} YuriVerse. Made with care.
          </p>
        </div>
      </div>
    </footer>
  );
}
