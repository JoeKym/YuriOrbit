import type { ContentTitle } from '@/types/content';

/**
 * Is this title animated?
 *
 * AniList only indexes anime, so an ANILIST row in a screen format is anime by
 * definition. TMDB has no such rule and marks it with a genre instead. MangaDex
 * rows are comics and never reach the screen formats.
 *
 * The dramas catalogue is live action: without this, the TV content type fills
 * with AniList TV anime (Dragon Maid, Bocchi, Lycoris Recoil), which already
 * have their own home under /anime.
 */
/**
 * TMDB occasionally files an anime under Comedy/Drama with no Animation genre
 * and no "anime" keyword, so the genre check above cannot see it. These ids are
 * anime and belong in the anime catalogue, not the drama one.
 */
const ANIMATED_TMDB_IDS = new Set(['256384']); // AYAKA is in LOVE with HIROKO

export function isAnimatedTitle(title: ContentTitle): boolean {
  if (title.provider === 'ANILIST') return true;
  if (title.provider === 'TMDB' && ANIMATED_TMDB_IDS.has(title.providerId)) return true;
  return (title.genres || []).some((genre) => /^(animation|anime)$/i.test(genre.trim()));
}
