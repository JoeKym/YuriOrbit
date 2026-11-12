/**
 * The visitor's content-filter preference, stored locally.
 *
 * Level chosen = the *highest* maturity that may appear. Defaults to
 * `SUGGESTIVE`, which is what a brand-new visitor sees: mild fanservice is fine,
 * erotica and pornography are hidden until someone opts in and confirms 18+.
 *
 * This is a URL-free, server-free store with subscriptions so a change in
 * Settings immediately re-filters every page.
 */
import type { MaturityLevel } from '@/types/content';
import { MATURITY_LEVELS } from '@/types/content';
import { clearProviderCache } from '@/lib/providers/cache';
import { clearCatalogCount } from '@/lib/catalog/catalog-count';
import { maturityRank, requiresAdultConfirmation } from './maturity';

const LEVEL_KEY = 'yuriorbit_maturity_level';
const ADULT_ACK_KEY = 'yuriorbit_maturity_adult_ack';

const DEFAULT_LEVEL: MaturityLevel = 'SUGGESTIVE';

function readLevel(): MaturityLevel {
  try {
    const stored = localStorage.getItem(LEVEL_KEY) as MaturityLevel | null;
    if (stored && MATURITY_LEVELS.includes(stored)) return stored;
  } catch {
    // Private mode / storage disabled.
  }
  return DEFAULT_LEVEL;
}

function readAdultAck(): boolean {
  try {
    return localStorage.getItem(ADULT_ACK_KEY) === 'true';
  } catch {
    return false;
  }
}

let currentLevel: MaturityLevel = readLevel();
let adultAcknowledged = readAdultAck();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getMaturityLevel(): MaturityLevel {
  return currentLevel;
}

export function getAdultAcknowledged(): boolean {
  return adultAcknowledged;
}

export function subscribeMaturity(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function acknowledgeAdult(): void {
  if (adultAcknowledged) return;
  adultAcknowledged = true;
  try {
    localStorage.setItem(ADULT_ACK_KEY, 'true');
  } catch {
    // ignore
  }
  emit();
}

/**
 * Change the level. Raising it into erotica/pornographic without an 18+
 * confirmation is refused — call `acknowledgeAdult()` first, then retry.
 */
export function setMaturityLevel(next: MaturityLevel): boolean {
  if (!MATURITY_LEVELS.includes(next)) return false;
  if (requiresAdultConfirmation(next) && !adultAcknowledged) return false;
  if (next === currentLevel) return true;

  currentLevel = next;
  try {
    localStorage.setItem(LEVEL_KEY, next);
  } catch {
    // ignore
  }

  // Provider queries are built per level (adult flags, content ratings), so
  // anything cached under the previous level must go — including the headline
  // "titles catalogued" count, which is measured at this level.
  clearProviderCache();
  clearCatalogCount();
  emit();
  return true;
}

export function resetMaturityPreference(): void {
  currentLevel = DEFAULT_LEVEL;
  try {
    localStorage.removeItem(LEVEL_KEY);
  } catch {
    // ignore
  }
  clearProviderCache();
  clearCatalogCount();
  emit();
}

/** Convenience for non-React code paths. */
export function allowsMaturity(level: MaturityLevel): boolean {
  return maturityRank(level) <= maturityRank(currentLevel);
}
