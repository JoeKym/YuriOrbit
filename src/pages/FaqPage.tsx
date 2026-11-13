import { Link } from 'react-router-dom';
import {
  HelpCircle,
  Shield,
  BookOpen,
  Globe,
  SlidersHorizontal,
  Palette,
  Wrench,
  Scale,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { PageHeading } from '@/components/layout/PageHeading';

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

interface FaqSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: FaqItem[];
}

const SECTIONS: FaqSection[] = [
  {
    title: 'Discovery & Content',
    icon: Globe,
    items: [
      {
        q: 'What content does YuriOrbit focus on?',
        a: (
          <p>
            YuriOrbit is a discovery and tracking platform for Girls' Love (GL), yuri, and sapphic romance across
            anime, manga, manhwa, manhua, webtoons, light/web novels, movies, and live-action dramas/series. We
            prioritize accurate GL results and do not include BL (Boys' Love) in the primary catalogue.
          </p>
        ),
      },
      {
        q: "Why don't I see certain titles?",
        a: (
          <div className="space-y-2">
            <p>
              Results depend on your filters, search terms, and <strong>content maturity setting</strong>. If a title is
              missing, check:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Search/genre/format/status filters on the page.</li>
              <li>Settings → Content filter (Safe, Suggestive, Erotica). Higher levels show more titles.</li>
              <li>Whether the title is indexed by our connected metadata providers.</li>
            </ul>
          </div>
        ),
      },
      {
        q: 'Do you host manga chapters or stream video?',
        a: (
          <p>
            No. YuriOrbit indexes metadata and links to official/third-party sources. Where supported, the reader acts as
            a client interface to upstream providers (e.g., MangaDex). We do not host or redistribute copyrighted media
            files.
          </p>
        ),
      },
      {
        q: 'How is GL classification handled?',
        a: (
          <p>
            We use provider metadata and classification signals to surface canonical GL and related content. You can
            adjust GL classification filters (where available) to include or narrow results. If you spot incorrect
            metadata, use the report/feedback tools on the title page.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Filters, Maturity & Library Growth',
    icon: SlidersHorizontal,
    items: [
      {
        q: 'How do I make the library show more titles (including mature content)?',
        a: (
          <div className="space-y-2">
            <p>
              Go to <Link to="/settings" className="text-rose-300 hover:underline">Settings → Content filter</Link>.
              Choosing <strong>Erotica (18+)</strong> (after age confirmation) expands what you can browse across the
              site, including mature titles from connected sources where available.
            </p>
            <p className="text-ink-400">
              Adult content is never shown without your explicit 18+ confirmation and selected filter level.
            </p>
          </div>
        ),
      },
      {
        q: 'Where can I filter content on listing pages?',
        a: (
          <p>
            Discovery and content pages provide filters (search, format/type, genre, status, sort, and classification
            where relevant). Use the Filters controls on pages like <Link to="/discover" className="text-rose-300 hover:underline">Discover</Link>,{' '}
            <Link to="/search" className="text-rose-300 hover:underline">Search</Link>, and category pages to refine
            results without losing your place.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Library, Reading & Accounts',
    icon: BookOpen,
    items: [
      {
        q: 'Do I need an account?',
        a: (
          <p>
            No. You can browse and use core features without signing in. With an account, you can sync supported library
            data across devices and manage your profile. Local-only data is stored in your browser unless you choose to
            use cloud features.
          </p>
        ),
      },
      {
        q: 'Where is my library stored?',
        a: (
          <p>
            By default, library/progress and preferences can be stored locally in your browser. If you sign in and sync
            is available, supported data may be stored in your account. You can export a local backup from{' '}
            <Link to="/settings" className="text-rose-300 hover:underline">Settings</Link>.
          </p>
        ),
      },
      {
        q: 'How do I delete my account?',
        a: (
          <p>
            Go to <Link to="/settings" className="text-rose-300 hover:underline">Settings → Danger Zone</Link> and use{' '}
            <strong>Delete account</strong> (you’ll be asked to type <code className="rounded bg-ink-800 px-1">DELETE</code> to
            confirm). You can also contact us via the{' '}
            <Link to="/contact" className="text-rose-300 hover:underline">contact page</Link> for account-related help.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Appearance & Themes',
    icon: Palette,
    items: [
      {
        q: 'Can I change the site theme?',
        a: (
          <p>
            Yes. Visit <Link to="/settings" className="text-rose-300 hover:underline">Settings → Appearance</Link> to
            choose a GL-aligned theme preset (e.g., Sakura Blush, Wisteria Dusk, Noir Rose, Moonlit Lily). Theme
            preferences are saved on your device.
          </p>
        ),
      },
      {
        q: 'Will themes affect my data?',
        a: <p>No. Themes only change appearance. Resetting settings or clearing local data is separate and clearly labeled in the Danger Zone.</p>,
      },
    ],
  },
  {
    title: 'Reports, Moderation & Appeals',
    icon: Scale,
    items: [
      {
        q: 'How do I report incorrect metadata or a problem?',
        a: (
          <p>
            Use the report/feedback controls on title pages or submit details via{' '}
            <Link to="/feedback" className="text-rose-300 hover:underline">Feedback</Link>. Include the title, what’s
            wrong, and (if possible) the correct information or source.
          </p>
        ),
      },
      {
        q: 'What moderation actions can be taken?',
        a: (
          <p>
            To keep the platform safe and accurate, admins may take actions such as warnings, suspensions, bans for
            accounts, or content restrictions/takedowns where appropriate (e.g., policy violations, valid rights
            requests, or harmful/incorrect listings). Actions are handled case by case.
          </p>
        ),
      },
      {
        q: 'How do I submit an appeal?',
        a: (
          <p>
            If you believe an account or content moderation action was made in error, submit an appeal through the{' '}
            <Link to="/appeals" className="text-rose-300 hover:underline">Appeals page</Link>. Provide relevant context,
            identifiers (username, title/URL), and any supporting information. Appeals are reviewed by the admin team.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Maintenance, Safety & Privacy',
    icon: Shield,
    items: [
      {
        q: 'What happens during maintenance?',
        a: (
          <p>
            When maintenance mode is active, the site may show a maintenance screen with an optional ETA while updates
            are applied. Admin and sign-in access remain available for recovery. Check back after the posted time or
            follow official updates if provided.
          </p>
        ),
      },
      {
        q: 'Does YuriOrbit track my sexuality or sell my data?',
        a: (
          <p>
            No. We do not infer a user’s sexuality from reading preferences, and we do not sell personal data or run
            behavioral ad networks. See our <Link to="/privacy" className="text-rose-300 hover:underline">Privacy Policy</Link>{' '}
            for details.
          </p>
        ),
      },
      {
        q: 'How are copyright/takedown requests handled?',
        a: (
          <p>
            Submit rights requests with ownership verification, the specific URL/title, and requested action via{' '}
            <Link to="/contact" className="text-rose-300 hover:underline">Contact</Link> or email. Valid requests are
            reviewed promptly. See <Link to="/terms" className="text-rose-300 hover:underline">Terms</Link> for the
            process.
          </p>
        ),
      },
    ],
  },
];

export function FaqPage() {
  usePageMeta({
    title: 'FAQ',
    description:
      'Frequently asked questions about YuriOrbit: discovery, filters, maturity settings, library, themes, moderation, appeals, maintenance, and privacy.',
    path: '/faq',
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-lavender-600">
          <HelpCircle className="h-7 w-7 text-white" />
        </div>
        <PageHeading
          align="center"
          eyebrow="Platform transparency & knowledge base"
          title="Frequently Asked"
          accent="Questions"
          description="Answers about discovery, content filters, your library, themes, moderation and appeals, maintenance, and site policies."
        />
      </div>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {[
          { to: '/discover', label: 'Browse titles', icon: Sparkles },
          { to: '/settings', label: 'Filters & themes', icon: Palette },
          { to: '/appeals', label: 'Submit an appeal', icon: Scale },
        ].map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="card-surface flex items-center gap-3 p-4 transition-colors hover:border-ink-700"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-850 text-rose-300">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-ink-100">{label}</span>
          </Link>
        ))}
      </div>

      <div className="space-y-5">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section key={section.title} className="card-surface p-5 md:p-6">
              <h2 className="mb-4 flex items-center gap-2 border-b border-ink-800 pb-3 font-semibold text-ink-50">
                <Icon className="h-4 w-4 text-rose-400" />
                {section.title}
              </h2>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-xl border border-ink-800 bg-ink-900/40 px-4 py-3 open:border-ink-700 open:bg-ink-900/70"
                  >
                    <summary className="cursor-pointer list-none pr-6 text-sm font-medium text-ink-100 marker:content-none">
                      <span className="flex items-center justify-between gap-3">
                        <span>{item.q}</span>
                        <span className="text-ink-400 transition-transform group-open:rotate-45">+</span>
                      </span>
                    </summary>
                    <div className="mt-3 text-sm leading-relaxed text-ink-400">{item.a}</div>
                  </details>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-ink-800 bg-ink-900/50 p-6 text-center">
        <div className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-ink-100">
          <MessageSquare className="h-4 w-4 text-rose-400" /> Still need help?
        </div>
        <p className="text-sm text-ink-400">
          <Link to="/contact" className="text-rose-300 hover:underline">Contact us</Link>, send{' '}
          <Link to="/feedback" className="text-rose-300 hover:underline">feedback</Link>, or submit an{' '}
          <Link to="/appeals" className="text-rose-300 hover:underline">appeal</Link> if a moderation decision needs
          review.
        </p>
      </div>
    </div>
  );
}
