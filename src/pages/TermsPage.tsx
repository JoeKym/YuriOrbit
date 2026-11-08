export function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-50 mb-2">Terms of Use</h1>
      <p className="text-sm text-ink-400 mb-8">Last updated: November 2026</p>

      <div className="space-y-6 text-ink-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">1. What YuriOrbit Is</h2>
          <p className="text-sm">
            YuriOrbit is a dedicated search, catalog indexing, and metadata aggregation platform for Girls' Love (GL),
            yuri, and sapphic romance entertainment. We catalog works across multiple formats including manga, manhwa,
            manhua, webtoons, light novels, web novels, anime, films, and live-action television series (including Thai GL,
            Japanese, Korean, Chinese Baihe, and international cinema).
          </p>
          <p className="mt-2 text-sm text-rose-300/90 font-medium">
            Important Content Disclaimer: YuriOrbit does not host, upload, store, or stream copyrighted video files,
            manga page image archives, or novel texts on its own servers. All media streaming, chapter pages, and book
            data are accessed directly through public, third-party APIs or official publisher links.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">2. Accounts and Guest Mode</h2>
          <p className="text-sm">
            Browsing, searching, and tracking your reading do not require an account. By default, YuriOrbit functions
            fully offline in your browser using local storage.
          </p>
          <p className="mt-2 text-sm">
            Signing in with an optional cloud account allows you to securely sync your library, progress, custom lists,
            and personal ratings across devices. You are responsible for safeguarding your login credentials. You may
            request account deletion or export your data at any time through Settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">3. Your Library and Profiles</h2>
          <p className="text-sm">
            When you create a profile, you control its visibility. Public profiles display your chosen display name, avatar,
            and public reading list. Personal notes, custom settings, and private library entries are never displayed publicly.
            You can switch your profile to private at any time in Settings.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">4. Metadata and API Providers</h2>
          <p className="text-sm">
            Catalogue information — including titles, alternate names, synopsis text, cover art, release schedules,
            community ratings, and chapter metadata — is dynamically aggregated from respected third-party platforms:
          </p>
          <ul className="mt-2 list-disc list-inside space-y-1 text-sm text-ink-300">
            <li><strong className="text-ink-100">AniList:</strong> Anime, manga, and creator metadata via GraphQL.</li>
            <li><strong className="text-ink-100">MangaDex:</strong> Manga, manhwa, and scanlation chapter indexing via official REST endpoints.</li>
            <li><strong className="text-ink-100">The Movie Database (TMDB):</strong> Live-action television series, GL dramas, and feature films.</li>
          </ul>
          <p className="mt-2 text-sm">
            All trademarks, logos, covers, and promotional materials remain the intellectual property of their respective
            original copyright holders and publishers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">5. Content Filtering and Maturity Standards</h2>
          <p className="text-sm">
            To provide a comfortable and tailored discovery environment, YuriOrbit categorizes works into four distinct
            maturity levels: <span className="text-ink-100">Safe</span>, <span className="text-ink-100">Suggestive</span>,{' '}
            <span className="text-ink-100">Erotica</span>, and <span className="text-ink-100">Pornographic</span>.
          </p>
          <p className="mt-2 text-sm">
            The platform defaults to hiding explicit works. Displaying mature or adult ratings requires a voluntary age
            confirmation (18+), which is stored locally on your device. We do not distribute adult media directly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">6. In-Browser Reader and Proxies</h2>
          <p className="text-sm">
            YuriOrbit includes a built-in reader for supported open platforms (such as MangaDex At-Home). The reader operates
            as a client interface to upstream scanlation networks and image servers. Cover and API proxies deployed via
            Cloudflare Pages Functions exist strictly for origin validation, CORS resolution, and network caching.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">7. Acceptable Use</h2>
          <p className="text-sm">
            Users agree not to exploit YuriOrbit to conduct automated scraping attacks, DDoS upstream services, bypass
            digital access restrictions, impersonate administrators, or harass community members. Violations may result
            in immediate IP restriction or account termination.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">8. Copyright, Fair Use, and Takedown Policy</h2>
          <p className="text-sm">
            YuriOrbit respects copyright laws and operates in compliance with standard DMCA notice-and-takedown principles.
            If you are a copyright owner or licensing agent who believes that any index entry or cover thumbnail infringes
            upon your rights, please submit a notice to our project maintainers at{' '}
            <span className="text-rose-300 font-mono">github.com/JoeKym/YuriOrbit</span> with verification of ownership,
            the specific title or URL, and the requested action. Valid requests are reviewed and addressed promptly.
          </p>
        </section>
      </div>
    </div>
  );
}
