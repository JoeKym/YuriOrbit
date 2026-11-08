import { useSyncExternalStore } from 'react';
import type { MaturityLevel } from '@/types/content';
import {
  acknowledgeAdult,
  getAdultAcknowledged,
  getMaturityLevel,
  setMaturityLevel,
  subscribeMaturity,
} from '@/lib/content/maturity-preference';
import { requiresAdultConfirmation } from '@/lib/content/maturity';

/**
 * Reads and updates the visitor's content filter.
 *
 * `setLevel` returns false when the level needs an 18+ confirmation the visitor
 * has not given yet; the caller should show the confirmation and then call
 * `acknowledge()` before retrying.
 */
export function useMaturity() {
  const level = useSyncExternalStore(subscribeMaturity, getMaturityLevel, () => 'SUGGESTIVE' as MaturityLevel);
  const adultAcknowledged = useSyncExternalStore(subscribeMaturity, getAdultAcknowledged, () => false);

  const setLevel = (next: MaturityLevel): boolean => setMaturityLevel(next);

  return {
    level,
    adultAcknowledged,
    setLevel,
    acknowledge: acknowledgeAdult,
    needsAdultConfirmation: (next: MaturityLevel) => requiresAdultConfirmation(next) && !adultAcknowledged,
  };
}
