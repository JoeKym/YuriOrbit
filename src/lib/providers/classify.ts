import type { ContentTitle, GLClassification } from '@/types/content';

const normalizeStr = (s: string) => s.toLowerCase().replace(/['’]/g, '').trim();

const GL_GENRES = new Set([
  'yuri',
  'girls love',
  "girls' love",
  'gl',
  'shoujo ai',
  'shoujo-ai',
  'lesbian',
  'sapphic',
  'wlw',
  'baihe',
  'thai gl',
]);

const GL_TAGS = new Set([
  'yuri',
  'girls love',
  "girls' love",
  'shoujo ai',
  'shoujo-ai',
  'female-female romance',
  'lesbian',
  'sapphic',
  'wlw',
  'ff romance',
  'baihe',
  'thai gl',
  'gl drama',
]);

const BL_GENRES = new Set([
  'boys love',
  "boys' love",
  'bl',
  'yaoi',
  'shounen ai',
  'shounen-ai',
]);

const BL_TAGS = new Set([
  'yaoi',
  'boys love',
  "boys' love",
  'bl',
  'shounen ai',
  'shounen-ai',
  'male-male romance',
  'mm romance',
]);

const GL_KEYWORDS = [
  'yuri',
  'girls love',
  "girls' love",
  'shoujo ai',
  'female-female romance',
  'two girls',
  'women in love',
  'lesbian',
  'sapphic',
  'wlw',
  'girl x girl',
  'baihe',
  'gl drama',
  'thai gl',
];

/**
 * AniList tags are user-ranked and include spoiler tags. A "Yuri" tag at rank
 * 20–40 is usually a subtext/one-scene spoiler tag (e.g. Re:Zero), not evidence
 * that the work belongs in a GL catalogue. MangaDex tags carry no rank, so the
 * default of 100 keeps them authoritative.
 */
const MIN_CONFIRMED_TAG_RANK = 50;

const BL_KEYWORDS = [
  'yaoi',
  'boys love',
  "boys' love",
  'shounen ai',
  'male-male romance',
  'two boys',
  'bl ',
  'boy x boy',
];

export interface GLRelationEvidence {
  relationType?: string;
  genres?: string[];
  tags?: { name: string; rank?: number }[];
}

/** Franchise relations that make a related work part of a GL series. */
const GL_RELATION_TYPES = new Set([
  'PARENT',
  'SPIN_OFF',
  'SIDE_STORY',
  'SEQUEL',
  'PREQUEL',
  'ALTERNATIVE',
  'ADAPTATION',
]);

export function classifyGL(title: {
  genres?: string[];
  tags?: { name: string; rank?: number }[];
  description?: string;
  title?: string;
  altTitles?: string[];
  relations?: GLRelationEvidence[];
}): GLClassification {
  const genres = (title.genres || []).map((g) => g.toLowerCase().trim());
  const tags = title.tags || [];
  const descText = `${title.title || ''} ${(title.altTitles || []).join(' ')} ${title.description || ''}`.toLowerCase();

  const tagMatches = (name: string, set: Set<string>) => {
    const lower = name.toLowerCase().trim();
    const normalized = normalizeStr(lower);
    return set.has(lower) || set.has(normalized) || normalized === 'girls love' || normalized === 'shoujo ai';
  };
  const strongTag = (set: Set<string>) =>
    tags.some((tag) => (tag.rank ?? 100) >= MIN_CONFIRMED_TAG_RANK && tagMatches(tag.name, set));

  const isGLGenre = genres.some((g) => GL_GENRES.has(g) || normalizeStr(g) === 'girls love' || normalizeStr(g) === 'shoujo ai');
  const isGLTag = strongTag(GL_TAGS);

  const isBLGenre = genres.some((g) => BL_GENRES.has(g) || normalizeStr(g) === 'boys love');
  const isBLTag = strongTag(BL_TAGS);

  // Side stories, sequels and adaptations often carry no usable tags of their
  // own. A strong GL signal on a related franchise entry is independent
  // evidence, but only yields the weaker GL_RELATED classification.
  const hasRelatedGLEvidence = (title.relations || []).some((relation) => {
    if (!relation.relationType || !GL_RELATION_TYPES.has(relation.relationType)) return false;
    const relationGenres = (relation.genres || []).map((genre) => genre.toLowerCase().trim());
    if (
      relationGenres.some(
        (genre) =>
          GL_GENRES.has(genre) ||
          normalizeStr(genre) === 'girls love' ||
          normalizeStr(genre) === 'shoujo ai'
      )
    ) {
      return true;
    }
    return (relation.tags || []).some(
      (tag) => (tag.rank ?? 100) >= MIN_CONFIRMED_TAG_RANK && tagMatches(tag.name, GL_TAGS)
    );
  });

  if (isBLGenre || isBLTag) {
    // Explicit BL stays out unless a GL genre is also declared; a weak or
    // spoiler-tagged "Yuri" tag must not pull a BL title into the catalogue.
    if (!isGLGenre) return 'EXCLUDED';
  }

  if (isGLGenre || isGLTag) {
    return 'CONFIRMED_GL';
  }

  const hasBLKeyword = BL_KEYWORDS.some((kw) => descText.includes(kw));
  if (hasBLKeyword) {
    return 'EXCLUDED';
  }

  if (hasRelatedGLEvidence) {
    return 'GL_RELATED';
  }

  const glKeywordHits = GL_KEYWORDS.filter((kw) => descText.includes(kw));
  if (glKeywordHits.length >= 2) {
    return 'CONFIRMED_GL';
  }
  if (glKeywordHits.length === 1) {
    return 'GL_RELATED';
  }

  const strongGLSignal = (value: string) => {
    const clean = normalizeStr(value);
    return ['yuri', 'girls love', 'shoujo ai', 'lesbian', 'sapphic', 'baihe'].some((word) => clean.includes(word));
  };
  const hasStrongGLTag = tags.some((tag) => (tag.rank ?? 100) >= MIN_CONFIRMED_TAG_RANK && strongGLSignal(tag.name));

  if (hasStrongGLTag || genres.some(strongGLSignal)) {
    return 'CONFIRMED_GL';
  }

  return 'NEEDS_REVIEW';
}

export function filterGL(titles: ContentTitle[], allowed: GLClassification[] = ['CONFIRMED_GL', 'GL_RELATED']): ContentTitle[] {
  return titles.filter((t) => allowed.includes(t.glClassification));
}

/**
 * How strongly a title reads as Girls' Love, 0–100.
 */
export function glConfidence(title: {
  glClassification?: GLClassification;
  genres?: string[];
  tags?: { name: string; rank?: number }[];
  provider?: string;
}): number {
  let score = 0;

  if (title.glClassification === 'CONFIRMED_GL') score += 40;
  else if (title.glClassification === 'GL_RELATED') score += 15;

  const genres = (title.genres || []).map((genre) => normalizeStr(genre));
  if (genres.some((genre) => GL_GENRES.has(genre))) score += 25;

  const tagHit = (title.tags || []).find((tag) => GL_TAGS.has(normalizeStr(tag.name)));
  if (tagHit) score += 20 + Math.min(20, Math.round((tagHit.rank ?? 60) / 5));

  if (title.provider === 'MANGADEX') score += 15;

  return Math.min(100, score);
}

export const GL_ALLOWED_CLASSIFICATIONS: GLClassification[] = ['CONFIRMED_GL', 'GL_RELATED'];
