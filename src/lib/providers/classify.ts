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
]);

const GL_TAGS = new Set([
  'yuri',
  'girls love',
  "girls' love",
  'shoujo ai',
  'shoujo-ai',
  'female protagonist',
  'female-female romance',
  'lesbian',
  'sapphic',
  'wlw',
  'ff romance',
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
];

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

export function classifyGL(title: {
  genres?: string[];
  tags?: { name: string; rank?: number }[];
  description?: string;
  title?: string;
  altTitles?: string[];
}): GLClassification {
  const genres = (title.genres || []).map((g) => g.toLowerCase().trim());
  const tagNames = (title.tags || []).map((t) => t.name.toLowerCase().trim());
  const descText = `${title.title || ''} ${(title.altTitles || []).join(' ')} ${title.description || ''}`.toLowerCase();

  const isGLGenre = genres.some((g) => GL_GENRES.has(g) || normalizeStr(g) === 'girls love' || normalizeStr(g) === 'shoujo ai');
  const isGLTag = tagNames.some((t) => GL_TAGS.has(t) || normalizeStr(t) === 'girls love' || normalizeStr(t) === 'shoujo ai');

  const isBLGenre = genres.some((g) => BL_GENRES.has(g) || normalizeStr(g) === 'boys love');
  const isBLTag = tagNames.some((t) => BL_TAGS.has(t) || normalizeStr(t) === 'boys love');

  if (isBLGenre || isBLTag) {
    if (!isGLGenre && !isGLTag) {
      return 'EXCLUDED';
    }
  }

  if (isGLGenre || isGLTag) {
    return 'CONFIRMED_GL';
  }

  const hasBLKeyword = BL_KEYWORDS.some((kw) => descText.includes(kw));
  if (hasBLKeyword) {
    return 'EXCLUDED';
  }

  const glKeywordHits = GL_KEYWORDS.filter((kw) => descText.includes(kw));
  if (glKeywordHits.length >= 2) {
    return 'CONFIRMED_GL';
  }
  if (glKeywordHits.length === 1) {
    return 'GL_RELATED';
  }

  const glTagsOrGenres = [...tagNames, ...genres].filter((t) => {
    const clean = normalizeStr(t);
    return clean.includes('yuri') || clean.includes('girls love') || clean.includes('shoujo ai') || clean.includes('lesbian') || clean.includes('sapphic');
  });

  if (glTagsOrGenres.length > 0) {
    return 'CONFIRMED_GL';
  }

  return 'NEEDS_REVIEW';
}

export function filterGL(titles: ContentTitle[], allowed: GLClassification[] = ['CONFIRMED_GL', 'GL_RELATED']): ContentTitle[] {
  return titles.filter((t) => allowed.includes(t.glClassification));
}

export const GL_ALLOWED_CLASSIFICATIONS: GLClassification[] = ['CONFIRMED_GL', 'GL_RELATED'];
