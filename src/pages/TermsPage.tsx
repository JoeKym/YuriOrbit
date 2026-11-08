export function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-50 mb-2">Terms of Use</h1>
      <p className="text-sm text-ink-400 mb-8">Last updated: November 2026</p>

      <div className="space-y-6 text-ink-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">1. What YuriOrbit Is</h2>
          <p className="text-sm">
            YuriOrbit is a discovery and metadata platform for Girls' Love (GL) content. It helps you find
            titles across manga, manhwa, manhua, webtoons, light novels, anime, films, and live-action
            dramas. YuriOrbit does not host, store, or redistribute copyrighted works: no manga pages, no
            video, no novel text.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">2. Accounts</h2>
          <p className="text-sm">
            Browsing and searching need no account. Signing in is optional and is used to sync your library,
            ratings, progress and notes across devices, and to give you a public profile. You are
            responsible for keeping your credentials private and for activity performed through your
            account. You may stop using an account at any time and ask for it to be deleted (section 10).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">3. Your Library and Public Profile</h2>
          <p className="text-sm">
            Profiles are public by default: your username, display name, bio, avatar, and the titles,
            statuses, progress and ratings in your library. Reading notes and personal settings are private
            and are never shown on a public profile. You can make your profile private in your profile
            settings, which hides your library from everyone except you. Do not put anything in a public
            profile that you would not want indexed or copied by others.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">4. Metadata Sources</h2>
          <p className="text-sm">
            Title metadata — names, descriptions, cover images, genres, tags, scores, credits, and streaming
            or store links — comes from third-party sources including AniList, MyAnimeList (via Jikan),
            MangaDex, and TMDB. Metadata remains the property of its source and of the original rights
            holders. YuriOrbit claims no ownership of it and passes it through for discovery purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">5. Content Ratings and the Content Filter</h2>
          <p className="text-sm">
            Every title carries a maturity rating on one scale: <span className="text-ink-100">Safe</span>,{' '}
            <span className="text-ink-100">Suggestive</span>, <span className="text-ink-100">Erotica</span>, or{' '}
            <span className="text-ink-100">Pornographic</span>. The site defaults to Suggestive, so explicit
            works are hidden. Showing Erotica or Pornographic requires confirming that you are 18 or older,
            and that confirmation is stored only in your browser.
          </p>
          <p className="mt-2 text-sm">
            The filter is a browsing aid based on third-party ratings and tags; it is not age verification,
            not a guarantee about any title's contents, and not a legal determination. If you are under 18,
            do not enable the explicit levels, and do not follow external links to mature works.
          </p>
          <p className="mt-2 text-sm">
            YuriOrbit does not supply explicit material itself. Enabling a higher level only stops hiding
            metadata that third-party catalogues already publish.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">6. Accuracy, AI-Assisted Metadata and Changes</h2>
          <p className="text-sm">
            Catalogue data is aggregated automatically, can lag behind the source, and may be incomplete or
            wrong. Some upstream entries describe AI-generated or machine-translated works; YuriOrbit lists
            them as the source does and makes no claim about their origin or quality. Titles, ratings and
            availability can change or disappear without notice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">7. Acceptable Use</h2>
          <p className="text-sm">
            You agree not to use YuriOrbit to infringe copyrights, bypass digital rights management, scrape
            or redistribute content from external sources, overload the service or its upstream APIs, attempt
            to access other people's accounts or private data, or use public profiles to harass anyone. We
            may remove content or suspend accounts that break these rules.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">8. Copyright and Takedown Requests</h2>
          <p className="text-sm">
            YuriOrbit links to and displays metadata about works it does not own. If you are a rights holder
            and believe a listing or image should be removed, contact the operator through the project's
            repository at{' '}
            <span className="text-ink-100">github.com/JoeKym/YuriOrbit</span> with the title, the source, and
            the nature of your claim. Listings are removed or corrected where the claim is valid.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">9. No Warranty and Limitation of Liability</h2>
          <p className="text-sm">
            YuriOrbit is provided "as is", without warranty of any kind. Availability depends on third-party
            APIs and hosting and may change without notice. To the extent permitted by law, YuriOrbit is not
            liable for damages arising from use of the platform, from inaccurate metadata, or from the
            content and practices of external sites linked from it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">10. Ending Use and Deleting Data</h2>
          <p className="text-sm">
            You can stop using the site at any time, export your library from Settings, and clear everything
            stored in your browser by clearing site data. To have an account and its synced library deleted,
            send a request through the contact channel above. We may suspend or close accounts that break
            these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">11. Changes to These Terms</h2>
          <p className="text-sm">
            We may update these terms as the site changes. The revision date at the top of this page always
            reflects the current version, and continued use after a change means you accept it.
          </p>
        </section>
      </div>
    </div>
  );
}
