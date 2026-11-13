import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils/format';

/** Tuning knobs — the diagram's whole animation is controlled from here. */
const STEP_INTERVAL_MS = 3200;
const DASH_TRAVEL_SECONDS = 1.1;
const PACKET_TRAVEL_SECONDS = 2.4;
const EDGE_DASH = '5 9';
const BROKEN_DASH = '7 6';

type Scope = 'both' | 'catalogue' | 'account';
type IconKind = 'browser' | 'react' | 'layers' | 'account' | 'cloudflare' | 'api' | 'supabase';
type PathId = 'catalogue' | 'account';

interface NodeDef {
  id: string;
  label: string;
  sub: string;
  icon: IconKind;
  x: number;
  y: number;
  /** Which branch the node belongs to; shared nodes stay visible in both. */
  path?: PathId;
}

interface EdgeDef {
  id: string;
  d: string;
  path: PathId;
}

interface Step {
  title: string;
  detail: string;
  nodes: string[];
  edges: string[];
  path: PathId | 'shared';
}

const NODE_W = 196;
const NODE_H = 64;

const NODES: NodeDef[] = [
  { id: 'visitor', label: 'Visitor', sub: 'opens, searches, signs in', icon: 'browser', x: 440, y: 56 },
  { id: 'frontend', label: 'React frontend', sub: 'renders the interface', icon: 'react', x: 440, y: 156 },
  { id: 'catalogue', label: 'Catalogue layer', sub: 'merge · GL check · dedupe', icon: 'layers', x: 206, y: 262, path: 'catalogue' },
  { id: 'account', label: 'Account & library', sub: 'session · saved titles', icon: 'account', x: 674, y: 262, path: 'account' },
  { id: 'functions', label: 'Cloudflare Functions', sub: 'shared edge gateway', icon: 'cloudflare', x: 440, y: 372 },
  { id: 'upstream', label: 'Upstream APIs', sub: 'AniList · MangaDex · TMDB', icon: 'api', x: 206, y: 478, path: 'catalogue' },
  { id: 'supabase', label: 'Supabase', sub: 'accounts · personal library', icon: 'supabase', x: 674, y: 478, path: 'account' },
];

const EDGES: EdgeDef[] = [
  { id: 'e1', d: 'M440 88 V124', path: 'catalogue' },
  { id: 'e2', d: 'M440 188 V216 H206 V228', path: 'catalogue' },
  { id: 'e3', d: 'M440 188 V216 H674 V228', path: 'account' },
  { id: 'e4', d: 'M206 294 V330 H420 V338', path: 'catalogue' },
  { id: 'e5', d: 'M674 294 V330 H460 V338', path: 'account' },
  { id: 'e6', d: 'M440 404 V430 H206 V444', path: 'catalogue' },
  { id: 'e7', d: 'M440 404 V430 H674 V444', path: 'account' },
];

const STEPS: Step[] = [
  {
    title: 'Visitor',
    detail: 'Every request starts in the browser — opening a page, searching, or signing in.',
    nodes: ['visitor'],
    edges: [],
    path: 'shared',
  },
  {
    title: 'React frontend',
    detail: 'Static files arrive immediately; React takes over routing and renders the shell while content streams in.',
    nodes: ['visitor', 'frontend'],
    edges: ['e1'],
    path: 'shared',
  },
  {
    title: 'Two paths, one gateway',
    detail: 'Browsing the catalogue and managing an account take different branches, but both leave through the same edge layer.',
    nodes: ['frontend', 'catalogue', 'account'],
    edges: ['e2', 'e3'],
    path: 'shared',
  },
  {
    title: 'Catalogue path',
    detail: 'Provider responses are normalised, checked for Girls’ Love, de-duplicated and ranked before any title reaches the screen.',
    nodes: ['catalogue'],
    edges: ['e2'],
    path: 'catalogue',
  },
  {
    title: 'Account path',
    detail: 'A signed-in visitor carries a session so saved titles and preferences follow them between devices.',
    nodes: ['account'],
    edges: ['e3'],
    path: 'account',
  },
  {
    title: 'Cloudflare Functions',
    detail: 'One thin edge layer for both paths: it relays provider calls, keeps credentials off the client, and caches repeats.',
    nodes: ['catalogue', 'account', 'functions'],
    edges: ['e4', 'e5'],
    path: 'shared',
  },
  {
    title: 'Upstream APIs',
    detail: 'AniList, MangaDex and TMDB supply titles, covers and scores — each with its own strengths and blind spots.',
    nodes: ['functions', 'upstream'],
    edges: ['e6'],
    path: 'catalogue',
  },
  {
    title: 'Supabase',
    detail: 'Accounts and the personal library live in Supabase, separate from the public catalogue anyone can browse.',
    nodes: ['functions', 'supabase'],
    edges: ['e7'],
    path: 'account',
  },
];

/** Hand-drawn stand-ins for the real brand marks, so nothing is fetched at runtime. */
function NodeIcon({ kind }: { kind: IconKind }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (kind) {
    case 'browser':
      return (
        <g {...common}>
          <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
          <path d="M2.5 9h19" />
          <circle cx="5.6" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="8.4" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
        </g>
      );
    case 'react':
      return (
        <g {...common}>
          <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="9.2" ry="3.8" />
          <ellipse cx="12" cy="12" rx="9.2" ry="3.8" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="9.2" ry="3.8" transform="rotate(120 12 12)" />
        </g>
      );
    case 'layers':
      return (
        <g {...common}>
          <path d="M12 3.2 20.6 7.7 12 12.2 3.4 7.7z" />
          <path d="M3.4 12.2 12 16.7l8.6-4.5" />
          <path d="M3.4 16.4 12 20.9l8.6-4.5" />
        </g>
      );
    case 'account':
      return (
        <g {...common}>
          <circle cx="12" cy="8.6" r="3.4" />
          <path d="M5.2 20.2a6.8 6.8 0 0 1 13.6 0" />
        </g>
      );
    case 'cloudflare':
      return (
        <g {...common}>
          <path d="M7 18.2h9.6a3.9 3.9 0 0 0 .5-7.8 5.7 5.7 0 0 0-10.5-.5A3.7 3.7 0 0 0 7 18.2z" />
          <path d="M14.8 6.2 12.4 11h3.1l-2.4 4.8" />
        </g>
      );
    case 'api':
      return (
        <g {...common}>
          <rect x="3" y="4.2" width="18" height="6.4" rx="2" />
          <rect x="3" y="13.4" width="18" height="6.4" rx="2" />
          <path d="M6.6 7.4h.01M6.6 16.6h.01" />
        </g>
      );
    case 'supabase':
      return (
        <g {...common}>
          <path d="M13.2 3 5 13.6h5.4L10.8 21 19 10.4h-5.4z" />
        </g>
      );
    default:
      return null;
  }
}

export function HowItWorksFlow() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [scope, setScope] = useState<Scope>('both');
  const [outage, setOutage] = useState(false);
  const [motionOk, setMotionOk] = useState(true);

  // Respect the OS setting: no cycling, no travelling packets.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMotionOk(!query.matches);
    if (query.matches) setPlaying(false);
    const onChange = (event: MediaQueryListEvent) => {
      setMotionOk(!event.matches);
      if (event.matches) setPlaying(false);
    };
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const steps = useMemo(
    () => (scope === 'both' ? STEPS : STEPS.filter((s) => s.path === 'shared' || s.path === scope)),
    [scope]
  );

  const safeIndex = Math.min(step, steps.length - 1);
  const active = steps[safeIndex];

  useEffect(() => {
    if (!playing || steps.length < 2) return;
    const id = window.setInterval(() => setStep((current) => (current + 1) % steps.length), STEP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, steps.length]);

  useEffect(() => {
    if (step > steps.length - 1) setStep(0);
  }, [step, steps.length]);

  const isVisible = (path?: PathId) => !path || scope === 'both' || path === scope;

  const visited = useMemo(() => {
    const nodes = new Set<string>();
    const edges = new Set<string>();
    steps.slice(0, safeIndex).forEach((s) => {
      s.nodes.forEach((n) => nodes.add(n));
      s.edges.forEach((e) => edges.add(e));
    });
    return { nodes, edges };
  }, [steps, safeIndex]);

  const activeNodes = new Set(active?.nodes ?? []);
  const activeEdges = new Set(active?.edges ?? []);

  const go = (delta: number) => {
    setStep((current) => (current + delta + steps.length) % steps.length);
    setPlaying(false);
  };

  const jumpToNode = (id: string) => {
    const index = steps.findIndex((s) => s.nodes.includes(id));
    if (index >= 0) {
      setStep(index);
      setPlaying(false);
    }
  };

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-400">Under the hood</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink-50">How YuriOrbit works</h2>
          <p className="mt-1 text-sm text-ink-400">
            One request, two branches — the catalogue you browse and the account behind it.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter the diagram by path"
            className="flex overflow-hidden rounded-lg border border-ink-700 bg-ink-900 text-xs"
          >
            {(['both', 'catalogue', 'account'] as Scope[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setScope(value);
                  setStep(0);
                  setPlaying(false);
                }}
                aria-pressed={scope === value}
                className={cn(
                  'px-2.5 py-2 font-medium capitalize transition-colors',
                  scope === value ? 'bg-rose-500/15 text-rose-200' : 'text-ink-400 hover:text-ink-200'
                )}
              >
                {value === 'both' ? 'Both' : value}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOutage((value) => !value)}
            aria-pressed={outage}
            className={cn(
              'rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors',
              outage
                ? 'border-rose-500/60 bg-rose-500/10 text-rose-200'
                : 'border-ink-700 bg-ink-900 text-ink-300 hover:text-ink-100'
            )}
          >
            {outage ? 'Outage shown' : 'Simulate outage'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-3" aria-live="polite">
        <div key={`${scope}-${safeIndex}`} className="animate-fade-up">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-rose-300">
            Step {safeIndex + 1} of {steps.length} · {active?.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-200">{active?.detail}</p>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-ink-800 bg-ink-950/50 p-2 sm:p-3">
        <svg
          viewBox="0 0 880 524"
          className="h-auto w-full min-w-[560px]"
          role="group"
          aria-label="Request flow: a visitor reaches the React frontend, which branches into a catalogue path and an account path; both pass through Cloudflare Functions to the upstream APIs and Supabase."
        >
          <defs>
            <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgb(244 63 94)" />
              <stop offset="100%" stopColor="rgb(167 139 250)" />
            </linearGradient>
            <marker id="arrowIdle" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" fill="rgb(63 63 70)" />
            </marker>
            <marker id="arrowActive" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 10 5 0 10z" fill="rgb(251 113 133)" />
            </marker>
          </defs>

          {EDGES.map((edge) => {
            const visible = isVisible(edge.path);
            const isActive = activeEdges.has(edge.id);
            const isVisited = visited.edges.has(edge.id);
            const broken = outage && edge.id === 'e6';
            const flowing = motionOk && (isActive || isVisited) && !broken;

            return (
              <g key={edge.id} opacity={visible ? 1 : 0.16}>
                <path
                  id={`edge-${edge.id}`}
                  d={edge.d}
                  fill="none"
                  stroke={broken ? 'rgb(244 63 94)' : isActive ? 'url(#flowGrad)' : isVisited ? 'rgb(82 82 91)' : 'rgb(39 39 42)'}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  strokeDasharray={broken ? BROKEN_DASH : undefined}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  markerEnd={isActive ? 'url(#arrowActive)' : 'url(#arrowIdle)'}
                  className="transition-all duration-500"
                />

                {flowing && (
                  <path
                    d={edge.d}
                    fill="none"
                    stroke="url(#flowGrad)"
                    strokeWidth="2"
                    strokeDasharray={EDGE_DASH}
                    strokeLinecap="round"
                    opacity="0.85"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="-28"
                      dur={`${DASH_TRAVEL_SECONDS}s`}
                      repeatCount="indefinite"
                    />
                  </path>
                )}

                {flowing && isActive && (
                  <circle r="3.4" fill="rgb(251 113 133)">
                    <animateMotion dur={`${PACKET_TRAVEL_SECONDS}s`} repeatCount="indefinite" rotate="0">
                      <mpath href={`#edge-${edge.id}`} />
                    </animateMotion>
                  </circle>
                )}
              </g>
            );
          })}

          {/* Path labels sit beside the branch edges. */}
          {/* A failed provider call is not a dead end: the edge breaks visibly. */}
          {outage && (
            <g>
              <circle cx="323" cy="430" r="9" className="fill-ink-950" />
              <path d="M319 426l8 8M327 426l-8 8" stroke="rgb(244 63 94)" strokeWidth="2" strokeLinecap="round" />
              <text x="323" y="412" textAnchor="middle" className="fill-rose-300 text-[10px]">
                provider error
              </text>
            </g>
          )}

          {scope === 'both' && (
            <>
              <text x="322" y="212" textAnchor="middle" className="fill-ink-500 text-[10px] uppercase tracking-[0.14em]">
                catalogue
              </text>
              <text x="558" y="212" textAnchor="middle" className="fill-ink-500 text-[10px] uppercase tracking-[0.14em]">
                account
              </text>
            </>
          )}

          {NODES.map((node) => {
            const visible = isVisible(node.path);
            const isActive = activeNodes.has(node.id);
            const isVisited = visited.nodes.has(node.id);

            return (
              <g
                key={node.id}
                opacity={visible ? 1 : 0.16}
                role="button"
                tabIndex={visible ? 0 : -1}
                aria-label={`${node.label}: ${node.sub}`}
                onClick={() => jumpToNode(node.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    jumpToNode(node.id);
                  }
                }}
                className="cursor-pointer transition-opacity duration-500 focus:outline-none"
              >
                <rect
                  x={node.x - NODE_W / 2}
                  y={node.y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                  rx="14"
                  className={cn(
                    'transition-all duration-500',
                    isActive
                      ? 'fill-rose-500/10 stroke-rose-400/70'
                      : isVisited
                        ? 'fill-ink-900 stroke-ink-700'
                        : 'fill-ink-950 stroke-ink-800'
                  )}
                  strokeWidth={isActive ? 2 : 1.4}
                />

                <g
                  transform={`translate(${node.x - 82}, ${node.y - 12})`}
                  className={cn(
                    'transition-colors duration-500',
                    isActive ? 'text-rose-200' : isVisited ? 'text-ink-200' : 'text-ink-500'
                  )}
                >
                  <NodeIcon kind={node.icon} />
                </g>

                <text
                  x={node.x - 48}
                  y={node.y - 1}
                  className={cn(
                    'text-[13px] font-semibold transition-colors duration-500',
                    isActive ? 'fill-rose-100' : isVisited ? 'fill-ink-100' : 'fill-ink-400'
                  )}
                >
                  {node.label}
                </text>
                <text
                  x={node.x - 48}
                  y={node.y + 16}
                  className={cn(
                    'text-[11px] transition-colors duration-500',
                    isActive ? 'fill-rose-200/80' : 'fill-ink-500'
                  )}
                >
                  {node.sub}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => go(-1)}
            className="inline-flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:bg-ink-850"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Prev
          </button>
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-pressed={playing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:bg-ink-850"
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="inline-flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-ink-200 transition-colors hover:bg-ink-850"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-[11px] text-ink-500 sm:hidden">Scroll the diagram sideways to see the full flow.</p>

        <p className="hidden text-[11px] text-ink-500 sm:block">
          {outage
            ? 'Outage view: the catalogue path shows a broken link to the upstream APIs.'
            : 'A simplified view — admin tooling, moderation and internal services are left out on purpose.'}
        </p>
      </div>
    </section>
  );
}
