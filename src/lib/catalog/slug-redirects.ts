/**
 * Cross-device canonical slug redirects.
 *
 * The catalog keeps a per-browser registry of slugs, which meant the same story
 * could live at different URLs on different devices. `slug_redirects` in
 * Supabase is the shared source of truth for old → canonical mappings; this
 * module caches it locally, resolves chains, and publishes new aliases when a
 * merge changes a slug.
 */
import { supabase } from '@/lib/supabase';

const CACHE_KEY = 'yuriorbit:slug_redirects_v1';
const TTL_MS = 1000 * 60 * 60 * 24;
const MAX_REDIRECTS = 5000;
const MAX_DEPTH = 5;

type RedirectMap = Record<string, string>;

interface Cache {
  map: RedirectMap;
  at: number;
}

let memory: RedirectMap | null = null;
let loadedAt = 0;
let loadPromise: Promise<void> | null = null;
const publishedAliases = new Set<string>();

function readCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { map: {}, at: 0 };
    const parsed = JSON.parse(raw) as Cache;
    if (!parsed || typeof parsed.map !== 'object') return { map: {}, at: 0 };
    return { map: parsed.map, at: Number(parsed.at) || 0 };
  } catch {
    return { map: {}, at: 0 };
  }
}

function writeCache(): void {
  if (!memory) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ map: memory, at: loadedAt }));
  } catch {
    /* Storage blocked or full: the in-memory map still works for this visit. */
  }
}

function hydrate(): RedirectMap {
  if (memory) return memory;
  const cached = readCache();
  memory = cached.map;
  loadedAt = cached.at;
  return memory;
}

function isSlug(value: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

/** Follow the cached chain without touching the network. */
export function getCachedCanonicalSlug(slug: string): string {
  const map = hydrate();
  let current = slug;
  for (let depth = 0; depth < MAX_DEPTH; depth += 1) {
    const next = map[current];
    if (!next || next === current) break;
    current = next;
  }
  return current;
}

/**
 * Canonical slug for an old URL. Reads the shared table at most once per cache
 * window, and never blocks a page for more than a moment if Supabase is slow.
 */
export async function canonicalSlugFor(slug: string): Promise<string> {
  hydrate();

  if (loadedAt > 0 && Date.now() - loadedAt < TTL_MS) {
    return getCachedCanonicalSlug(slug);
  }

  if (supabase && !loadPromise) {
    loadPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('slug_redirects')
          .select('alias_slug,canonical_slug')
          .limit(MAX_REDIRECTS);
        if (error) throw error;

        const remote: RedirectMap = {};
        for (const row of (data as { alias_slug: string; canonical_slug: string }[]) ?? []) {
          if (isSlug(row.alias_slug) && isSlug(row.canonical_slug)) {
            remote[row.alias_slug] = row.canonical_slug;
          }
        }
        memory = { ...hydrate(), ...remote };
        loadedAt = Date.now();
        writeCache();
      } catch {
        /* Offline or table not migrated: keep the local cache. */
      } finally {
        loadPromise = null;
      }
    })();
  }

  if (loadPromise) {
    await Promise.race([
      loadPromise,
      new Promise<void>((resolve) => setTimeout(resolve, 1200)),
    ]);
  }

  return getCachedCanonicalSlug(slug);
}

/**
 * Record that `alias` is the same story as `canonical`. Local immediately,
 * remote in the background so other devices converge on one URL.
 */
export function rememberSlugAlias(
  alias: string,
  canonical: string,
  provider?: string,
  providerId?: string
): void {
  const from = alias?.trim();
  const to = canonical?.trim();
  if (!from || !to || from === to || !isSlug(from) || !isSlug(to)) return;

  const map = hydrate();
  map[from] = to;

  const keys = Object.keys(map);
  if (keys.length > MAX_REDIRECTS) {
    for (const key of keys.slice(0, keys.length - MAX_REDIRECTS)) delete map[key];
  }
  writeCache();

  if (!supabase || publishedAliases.has(from)) return;
  publishedAliases.add(from);

  void supabase
    .rpc('register_slug_redirect', {
      p_alias: from,
      p_canonical: to,
      p_provider: provider ?? null,
      p_provider_id: providerId ?? null,
    })
    .then(({ error }) => {
      // Let a later attempt retry if the table is not migrated yet.
      if (error) publishedAliases.delete(from);
    });
}
