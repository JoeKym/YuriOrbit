import { useEffect, useState } from 'react';
import {
  Database,
  Globe2,
  Layers,
  LayoutTemplate,
  Pause,
  Play,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils/format';

interface Stage {
  icon: typeof Users;
  title: string;
  role: string;
  detail: string;
}

/**
 * Deliberately simplified: this is the shape of the request path a visitor
 * cares about, not an inventory of the codebase.
 */
const STAGES: Stage[] = [
  {
    icon: Users,
    title: 'Visitor',
    role: 'Opens a page, searches, or signs in',
    detail: 'Everything starts in the browser. YuriOrbit ships as static files, so the shell arrives instantly.',
  },
  {
    icon: LayoutTemplate,
    title: 'React frontend',
    role: 'Renders the interface',
    detail: 'Routing, filters and lists run client-side. Content streams in behind placeholders instead of blocking the page.',
  },
  {
    icon: Layers,
    title: 'Catalogue layer',
    role: 'Merges every source into one feed',
    detail: 'Provider responses are normalised, checked for Girls’ Love, and de-duplicated before anything reaches the screen.',
  },
  {
    icon: ShieldCheck,
    title: 'Cloudflare Functions',
    role: 'Edge proxy in front of the APIs',
    detail: 'Thin serverless routes relay provider calls, keep credentials off the client, and cache repeat requests at the edge.',
  },
  {
    icon: Globe2,
    title: 'Upstream APIs',
    role: 'Titles, covers, scores',
    detail: 'AniList, MangaDex, TMDB and Jikan supply the catalogue — each with its own strengths and blind spots.',
  },
  {
    icon: Database,
    title: 'Supabase',
    role: 'Accounts and personal library',
    detail: 'Sign-in and saved titles are stored per user, separate from the public catalogue that anyone can browse.',
  },
];

const STEP_MS = 2600;

export function HowItWorksFlow() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  // Respect the OS setting: no cycling animation when motion is reduced.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (query.matches) setPlaying(false);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setPlaying(false);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setStep((current) => (current + 1) % STAGES.length), STEP_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  const active = STAGES[step];

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-400">Under the hood</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink-50">How YuriOrbit works</h2>
          <p className="mt-1 text-sm text-ink-400">
            The path from a page view to a title on screen — simplified.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-xs font-medium text-ink-200 transition-colors hover:bg-ink-850"
          aria-pressed={playing}
        >
          {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-3" aria-live="polite">
        <div key={step} className="animate-fade-up">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-rose-300">
            Step {step + 1} of {STAGES.length} · {active.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-200">{active.detail}</p>
        </div>
      </div>

      <ol className="relative mt-4 space-y-3">
        {STAGES.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = index === step;
          const passed = index < step;

          return (
            <li key={stage.title} className="relative pl-12 sm:pl-14">
              {index < STAGES.length - 1 && (
                <span className="absolute bottom-[-0.75rem] left-[19px] top-10 w-px bg-ink-800 sm:left-[23px]">
                  <span
                    className={cn(
                      'block w-px bg-gradient-to-b from-rose-500 to-lavender-500 transition-all duration-700',
                      passed ? 'h-full' : 'h-0'
                    )}
                  />
                </span>
              )}

              <span
                className={cn(
                  'absolute left-0 top-0.5 flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-500 sm:h-12 sm:w-12',
                  isActive
                    ? 'scale-105 border-rose-500/60 bg-rose-500/15 text-rose-300 shadow-lg shadow-rose-500/10'
                    : passed
                      ? 'border-ink-700 bg-ink-900 text-ink-300'
                      : 'border-ink-800 bg-ink-950 text-ink-500'
                )}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>

              <button
                type="button"
                onClick={() => {
                  setStep(index);
                  setPlaying(false);
                }}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition-all duration-500',
                  isActive
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : 'border-ink-800 bg-ink-900/40 hover:border-ink-700'
                )}
              >
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <p className="text-sm font-semibold text-ink-50">{stage.title}</p>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-ink-500">
                    {index + 1}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-ink-400">{stage.role}</p>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-500">
        A simplified view — admin tooling, moderation and internal services are left out on purpose.
      </p>
    </section>
  );
}
