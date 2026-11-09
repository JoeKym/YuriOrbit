import { supabase } from '@/lib/supabase';
import type { ContentTitle } from '@/types/content';

export type ContentModerationAction = 'takedown' | 'suspended' | 'restricted';

export interface ContentModerationItem {
  titleId: string;
  title?: string;
  action: ContentModerationAction;
  reason?: string;
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
}

type ModerationMap = Record<string, ContentModerationItem>;

let cache: { at: number; map: ModerationMap } | null = null;
let inFlight: Promise<ModerationMap> | null = null;
const TTL_MS = 60_000;

export async function fetchContentModeration(force = false): Promise<ModerationMap> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.map;
  if (!supabase) return cache?.map ?? {};
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'content_moderation')
        .maybeSingle();
      if (error || !data?.value || typeof data.value !== 'object') return {};
      return data.value as ModerationMap;
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

export function getModerationFor(map: ModerationMap, titleId: string): ContentModerationItem | null {
  const item = map[titleId];
  return item && item.action ? item : null;
}

export function isContentBlocked(map: ModerationMap, titleId: string): boolean {
  const item = getModerationFor(map, titleId);
  return item?.action === 'takedown' || item?.action === 'suspended';
}

export function filterModeratedTitles<T extends Pick<ContentTitle, 'id'>>(titles: T[], map: ModerationMap): T[] {
  if (!map || Object.keys(map).length === 0) return titles;
  return titles.filter((t) => !isContentBlocked(map, t.id));
}
