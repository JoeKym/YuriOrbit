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
  | 'TV'
  /** Animated screen works. Kept separate from MOVIE/TV/DRAMA so live-action
   *  catalogues never have to guess from the provider. */
  | 'ANIME';

export type ContentFormat = ContentType;

export type GLClassification = 'CONFIRMED_GL' | 'GL_RELATED' | 'NEEDS_REVIEW' | 'EXCLUDED';

/**
 * Content maturity, mirroring MangaDex's content rating scale so every source
 * can be mapped onto the same four steps.
 */
export type MaturityLevel = 'SAFE' | 'SUGGESTIVE' | 'EROTICA' | 'PORNOGRAPHIC';

export const MATURITY_LEVELS: MaturityLevel[] = ['SAFE', 'SUGGESTIVE', 'EROTICA', 'PORNOGRAPHIC'];

export const MATURITY_LABELS: Record<MaturityLevel, string> = {
  SAFE: 'Safe',
  SUGGESTIVE: 'Suggestive',
  EROTICA: 'Erotica',
  PORNOGRAPHIC: 'Pornographic',
};

export const MATURITY_DESCRIPTIONS: Record<MaturityLevel, string> = {
  SAFE: 'No sexual content. Romance, drama and slice of life only.',
  SUGGESTIVE: 'Mild fanservice, innuendo or suggestive themes. No explicit content.',
  EROTICA: 'Sexually explicit storylines and imagery. Signed-in readers only, 18+.',
  PORNOGRAPHIC: 'Explicit sexual content with no narrative restraint. 18+ only.',
};

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

export interface TitleSource {
  provider: SourceProvider;
  providerId: string;
  url?: string;
}

export interface ContentTitle {
  /** YuriOrbit id — a stable slug, e.g. `yuri-on-ice`. Never a provider id. */
  id: string;
  providerId: string;
  provider: SourceProvider;
  /** Every upstream record this entry was merged from. */
  sources?: TitleSource[];
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
  /** Normalised maturity rating; defaults to `SAFE` when a source gives no signal. */
  maturityRating?: MaturityLevel;
  /** Creator names (author, artist, director, cast) when the source provides them. */
  creators?: string[];
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
  sort?: 'TITLE' | 'YEAR' | 'SCORE' | 'POPULARITY' | 'NEWEST' | 'TRENDING' | 'UPDATED_AT';
  classification?: GLClassification | 'ALL';
  /** Narrow the anime catalogue to series/OVA or films. */
  animeFormat?: 'SERIES' | 'FILM';
}

export interface PaginatedResult {
  items: ContentTitle[];
  page: number;
  perPage: number;
  total?: number;
  /**
   * The provider stopped counting at its own cap, so `total` means "at least"
   * and must not be shown as a figure.
   */
  totalCapped?: boolean;
  /**
   * Largest capped total seen across providers — the real figure is at least
   * this. Used where "5,000+" is a more honest answer than a blank.
   */
  totalFloor?: number;
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
  /** Upstream record behind the slug, so saved titles resolve exactly. */
  providerId?: string;
}

export type LibraryStatus =
  | 'CURRENT'
  | 'PLANNED'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'DROPPED'
  | 'FAVOURITE';

export const LIBRARY_STATUS_LABELS: Record<LibraryStatus, string> = {
  CURRENT: 'In Progress',
  PLANNED: 'Planned',
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
  ANIME: 'Anime',
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
  ANIME: '/anime',
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
