export function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-50 mb-2">Privacy Policy</h1>
      <p className="text-sm text-ink-400 mb-8">Last updated: October 2026</p>

      <div className="space-y-6 text-ink-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">Local Storage</h2>
          <p className="text-sm">
            YuriVerse stores your personal library, favourites, reading progress, ratings, notes, and display preferences locally in your browser using localStorage. This data never leaves your device unless you explicitly export it. Clearing your browser data will remove all saved information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">No Account Required</h2>
          <p className="text-sm">
            You can browse the catalogue, search, and use the personal library without creating an account or providing any personal information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">External API Requests</h2>
          <p className="text-sm">
            When browsing titles, YuriVerse sends requests to the AniList GraphQL API to retrieve metadata. These requests are sent directly from your browser to AniList's servers. AniList's privacy policy applies to any data they collect. No YuriVerse server intermediates these requests.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">No Tracking or Analytics</h2>
          <p className="text-sm">
            YuriVerse does not use third-party analytics, advertising trackers, or fingerprinting. We do not collect browsing history, search queries, or reading preferences on any server.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">Cookies</h2>
          <p className="text-sm">
            YuriVerse does not use cookies. All persistence is handled through browser localStorage.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">External Links</h2>
          <p className="text-sm">
            Title detail pages contain links to external sources such as official publishers and streaming platforms. Once you leave YuriVerse, the privacy practices of those external sites apply.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">Children's Privacy</h2>
          <p className="text-sm">
            YuriVerse is not directed at children under 13. We do not knowingly collect any personal information from children.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">Changes to This Policy</h2>
          <p className="text-sm">
            We may update this privacy policy from time to time. Changes will be posted on this page with an updated revision date.
          </p>
        </section>
      </div>
    </div>
  );
}
