/**
 * Give the catalogue routes their own HTML shell.
 *
 * The app is a client-rendered SPA served from one `index.html`, so every route
 * shipped the homepage's title, description and canonical. Crawlers that do not
 * run JavaScript (and Google's first pass) saw eighteen identical pages, which is
 * why only the homepage was indexed.
 *
 * This runs after `vite build` and writes one static file per public route
 * (`dist/discover.html`, `dist/manga.html`, …) with that route's title,
 * description, canonical and a readable heading. Cloudflare Pages serves
 * `/discover` from `discover.html` and React still hydrates over it, so browsers
 * get the normal app.
 *
 * The metadata here mirrors each page's `usePageMeta` call — keep the two in step
 * when the copy changes. Signed-in-only routes (/library, /settings, /profile,
 * /auth, /admin, /search) are deliberately absent: they are `noIndex` and are not
 * in the sitemap.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://yuriorbit.pages.dev';
const DIST = new URL('../dist/', import.meta.url).pathname;

/** `heading` is the static <h1> a crawler sees; the app replaces it on mount. */
const ROUTES = [
  {
    path: '/discover',
    title: 'Discover',
    description: "Discover Girls' Love anime, manga, manhwa, webtoons, novels, and dramas on YuriOrbit.",
    heading: 'Discover Girls’ Love',
    summary:
      "Browse every format in one place — anime and live-action series, manga, manhwa, manhua, webtoons and light novels — with filters for genre, status and year.",
  },
  {
    path: '/trending',
    title: 'Trending',
    description: "See trending Girls' Love titles on YuriOrbit.",
    heading: 'Trending in Girls’ Love',
    summary:
      "What GL readers and viewers are picking up right now, ranked from the live catalogue rather than a hand-written list.",
  },
  {
    path: '/genres',
    title: 'Genres',
    description: "Browse Girls' Love titles by genre on YuriOrbit.",
    heading: 'Genres',
    summary:
      "Find GL by mood and theme — romance, drama, comedy, fantasy, school life, historical and more — across every format.",
  },
  {
    path: '/anime',
    title: 'GL Anime',
    description: "Browse Girls' Love anime on YuriOrbit.",
    heading: 'GL Anime',
    summary:
      "Girls’ Love anime and animated series, with episode counts, studios and where to watch them.",
  },
  {
    path: '/manga',
    title: 'GL Manga',
    description: 'Browse curated gl manga on YuriOrbit.',
    heading: 'GL Manga',
    summary:
      "Curated Girls’ Love manga, with chapter counts, publication years and reader ratings.",
  },
  {
    path: '/manhwa',
    title: 'GL Manhwa',
    description: 'Browse curated gl manhwa on YuriOrbit.',
    heading: 'GL Manhwa',
    summary: 'Korean Girls’ Love manhwa — full-colour series, mostly vertical scroll.',
  },
  {
    path: '/manhua',
    title: 'GL Manhua',
    description: 'Browse curated gl manhua on YuriOrbit.',
    heading: 'GL Manhua',
    summary: 'Chinese Girls’ Love manhua, collected from the connected catalogues.',
  },
  {
    path: '/webtoons',
    title: 'GL Webtoons',
    description: 'Browse curated gl webtoons on YuriOrbit.',
    heading: 'GL Webtoons',
    summary: 'Girls’ Love webtoons built for phone reading, one panel strip at a time.',
  },
  {
    path: '/novels',
    title: 'GL Novels',
    description: 'Browse curated gl novels on YuriOrbit.',
    heading: 'GL Novels',
    summary: 'Girls’ Love light novels and prose series.',
  },
  {
    path: '/movies',
    title: 'GL Movies',
    description: 'Browse curated gl movies on YuriOrbit.',
    heading: 'GL Movies',
    summary: 'Girls’ Love films, with runtime, release year and streaming availability.',
  },
  {
    path: '/dramas',
    title: 'GL Dramas & Series',
    description: 'Browse curated gl dramas & series on YuriOrbit.',
    heading: 'GL Dramas & Series',
    summary: 'Live-action Girls’ Love series and dramas, with season and episode details.',
  },
  {
    path: '/about',
    title: 'About',
    description:
      "Learn about YuriOrbit, a discovery platform for Girls' Love anime, manga, manhwa, webtoons, novels, and dramas.",
    heading: 'About YuriOrbit',
    summary:
      'A Girls’ Love catalogue built by JoeKym Labs: what it covers, where the data comes from, and how the tracking works.',
  },
  {
    path: '/faq',
    title: 'FAQ',
    description:
      'Answers about YuriOrbit accounts, library sync, the content filter, chapter tracking and moderation.',
    heading: 'Frequently asked questions',
    summary:
      'How the library syncs, what the content filter hides, how new chapters are detected, and how moderation and appeals work.',
  },
  {
    path: '/contact',
    title: 'Contact',
    description:
      'Contact YuriOrbit for questions, corrections, partnerships, or support. Use Appeals for moderation actions.',
    heading: 'Contact',
    summary: 'Reach JoeKym Labs about corrections, partnerships or support.',
  },
  {
    path: '/feedback',
    title: 'Feedback',
    description: 'Share feedback, report an issue, or submit a review/testimonial for admin approval.',
    heading: 'Feedback & Reports',
    summary: 'Report a bug, suggest a feature, or leave a review for the admin queue.',
  },
  {
    path: '/appeals',
    title: 'Appeals & Moderation Review',
    description:
      'Submit an appeal for an account or content moderation decision, or request a review related to a takedown/restriction on YuriOrbit.',
    heading: 'Appeals & Moderation Review',
    summary:
      'Ask for a moderation decision to be reviewed. Appeals go to the admin team; submitting one does not guarantee a reversal.',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy',
    description:
      'Read how YuriOrbit handles your data, privacy, account controls, moderation, and appeals information.',
    heading: 'Privacy Policy',
    summary: 'What is stored in your browser, what is stored on your account, and what is never collected.',
  },
  {
    path: '/terms',
    title: 'Terms of Use',
    description: 'Read the terms of use, moderation, appeals, and takedown policies for YuriOrbit.',
    heading: 'Terms of Use',
    summary: 'The rules for using YuriOrbit, how moderation and appeals work, and how takedowns are handled.',
  },
];

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Replace a tag's content attribute without caring where it sits in the head. */
function setContent(html, selector, value) {
  const re = new RegExp(`(<meta ${selector} content=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`missing meta: ${selector}`);
  return html.replace(re, `$1${escapeHtml(value)}$2`);
}

function render(template, route) {
  // Pages serves `<route>/index.html` at `<route>/` and permanently redirects the
  // slash-less form, so the canonical has to carry the trailing slash.
  const url = `${SITE}${route.path}/`;
  const fullTitle = `${route.title} — YuriOrbit`;

  let html = template;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(fullTitle)}</title>`);
  html = setContent(html, 'name="title"', fullTitle);
  html = setContent(html, 'name="description"', route.description);
  html = setContent(html, 'property="og:title"', fullTitle);
  html = setContent(html, 'property="og:description"', route.description);
  html = setContent(html, 'name="twitter:title"', fullTitle);
  html = setContent(html, 'name="twitter:description"', route.description);

  // The shell deliberately ships no canonical; each rendered route adds its own.
  html = html.replace(
    '<!-- Fonts -->',
    `<link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />\n    <meta name="twitter:url" content="${url}" />\n\n    <!-- Fonts -->`
  );

  // Headline and intro in the no-JS shell, so the page has real content before
  // React mounts and something readable if it never does.
  html = html.replace(
    /(<div class="boot-fallback">\s*<h1>)[^<]*(<\/h1>\s*<p>)[^<]*(<\/p>)/,
    `$1${escapeHtml(route.heading)}$2${escapeHtml(route.summary)}$3`
  );

  return html;
}

const template = readFileSync(join(DIST, 'index.html'), 'utf8');
let written = 0;

for (const route of ROUTES) {
  const html = render(template, route);
  const dir = join(DIST, route.path.replace(/^\//, ''));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), html);
  written += 1;
}

/**
 * Cloudflare Pages applies `_redirects` before static assets, so the SPA catch-all
 * still wins for a slash-less path — which is exactly why the shells live at
 * `<route>/index.html`: Pages answers `/discover` with a 308 to `/discover/`, and
 * the re-request matches the real file instead of the catch-all. No per-route
 * rewrite is needed, and adding one loops (Pages strips ".html" and re-matches).
 */
console.log(`prerender: wrote ${written} route shells to dist/`);
