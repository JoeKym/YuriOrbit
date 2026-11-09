import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';

export function PrivacyPage() {
  usePageMeta({ title: 'Privacy Policy', description: 'Read how YuriOrbit handles your data, privacy, and account information.', path: '/privacy' });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-50 mb-2">Privacy Policy</h1>
      <p className="text-sm text-ink-400 mb-8">Last updated: November 2026</p>

      <div className="space-y-6 text-ink-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">1. Offline & Local-First by Default</h2>
          <p className="text-sm">
            You can use YuriOrbit completely anonymously without an account. When unauthenticated, your personal library,
            reading history, chapter bookmarks, favorites, notes, and display preferences (such as reader layout, theme,
            and content maturity filter level) are stored exclusively in your browser's local storage.
          </p>
          <p className="mt-2 text-sm">
            This data never leaves your device and is never transmitted to our servers. You can permanently clear it at
            any time simply by clearing your browser's site data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">2. Optional Cloud Accounts (Supabase)</h2>
          <p className="text-sm">
            If you choose to create a cloud account, authentication and encrypted database synchronization are managed
            via Supabase with Postgres Row-Level Security (RLS). We collect:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-ink-300">
            <li>Your email address and a cryptographically hashed password (we never have access to plain-text passwords).</li>
            <li>Your chosen public profile fields (display name, username, bio, avatar image URL).</li>
            <li>Your synchronized library items, including read status, score ratings, and private reading notes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">3. Profile Privacy & Database Isolation</h2>
          <p className="text-sm">
            You have full control over your profile visibility. Public profiles showcase your favorite titles and reading
            milestones. Private notes and personal account settings are strictly shielded at the database level using
            row-level security policies. You can set your entire profile to Private at any time in Settings, which hides
            your library from all external visitors.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">4. Third-Party Network Requests & Edge Proxies</h2>
          <p className="text-sm">
            To provide live discovery, catalogue requests communicate with external APIs:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-ink-300">
            <li><strong className="text-ink-100">AniList:</strong> Queried directly from your client for anime and manga information.</li>
            <li><strong className="text-ink-100">MangaDex & TMDB:</strong> Routed through secure Cloudflare Pages Functions edge proxies to enforce proper CORS handling, DDoS mitigation headers, and server-side secret management.</li>
          </ul>
          <p className="mt-2 text-sm">
            These external services receive standard HTTP request data (such as IP address and user-agent string). We do not
            share your personal account data or email address with any third-party providers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">5. No Tracking & No Ad Networks</h2>
          <p className="text-sm">
            YuriOrbit does not sell your personal data, employ cross-site tracking cookies, use third-party fingerprinting,
            or run behavioral ad networks. We believe your reading tastes and favorite works should remain entirely your own.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">6. Data Portability and Deletion</h2>
          <p className="text-sm">
            You own your data. You can export your complete library at any time as a JSON backup from the Settings page.
            If you wish to permanently delete your account and all associated cloud library records, you can do so through
            your account settings, by emailing the project administrators at{' '}
            <a href="mailto:mail.jkyme@gmail.com" className="text-rose-300 hover:underline">
              mail.jkyme@gmail.com
            </a>
            , or through the{' '}
            <Link to="/contact" className="text-rose-300 hover:underline">contact page</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
