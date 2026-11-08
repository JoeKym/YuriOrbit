/**
 * Canonical catalog entries.
 *
 * The catalog aggregates several providers, so the same work can show up twice
 * (once from AniList, once from MangaDex). This module merges those duplicates
 * into a single entry and gives it a YuriOrbit slug id.
 */
import type { ContentTitle, ExternalLink, Tag, TitleRelation } from '@/types/content';
import { familyOf, slugifyTitle, titleKey } from './identity';
import { registerTitles } from './registry';

const PROVIDER_WEIGHT: Record<ContentTitle['provider'], number> = {
  ANILIST: 30,
  MANGADEX: 22,
  JIKAN: 16,
  TMDB: 10,
  CURATED: 4,
};

/** How much metadata an entry carries — the richest one becomes the primary. */
function richness(title: ContentTitle): number {
  let score = PROVIDER_WEIGHT[title.provider] ?? 0;
  if (title.coverImage) score += 8;
  if (title.bannerImage) score += 2;
  if (title.description && title.description.length > 40) score += 6;
  if (title.averageScore) score += 4;
  if (title.tags.length > 0) score += 3;
  if (title.genres.length > 0) score += 1;
  if (title.status !== 'UNKNOWN') score += 1;
  return score;
}

function mergeTags(a: Tag[], b: Tag[]): Tag[] {
  const seen = new Set(a.map((tag) => tag.name.toLowerCase()));
  const merged = [...a];
  for (const tag of b) {
    const name = tag.name.toLowerCase();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    merged.push(tag);
  }
  return merged;
}

function mergeLinks(a: ExternalLink[], b: ExternalLink[]): ExternalLink[] {
  const seen = new Set(a.map((link) => link.url));
  const merged = [...a];
  for (const link of b) {
    if (!link.url || seen.has(link.url)) continue;
    seen.add(link.url);
    merged.push(link);
  }
  return merged;
}

function mergeRelations(a: TitleRelation[], b: TitleRelation[]): TitleRelation[] {
  const seen = new Set(a.map((rel) => `${rel.id}:${rel.relationType}`));
  const merged = [...a];
  for (const rel of b) {
    const key = `${rel.id}:${rel.relationType}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(rel);
  }
  return merged;
}

function mergeSources(primary: ContentTitle, others: ContentTitle[]): ContentTitle['sources'] {
  const seen = new Set<string>();
  const sources: NonNullable<ContentTitle['sources']> = [];
  const all = [primary, ...others];

  for (const title of all) {
    const key = `${title.provider}:${title.providerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({ provider: title.provider, providerId: title.providerId, url: title.sourceUrl });
  }

  return sources;
}

function mergeGroup(group: ContentTitle[]): ContentTitle {
  const sorted = [...group].sort((a, b) => richness(b) - richness(a));
  const primary: ContentTitle = {
    ...sorted[0],
    genres: [...sorted[0].genres],
    tags: [...sorted[0].tags],
    altTitles: [...sorted[0].altTitles],
    externalLinks: [...sorted[0].externalLinks],
    relations: [...sorted[0].relations],
  };
  const others = sorted.slice(1);

  for (const other of others) {
    if (!primary.coverImage && other.coverImage) primary.coverImage = other.coverImage;
    if (!primary.bannerImage && other.bannerImage) primary.bannerImage = other.bannerImage;

    if (
      other.description &&
      (!primary.description || other.description.length > primary.description.length + 40)
    ) {
      primary.description = other.description;
    }

    if (!primary.averageScore && other.averageScore) primary.averageScore = other.averageScore;
    if (!primary.releaseYear && other.releaseYear) primary.releaseYear = other.releaseYear;
    if (!primary.chapters && other.chapters) primary.chapters = other.chapters;
    if (!primary.volumes && other.volumes) primary.volumes = other.volumes;
    if (!primary.episodes && other.episodes) primary.episodes = other.episodes;
    if (!primary.country && other.country) primary.country = other.country;
    if (!primary.endDate && other.endDate) primary.endDate = other.endDate;
    if (primary.status === 'UNKNOWN' && other.status !== 'UNKNOWN') primary.status = other.status;
    if (primary.popularity === undefined && other.popularity !== undefined) {
      primary.popularity = other.popularity;
    }
    if (primary.favourites === undefined && other.favourites !== undefined) {
      primary.favourites = other.favourites;
    }

    // A provider that explicitly tags the work as GL settles the classification.
    if (other.glClassification === 'CONFIRMED_GL') primary.glClassification = 'CONFIRMED_GL';

    primary.genres = Array.from(new Set([...primary.genres, ...other.genres]));
    primary.tags = mergeTags(primary.tags, other.tags);
    primary.altTitles = Array.from(
      new Set([...primary.altTitles, ...other.altTitles, other.title].filter(Boolean))
    ).filter((alt) => titleKey(alt) !== titleKey(primary.title));
    primary.externalLinks = mergeLinks(primary.externalLinks, other.externalLinks);
    primary.relations = mergeRelations(primary.relations, other.relations);
  }

  primary.sources = mergeSources(sorted[0], others);
  return primary;
}

/**
 * Normalized title keys for an entry.
 * Alternate titles matter here: AniList calls it "Bloom Into You" while MangaDex
 * lists the romanized "Yagate Kimi ni Naru" — sharing a synonym is what proves
 * they are the same work.
 */
function keysFor(title: ContentTitle): string[] {
  const family = familyOf(title.contentType);
  const keys = new Set<string>();

  for (const raw of [title.title, ...title.altTitles]) {
    const key = titleKey(raw);
    // Ignore very short keys ("yuri", "gl") — they would merge unrelated works.
    if (key.length >= 6) keys.add(`${family}:${key}`);
  }

  if (keys.size === 0) keys.add(`${family}:${titleKey(title.title)}`);
  return [...keys];
}

function uniqueSlug(base: string, year: number | undefined, used: Set<string>): string {
  if (!used.has(base)) return base;

  if (year) {
    const withYear = `${base}-${year}`;
    if (!used.has(withYear)) return withYear;
  }

  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

/**
 * Merge duplicates and stamp every entry with a YuriOrbit slug id.
 * Order of first appearance is preserved so lists stay stable.
 */
export function canonicalizeTitles(titles: ContentTitle[]): ContentTitle[] {
  const entries = titles.filter((title) => title && title.title);
  if (entries.length === 0) return [];

  // Union-find over shared title keys so provider A's English title and provider
  // B's romanized title collapse into a single catalog entry.
  const parent = entries.map((_, index) => index);

  const find = (index: number): number => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };

  const union = (a: number, b: number) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  };

  const firstOwner = new Map<string, number>();
  entries.forEach((entry, index) => {
    for (const key of keysFor(entry)) {
      const owner = firstOwner.get(key);
      if (owner === undefined) firstOwner.set(key, index);
      else union(owner, index);
    }
  });

  const groups = new Map<number, ContentTitle[]>();
  const order: number[] = [];

  entries.forEach((entry, index) => {
    const root = find(index);
    const group = groups.get(root);
    if (group) {
      group.push(entry);
    } else {
      groups.set(root, [entry]);
      order.push(root);
    }
  });

  const used = new Set<string>();
  const result: ContentTitle[] = [];

  for (const root of order) {
    const group = groups.get(root);
    if (!group || group.length === 0) continue;

    const merged = mergeGroup(group);
    const slug = uniqueSlug(slugifyTitle(merged.title), merged.releaseYear, used);
    merged.id = slug;
    used.add(slug);
    result.push(merged);
  }

  registerTitles(result);
  return result;
}

/** Canonicalize a single title (safer than calling with a list you then take [0]). */
export function canonicalizeTitle(title: ContentTitle): ContentTitle {
  return canonicalizeTitles([title])[0] ?? title;
}
