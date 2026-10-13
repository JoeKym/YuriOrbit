import { Link } from 'react-router-dom';
import { Heart, Compass, BookOpen, Shield, Globe, Sparkles } from 'lucide-react';

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
      <div className="text-center mb-10">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-lavender-600 mb-4">
          <Heart className="h-7 w-7 text-white" fill="white" />
        </div>
        <h1 className="font-display text-4xl font-semibold text-ink-50">YuriVerse</h1>
        <p className="mt-2 text-lg text-ink-300">Your world of Girls' Love.</p>
      </div>

      <div className="prose prose-invert max-w-none">
        <p className="text-ink-300 leading-relaxed">
          YuriVerse is a dedicated discovery platform for Girls' Love (GL), yuri, and female-female romance content across manga, manhwa, manhua, webtoons, light novels, web novels, movies, dramas, and television series.
        </p>
        <p className="mt-4 text-ink-300 leading-relaxed">
          Our mission is to make it easy to discover, organize, and access GL entertainment from different countries, formats, and legitimate publishing or viewing sources through one coherent platform — without depending on manual content uploads.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="card-surface p-5">
          <Compass className="h-6 w-6 text-rose-400 mb-2" />
          <h2 className="font-semibold text-ink-50">Discovery</h2>
          <p className="mt-1 text-sm text-ink-400">Find GL titles across formats with intelligent classification that filters out non-GL content.</p>
        </div>
        <div className="card-surface p-5">
          <BookOpen className="h-6 w-6 text-lavender-400 mb-2" />
          <h2 className="font-semibold text-ink-50">Personal Library</h2>
          <p className="mt-1 text-sm text-ink-400">Track your reading and watching progress, rate titles, and organize your collection.</p>
        </div>
        <div className="card-surface p-5">
          <Globe className="h-6 w-6 text-rose-400 mb-2" />
          <h2 className="font-semibold text-ink-50">Multi-Source</h2>
          <p className="mt-1 text-sm text-ink-400">Metadata from AniList with a provider architecture designed to add more sources over time.</p>
        </div>
        <div className="card-surface p-5">
          <Shield className="h-6 w-6 text-lavender-400 mb-2" />
          <h2 className="font-semibold text-ink-50">Respectful</h2>
          <p className="mt-1 text-sm text-ink-400">We link to official sources and never host or redistribute copyrighted content.</p>
        </div>
      </div>

      <div className="mt-10 card-surface p-5">
        <Sparkles className="h-5 w-5 text-rose-400 mb-2" />
        <h2 className="font-semibold text-ink-50">Our Standards</h2>
        <ul className="mt-2 space-y-2 text-sm text-ink-300">
          <li>We do not include BL (Boys' Love) in the primary catalogue.</li>
          <li>We do not infer a user's sexuality from their reading preferences.</li>
          <li>We prioritize accurate results over inflated catalogue counts.</li>
          <li>We do not fabricate ratings, statistics, or content availability.</li>
          <li>We respect source attribution, removal requests, and provider terms.</li>
        </ul>
      </div>

      <div className="mt-10 text-center">
        <Link to="/discover" className="btn-primary">Start Exploring</Link>
      </div>
    </div>
  );
}
