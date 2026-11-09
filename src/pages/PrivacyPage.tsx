import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';

export function PrivacyPage() {
  usePageMeta({
    title: 'Privacy Policy',
    description: 'Read how YuriOrbit handles your data, privacy, account controls, moderation, and appeals information.',
    path: '/privacy',
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink-50">Privacy Policy</h1>
      <p className="mb-8 text-sm text-ink-400">Last updated: November 2026</p>

      <div className="space-y-6 leading-relaxed text-ink-300">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">1. Local-first by default</h2>
          <p className="text-sm">
            You can use YuriOrbit without an account. When unauthenticated, personal library data, reading/watching
            progress, bookmarks/favorites, notes, and preferences (such as theme, reader layout, and content maturity
            filter) may be stored locally in your browser. Local data stays on your device unless you choose to use
            cloud features.
          </p>
          <p className="mt-2 text-sm">
            You can clear local data at any time from <Link to="/settings" className="text-rose-300 hover:underline">Settings → Danger Zone</Link>{' '}
            or by clearing your browser/site data.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">2. Optional accounts and synced data</h2>
          <p className="text-sm">
            If you create an account, authentication and supported cloud features are provided through Supabase-backed
            services. Depending on the feature, we may process:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>Account identifiers (email, user ID) and authentication/session data.</li>
            <li>Profile fields you choose to set (e.g., display name, username, bio, avatar URL, visibility settings).</li>
            <li>Synced library entries, progress/status, ratings, and notes where cloud sync is used.</li>
            <li>Submissions you send (feedback, contact messages, reports, appeals, or reviews/testimonials), including any contact details you provide.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">3. Moderation, safety, and appeals data</h2>
          <p className="text-sm">
            To operate the service safely and accurately, we may process moderation-related information, such as reports
            of incorrect metadata, abuse/safety reports, moderation actions (warnings, suspensions, bans, content
            restrictions/takedowns), reasons, timestamps, and appeal submissions. This information is used to review
            issues, enforce policies, prevent abuse, and maintain service integrity.
          </p>
          <p className="mt-2 text-sm">
            Appeal and report submissions may include identifiers (username, email if provided, title IDs/URLs) and the
            message you submit. Please avoid sharing sensitive personal information unless necessary for your request.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">4. Profile visibility and controls</h2>
          <p className="text-sm">
            You control supported profile visibility settings. Public profiles may display information you choose to
            make public. Private notes and account settings are intended to remain private to your account context.
            You can manage account/profile preferences in <Link to="/settings" className="text-rose-300 hover:underline">Settings</Link>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">5. Third-party services and network requests</h2>
          <p className="text-sm">
            YuriOrbit aggregates metadata and discovery data from external providers (for example, AniList, MangaDex,
            TMDB, and other configured sources). Requests may be sent directly from your device or routed through
            server/edge functions (e.g., Cloudflare Pages Functions) for CORS, caching, and key management.
          </p>
          <p className="mt-2 text-sm">
            These providers may receive standard technical request data (such as IP address and user agent). We do not
            sell your personal data and do not intentionally share your account password or private notes with metadata
            providers.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">6. No behavioral ad tracking</h2>
          <p className="text-sm">
            YuriOrbit does not run behavioral ad networks, and we do not infer a user’s sexuality from reading
            preferences. We aim to minimize data collection to what is needed to provide and protect the service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">7. Maintenance and service operations</h2>
          <p className="text-sm">
            During maintenance, the site may temporarily limit access and display a maintenance notice. Operational logs
            and error information may be processed to diagnose issues and keep the service reliable, subject to platform
            and infrastructure constraints.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">8. Data export, deletion, and requests</h2>
          <p className="text-sm">
            Where supported, you can export a local backup from Settings. You can delete your account from{' '}
            <Link to="/settings" className="text-rose-300 hover:underline">Settings → Danger Zone</Link> (self-service) or
            request help via <Link to="/contact" className="text-rose-300 hover:underline">Contact</Link> /{' '}
            <a href="mailto:mail.jkyme@gmail.com" className="text-rose-300 hover:underline">mail.jkyme@gmail.com</a>.
            Deletion/removal is subject to technical, legal, and operational requirements (for example, security logs
            or records needed to handle abuse/rights requests may be retained where appropriate).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">9. Changes to this policy</h2>
          <p className="text-sm">
            We may update this policy as features evolve (including moderation, appeals, reviews, and account controls).
            The “Last updated” date reflects the latest revision.
          </p>
        </section>
      </div>
    </div>
  );
}
