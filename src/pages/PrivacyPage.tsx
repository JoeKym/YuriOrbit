export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-50 mb-2">Privacy Policy</h1>
      <p className="text-sm text-ink-400 mb-8">Last updated: November 2026</p>

      <div className="space-y-6 text-ink-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">1. What Stays in Your Browser</h2>
          <p className="text-sm">
            Without an account, your library, favourites, reading progress, ratings, notes and preferences —
            including reader width, background, data saver, reduced motion and your content-filter level —
            are stored in your browser's local storage. They do not leave your device. Clearing site data
            removes them permanently.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">2. Accounts and What We Store</h2>
          <p className="text-sm">
            If you create an account, authentication and data storage are handled by Supabase. We store your
            email address, a securely hashed password (we never see the password itself), and the profile
            details you choose: username, display name, bio, avatar URL and visibility setting. Your library
            entries — title reference, status, progress, rating and notes — are stored with your account so
            they sync across devices.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">3. Public Profiles and Private Data</h2>
          <p className="text-sm">
            Profiles are public by default. A public profile shows your username, display name, bio, avatar,
            and the titles, statuses, progress and ratings in your library. Reading notes are private: they
            are excluded from the public view at the database level, not merely hidden in the interface. You
            can make your whole profile private in your profile settings; only you will see your library
            then. Library data is scoped to your account — other visitors cannot read or change it.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">4. Third-Party Requests</h2>
          <p className="text-sm">
            Catalogue data is requested from AniList, MyAnimeList (via Jikan), MangaDex and TMDB. Requests
            for MangaDex and TMDB pass through this site's own edge functions so their API credentials stay
            server-side; AniList and Jikan are called directly from your browser. Those providers receive
            your IP address and the request itself (such as a search term), and their own privacy policies
            apply. We do not send them your account details.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">5. Cookies, Sessions and Local Storage</h2>
          <p className="text-sm">
            YuriOrbit sets no advertising or analytics cookies. If you sign in, Supabase stores a session
            token in your browser so you stay signed in; signing out clears it. Local storage also holds your
            settings, your content-filter choice, and short-lived caches of catalogue responses so pages load
            faster.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">6. No Tracking, No Advertising</h2>
          <p className="text-sm">
            We do not use third-party analytics, fingerprinting or ad networks, and we do not build profiles
            of your browsing. Search terms are not logged by YuriOrbit; they are sent to the providers listed
            above to answer the query.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">7. Mature Content and Age</h2>
          <p className="text-sm">
            The catalogue defaults to hiding Erotica and Pornographic titles. Choosing a higher level stores
            an "18 or older" confirmation in your browser only; it is not an identity check and is not sent
            to us. YuriOrbit is not directed at children under 13, and we do not knowingly collect personal
            information from them.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">8. Your Choices and Rights</h2>
          <p className="text-sm">
            You can export your library as JSON from Settings, change or make private your profile, reset
            preferences, and ask for your account and library to be deleted. Deletion requests can be sent
            through the project's repository at{' '}
            <span className="text-ink-100">github.com/JoeKym/YuriOrbit</span>. Local data can be removed
            immediately by clearing site data in your browser.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">9. Security and Retention</h2>
          <p className="text-sm">
            Access to library rows is restricted to the account that owns them, and public profile data is
            served through a limited view that excludes private fields. Data is kept for as long as your
            account exists; deleting the account removes its library and profile, apart from backups that
            expire on a short cycle.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">10. External Links</h2>
          <p className="text-sm">
            Title pages link to official publishers, stores, and streaming services. Once you follow a link,
            the privacy practices of that site apply, not ours.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">11. Changes to This Policy</h2>
          <p className="text-sm">
            This policy is updated as the site changes; the revision date above always reflects the current
            version. Material changes will be noted on this page.
          </p>
        </section>
      </div>
    </div>
  );
}
