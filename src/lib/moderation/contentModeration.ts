import { supabase } from '@/lib/supabase';
import type { ContentTitle } from '@/types/content';

export type ContentModerationAction = 'takedown' | 'suspended' | 'restricted';

export interface ContentModerationItem {
  titleId: string;
  title?: string;
  action: ContentModerationAction;
  reason?: string;
  note?: string;
  /** ISO timestamp; suspensions automatically stop blocking at this point. */
  expiresAt?: string;
  updatedAt?: string;
  updatedBy?: string;
}

type ModerationMap = Record<string, ContentModerationItem>;

let cache: { at: number; map: ModerationMap } | null = null;
let inFlight: Promise<ModerationMap> | null = null;
const TTL_MS = 15_000;
// A missing RPC (migration not applied yet) is permanent for this page load.
let rpcUnavailable = false;

function normalizeItem(item: ContentModerationItem | null | undefined): ContentModerationItem | null {
  if (!item || !item.action) return null;
  if (item.action !== 'restricted' && item.expiresAt) {
    const expires = Date.parse(item.expiresAt);
    if (Number.isFinite(expires) && expires <= Date.now()) return null;
  }
  return item;
}

function normalizeMap(value: unknown): ModerationMap {
  if (!value || typeof value !== 'object') return {};
  const out: ModerationMap = {};
  for (const [id, raw] of Object.entries(value as Record<string, ContentModerationItem>)) {
    const item = normalizeItem(raw);
    if (item) out[id] = { ...item, titleId: item.titleId || id };
  }
  return out;
}

async function readViaRpc(): Promise<ModerationMap | null> {
  if (!supabase || rpcUnavailable) return null;
  try {
    const { data, error } = await supabase.rpc('get_content_moderation');
    if (error) {
      const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase();
      if (
        text.includes('pgrst202') ||
        text.includes('could not find the function') ||
        text.includes('schema cache')
      ) {
        rpcUnavailable = true;
      }
      return null;
    }
    return normalizeMap(data);
  } catch {
    return null;
  }
}

async function readViaSettings(): Promise<ModerationMap | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'content_moderation')
    .maybeSingle();
  if (error) return null;
  return normalizeMap(data?.value);
}

export async function fetchContentModeration(force = false): Promise<ModerationMap> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.map;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const map = (await readViaRpc()) ?? (await readViaSettings());
      if (!map) return cache?.map ?? {};
      return map;
    } catch {
      return cache?.map ?? {};
    } finally {
      inFlight = null;
    }
  })();

  const map = await inFlight;
  cache = { at: Date.now(), map };
  return map;
}

/** Returns the active moderation entry for a title, or null when clean/expired. */
export function getModerationFor(map: ModerationMap, titleId: string): ContentModerationItem | null {
  return normalizeItem(map[titleId]);
}

/** Takedowns and suspensions block the page itself. */
export function isContentBlocked(map: ModerationMap, titleId: string): boolean {
  const item = getModerationFor(map, titleId);
  return item?.action === 'takedown' || item?.action === 'suspended';
}

/**
 * Anything with an active action is kept out of browse/search. Restrictions
 * differ from takedowns only in that a direct link still opens the page, with
 * a warning shown there.
 */
export function isContentHidden(map: ModerationMap, titleId: string): boolean {
  return getModerationFor(map, titleId) !== null;
}

export function filterModeratedTitles<T extends Pick<ContentTitle, 'id'>>(
  titles: T[],
  map: ModerationMap,
  onHidden?: (title: T) => void
): T[] {
  if (!map || Object.keys(map).length === 0) return titles;
  const visible: T[] = [];
  for (const title of titles) {
    if (isContentHidden(map, title.id)) onHidden?.(title);
    else visible.push(title);
  }
  return visible;
}
