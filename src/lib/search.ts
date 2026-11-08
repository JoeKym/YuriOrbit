/**
 * Catalogue search: one entry point used by the navbar typeahead and the
 * /search page.
 *
 * Handles the four things people actually type:
 *   - a title or an alias             → provider text search
 *   - a YuriOrbit slug or provider id → exact lookup, no search
 *   - a creator (author, artist, VA, director) → staff/person lookups
 *   - a format filter                 → applied by the caller on `hits`
 */
import type { ContentTitle } from '@/types/content';
import { getTitleById, getCreatorTitles, resolveDirectTitle, searchGLTitles } from '@/lib/providers';
import type { CreatorGroup } from '@/lib/providers';
import { getCached, setCached } from '@/lib/providers/cache';
import { getMaturityLevel } from '@/lib/content/maturity-preference';
import { titleKey } from '@/lib/catalog/identity';

export type SearchMatchKind = 'TITLE' | 'ALT_TITLE' | 'CREATOR' | 'ID';

export interface SearchHit {
  title: ContentTitle;
  match: SearchMatchKind;
  /** Creator name, alias, or provider id that matched. */
  detail?: string;
}

export interface LiveSearchResult {
  query: string;
  hits: SearchHit[];
  creators: CreatorGroup[];
  /** Set when the query resolved to exactly one title (slug or provider id). */
  direct?: ContentTitle;
  /** Number of results before the caller's own filters. */
  total: number;
  error: boolean;
}

const PROVIDER_ID_RE = /^(ANILIST|MANGADEX|JIKAN|TMDB)-/i;
const MD_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeId(query: string): boolean {
  const q = query.trim();
  return PROVIDER_ID_RE.test(q) || MD_UUID_RE.test(q) || /^\d+$/.test(q);
}

const norm = (value: string) => value.toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim();

function classifyMatch(title: ContentTitle, query: string): SearchHit {
  const q = norm(query);
  const primary = norm(title.title);
  if (primary === q) return { title, match: 'TITLE' };

  const alias = title.altTitles.find((alt) => norm(alt).includes(q));
  if (alias) return { title, match: 'ALT_TITLE', detail: alias };

  if (primary.includes(q)) return { title, match: 'TITLE' };
  if (title.providerId.toLowerCase() === q) return { title, match: 'ID', detail: title.provider };
  return { title, match: 'TITLE' };
}

export async function liveSearch(
  rawQuery: string,
  options: { limit?: number; includeCreators?: boolean } = {}
): Promise<LiveSearchResult> {
  const query = rawQuery.trim();
  const limit = options.limit ?? 24;
  const empty: LiveSearchResult = { query, hits: [], creators: [], total: 0, error: false };
  if (query.length < 2) return empty;

  const cacheKey = `search_${query.toLowerCase()}_${getMaturityLevel()}`;
  const cached = getCached<LiveSearchResult>(cacheKey);
  if (cached) return cached;

  // 1. Exact ids and already-seen slugs skip the search engines entirely.
  let direct: ContentTitle | undefined;
  const registered = resolveDirectTitle(query);
  if (registered) {
    direct = registered;
  } else if (PROVIDER_ID_RE.test(query)) {
    direct = (await getTitleById(query)) ?? undefined;
  }

  if (direct) {
    const result: LiveSearchResult = {
      query,
      direct,
      hits: [{ title: direct, match: 'ID', detail: direct.provider }],
      creators: [],
      total: 1,
      error: false,
    };
    setCached(cacheKey, result);
    return result;
  }

  // 2. Title search and creator search run together.
  const [titleResult, creatorGroups] = await Promise.all([
    searchGLTitles({ query }, 1, limit).catch(() => null),
    options.includeCreators ? getCreatorTitles(query).catch(() => []) : Promise.resolve([]),
  ]);

  const titleHits: SearchHit[] = (titleResult?.items ?? []).map((title) => classifyMatch(title, query));

  // 3. Titles found through a creator are appended once, labelled with the name.
  const hits: SearchHit[] = [...titleHits];
  const seen = new Set(titleHits.map((hit) => hit.title.id));
  const seenTitles = new Set(titleHits.map((hit) => titleKey(hit.title.title)));
  for (const group of creatorGroups) {
    for (const title of group.titles) {
      const key = titleKey(title.title);
      const existing = hits.find((hit) => hit.title.id === title.id || titleKey(hit.title.title) === key);
      if (existing) {
        // Already a title hit, but the creator is the more useful explanation.
        existing.match = 'CREATOR';
        existing.detail = group.name;
        continue;
      }
      seen.add(title.id);
      seenTitles.add(key);
      hits.push({ title, match: 'CREATOR', detail: group.name });
    }
  }

  const result: LiveSearchResult = {
    query,
    hits: hits.slice(0, limit),
    creators: creatorGroups,
    total: hits.length,
    error: titleResult === null,
  };

  if (!result.error) setCached(cacheKey, result);
  return result;
}

export type FormatFilter = 'all' | 'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'novel' | 'screen';

export const FORMAT_FILTERS: { key: FormatFilter; label: string }[] = [
  { key: 'all', label: 'All formats' },
  { key: 'manga', label: 'Manga' },
  { key: 'manhwa', label: 'Manhwa' },
  { key: 'manhua', label: 'Manhua' },
  { key: 'webtoon', label: 'Webtoons' },
  { key: 'novel', label: 'Novels' },
  { key: 'screen', label: 'Anime, Movies & Dramas' },
];

export function matchesFormat(title: ContentTitle, format: FormatFilter): boolean {
  switch (format) {
    case 'all': return true;
    case 'manga': return title.contentType === 'MANGA';
    case 'manhwa': return title.contentType === 'MANHWA';
    case 'manhua': return title.contentType === 'MANHUA';
    case 'webtoon': return title.contentType === 'WEBTOON';
    case 'novel': return ['LIGHT_NOVEL', 'WEB_NOVEL', 'BOOK'].includes(title.contentType);
    case 'screen': return ['TV', 'MOVIE', 'DRAMA'].includes(title.contentType);
    default: return true;
  }
}

/** Group hits by format for the typeahead. */
export function groupHitsByFormat(hits: SearchHit[]): { key: string; label: string; hits: SearchHit[] }[] {
  const order: { key: string; label: string; types: ContentTitle['contentType'][] }[] = [
    { key: 'manga', label: 'Manga', types: ['MANGA'] },
    { key: 'manhwa', label: 'Manhwa', types: ['MANHWA'] },
    { key: 'manhua', label: 'Manhua', types: ['MANHUA'] },
    { key: 'novel', label: 'Novels', types: ['LIGHT_NOVEL', 'WEB_NOVEL', 'BOOK'] },
    { key: 'webtoon', label: 'Webtoons', types: ['WEBTOON'] },
    { key: 'screen', label: 'Anime, Movies & Dramas', types: ['TV', 'MOVIE', 'DRAMA'] },
  ];

  const groups = order
    .map((group) => ({
      key: group.key,
      label: group.label,
      hits: hits.filter((hit) => group.types.includes(hit.title.contentType)),
    }))
    .filter((group) => group.hits.length > 0);

  // Anything with an unexpected type still shows up rather than vanishing.
  const covered = new Set(groups.flatMap((group) => group.hits.map((hit) => hit.title.id)));
  const leftovers = hits.filter((hit) => !covered.has(hit.title.id));
  if (leftovers.length > 0) groups.push({ key: 'other', label: 'Other', hits: leftovers });

  return groups;
}
