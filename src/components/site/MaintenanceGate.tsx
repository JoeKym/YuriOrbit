import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Construction, Clock, Heart } from 'lucide-react';
import { fetchMaintenanceConfig, type MaintenanceConfig, DEFAULT_MAINTENANCE } from '@/lib/maintenance';
import { usePageMeta } from '@/hooks/usePageMeta';

const MAINTENANCE_CACHE_KEY = 'yuriorbit:maintenance_cache';
const CACHE_TTL_MS = 60_000;

function readCache(): { at: number; config: MaintenanceConfig } | null {
  try {
    const raw = sessionStorage.getItem(MAINTENANCE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; config: MaintenanceConfig };
    if (!parsed || typeof parsed.at !== 'number') return null;
    if (Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(config: MaintenanceConfig) {
  try {
    sessionStorage.setItem(MAINTENANCE_CACHE_KEY, JSON.stringify({ at: Date.now(), config }));
  } catch {}
}

function MaintenanceScreen({ config }: { config: MaintenanceConfig }) {
  usePageMeta({
    title: 'Scheduled Maintenance',
    description: config.message || 'YuriOrbit is temporarily unavailable for maintenance. Please check back soon.',
    noIndex: true,
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-4 py-16 text-center">
      <div className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-lavender-600 shadow-lg shadow-rose-500/20">
        <Heart className="h-8 w-8 text-white" fill="white" />
      </div>
      <div className="mx-auto max-w-lg rounded-2xl border border-ink-800 bg-ink-900/80 p-8 shadow-card">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-warning-500/30 bg-warning-500/10 px-3 py-1 text-xs font-medium text-warning-400">
          <Construction className="h-3.5 w-3.5" />
          Maintenance in progress
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink-50">We'll be right back</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-300">
          {config.message?.trim() ||
            'YuriOrbit is temporarily down for maintenance. We’re making improvements and will be back soon.'}
        </p>
        {config.eta?.trim() && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-850 px-3 py-2 text-xs text-ink-200">
            <Clock className="h-3.5 w-3.5 text-rose-400" />
            <span>
              Estimated return: <strong className="text-ink-50">{config.eta.trim()}</strong>
            </span>
          </div>
        )}
        <p className="mt-6 text-[11px] text-ink-500">Thank you for your patience. — YuriOrbit</p>
      </div>
    </div>
  );
}

function isExemptPath(pathname: string): boolean {
  // Allow admin and auth routes so admins can sign in and disable maintenance.
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/auth' || pathname.startsWith('/auth/');
}

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<{ ready: boolean; config: MaintenanceConfig }>(() => {
    const cached = readCache();
    return { ready: Boolean(cached), config: cached?.config ?? DEFAULT_MAINTENANCE };
  });

  useEffect(() => {
    let cancelled = false;
    fetchMaintenanceConfig().then((config) => {
      if (cancelled) return;
      writeCache(config);
      setState({ ready: true, config });
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // Fail-open while loading, and always allow admin/auth routes.
  if (!state.ready) return <>{children}</>;
  if (!state.config.active) return <>{children}</>;
  if (isExemptPath(location.pathname)) return <>{children}</>;

  return <MaintenanceScreen config={state.config} />;
}
