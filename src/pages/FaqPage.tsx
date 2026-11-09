import { Link } from 'react-router-dom';
import { HelpCircle, Shield, BookOpen, Globe, Clock } from 'lucide-react';

export function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="text-center mb-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-lavender-600 mb-4 mx-auto">
          <HelpCircle className="h-7 w-7 text-white" fill="white" />
        </div>
        <h1 className="font-display text-4xl font-semibold text-ink-50">FAQ</h1>
        <p className="mt-2 text-lg text-ink-300">Frequently asked questions</p>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-ink-300 leading-relaxed mb-8">
          Find answers to common questions about YuriOrbit and how to use the platform.
        </p>
      </div>

      <div className="space-y-6">

        <div className="card-surface p-6">
          <h2 className="font-semibold text-ink-50 border-b border-ink-800 pb-2 mb-4">Discovery & Content</h2>
          <details>
            <summary className="cursor-pointer text-rose-300 hover:underline text-sm">
              Why don't I see certain titles in the catalogue?
            </summary>
            <p className="mt-3 text-sm text-ink-400 leading-relaxed">
              YuriOrbit prioritizes accurate GL results over inflated counts. We do not include BL (Boys' Love) in the primary catalogue, and we do not infer a user's sexuality from their reading preferences.
            </p>
          </details>
          <details>
            <summary className="cursor-pointer text-rose-300 hover:underline text-sm">
              Do you include content from all sources?
            </summary>
            <p className="mt-3 text-sm text-ink-400 leading-relaxed">
              We link to official sources and never host or redistribute copyrighted content. Our provider architecture is designed to add more sources over time, starting with AniList metadata.
            </p>
          </details>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-semibold text-ink-50 border-b border-ink-800 pb-2 mb-4">Account & Privacy</h2>
          <details>
            <summary className="cursor-pointer text-rose-300 hover:underline text-sm">
              Does YuriOrbit track my reading preferences?
            </summary>
            <p className="mt-3 text-sm text-ink-400 leading-relaxed">
              No, we do not infer a user's sexuality from their reading preferences and we prioritize user privacy.
            </p>
          </details>
          <details>
            <summary className="cursor-pointer text-rose-300 hover:underline text-sm">
              How do I delete my account?
            </summary>
            <p className="mt-3 text-sm text-ink-400 leading-relaxed">
              Account deletion can be done through the Settings page. All personal data is removed in accordance with our Privacy Policy.
            </p>
          </details>
        </div>

        <div className="card-surface p-6">
          <h2 className="font-semibold text-ink-50 border-b border-ink-800 pb-2 mb-4">Platform & Features</h2>
          <details>
            <summary className="cursor-pointer text-rose-300 hover:underline text-sm">
              Which formats are supported?
            </summary>
            <p className="mt-3 text-sm text-ink-400 leading-relaxed">
              We support manga, manhwa, manhua, webtoons, light novels, web novels, movies, dramas, and television series with GL/GL themes.
            </p>
          </details>
          <details>
            <summary className="cursor-pointer text-rose-300 hover:underline text-sm">
              Is there a mobile app?
            </summary>
            <p className="mt-3 text-sm text-ink-400 leading-relaxed">
              YuriOrbit is a web-based platform optimized for desktop and mobile browsers. No native app is currently available.
            </p>
          </details>
        </div>

      </div>

      <div className="mt-10 text-center">
        <Link to="/discover" className="btn-primary">Start Exploring GL Titles</Link>
        <p className="mt-4 text-sm text-ink-400">
          Still have a question? <Link to="/contact" className="text-rose-300 hover:underline">Contact us</Link>{' '}
          or <Link to="/feedback" className="text-rose-300 hover:underline">send feedback</Link>.
        </p>
      </div>
    </div>
  );
}