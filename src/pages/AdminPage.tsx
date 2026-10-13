import { Link } from 'react-router-dom';
import { Shield, Lock, AlertCircle } from 'lucide-react';

export function AdminPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink-800">
          <Shield className="h-5 w-5 text-rose-400" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink-50">Administration</h1>
      </div>

      <div className="card-surface p-6">
        <div className="flex gap-3 mb-4">
          <Lock className="h-5 w-5 flex-shrink-0 text-warning-400" />
          <div>
            <h2 className="text-lg font-semibold text-ink-50">Admin Access Unavailable</h2>
            <p className="mt-1 text-sm text-ink-400 leading-relaxed">
              The administration dashboard requires a configured backend with server-verified admin privileges. No Supabase backend is currently configured for this deployment.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-ink-800 bg-ink-850 p-4">
          <div className="flex gap-2 mb-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-ink-400 mt-0.5" />
            <p className="text-xs text-ink-400">
              For security reasons, YuriVerse does not create a simulated or client-side admin system. Admin features — including classification review, metadata overrides, curated collections, and broken-link reports — require a real server with role-based access control.
            </p>
          </div>
        </div>

        <div className="mt-4 text-sm text-ink-400">
          <p className="mb-2">When a backend is configured, admin features will include:</p>
          <ul className="space-y-1 ml-4 list-disc">
            <li>Classification review queue</li>
            <li>Metadata overrides and corrections</li>
            <li>Curated collections and featured titles</li>
            <li>Official source-link management</li>
            <li>Broken-link report review</li>
            <li>Provider status and synchronization logs</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link to="/" className="btn-ghost">Back to home</Link>
      </div>
    </div>
  );
}
