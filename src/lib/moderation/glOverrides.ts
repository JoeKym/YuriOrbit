/**
 * Manual GL overrides for TMDB records.
 *
 * TMDB keyword data is incomplete: some films and dramas are clearly GL but
 * carry no verified keyword, so search correctly refuses to guess. Moderators
 * can record an explicit override here; the TMDB provider upgrades those
 * titles to GL-related before the allow-list runs.
 *
 * Stored in `site_settings` as `gl_overrides`, keyed `${mediaType}:${tmdbId}`.
 */
import { supabase } from '@/lib/supabase';
import type { ContentTitle, GLClassification } from '@/types/content';

export interface GLOverrideItem {
  title?: string;
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type GLOverrideMap = Record<string, GLOverrideItem>;

const CACHE_TTL = 15_000;
let cache: { at: number; map: GLOverrideMap } | null = null;
let inFlight: Promise<GLOverrideMap> | null = null;

export function glOverrideKey(mediaType: 'movie' | 'tv', providerId: string): string {
  return `${mediaType}:${providerId}`;
}

export function mediaTypeForTitle(
  title: Pick<ContentTitle, 'contentType'>
): 'movie' | 'tv' {
  return title.contentType === 'MOVIE' ? 'movie' : 'tv';
}

function normalizeMap(value: unknown): GLOverrideMap {
  if (!value || typeof value !== 'object') return {};
  const out: GLOverrideMap = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!/^(movie|tv):[0-9]+$/.test(key) || !raw || typeof raw !== 'object') continue;
    out[key] = raw as GLOverrideItem;
  }
  return out;
}

export async function fetchGLOverrides(force = false): Promise<GLOverrideMap> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL) return cache.map;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (!supabase) return cache?.map ?? {};
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'gl_overrides')
        .maybeSingle();
      if (error) return cache?.map ?? {};
      return normalizeMap(data?.value);
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

/**
 * Pure application step, shared by the provider and the tests. Only TMDB items
 * are eligible; a manual override is treated as confirmed GL evidence.
 */
export function applyGLOverrides<
  T extends Pick<ContentTitle, 'provider' | 'providerId' | 'contentType' | 'glClassification'>,
>(items: T[], map: GLOverrideMap): T[] {
  if (!map || Object.keys(map).length === 0) return items;
  return items.map((item) => {
    if (item.provider !== 'TMDB') return item;
    const key = glOverrideKey(mediaTypeForTitle(item), item.providerId);
    if (!map[key]) return item;
    return { ...item, glClassification: 'GL_RELATED' as GLClassification };
  });
}
