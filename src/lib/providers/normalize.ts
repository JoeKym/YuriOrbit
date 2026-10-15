import type {
  ContentTitle,
  ContentType,
  ReleaseStatus,
  GLClassification,
  ExternalLink,
  TitleRelation,
  Tag,
} from '@/types/content';
import { classifyGL } from './classify';

interface AniListMedia {
  id: number;
  idMal?: number;
  title?: {
    romaji?: string;
    english?: string;
    native?: string;
  };
  synonyms?: string[];
  description?: string;
  countryOfOrigin?: string;
  genres?: string[];
  tags?: { id: number; name: string; rank?: number }[];
  averageScore?: number;
  popularity?: number;
  favourites?: number;
  status?: string;
  season?: string;
  seasonYear?: number;
  startDate?: { year?: number; month?: number; day?: number };
  endDate?: { year?: number; month?: number; day?: number };
  episodes?: number;
  chapters?: number;
  volumes?: number;
  coverImage?: { extraLarge?: string; large?: string; medium?: string; color?: string };
  bannerImage?: string;
  format?: string;
  source?: string;
  externalLinks?: { url: string; site: string; type?: string; icon?: string; color?: string }[];
  relations?: { edges?: { relationType?: string; node?: { id: number; title?: { romaji?: string; english?: string }; coverImage?: { large?: string }; format?: string; type?: string } }[] };
  trailer?: { id: string; site: string };
  isAdult?: boolean;
  siteUrl?: string;
}

function mapStatus(status?: string): ReleaseStatus {
  switch (status) {
    case 'RELEASING': return 'RELEASING';
    case 'FINISHED': return 'FINISHED';
    case 'NOT_YET_RELEASED': return 'NOT_YET_RELEASED';
    case 'CANCELLED': return 'CANCELLED';
    case 'HIATUS': return 'HIATUS';
    default: return 'UNKNOWN';
  }
}

function mapContentType(format?: string, country?: string): ContentType {
  const isKorean = country === 'KR';
  const isChinese = country === 'CN';
  switch (format) {
    case 'MANGA':
      if (isKorean) return 'MANHWA';
      if (isChinese) return 'MANHUA';
      return 'MANGA';
    case 'MANHWA': return 'MANHWA';
    case 'MANHUA': return 'MANHUA';
    case 'NOVEL': return 'LIGHT_NOVEL';
    case 'ONE_SHOT': return 'MANGA';
    case 'MOVIE': return 'MOVIE';
    case 'TV': return 'TV';
    case 'TV_SHORT': return 'TV';
    case 'OVA': return 'TV';
    case 'ONA': return 'TV';
    case 'SPECIAL': return 'TV';
    case 'MUSIC': return 'TV';
    default:
      if (isKorean) return 'MANHWA';
      if (isChinese) return 'MANHUA';
      return 'MANGA';
  }
}

function stripHtml(html?: string): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export function normalizeAniList(media: AniListMedia): ContentTitle {
  const title = media.title?.english || media.title?.romaji || media.title?.native || 'Unknown Title';
  const altTitles = media.synonyms || [
    media.title?.romaji,
    media.title?.native,
  ].filter(Boolean) as string[];

  const genres = media.genres || [];
  const tags: Tag[] = (media.tags || []).map((t) => ({ id: t.id, name: t.name, rank: t.rank }));

  const glClassification: GLClassification = classifyGL({
    genres,
    tags,
    description: stripHtml(media.description),
    title,
    altTitles,
  });

  const externalLinks: ExternalLink[] = (media.externalLinks || []).map((l) => ({
    url: l.url,
    site: l.site,
    type: l.type,
    icon: l.icon,
    color: l.color,
  }));

  if (media.siteUrl) {
    externalLinks.unshift({ url: media.siteUrl, site: 'AniList', type: 'METADATA' });
  }
  if (media.idMal) {
    externalLinks.push({ url: `https://myanimelist.net/manga/${media.idMal}`, site: 'MyAnimeList', type: 'METADATA' });
  }

  const relations: TitleRelation[] = (media.relations?.edges || [])
    .filter((e) => e.node)
    .map((e) => ({
      id: `ANILIST-${e.node!.id}`,
      title: e.node!.title?.english || e.node!.title?.romaji || 'Unknown',
      coverImage: e.node!.coverImage?.large,
      relationType: e.relationType || 'RELATED',
      contentType: mapContentType(e.node!.format),
    }));

  const contentType = mapContentType(media.format, media.countryOfOrigin);

  return {
    id: `ANILIST-${media.id}`,
    providerId: String(media.id),
    provider: 'ANILIST',
    title,
    altTitles,
    description: stripHtml(media.description),
    contentType,
    coverImage: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium,
    bannerImage: media.bannerImage || undefined,
    genres,
    tags,
    status: mapStatus(media.status),
    releaseYear: media.startDate?.year || media.seasonYear,
    endDate: media.endDate?.year ? `${media.endDate.year}-${String(media.endDate.month || 1).padStart(2, '0')}-${String(media.endDate.day || 1).padStart(2, '0')}` : undefined,
    country: media.countryOfOrigin,
    averageScore: media.averageScore,
    popularity: media.popularity,
    favourites: media.favourites,
    chapters: media.chapters,
    volumes: media.volumes,
    episodes: media.episodes,
    externalLinks,
    relations,
    trailerId: media.trailer?.id,
    trailerSite: media.trailer?.site,
    isAdult: media.isAdult,
    glClassification,
    sourceUrl: media.siteUrl,
    updatedAt: new Date().toISOString(),
  };
}
