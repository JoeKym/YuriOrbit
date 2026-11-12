import { Link } from 'react-router-dom';
import { Heart, Compass, BookOpen, Shield, Globe, Sparkles, Film, Eye } from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { PageHeading } from '@/components/layout/PageHeading';
import { CatalogStats } from '@/components/site/CatalogStats';

export function AboutPage() {
  usePageMeta({
    title: 'About',
    description: 'Learn about YuriOrbit, a discovery platform for Girls\' Love anime, manga, manhwa, webtoons, novels, and dramas.',
    path: '/about',
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="text-center mb-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-lavender-600 mb-4 shadow-lg shadow-rose-500/20">
          <Heart className="h-7 w-7 text-white" fill="white" />
        </div>
        <PageHeading
          align="center"
          eyebrow="About the project"
          title="Yuri"
          accent="Orbit"
          description="The premier discovery platform for Girls' Love & Yuri."
        />
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-ink-300 leading-relaxed text-base">
          YuriOrbit is a modern discovery hub and reading companion dedicated to Girls' Love (GL), yuri, baihe,
          and sapphic storytelling. We bring together literature, comics, animation, and live-action cinema into one
          seamless, unified storefront.
        </p>
        <p className="mt-4 text-ink-300 leading-relaxed text-base">
          Whether you are looking for classic Japanese manga, trending Korean manhwa, Chinese baihe webtoons,
          hit Thai GL dramas (like <em>GAP</em>, <em>The Secret of Us</em>, and <em>23.5</em>), or acclaimed international
          films, YuriOrbit indexes, categorizes, and organizes them all without manual data entry.
        </p>
      </div>

      <CatalogStats />

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="card-surface p-5">
          <Compass className="h-6 w-6 text-rose-400 mb-2" />
          <h2 className="font-semibold text-ink-50">Smart GL Discovery</h2>
          <p className="mt-1 text-sm text-ink-400">
            Intelligent keyword and taxonomy filtering that highlights genuine female-female romance while filtering
            out non-GL false positives, sports dramas, and BL series.
          </p>
        </div>

        <div className="card-surface p-5">
          <BookOpen className="h-6 w-6 text-lavender-400 mb-2" />
          <h2 className="font-semibold text-ink-50">Built-in Manga Reader</h2>
          <p className="mt-1 text-sm text-ink-400">
            Read manga and webtoons directly in your browser with smooth vertical-scroll and paginated reader modes,
            backed by high-speed edge image proxying.
          </p>
        </div>

        <div className="card-surface p-5">
          <Film className="h-6 w-6 text-rose-400 mb-2" />
          <h2 className="font-semibold text-ink-50">Live-Action & Dramas</h2>
          <p className="mt-1 text-sm text-ink-400">
            Comprehensive cataloging for Thai GL series, Japanese & Korean television, and worldwide sapphic cinema
            powered by TMDB metadata integration.
          </p>
        </div>

        <div className="card-surface p-5">
          <Globe className="h-6 w-6 text-lavender-400 mb-2" />
          <h2 className="font-semibold text-ink-50">Multi-Source Engine</h2>
          <p className="mt-1 text-sm text-ink-400">
            Unified data architecture syncing live from AniList, MangaDex, and TMDB with automated deduplication
            and canonical slug mapping.
          </p>
        </div>
      </div>

      <div className="mt-10 card-surface p-5">
        <Sparkles className="h-5 w-5 text-rose-400 mb-2" />
        <h2 className="font-semibold text-ink-50">Our Guiding Standards</h2>
        <ul className="mt-3 space-y-2 text-sm text-ink-300">
          <li className="flex items-start gap-2">
            <span className="text-rose-400 font-bold">•</span>
            <span><strong>Strict GL/Yuri Focus:</strong> Dedicated exclusively to female-female romance and wlw stories; BL is kept out of the main catalog.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-400 font-bold">•</span>
            <span><strong>No File Hosting:</strong> We respect creators and publishers. We do not host copyrighted video files or pirated archives.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-400 font-bold">•</span>
            <span><strong>Privacy & Local-First:</strong> Full catalog browsing and personal tracking work completely offline with no tracking or profiling.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-400 font-bold">•</span>
            <span><strong>Respectful Maturity Filtering:</strong> Explicit content is hidden by default and requires opt-in browser confirmation.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-400 font-bold">•</span>
            <span><strong>Safety & Appeals:</strong> Accounts/content may be moderated for safety and policy reasons. If you believe an action was wrong, use the <Link to="/appeals" className="text-rose-300 hover:underline">appeals page</Link>.</span>
          </li>
        </ul>
      </div>

      <div className="mt-10 card-surface p-6 border border-ink-800 bg-gradient-to-br from-ink-900 to-ink-950">
        <h2 className="text-base font-semibold text-ink-50 mb-1">Crafted & Engineered by JoeKym Labs</h2>
        <p className="text-sm text-ink-400 leading-relaxed mb-4">
          YuriOrbit is created and maintained by <strong className="text-ink-100">JoeKym Labs</strong>, a modern digital product
          studio building high-performance web applications and tailored software experiences.
        </p>
        <a
          href="https://joekymlabs.pages.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-ink-800 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-ink-750 border border-ink-700 transition-colors"
        >
          <span>Visit JoeKym Labs</span>
          <span className="text-ink-400">&rarr;</span>
        </a>
        <p className="mt-4 text-xs text-ink-400">
          Questions, corrections or press enquiries? See the{' '}
          <Link to="/contact" className="text-rose-300 hover:underline">contact page</Link>{' '}
          or the <Link to="/faq" className="text-rose-300 hover:underline">FAQ</Link>.
        </p>
      </div>

      <div className="mt-10 text-center">
        <Link to="/discover" className="btn-primary">
          Start Exploring YuriOrbit
        </Link>
      </div>
    </div>
  );
}
