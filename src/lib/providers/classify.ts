import type { ContentTitle, GLClassification } from '@/types/content';

const GL_GENRES = new Set([
  'yuri',
  'girls love',
  'gl',
  'shoujo ai',
]);

const GL_TAGS = new Set([
  'yuri',
  'girls love',
  'shoujo ai',
  'female protagonist',
  'female-female romance',
  'lesbian',
  'ff romance',
]);

const BL_GENRES = new Set([
  'boys love',
  'bl',
  'yaoi',
  'shounen ai',
]);

const BL_TAGS = new Set([
  'yaoi',
  'boys love',
  'bl',
  'shounen ai',
  'male-male romance',
  'mm romance',
]);

const GL_KEYWORDS = [
  'yuri',
  'girls love',
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

  if (genres.some((g) => BL_GENRES.has(g)) || tagNames.some((t) => BL_TAGS.has(t))) {
    if (!genres.some((g) => GL_GENRES.has(g)) && !tagNames.some((t) => GL_TAGS.has(t))) {
      return 'EXCLUDED';
    }
  }

  if (genres.some((g) => GL_GENRES.has(g))) {
    return 'CONFIRMED_GL';
  }

  if (tagNames.some((t) => GL_TAGS.has(t))) {
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

  const glTags = tagNames.filter((t) =>
    t.includes('yuri') || t.includes('girls love') || t.includes('shoujo ai') || t.includes('lesbian') || t.includes('sapphic')
  );
  if (glTags.length > 0) {
    return 'CONFIRMED_GL';
  }

  return 'NEEDS_REVIEW';
}

export function filterGL(titles: ContentTitle[], allowed: GLClassification[] = ['CONFIRMED_GL', 'GL_RELATED']): ContentTitle[] {
  return titles.filter((t) => allowed.includes(t.glClassification));
}

export const GL_ALLOWED_CLASSIFICATIONS: GLClassification[] = ['CONFIRMED_GL', 'GL_RELATED'];
