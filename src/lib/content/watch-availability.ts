/**
 * Card-level streaming availability.
 *
 * A discover grid can render dozens of cards, and TMDB has no bulk
 * watch-providers endpoint, so every lookup is cached, deduplicated and run
 * through a small queue. Cards only request data once they are near the
 * viewport, which keeps a page load to the titles actually being seen.
 */
import { tmdbGetWatchProviders, tmdbPreferredRegion } from '@/lib/providers';
import type { TmdbWatchProviderResult } from '@/lib/providers/tmdb';
import { readStoredWatchRegion } from './watch-region';

const TTL = 10 * 60 * 1000;
const MAX_CONCURRENT = 3;

const cache = new Map<string, { at: number; value: TmdbWatchProviderResult | null }>();
const inflight = new Map<string, Promise<TmdbWatchProviderResult | null>>();

let active = 0;
const pending: (() => void)[] = [];

function schedule<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const run = () => {
      active += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          pending.shift()?.();
        });
    };

    if (active < MAX_CONCURRENT) run();
    else pending.push(run);
  });
}

export function getWatchAvailability(
  providerId: string,
  mediaType: 'movie' | 'tv'
): Promise<TmdbWatchProviderResult | null> {
  const stored = readStoredWatchRegion();
  const region = stored || tmdbPreferredRegion();
  const key = `${mediaType}:${providerId}:${region}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL) return Promise.resolve(cached.value);

  const running = inflight.get(key);
  if (running) return running;

  const task = schedule(() =>
    tmdbGetWatchProviders(providerId, mediaType, region, { fallbackToUS: !stored })
  )
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      return value;
    })
    .catch(() => null)
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, task);
  return task;
}
