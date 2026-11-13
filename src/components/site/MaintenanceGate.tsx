import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, Cog, Construction, Sparkles, Wrench } from 'lucide-react';
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

  const message =
    config.message?.trim() ||
    'YuriOrbit is temporarily down for maintenance. We’re giving things a quick tune-up and will be back soon.';

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-ink-950">
      {/* Ambient background (respects prefers-reduced-motion via CSS) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-float-y-slow absolute -left-10 top-16 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="animate-drift-x absolute right-0 top-24 h-52 w-52 rounded-full bg-lavender-500/10 blur-3xl" />
        <div className="animate-float-y absolute bottom-10 left-1/4 h-32 w-32 rounded-full bg-rose-400/10 blur-2xl" />
        <div className="animate-pulse-soft absolute bottom-24 right-1/4 h-24 w-24 rounded-full bg-lavender-400/10 blur-2xl" />
        <div className="animate-shimmer-line absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
      </div>

      <div className="relative mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center px-4 py-12 text-center md:py-16">
        <div className="animate-fade-up w-full">
          {/* Construction / gear emblem */}
          <div className="mb-6 inline-flex items-center justify-center">
            <div className="relative">
              <div className="animate-spin-slow absolute -inset-4 rounded-full border border-dashed border-rose-500/25" />
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-rose-500/20 to-lavender-500/20 blur-sm" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-ink-700/80 bg-gradient-to-br from-ink-850 to-ink-900 shadow-card">
                <Cog className="animate-spin-slow h-9 w-9 text-rose-300/90" strokeWidth={1.5} />
              </div>
              <div className="animate-float-y absolute -right-3 -top-2 rounded-xl border border-ink-700 bg-ink-900 p-2 shadow-card">
                <Wrench className="h-4 w-4 text-warning-400" />
              </div>
              <div className="absolute -bottom-2 -left-3 rounded-xl border border-ink-700 bg-ink-900 p-2 shadow-card">
                <Construction className="h-4 w-4 text-lavender-300" />
              </div>
            </div>
          </div>

          <div className="mx-auto max-w-lg rounded-2xl border border-ink-800 bg-ink-900/85 p-7 shadow-card backdrop-blur-sm md:p-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-warning-500/30 bg-warning-500/10 px-3 py-1 text-xs font-medium text-warning-400">
              <Construction className="h-3.5 w-3.5" />
              Maintenance in progress
              <span className="ml-1 inline-flex gap-0.5" aria-hidden="true">
                <span className="h-1 w-1 animate-pulse rounded-full bg-warning-400 [animation-delay:0ms]" />
                <span className="h-1 w-1 animate-pulse rounded-full bg-warning-400 [animation-delay:150ms]" />
                <span className="h-1 w-1 animate-pulse rounded-full bg-warning-400 [animation-delay:300ms]" />
              </span>
            </div>

            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50 md:text-4xl">
              We&apos;ll be right back
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">{message}</p>

            {/* Status / progress indicator — communicates active work */}
            <div className="mt-6 rounded-xl border border-ink-800 bg-ink-950/60 px-4 py-3 text-left">
              <div className="mb-2 flex items-center justify-between text-micro uppercase tracking-wider text-ink-400">
                <span className="inline-flex items-center gap-1.5">
                  <Cog className="h-3 w-3 text-rose-400/80" />
                  Tuning things up
                </span>
                <span className="text-ink-500">In progress</span>
              </div>
              <div
                className="relative h-1.5 overflow-hidden rounded-full bg-ink-800"
                role="progressbar"
                aria-label="Maintenance in progress"
                aria-valuetext="In progress"
              >
                <div className="animate-maintenance-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-rose-500 via-lavender-400 to-rose-500" />
              </div>
            </div>

            {config.eta?.trim() && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-850/80 px-3 py-2 text-xs text-ink-200">
                <Clock className="h-3.5 w-3.5 text-rose-400" />
                <span>
                  Estimated return: <strong className="text-ink-50">{config.eta.trim()}</strong>
                </span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-2 text-micro text-ink-400">
              <Sparkles className="h-3 w-3 text-rose-400/70" />
              <span>Thank you for your patience. — YuriOrbit</span>
            </div>
          </div>
        </div>
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
