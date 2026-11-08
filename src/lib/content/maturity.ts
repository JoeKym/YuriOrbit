/**
 * Maturity ratings for the catalogue.
 *
 * Every provider exposes maturity differently — MangaDex has an explicit
 * content rating, AniList has `isAdult` plus user-voted tags, TMDB has an
 * `adult` flag, Jikan has explicit genres — so everything is folded into one
 * four-step scale that matches MangaDex's own wording.
 *
 * Titles are only *labelled* here. What a visitor is allowed to see is decided
 * by their preference (see `maturity-preference.ts`).
 */
import type { ContentTitle, MaturityLevel } from '@/types/content';
import { MATURITY_LEVELS } from '@/types/content';

export { MATURITY_LEVELS };
export { MATURITY_LABELS, MATURITY_DESCRIPTIONS } from '@/types/content';

export function maturityRank(level: MaturityLevel): number {
  const index = MATURITY_LEVELS.indexOf(level);
  return index === -1 ? 1 : index;
}

export function compareMaturity(a: MaturityLevel, b: MaturityLevel): number {
  return maturityRank(a) - maturityRank(b);
}

/** True when `level` needs the visitor to have confirmed they are 18+. */
export function requiresAdultConfirmation(level: MaturityLevel): boolean {
  return maturityRank(level) >= maturityRank('EROTICA');
}

export function maxMaturityOf(levels: MaturityLevel[]): MaturityLevel {
  return levels.reduce<MaturityLevel>(
    (highest, level) => (maturityRank(level) > maturityRank(highest) ? level : highest),
    'SAFE'
  );
}

/** MangaDex content ratings to request for a given maximum level. */
export function mangadexContentRatings(max: MaturityLevel): ('safe' | 'suggestive' | 'erotica' | 'pornographic')[] {
  const allowed: ('safe' | 'suggestive' | 'erotica' | 'pornographic')[] = ['safe'];
  if (maturityRank(max) >= maturityRank('SUGGESTIVE')) allowed.push('suggestive');
  if (maturityRank(max) >= maturityRank('EROTICA')) allowed.push('erotica');
  if (maturityRank(max) >= maturityRank('PORNOGRAPHIC')) allowed.push('pornographic');
  return allowed;
}

/**
 * Tags strong enough to move a title out of "Safe". AniList tag ranks are 0–100
 * and describe how many users applied the tag, not how explicit the work is, so
 * only strongly applied tags count.
 */
const TAG_SIGNALS: { level: MaturityLevel; tags: string[]; minRank: number }[] = [
  {
    level: 'PORNOGRAPHIC',
    tags: ['hentai', 'explicit sex', 'pornographic', 'pornography', 'hardcore'],
    minRank: 0,
  },
  {
    level: 'EROTICA',
    tags: ['smut', 'erotica', 'explicit', 'sexual violence'],
    minRank: 50,
  },
  {
    level: 'SUGGESTIVE',
    tags: ['nudity', 'sexual content', 'ecchi', 'mature themes', 'fanservice'],
    minRank: 55,
  },
];

const DESCRIPTION_SIGNALS: { level: MaturityLevel; words: string[] }[] = [
  {
    level: 'PORNOGRAPHIC',
    words: ['pornographic', 'hentai', 'explicit sex', 'hardcore sex'],
  },
  {
    level: 'EROTICA',
    words: ['erotic', 'smut', 'steamy sex', 'explicit sexual'],
  },
  {
    level: 'SUGGESTIVE',
    words: ['suggestive', 'fanservice', 'ecchi', 'nudity', 'sexual tension'],
  },
];

const EXPLICIT_GENRES = new Set(['hentai', 'ecchi', 'erotica', 'pornographic']);

/**
 * Best-effort maturity for a title. An explicit `maturityRating` from the
 * provider always wins; otherwise tags, explicit genres, the adult flag and
 * description wording are combined and the highest signal is kept.
 */
export function inferMaturity(input: {
  maturityRating?: MaturityLevel;
  isAdult?: boolean;
  tags?: { name: string; rank?: number }[];
  genres?: string[];
  description?: string;
}): MaturityLevel {
  if (input.maturityRating) return input.maturityRating;

  const signals: MaturityLevel[] = [];

  if (input.isAdult) signals.push('PORNOGRAPHIC');

  const tagNames = (input.tags || []).map((tag) => ({
    name: tag.name.toLowerCase().trim(),
    rank: tag.rank ?? 100,
  }));
  for (const rule of TAG_SIGNALS) {
    const hit = tagNames.some((tag) => rule.tags.includes(tag.name) && tag.rank >= rule.minRank);
    if (hit) signals.push(rule.level);
  }

  const genreNames = (input.genres || []).map((genre) => genre.toLowerCase().trim());
  if (genreNames.some((genre) => EXPLICIT_GENRES.has(genre))) {
    signals.push(genreNames.includes('hentai') ? 'PORNOGRAPHIC' : 'EROTICA');
  }

  const description = (input.description || '').toLowerCase();
  for (const rule of DESCRIPTION_SIGNALS) {
    if (rule.words.some((word) => description.includes(word))) signals.push(rule.level);
  }

  return signals.length > 0 ? maxMaturityOf(signals) : 'SAFE';
}

export function maturityOf(title: Pick<ContentTitle, 'maturityRating' | 'isAdult' | 'tags' | 'genres' | 'description'>): MaturityLevel {
  return inferMaturity(title);
}

/** True when a title may be shown at the visitor's chosen level. */
export function isWithinMaturity(
  title: Pick<ContentTitle, 'maturityRating' | 'isAdult' | 'tags' | 'genres' | 'description'>,
  max: MaturityLevel
): boolean {
  return maturityRank(maturityOf(title)) <= maturityRank(max);
}

export function filterByMaturity<
  T extends Pick<ContentTitle, 'maturityRating' | 'isAdult' | 'tags' | 'genres' | 'description'>
>(titles: T[], max: MaturityLevel): T[] {
  return titles.filter((title) => isWithinMaturity(title, max));
}
