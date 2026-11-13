import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Link2, Pause, Play } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
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
type NodeState = 'active' | 'visited' | 'idle';

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
  /** Omitted for edges that belong to both branches. */
  path?: PathId;
  /** Answers travel back along the return lane rather than the request lines. */
  direction?: 'response';
}

interface Step {
  /** Stable id — this is what the ?flow= deep link carries. */
  id: string;
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

const NODE_BY_ID = new Map(NODES.map((node) => [node.id, node]));

const EDGES: EdgeDef[] = [
  { id: 'e1', d: 'M440 88 V124', path: 'catalogue' },
  { id: 'e2', d: 'M440 188 V216 H206 V228', path: 'catalogue' },
  { id: 'e3', d: 'M440 188 V216 H674 V228', path: 'account' },
  { id: 'e4', d: 'M206 294 V330 H420 V338', path: 'catalogue' },
  { id: 'e5', d: 'M674 294 V330 H460 V338', path: 'account' },
  { id: 'e6', d: 'M440 404 V430 H206 V444', path: 'catalogue' },
  { id: 'e7', d: 'M440 404 V430 H674 V444', path: 'account' },
  // The return lane: every request is answered, and the answer travels back up
  // the right-hand side to the browser that asked for it.
  { id: 'r1', d: 'M206 510 V520 H838', path: 'catalogue', direction: 'response' },
  { id: 'r2', d: 'M674 510 V520 H838', path: 'account', direction: 'response' },
  { id: 'r3', d: 'M838 520 V156 H540', direction: 'response' },
  { id: 'r4', d: 'M452 158 V88', direction: 'response' },
];

const STEPS: Step[] = [
  {
    id: 'visitor',
    title: 'Visitor',
    detail: 'Every request starts in the browser — opening a page, searching, or signing in.',
    nodes: ['visitor'],
    edges: [],
    path: 'shared',
  },
  {
    id: 'frontend',
    title: 'React frontend',
    detail: 'Static files arrive immediately; React takes over routing and renders the shell while content streams in.',
    nodes: ['visitor', 'frontend'],
    edges: ['e1'],
    path: 'shared',
  },
  {
    id: 'branch',
    title: 'Two paths, one gateway',
    detail: 'Browsing the catalogue and managing an account take different branches, but both leave through the same edge layer.',
    nodes: ['frontend', 'catalogue', 'account'],
    edges: ['e2', 'e3'],
    path: 'shared',
  },
  {
    id: 'catalogue',
    title: 'Catalogue path',
    detail: 'Provider responses are normalised, checked for Girls’ Love, de-duplicated and ranked before any title reaches the screen.',
    nodes: ['catalogue'],
    edges: ['e2'],
    path: 'catalogue',
  },
  {
    id: 'account',
    title: 'Account path',
    detail: 'A signed-in visitor carries a session so saved titles and preferences follow them between devices.',
    nodes: ['account'],
    edges: ['e3'],
    path: 'account',
  },
  {
    id: 'functions',
    title: 'Cloudflare Functions',
    detail: 'One thin edge layer for both paths: it relays provider calls, keeps credentials off the client, and caches repeats.',
    nodes: ['catalogue', 'account', 'functions'],
    edges: ['e4', 'e5'],
    path: 'shared',
  },
  {
    id: 'upstream',
    title: 'Upstream APIs',
    detail: 'AniList, MangaDex and TMDB supply titles, covers and scores — each with its own strengths and blind spots.',
    nodes: ['functions', 'upstream'],
    edges: ['e6'],
    path: 'catalogue',
  },
  {
    id: 'supabase',
    title: 'Supabase',
    detail: 'Accounts and the personal library live in Supabase, separate from the public catalogue anyone can browse.',
    nodes: ['functions', 'supabase'],
    edges: ['e7'],
    path: 'account',
  },
  {
    id: 'response',
    title: 'The answer comes back',
    detail: 'Every request is answered. The providers reply to the edge layer, which normalises, filters and caches the payload before it travels any further.',
    nodes: ['upstream', 'supabase', 'functions'],
    edges: ['e6', 'e7', 'r1', 'r2'],
    path: 'shared',
  },
  {
    id: 'render',
    title: 'Back on screen — the loop closes',
    detail: 'React renders what came back and the visitor sees it. The next scroll, search or sign-in starts the same round trip again.',
    nodes: ['functions', 'frontend', 'visitor'],
    edges: ['r3', 'r4'],
    path: 'shared',
  },
];

const BRANCH_NODES: Record<PathId, string[]> = {
  catalogue: ['catalogue', 'functions', 'upstream'],
  account: ['account', 'functions', 'supabase'],
};

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

function parseFlowParams(params: URLSearchParams): { scope: Scope; stepId?: string } {
  const rawFlow = params.get('flow');
  const step = rawFlow ? STEPS.find((candidate) => candidate.id === rawFlow) : undefined;
  const rawPath = params.get('path');

  const scope: Scope =
    rawPath === 'catalogue' || rawPath === 'account'
      ? rawPath
      : step && step.path !== 'shared'
        ? step.path
        : 'both';

  return { scope, stepId: step?.id };
}

export function HowItWorksFlow() {
  const [searchParams, setSearchParams] = useSearchParams();
  // The URL is read once, on mount: after that the component owns the state and
  // writes it back, so a shared link lands on the exact step and path.
  const initial = useMemo(() => parseFlowParams(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [scope, setScope] = useState<Scope>(initial.scope);
  const [activeId, setActiveId] = useState<string>(initial.stepId ?? STEPS[0].id);
  const [playing, setPlaying] = useState(!initial.stepId);
  const [outage, setOutage] = useState(false);
  const [motionOk, setMotionOk] = useState(true);
  const [copied, setCopied] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);

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

  // A deep link should put the diagram in view, not just load it.
  useEffect(() => {
    if (!initial.stepId && !searchParams.get('path')) return;
    sectionRef.current?.scrollIntoView({ block: 'start', behavior: initial.stepId ? 'smooth' : 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = useMemo(
    () => (scope === 'both' ? STEPS : STEPS.filter((step) => step.path === 'shared' || step.path === scope)),
    [scope]
  );

  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === activeId));
  const active = steps[currentIndex];

  // Filtering can hide the current step (e.g. the account step while only the
  // catalogue path is shown), so fall back to the first visible step.
  useEffect(() => {
    if (active && active.id !== activeId) setActiveId(active.id);
  }, [active, activeId]);

  // Keep the address bar in sync without stacking history entries for every tick.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('flow', activeId);
    if (scope === 'both') next.delete('path');
    else next.set('path', scope);
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, scope]);

  useEffect(() => {
    if (!playing || steps.length < 2) return;
    const id = window.setInterval(() => {
      setActiveId((current) => {
        const index = steps.findIndex((step) => step.id === current);
        return steps[(index + 1) % steps.length].id;
      });
    }, STEP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, steps]);

  const visited = useMemo(() => {
    const nodes = new Set<string>();
    const edges = new Set<string>();
    steps.slice(0, currentIndex).forEach((step) => {
      step.nodes.forEach((node) => nodes.add(node));
      step.edges.forEach((edge) => edges.add(edge));
    });
    return { nodes, edges };
  }, [steps, currentIndex]);

  const activeNodes = new Set(active?.nodes ?? []);
  const activeEdges = new Set(active?.edges ?? []);

  const isVisible = (path?: PathId) => !path || scope === 'both' || path === scope;

  const go = (delta: number) => {
    const index = steps.findIndex((step) => step.id === activeId);
    setActiveId(steps[(index + delta + steps.length) % steps.length].id);
    setPlaying(false);
  };

  const jumpToNode = (id: string) => {
    const index = steps.findIndex((step) => step.nodes.includes(id));
    if (index >= 0) {
      setActiveId(steps[index].id);
      setPlaying(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be denied; the URL in the address bar still works.
    }
  };

  const nodeState = (id: string): NodeState =>
    activeNodes.has(id) ? 'active' : visited.nodes.has(id) ? 'visited' : 'idle';

  return (
    <section className="mt-10 scroll-mt-24" ref={sectionRef}>
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
                  setActiveId(STEPS[0].id);
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

          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-2 text-xs font-medium text-ink-300 transition-colors hover:text-ink-100"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-rose-300" /> : <Link2 className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-3" aria-live="polite">
        <div key={`${scope}-${activeId}`} className="animate-fade-up">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-rose-300">
            Step {currentIndex + 1} of {steps.length} · {active?.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-200">{active?.detail}</p>
        </div>
      </div>

      {/* Desktop: the branching graph. */}
      <div className="mt-3 hidden rounded-xl border border-ink-800 bg-ink-950/50 p-3 lg:block">
        <svg
          viewBox="0 0 880 556"
          className="h-auto w-full"
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
            <linearGradient id="returnGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgb(167 139 250)" />
              <stop offset="100%" stopColor="rgb(244 63 94)" />
            </linearGradient>
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
                  stroke={
                    broken
                      ? 'rgb(244 63 94)'
                      : edge.direction === 'response'
                        ? isActive || isVisited
                          ? 'url(#returnGrad)'
                          : 'rgb(63 63 70)'
                        : isActive
                          ? 'url(#flowGrad)'
                          : isVisited
                            ? 'rgb(82 82 91)'
                            : 'rgb(39 39 42)'
                  }
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
                    stroke={edge.direction === 'response' ? 'url(#returnGrad)' : 'url(#flowGrad)'}
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
              <text x="322" y="212" textAnchor="middle" className="fill-ink-400 text-[10px] uppercase tracking-[0.14em]">
                catalogue
              </text>
              <text x="558" y="212" textAnchor="middle" className="fill-ink-400 text-[10px] uppercase tracking-[0.14em]">
                account
              </text>
            </>
          )}

          <text
            x="828"
            y="330"
            transform="rotate(-90 828 330)"
            textAnchor="middle"
            className="fill-ink-600 text-[10px] uppercase tracking-[0.18em]"
          >
            response
          </text>

          {NODES.map((node) => {
            const visible = isVisible(node.path);
            const state = nodeState(node.id);

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
                    state === 'active'
                      ? 'fill-rose-500/10 stroke-rose-400/70'
                      : state === 'visited'
                        ? 'fill-ink-900 stroke-ink-700'
                        : 'fill-ink-950 stroke-ink-800'
                  )}
                  strokeWidth={state === 'active' ? 2 : 1.4}
                />

                <g
                  transform={`translate(${node.x - 82}, ${node.y - 12})`}
                  className={cn(
                    'transition-colors duration-500',
                    state === 'active' ? 'text-rose-200' : state === 'visited' ? 'text-ink-200' : 'text-ink-400'
                  )}
                >
                  <NodeIcon kind={node.icon} />
                </g>

                <text
                  x={node.x - 48}
                  y={node.y - 1}
                  className={cn(
                    'text-[13px] font-semibold transition-colors duration-500',
                    state === 'active' ? 'fill-rose-100' : state === 'visited' ? 'fill-ink-100' : 'fill-ink-400'
                  )}
                >
                  {node.label}
                </text>
                <text
                  x={node.x - 48}
                  y={node.y + 16}
                  className={cn(
                    'text-[11px] transition-colors duration-500',
                    state === 'active' ? 'fill-rose-200/80' : 'fill-ink-400'
                  )}
                >
                  {node.sub}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Mobile: the same graph, stacked instead of scrolled sideways. */}
      <div className="mt-3 rounded-xl border border-ink-800 bg-ink-950/50 p-3 lg:hidden">
        <div className="flex flex-col items-stretch">
          {['visitor', 'frontend'].map((id) => {
            const node = NODE_BY_ID.get(id);
            if (!node) return null;
            // The visitor sits on e1; the frontend's outgoing edges are the split.
            const outgoing = id === 'visitor' ? ['e1'] : ['e2', 'e3'];
            const lit = outgoing.some((edge) => activeEdges.has(edge) || visited.edges.has(edge));
            return (
              <div key={id} className="flex flex-col">
                <MobileNode node={node} state={nodeState(node.id)} />
                <MobileConnector active={lit} label={id === 'visitor' ? 'request' : 'branch'} />
              </div>
            );
          })}

          <div className="flex flex-col gap-3">
            {(['catalogue', 'account'] as PathId[])
              .filter((path) => scope === 'both' || scope === path)
              .map((path) => (
                <div
                  key={path}
                  className={cn(
                    'rounded-lg border p-2.5',
                    scope === path ? 'border-rose-500/30 bg-rose-500/[0.04]' : 'border-ink-800 bg-ink-900/40'
                  )}
                >
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                    {path === 'catalogue' ? 'Catalogue path' : 'Account path'}
                  </p>

                  {BRANCH_NODES[path].map((id, index) => {
                    const node = NODE_BY_ID.get(id);
                    if (!node) return null;
                    const isLast = index === BRANCH_NODES[path].length - 1;
                    // The same edges drive both layouts, so the stacked version
                    // lights up in step with the graph.
                    const edgeId = path === 'catalogue' ? (index === 0 ? 'e4' : 'e6') : index === 0 ? 'e5' : 'e7';
                    const lit = activeEdges.has(edgeId) || visited.edges.has(edgeId);
                    const broken = outage && path === 'catalogue' && isLast;

                    return (
                      <div key={`${path}-${id}`} className="flex flex-col">
                        <MobileNode
                          node={node}
                          state={nodeState(node.id)}
                          shared={id === 'functions'}
                        />
                        {!isLast && <MobileConnector active={lit} broken={broken} />}
                      </div>
                    );
                  })}
                </div>
              ))}
          </div>

          {/* The answer comes back to the browser — the loop closes. */}
          <div className="mt-3 rounded-lg border border-ink-800 bg-ink-900/40 p-2.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              Response
            </p>

            {['frontend', 'visitor'].map((id, index) => {
              const node = NODE_BY_ID.get(id);
              if (!node) return null;
              const edgeId = index === 0 ? 'r3' : 'r4';
              const lit = activeEdges.has(edgeId) || visited.edges.has(edgeId);
              return (
                <div key={`response-${id}`} className="flex flex-col">
                  <MobileNode node={node} state={nodeState(node.id)} />
                  <MobileConnector active={lit} label={index === 0 ? 'answer' : undefined} />
                </div>
              );
            })}
          </div>
        </div>
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

        <p className="text-[11px] text-ink-400">
          {outage
            ? 'Outage view: the catalogue path shows a broken link to the upstream APIs.'
            : 'Requests travel the middle of the graph; answers come back along the return lane.'}
        </p>
      </div>
    </section>
  );
}

function MobileNode({
  node,
  state,
  shared,
}: {
  node: NodeDef;
  state: NodeState;
  shared?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors duration-500',
        state === 'active'
          ? 'border-rose-500/60 bg-rose-500/10'
          : state === 'visited'
            ? 'border-ink-700 bg-ink-900'
            : 'border-ink-800 bg-ink-950'
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(
          'h-5 w-5 shrink-0 transition-colors duration-500',
          state === 'active' ? 'text-rose-200' : state === 'visited' ? 'text-ink-200' : 'text-ink-400'
        )}
        aria-hidden="true"
      >
        <NodeIcon kind={node.icon} />
      </svg>

      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-xs font-semibold',
            state === 'active' ? 'text-rose-100' : state === 'visited' ? 'text-ink-100' : 'text-ink-400'
          )}
        >
          {node.label}
        </p>
        <p className={cn('truncate text-[10.5px]', state === 'active' ? 'text-rose-200/80' : 'text-ink-400')}>
          {node.sub}
        </p>
      </div>

      {shared && (
        <span className="ml-auto shrink-0 rounded-full border border-ink-700 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-ink-400">
          shared
        </span>
      )}
    </div>
  );
}

function MobileConnector({
  active,
  broken,
  label,
}: {
  active?: boolean;
  broken?: boolean;
  label?: string;
}) {
  return (
    <div className="relative flex h-7 items-center justify-center" aria-hidden="true">
      <span
        className={cn(
          'h-full w-px',
          broken
            ? 'border-l border-dashed border-rose-500/80'
            : active
              ? 'bg-gradient-to-b from-rose-500 to-lavender-500'
              : 'bg-ink-800'
        )}
      />
      {broken ? (
        <span className="absolute rounded-full bg-ink-950 px-1 text-[9px] font-semibold text-rose-300">✕</span>
      ) : (
        label && <span className="absolute left-1/2 ml-2 text-[9px] uppercase tracking-[0.12em] text-ink-600">{label}</span>
      )}
    </div>
  );
}
