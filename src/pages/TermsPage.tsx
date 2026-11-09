import { Link } from 'react-router-dom';
import { usePageMeta } from '@/hooks/usePageMeta';

export function TermsPage() {
  usePageMeta({
    title: 'Terms of Use',
    description: 'Read the terms of use, moderation, appeals, and takedown policies for YuriOrbit.',
    path: '/terms',
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="mb-2 font-display text-3xl font-semibold text-ink-50">Terms of Use</h1>
      <p className="mb-8 text-sm text-ink-400">Last updated: November 2026</p>

      <div className="space-y-6 leading-relaxed text-ink-300">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">1. About YuriOrbit</h2>
          <p className="text-sm">
            YuriOrbit is a discovery, catalog, and tracking platform for Girls' Love (GL), yuri, and sapphic romance
            content across formats including manga, manhwa, manhua, webtoons, novels, anime, films, and live-action
            series/dramas.
          </p>
          <p className="mt-2 text-sm font-medium text-rose-300/90">
            YuriOrbit does not host, upload, or redistribute copyrighted video files, manga archives, or novel texts on
            its own servers. Media access and reading/streaming experiences may rely on third-party providers and
            official sources.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">2. Accounts, local data, and controls</h2>
          <p className="text-sm">
            You may use YuriOrbit without an account. Optional accounts enable supported cloud features. You are
            responsible for your account credentials and activity under your account.
          </p>
          <p className="mt-2 text-sm">
            You can manage settings, themes, maturity filters, local data, and (where available) account deletion in{' '}
            <Link to="/settings" className="text-rose-300 hover:underline">Settings</Link>. Destructive actions in the
            Danger Zone are intentional and may be irreversible.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">3. Content filtering and maturity settings</h2>
          <p className="text-sm">
            YuriOrbit provides content filtering and maturity controls (e.g., Safe, Suggestive, Erotica, and related
            classifications where applicable). Adult/explicit content is not shown without the appropriate user
            confirmation and filter selection. You are responsible for using maturity settings appropriately in your
            jurisdiction and environment.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">4. User submissions and reviews</h2>
          <p className="text-sm">
            If you submit feedback, reports, contact messages, appeals, or reviews/testimonials, you represent that your
            submission is accurate to the best of your knowledge and does not violate others’ rights. You must not
            submit unlawful, abusive, harassing, deceptive, or spam content.
          </p>
          <p className="mt-2 text-sm">
            We may review, moderate, edit for formatting/safety, feature, hide, or remove submissions (including
            reviews/testimonials) to maintain quality, safety, and policy compliance.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">5. Moderation, suspension, bans, and content actions</h2>
          <p className="text-sm">
            To protect users and the service, we may take moderation actions at our discretion, including warnings,
            temporary suspension, permanent bans, feature restrictions, or removal/restriction of content listings and
            related metadata displays. Actions may be taken for policy violations, abuse, security risks, fraudulent
            activity, repeated harmful submissions, or valid legal/rights requests.
          </p>
          <p className="mt-2 text-sm">
            Content moderation actions may include <strong>suspension</strong> (temporary restriction),{' '}
            <strong>takedown</strong> (removal/restriction of a listing or display), or other limitations as needed.
            We may preserve records related to moderation and safety where appropriate.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">6. Appeals</h2>
          <p className="text-sm">
            If you believe a moderation decision (account or content-related) was made in error, you may submit an
            appeal via the <Link to="/appeals" className="text-rose-300 hover:underline">Appeals page</Link>. Provide
            relevant identifiers (username, title/URL, dates) and context. Submitting an appeal does not guarantee
            reversal, but appeals are reviewed.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">7. Copyright, rights requests, and takedowns</h2>
          <p className="text-sm">
            YuriOrbit respects intellectual property rights. If you are a rights holder or authorized agent and believe
            content listed/indexed or displayed on YuriOrbit infringes your rights, submit a request with: (1) proof of
            authority/ownership, (2) the specific URL(s)/title(s), (3) the material at issue, and (4) the requested
            action.
          </p>
          <p className="mt-2 text-sm">
            Send requests via <Link to="/contact" className="text-rose-300 hover:underline">Contact</Link> or{' '}
            <a href="mailto:mail.jkyme@gmail.com" className="text-rose-300 hover:underline">mail.jkyme@gmail.com</a>.
            Valid requests are reviewed and addressed promptly, which may include metadata correction, restriction, or
            takedown of the relevant listing/display.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">8. Acceptable use</h2>
          <p className="text-sm">
            You agree not to misuse the service, including attempting unauthorized access, scraping/abusing APIs or
            infrastructure, bypassing access controls, interfering with operations, harassing others, or using the
            platform for unlawful purposes.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">9. Third-party providers and availability</h2>
          <p className="text-sm">
            Metadata, images, and reading/watching availability may come from third-party providers and are subject to
            their terms, availability, and accuracy. YuriOrbit may change, suspend, or discontinue features (including
            during maintenance) without guarantee of uninterrupted availability.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink-100">10. Contact</h2>
          <p className="text-sm">
            For questions, reports, takedowns, or appeals, use <Link to="/contact" className="text-rose-300 hover:underline">Contact</Link>,{' '}
            <Link to="/feedback" className="text-rose-300 hover:underline">Feedback</Link>, or{' '}
            <Link to="/appeals" className="text-rose-300 hover:underline">Appeals</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
