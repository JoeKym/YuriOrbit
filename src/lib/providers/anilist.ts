/**
 * AniList GraphQL provider — public API, no API key required.
 */
import type { ContentFilter, ContentTitle, PaginatedResult, ContentType } from '@/types/content';
import { normalizeAniListMedia, type AniListMedia } from './normalize';
import { classifyGL, GL_ALLOWED_CLASSIFICATIONS } from './classify';

const ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const TIMEOUT = 15000;
const REQUEST_DELAY = 1200; // AniList recommends staying within 90 requests/minute

let lastRequest = 0;

async function anilistFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const elapsed = Date.now() - lastRequest;
  if (elapsed < REQUEST_DELAY) await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY - elapsed));
  lastRequest = Date.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(ANILIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`AniList ${response.status}`);
    const result = await response.json();
    if (result.errors?.length) throw new Error(result.errors[0].message);
    return result.data as T;
  } finally {
    clearTimeout(timer);
  }
}

const GL_TAGS = ['Yuri', 'Female Protagonist', 'LGBTQ+ Themes'];

const SEARCH_QUERY = `
query ($page: Int, $perPage: Int, $search: String, $tag_in: [String], $sort: [MediaSort], $status: MediaStatus, $seasonYear: Int, $format_in: [MediaFormat]) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage total }
    media(type: MANGA, search: $search, tag_in: $tag_in, sort: $sort, status: $status, seasonYear: $seasonYear, format_in: $format_in, isAdult: false) {
      id
      title { romaji english native }
      description(asHtml: false)
      coverImage { large medium }
      genres
      tags { name rank isMediaSpoiler }
      status
      format
      startDate { year month day }
      averageScore
      popularity
      chapters
      volumes
      siteUrl
      staff(perPage: 5) { edges { role node { name { full } } } }
    }
  }
}`;

function mapContentTypes(type?: ContentType | 'ALL'): string[] | undefined {
  if (!type || type === 'ALL') return ['MANGA', 'ONE_SHOT', 'NOVEL'];
  const map: Partial<Record<ContentType, string[]>> = {
    MANGA: ['MANGA'], MANHWA: ['MANGA'], MANHUA: ['MANGA'], WEBTOON: ['MANGA'], LIGHT_NOVEL: ['NOVEL'],
  };
  return map[type] || ['MANGA'];
}

function mapStatus(status?: ContentFilter['status']): string | undefined {
  if (!status || status === 'ALL') return undefined;
  const map: Record<string, string> = { RELEASING: 'RELEASING', FINISHED: 'FINISHED', NOT_YET_RELEASED: 'NOT_YET_RELEASED', HIATUS: 'HIATUS' };
  return map[status];
}

function mapSort(sort?: ContentFilter['sort']): string[] {
  switch (sort) {
    case 'SCORE': return ['SCORE_DESC'];
    case 'NEWEST': return ['START_DATE_DESC'];
    case 'TITLE': return ['TITLE_ROMAJI'];
    default: return ['POPULARITY_DESC'];
  }
}

function passesFilters(title: ContentTitle, filter: ContentFilter): boolean {
  if (filter.contentType && filter.contentType !== 'ALL') {
    const allowed: Partial<Record<ContentType, string[]>> = {
      MANGA: ['MANGA'], MANHWA: ['MANHWA'], MANHUA: ['MANHUA'], WEBTOON: ['WEBTOON'], LIGHT_NOVEL: ['LIGHT_NOVEL'],
    };
    if (allowed[filter.contentType] && !allowed[filter.contentType]!.includes(title.contentType)) return false;
  }
  if (filter.genre && !title.genres.some((genre) => genre.toLowerCase() === filter.genre!.toLowerCase())) return false;
  if (filter.year && title.releaseYear !== filter.year) return false;
  if (filter.status && filter.status !== 'ALL' && title.status !== filter.status) return false;
  if (filter.classification && filter.classification !== 'ALL' && !GL_ALLOWED_CLASSIFICATIONS.includes(title.glClassification)) return false;
  return true;
}

export async function anilistSearchGL(filter: ContentFilter = {}, page = 1, perPage = 24): Promise<PaginatedResult> {
  const variables = {
    page,
    perPage: Math.min(perPage, 50),
    search: filter.query || undefined,
    tag_in: GL_TAGS,
    sort: mapSort(filter.sort),
    status: mapStatus(filter.status),
    seasonYear: filter.year || undefined,
    format_in: mapContentTypes(filter.contentType),
  };
  const response = await anilistFetch<{
    Page: { pageInfo: { hasNextPage: boolean; total: number }; media: AniListMedia[] };
  }>(SEARCH_QUERY, variables);
  const items = response.Page.media
    .map((media) => normalizeAniListMedia(media))
    .map((title) => ({ ...title, glClassification: classifyGL({ genres: title.genres, description: title.description, title: title.title, altTitles: title.altTitles }) }))
    .filter((title) => passesFilters(title, filter));

  return { items, page, hasNextPage: response.Page.pageInfo.hasNextPage, total: response.Page.pageInfo.total };
}

export async function anilistGetPopularGL(limit = 12): Promise<ContentTitle[]> {
  try {
    const result = await anilistSearchGL({ sort: 'POPULARITY' }, 1, limit);
    return result.items;
  } catch {
    return [];
  }
}
