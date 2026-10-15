export function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink-50 mb-2">Terms of Use</h1>
      <p className="text-sm text-ink-400 mb-8">Last updated: October 2026</p>

      <div className="space-y-6 text-ink-300 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">1. What YuriVerse Is</h2>
          <p className="text-sm">
            YuriVerse is a discovery and metadata platform for Girls' Love (GL) content. It helps you find titles across manga, manhwa, manhua, webtoons, novels, movies, and dramas. YuriVerse does not host, store, or redistribute copyrighted content.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">2. Metadata Sources</h2>
          <p className="text-sm">
            Title metadata — including names, descriptions, cover images, genres, and ratings — is retrieved from external APIs such as AniList. All metadata is attributed to its source. YuriVerse makes no claim of ownership over this data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">3. No Content Hosting</h2>
          <p className="text-sm">
            YuriVerse does not host manga pages, video streams, or novel text. Reading and viewing are done through links to official, authorized external sources. Users are responsible for complying with the terms of those external services.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">4. Acceptable Use</h2>
          <p className="text-sm">
            You agree not to use YuriVerse to infringe copyrights, bypass digital rights management, scrape or redistribute content from external sources, or attempt to disrupt the service or its API providers.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">5. Disclaimer of Accuracy</h2>
          <p className="text-sm">
            Metadata is provided by third-party sources and may contain errors or omissions. YuriVerse is not responsible for the accuracy of externally sourced data. You can report incorrect information on any title detail page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">6. No Warranty</h2>
          <p className="text-sm">
            YuriVerse is provided "as is" without warranty of any kind. Availability of metadata depends on external API providers and may change without notice.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">7. Limitation of Liability</h2>
          <p className="text-sm">
            YuriVerse is not liable for any damages arising from the use of this platform or from the content or practices of external sites linked from YuriVerse.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-100 mb-2">8. Changes to These Terms</h2>
          <p className="text-sm">
            We may update these terms from time to time. Continued use of YuriVerse after changes constitutes acceptance of the revised terms.
          </p>
        </section>
      </div>
    </div>
  );
}
