/**
 * Metadata for a single catalogue title, resolved at the edge.
 *
 * `/title/<slug>` is the one route whose content cannot be known at build time —
 * the catalogue is live, so the shell for a title page has to be assembled when
 * the request arrives. This module does exactly what `scripts/prerender.mjs`
 * does for the static routes: it takes `dist/index.html` and rewrites the head
 * (title, description, canonical, Open Graph, Twitter, JSON-LD) plus the no-JS
 * body, so a crawler that never runs JavaScript still reads one page about one
 * work instead of the homepage's metadata eighteen thousand times.
 *
 * The runtime-agnostic half lives here — pure string work plus `fetch` — so a
 * Node harness or a Worker can exercise it without a Pages context.
 */

export type TitleKind = 'manga' | 'anime';

export interface TitleMeta {
  /** Display name, as the catalogue would show it. */
  name: string;
  /** Meta-description length copy (plain text, escaped on render). */
  description: string;
  /** Slightly longer copy for the no-JS heading paragraph. */
  summary: string;
  image?: string;
  year?: number;
  score?: number;
  kind: TitleKind;
  /** The slug this page should declare canonical — aliases collapse onto it. */
  canonicalSlug: string;
  source: 'mangadex' | 'anilist' | 'slug';
}

export interface ResolveOptions {
  /** Override for tests or a self-hosted relay. */
  anilistEndpoint?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const SITE_NAME = 'YuriOrbit';
const MANGADEX_API = 'https://api.mangadex.org';
const MANGADEX_UPLOADS = 'https://uploads.mangadex.org';
const DEFAULT_ANILIST_ENDPOINT = 'https://graphql.anilist.co';
const UPSTREAM_TIMEOUT_MS = 6_000;
const MANGADEX_USER_AGENT = 'YuriOrbit/1.0 (https://github.com/JoeKym/YuriOrbit)';

/**
 * Same rules as `src/lib/catalog/identity.ts`. Duplicated rather than imported:
 * this runs in a Pages Function, and `src` pulls in React, Vite aliases and the
 * browser registry. Keep the two in step — the canonical URL depends on it.
 */
export function slugifyTitle(input: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
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
  if (ascii) return ascii;

  // Fully non-latin titles still need a stable id (matches the client hash).
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.trim().toLowerCase().length; i += 1) {
    hash ^= input.trim().toLowerCase().charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `title-${(hash >>> 0).toString(36)}`;
}

/** Turn a slug back into a search phrase (`slugToQuery` in the client). */
export function slugToQuery(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/^title-[a-z0-9]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim();
}

/** `bie-mo-wo` -> `Bie Mo Wo`, for pages whose upstream data never resolves. */
export function titleCaseFromSlug(slug: string): string {
  const minor = new Set(['a', 'an', 'and', 'of', 'the', 'to', 'in', 'on', 'for']);
  const words = slugToQuery(slug)
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'Title';

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && minor.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

/** Provider descriptions are HTML (`<br>`, `<i>`); meta tags need plain text. */
export function plainText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const boundary = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' '));
  return `${(boundary > limit * 0.6 ? cut.slice(0, boundary) : cut).trim()}${boundary > limit * 0.6 ? '.' : '…'}`;
}

function describe(name: string, raw: string, kind: TitleKind): { description: string; summary: string } {
  const text = plainText(raw);
  if (text.length >= 60) {
    return { description: truncate(text, 158), summary: truncate(text, 300) };
  }
  const label = kind === 'anime' ? "Girls' Love anime" : "Girls' Love manga";
  return {
    description: `${label}: ${name}. Synopsis, genres, release year and where to read or watch it on ${SITE_NAME}.`,
    summary: `${name} in the ${SITE_NAME} catalogue — ${label.toLowerCase()} with synopsis, tags, ratings and related works.`,
  };
}

function titleCaseName(values: (string | null | undefined)[]): string {
  return values.map((value) => (value || '').trim()).find(Boolean) || '';
}

/** True when any known spelling of a title slugifies to the requested id. */
function matchesSlug(names: string[], slug: string, base: string): boolean {
  return names.some((name) => {
    if (!name) return false;
    const candidate = slugifyTitle(name);
    return candidate === slug || candidate === base;
  });
}

function withTimeout(fetchImpl: typeof fetch, url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetchImpl(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

interface MangaDexManga {
  id: string;
  attributes: {
    title?: Record<string, string>;
    altTitles?: Record<string, string>[];
    description?: Record<string, string>;
    year?: number | null;
    originalLanguage?: string;
  };
  relationships?: { type?: string; attributes?: { fileName?: string } }[];
}

/**
 * MangaDex first: the same catalogue the site already proxies, so a mangwa page
 * resolves identically here and in the app, and no key or relay is involved.
 */
async function fromMangaDex(
  slug: string,
  base: string,
  wantedYear: number | undefined,
  options: ResolveOptions,
): Promise<TitleMeta | null> {
  const query = slugToQuery(base);
  if (!query) return null;

  const fetchImpl = options.fetchImpl ?? fetch;
  const url =
    `${MANGADEX_API}/manga?title=${encodeURIComponent(query)}` +
    '&limit=10&includes[]=cover_art&order[relevance]=desc' +
    '&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica';

  const response = await withTimeout(
    fetchImpl,
    url,
    { headers: { Accept: 'application/json', 'User-Agent': MANGADEX_USER_AGENT } },
    options.timeoutMs ?? UPSTREAM_TIMEOUT_MS,
  );
  if (!response.ok) return null;

  const payload = (await response.json()) as { data?: MangaDexManga[] };
  const entries = payload.data ?? [];

  const scored = entries.map((entry) => {
    const titles = Object.values(entry.attributes.title ?? {});
    const alternatives = (entry.attributes.altTitles ?? []).flatMap((alt) => Object.values(alt));
    const names = [...titles, ...alternatives];
    return { entry, names, matches: matchesSlug(names, slug, base) };
  });

  const exact = scored.filter((item) => item.matches);
  if (exact.length === 0) return null;

  const picked =
    (wantedYear ? exact.find((item) => item.entry.attributes.year === wantedYear) : undefined) ??
    exact[0];

  const { entry, names } = picked;
  const primary = titleCaseName([
    entry.attributes.title?.en,
    entry.attributes.title?.['ja-ro'],
    entry.attributes.title?.ja,
    ...Object.values(entry.attributes.title ?? {}),
  ]);

  const name = primary || names[0] || titleCaseFromSlug(slug);
  const cover = entry.relationships?.find((rel) => rel.type === 'cover_art')?.attributes?.fileName;
  const image = cover ? `${MANGADEX_UPLOADS}/covers/${entry.id}/${cover}.512.jpg` : undefined;

  const copy = describe(
    name,
    entry.attributes.description?.en || Object.values(entry.attributes.description ?? {})[0] || '',
    'manga',
  );

  return {
    name,
    description: copy.description,
    summary: copy.summary,
    image,
    year: entry.attributes.year ?? undefined,
    kind: 'manga',
    canonicalSlug: canonicalFor(slug, base, slugifyTitle(name), entry.attributes.year ?? undefined),
    source: 'mangadex',
  };
}

interface AniListMedia {
  type?: string;
  format?: string;
  title?: { romaji?: string; english?: string; native?: string };
  synonyms?: string[];
  description?: string;
  coverImage?: { extraLarge?: string; large?: string };
  bannerImage?: string;
  startDate?: { year?: number };
  averageScore?: number;
  isAdult?: boolean;
}

const ANILIST_QUERY = `query ($search: String) {
  Page(page: 1, perPage: 10) {
    media(search: $search, sort: SEARCH_MATCH) {
      type
      format
      title { romaji english native }
      synonyms
      description
      coverImage { extraLarge large }
      bannerImage
      startDate { year }
      averageScore
      isAdult
    }
  }
}`;

/**
 * AniList second, because it is the only source here with anime, and the client
 * catalogue merges it. Cloudflare's shared egress is blocked by AniList, so the
 * endpoint is configurable (`ANILIST_API_URL`): point it at the relay in
 * `proxy/server.mjs` and anime pages resolve too. A 403 simply falls through to
 * the slug fallback rather than breaking the page.
 */
async function fromAniList(
  slug: string,
  base: string,
  wantedYear: number | undefined,
  options: ResolveOptions,
): Promise<TitleMeta | null> {
  const query = slugToQuery(base);
  if (!query) return null;

  const fetchImpl = options.fetchImpl ?? fetch;
  const endpoint = (options.anilistEndpoint || DEFAULT_ANILIST_ENDPOINT).replace(/\/+$/, '');

  const response = await withTimeout(
    fetchImpl,
    endpoint,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: ANILIST_QUERY, variables: { search: query } }),
    },
    options.timeoutMs ?? UPSTREAM_TIMEOUT_MS,
  );
  if (!response.ok) return null;

  const payload = (await response.json()) as { data?: { Page?: { media?: AniListMedia[] } } };
  const entries = payload.data?.Page?.media ?? [];

  const scored = entries.map((entry) => {
    const names = [
      entry.title?.english,
      entry.title?.romaji,
      entry.title?.native,
      ...(entry.synonyms ?? []),
    ].filter((value): value is string => Boolean(value));
    return { entry, matches: matchesSlug(names, slug, base) };
  });

  const exact = scored.filter((item) => item.matches);
  if (exact.length === 0) return null;

  const picked =
    (wantedYear
      ? exact.find((item) => item.entry.startDate?.year === wantedYear)
      : undefined) ?? exact[0];

  const { entry } = picked;
  const name =
    titleCaseName([entry.title?.english, entry.title?.romaji, entry.title?.native]) ||
    titleCaseFromSlug(slug);
  const kind: TitleKind = entry.type === 'ANIME' ? 'anime' : 'manga';

  const copy = entry.isAdult
    ? {
        description: `${name} — adult Girls' Love title in the ${SITE_NAME} catalogue.`,
        summary: `${name} is listed with an adult content rating on ${SITE_NAME}.`,
      }
    : describe(name, entry.description || '', kind);

  return {
    name,
    description: copy.description,
    summary: copy.summary,
    image: entry.coverImage?.extraLarge || entry.coverImage?.large || entry.bannerImage || undefined,
    year: entry.startDate?.year ?? undefined,
    score: entry.averageScore ?? undefined,
    kind,
    canonicalSlug: canonicalFor(slug, base, slugifyTitle(name), entry.startDate?.year ?? undefined),
    source: 'anilist',
  };
}

/**
 * Keep the slug the visitor asked for when it already is the canonical form,
 * including a `-2024` disambiguator the client may have appended. The edge never
 * sees the rest of the catalogue, so it cannot know whether a year was needed.
 */
function canonicalFor(slug: string, base: string, derived: string, year: number | undefined): string {
  if (derived === base || derived === slug) return slug;
  if (year && `${derived}-${year}` === slug) return slug;
  return derived;
}

/** Last resort: the slug itself is still a unique, honest page title. */
export function slugOnlyMeta(slug: string): TitleMeta {
  const name = titleCaseFromSlug(slug);
  return {
    name,
    description: `${name} — synopsis, genres, release year and reader ratings on ${SITE_NAME}, a discovery catalogue for Girls' Love manga and anime.`,
    summary: `${name} in the ${SITE_NAME} catalogue of Girls' Love manga, manhwa, anime, novels and dramas.`,
    kind: 'manga',
    canonicalSlug: slug,
    source: 'slug',
  };
}

/**
 * Resolve one slug. Sources are tried in order and the first exact title match
 * wins; a timeout or a blocked upstream is skipped, never fatal.
 */
export async function resolveTitleMeta(slug: string, options: ResolveOptions = {}): Promise<TitleMeta> {
  const yearMatch = /^(.*)-(\d{4})$/.exec(slug);
  const base = yearMatch ? yearMatch[1] : slug;
  const wantedYear = yearMatch ? Number(yearMatch[2]) : undefined;

  for (const source of [fromMangaDex, fromAniList]) {
    try {
      const meta = await source(slug, base, wantedYear, options);
      if (meta) return meta;
    } catch {
      // Provider down, blocked or slow — the next source gets a turn.
    }
  }

  return slugOnlyMeta(slug);
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Rewrite `<meta name|property="key" content="…">` wherever it sits. */
function setMetaContent(html: string, attribute: 'name' | 'property', key: string, value: string): string {
  const pattern = new RegExp(`(<meta ${attribute}="${key}" content=")[^"]*(")`);
  if (!pattern.test(html)) return html;
  return html.replace(pattern, `$1${escapeHtml(value)}$2`);
}

function buildJsonLd(meta: TitleMeta, canonicalUrl: string, origin: string): string {
  const pageNode: Record<string, unknown> = {
    '@type': meta.kind === 'anime' ? 'TVSeries' : 'ComicStory',
    '@id': `${canonicalUrl}#title`,
    name: meta.name,
    description: meta.summary,
    url: canonicalUrl,
    inLanguage: 'en',
    isPartOf: { '@id': `${origin}/#website` },
  };
  if (meta.image) pageNode.image = meta.image;
  if (meta.year) pageNode.datePublished = String(meta.year);
  if (meta.score) {
    pageNode.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: (meta.score / 10).toFixed(1),
      bestRating: '10',
      worstRating: '0',
      ratingCount: 1,
    };
  }

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: SITE_NAME,
        alternateName: ['Yuri Orbit', 'YuriOrbit GL'],
        url: `${origin}/`,
        inLanguage: 'en',
      },
      pageNode,
    ],
  });
}

/**
 * Assemble the final document. Everything outside the head and the no-JS block
 * is left untouched so React hydrates exactly as it does on any other route.
 */
export function renderTitlePage(shell: string, meta: TitleMeta, origin: string): string {
  const path = `/title/${meta.canonicalSlug}`;
  const canonicalUrl = `${origin}${path}`;
  const fullTitle = `${meta.name} — ${SITE_NAME}`;

  let html = shell;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`);
  html = setMetaContent(html, 'name', 'title', fullTitle);
  html = setMetaContent(html, 'name', 'description', meta.description);
  html = setMetaContent(html, 'property', 'og:title', fullTitle);
  html = setMetaContent(html, 'property', 'og:description', meta.description);
  html = setMetaContent(html, 'property', 'og:type', meta.kind === 'anime' ? 'video.tv_show' : 'book');
  html = setMetaContent(html, 'name', 'twitter:title', fullTitle);
  html = setMetaContent(html, 'name', 'twitter:description', meta.description);

  if (meta.image) {
    const safeImage = escapeHtml(meta.image);
    html = html.replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${safeImage}$2`);
    html = html.replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${safeImage}$2`);
  }

  // The one shell deliberately ships no canonical/og:url; each page adds its own.
  html = html.replace(
    '<!-- Fonts -->',
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n` +
      `    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />\n` +
      `    <meta name="twitter:url" content="${escapeHtml(canonicalUrl)}" />\n\n` +
      '    <!-- Fonts -->',
  );

  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n    ${buildJsonLd(meta, canonicalUrl, origin)}\n    </script>`,
  );

  // Readable heading and intro in the no-JS shell, exactly where prerender puts
  // the static routes' copy, so the page has real content before React mounts.
  html = html.replace(
    /(<div class="boot-fallback">\s*<h1>)[^<]*(<\/h1>\s*<p>)[^<]*(<\/p>)/,
    `$1${escapeHtml(meta.name)}$2${escapeHtml(meta.summary)}$3`,
  );

  return html;
}
