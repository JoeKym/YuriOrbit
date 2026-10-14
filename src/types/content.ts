export type ContentType =
  | 'MANGA'
  | 'MANHWA'
  | 'MANHUA'
  | 'WEBTOON'
  | 'LIGHT_NOVEL'
  | 'WEB_NOVEL'
  | 'BOOK'
  | 'MOVIE'
  | 'DRAMA'
  | 'TV';

export type ContentFormat = ContentType;

export type GLClassification = 'CONFIRMED_GL' | 'GL_RELATED' | 'NEEDS_REVIEW' | 'EXCLUDED';

export type ReleaseStatus = 'RELEASING' | 'FINISHED' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS' | 'UNKNOWN';

export type SourceProvider = 'ANILIST' | 'JIKAN' | 'MANGADEX' | 'TMDB' | 'CURATED';

export interface Genre {
  id: number;
  name: string;
}

export interface Tag {
  id: number;
  name: string;
  rank?: number;
}

export interface ExternalLink {
  url: string;
  site: string;
  type?: string;
  icon?: string;
  color?: string;
}

export interface TitleRelation {
  id: string;
  title: string;
  coverImage?: string;
  relationType: string;
  contentType: ContentType;
}

export interface ChapterInfo {
  id: string;
  number: number;
  title?: string;
  translatedTitle?: string;
  pageCount?: number;
  readable?: boolean;
  externalUrl?: string;
}

export interface SeasonInfo {
  number: number;
  title?: string;
  episodeCount?: number;
  airDate?: string;
}

export interface ContentTitle {
  id: string;
  providerId: string;
  provider: SourceProvider;
  title: string;
  altTitles: string[];
  description?: string;
  contentType: ContentType;
  coverImage?: string;
  bannerImage?: string;
  genres: string[];
  tags: Tag[];
  status: ReleaseStatus;
  releaseYear?: number;
  endDate?: string;
  country?: string;
  language?: string;
  averageScore?: number;
  popularity?: number;
  favourites?: number;
  chapters?: number;
  volumes?: number;
  episodes?: number;
  seasons?: SeasonInfo[];
  chaptersList?: ChapterInfo[];
  externalLinks: ExternalLink[];
  relations: TitleRelation[];
  trailerId?: string;
  trailerSite?: string;
  cast?: string[];
  isAdult?: boolean;
  glClassification: GLClassification;
  sourceUrl?: string;
  updatedAt?: string;
}

export interface ContentFilter {
  query?: string;
  contentType?: ContentType | 'ALL';
  genre?: string;
  year?: number;
  country?: string;
  status?: ReleaseStatus | 'ALL';
  source?: SourceProvider | 'ALL';
  sort?: 'TITLE' | 'YEAR' | 'SCORE' | 'POPULARITY' | 'NEWEST';
  classification?: GLClassification | 'ALL';
}

export interface PaginatedResult {
  items: ContentTitle[];
  page: number;
  perPage: number;
  total?: number;
  hasNextPage: boolean;
}

export interface LibraryEntry {
  id: string;
  titleId: string;
  title: string;
  coverImage?: string;
  contentType: ContentType;
  status: LibraryStatus;
  progress: number;
  totalProgress?: number;
  rating?: number;
  notes?: string;
  addedAt: string;
  updatedAt: string;
  provider: SourceProvider;
}

export type LibraryStatus =
  | 'CURRENT'
  | 'PLANNED'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'DROPPED'
  | 'FAVOURITE';

export const LIBRARY_STATUS_LABELS: Record<LibraryStatus, string> = {
  CURRENT: 'Currently Reading',
  PLANNED: 'Plan to Read',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped',
  FAVOURITE: 'Favourites',
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  MANGA: 'Manga',
  MANHWA: 'Manhwa',
  MANHUA: 'Manhua',
  WEBTOON: 'Webtoon',
  LIGHT_NOVEL: 'Light Novel',
  WEB_NOVEL: 'Web Novel',
  BOOK: 'Book',
  MOVIE: 'Movie',
  DRAMA: 'Drama',
  TV: 'TV Series',
};

export const CONTENT_TYPE_ROUTES: Record<ContentType, string> = {
  MANGA: '/manga',
  MANHWA: '/manhwa',
  MANHUA: '/manhua',
  WEBTOON: '/webtoons',
  LIGHT_NOVEL: '/novels',
  WEB_NOVEL: '/novels',
  BOOK: '/novels',
  MOVIE: '/movies',
  DRAMA: '/dramas',
  TV: '/dramas',
};

export const GENRE_LIST = [
  'Romance', 'Drama', 'Comedy', 'Fantasy', 'Historical',
  'School Life', 'Slice of Life', 'Mystery', 'Psychological',
  'Supernatural', 'Science Fiction', 'Tragedy', 'Slow Burn',
  'Action', 'Adventure', 'Thriller', 'Horror', 'Music',
];

export const SORT_OPTIONS = [
  { value: 'POPULARITY', label: 'Most Popular' },
  { value: 'SCORE', label: 'Highest Rated' },
  { value: 'NEWEST', label: 'Newest First' },
  { value: 'YEAR', label: 'Release Year' },
  { value: 'TITLE', label: 'A to Z' },
] as const;
