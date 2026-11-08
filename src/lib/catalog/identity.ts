/**
 * YuriOrbit catalog identity.
 *
 * Every title gets its own YuriOrbit id — a readable slug such as
 * `the-guy-she-was-interested-in-wasnt-a-guy-at-all` — instead of leaking the
 * upstream provider's id into the URL. Provider ids are still kept on the title
 * (`provider`, `providerId`, `sources`) so readers and links to the original
 * catalogue keep working, they are just no longer part of our public id.
 */
import type { ContentTitle, ContentType } from '@/types/content';

const MANGA_FAMILY: ContentType[] = ['MANGA', 'MANHWA', 'MANHUA', 'WEBTOON', 'LIGHT_NOVEL', 'WEB_NOVEL', 'BOOK'];
const SCREEN_FAMILY: ContentType[] = ['MOVIE', 'TV', 'DRAMA'];

/** Providers whose ids look like `PROVIDER-123`. */
const LEGACY_ID_PATTERN = /^(ANILIST|JIKAN|MANGADEX|TMDB|CURATED)-/;

export function isLegacyProviderId(id: string): boolean {
  return LEGACY_ID_PATTERN.test(id);
}

/** Content type family — manga-family and screen-family titles never merge. */
export function familyOf(contentType: ContentType): 'manga' | 'screen' {
  return SCREEN_FAMILY.includes(contentType) ? 'screen' : 'manga';
}

export function isMangaFamily(contentType: ContentType): boolean {
  return MANGA_FAMILY.includes(contentType);
}

function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function stripDiacritics(input: string): string {
  return input.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Public id for a title. Deterministic for a given title string, ASCII-safe,
 * and human readable so `/title/<slug>` reads like a real catalogue URL.
 */
export function slugifyTitle(input: string): string {
  const base = stripDiacritics(input)
    .replace(/['’‘`´]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[×✕]/g, ' x ')
    .toLowerCase();

  let ascii = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  if (ascii.length > 72) {
    ascii = ascii.slice(0, 72);
    const lastDash = ascii.lastIndexOf('-');
    if (lastDash > 32) ascii = ascii.slice(0, lastDash);
  }

  ascii = ascii.replace(/-+$/g, '');

  // Fully non-latin titles still need a stable id.
  return ascii || `title-${fnv1a(input.trim().toLowerCase())}`;
}

/**
 * Comparison key used to spot the same title coming from two providers
 * (AniList + MangaDex, etc). Ignores case, punctuation, articles and accents.
 */
export function titleKey(input: string): string {
  const key = stripDiacritics(input)
    .toLowerCase()
    .replace(/['’‘`´"“”]/g, '')
    .replace(/&/g, ' and ')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return key || input.trim().toLowerCase();
}

/** Dedupe key: same family + same normalized title means "same work". */
export function dedupeKey(title: Pick<ContentTitle, 'title' | 'contentType'>): string {
  return `${familyOf(title.contentType)}:${titleKey(title.title)}`;
}

/** Turn a slug back into something a search endpoint understands. */
export function slugToQuery(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/^title-[a-z0-9]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

/** Pull a catalog id out of a pasted URL or raw id. */
export function extractTitleId(input: string): string {
  const value = input.trim();
  if (!value) return '';

  const titlePath = value.match(/\/title\/([^/?#]+)/i);
  if (titlePath) return decodeURIComponent(titlePath[1]);

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const seg = url.pathname.split('/').filter(Boolean).pop();
      return seg ? decodeURIComponent(seg) : '';
    } catch {
      return value;
    }
  }

  return value;
}
