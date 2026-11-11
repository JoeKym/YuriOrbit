#!/usr/bin/env node

/**
 * YuriOrbit Production Build Smoke Test Suite
 *
 * Verifies:
 * 1. Provider exports and module contracts (prevents Rollup export failures)
 * 2. Normalizer functions and types
 * 3. Live AniList GraphQL connectivity & Yuri tag queries
 * 4. Home-page query pipeline (trending, popular, recent, completed)
 * 5. Single-title lookups by ID
 */

import { createJiti } from 'jiti';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// The app uses the `@/` alias, so the runner must resolve it the same way.
const jiti = createJiti(import.meta.url, {
  alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function logPass(msg) {
  console.log(` ${colors.green}✓${colors.reset} ${msg}`);
}

function logFail(msg, err) {
  console.error(` ${colors.red}✗${colors.reset} ${colors.bold}${msg}${colors.reset}`);
  if (err) console.error(`   ${colors.red}${err.message || err}${colors.reset}`);
}

async function run() {
  console.log(`\n${colors.cyan}${colors.bold}🔍 Running YuriOrbit Production Smoke Tests...${colors.reset}\n`);
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      logPass(name);
      passed++;
    } catch (err) {
      logFail(name, err);
      failed++;
    }
  }

  // ─── Test Suite 1: Provider Exports Verification ──────────────────────────
  console.log(`${colors.bold}1. Checking Module Exports & Contracts...${colors.reset}`);

  let anilist, normalize, mangadex, tmdb, classify, index;

  await test('normalize.ts exports normalizeAniList & normalizeAniListMedia', async () => {
    normalize = await jiti.import('../src/lib/providers/normalize.ts');
    assert.equal(typeof normalize.normalizeAniList, 'function', 'normalizeAniList must be a function');
    assert.equal(typeof normalize.normalizeAniListMedia, 'function', 'normalizeAniListMedia alias must be exported');
  });

  await test('anilist.ts exports all required provider queries', async () => {
    anilist = await jiti.import('../src/lib/providers/anilist.ts');
    const required = [
      'searchGLTitles',
      'getTrendingGL',
      'getPopularGL',
      'getRecentGL',
      'getCompletedGL',
      'getGLByGenre',
      'getGLByContentType',
      'getTitleById',
      'anilistSearchGL',
      'anilistGetPopularGL',
    ];
    for (const fn of required) {
      assert.equal(typeof anilist[fn], 'function', `anilist.ts missing export: ${fn}`);
    }
  });

  await test('mangadex.ts exports search, popular, and chapter helpers', async () => {
    mangadex = await jiti.import('../src/lib/providers/mangadex.ts');
    assert.equal(typeof mangadex.mangadexSearchGL, 'function');
    assert.equal(typeof mangadex.mangadexGetPopular, 'function');
    assert.equal(typeof mangadex.mangadexGetById, 'function');
    assert.equal(typeof mangadex.mangadexGetChapters, 'function');
    assert.equal(typeof mangadex.mangadexGetChapterPages, 'function');
    assert.equal(typeof mangadex.mangadexFindMangaId, 'function');
  });


  await test('tmdb.ts exports movies, dramas, search, and byId helpers', async () => {
    tmdb = await jiti.import('../src/lib/providers/tmdb.ts');
    assert.equal(typeof tmdb.tmdbSearchGL, 'function');
    assert.equal(typeof tmdb.tmdbGetGLMovies, 'function');
    assert.equal(typeof tmdb.tmdbGetGLDramas, 'function');
    assert.equal(typeof tmdb.tmdbGetById, 'function');
  });

  await test('classify.ts exports classifyGL, filterGL, and GL_ALLOWED_CLASSIFICATIONS', async () => {
    classify = await jiti.import('../src/lib/providers/classify.ts');
    assert.equal(typeof classify.classifyGL, 'function');
    assert.equal(typeof classify.filterGL, 'function');
    assert(Array.isArray(classify.GL_ALLOWED_CLASSIFICATIONS));
  });

  await test('index.ts re-exports unified provider functions', async () => {
    index = await jiti.import('../src/lib/providers/index.ts');
    const required = [
      'getTrendingGL',
      'getPopularGL',
      'getRecentGL',
      'getCompletedGL',
      'getGLByGenre',
      'getGLByContentType',
      'searchGLTitles',
      'getTitleById',
      'mangadexGetChapters',
      'mangadexGetChapterPages',
      'mangadexFindMangaId',
    ];
    for (const fn of required) {
      assert.equal(typeof index[fn], 'function', `index.ts missing unified export: ${fn}`);
    }
  });

  // ─── Test Suite 2: Live Query & Aggregation Smoke Tests ────────────────────
  console.log(`\n${colors.bold}2. Testing Live Queries & Home Page Pipelines...${colors.reset}`);

  await test('AniList direct query returns valid Yuri media', async () => {
    const trending = await anilist.getTrendingGL(5);
    assert(Array.isArray(trending), 'Trending result must be an array');
    assert(trending.length > 0, 'AniList must return at least one trending title');
    const first = trending[0];
    assert(first.id.startsWith('ANILIST-'), `ID must start with ANILIST- (got ${first.id})`);
    assert(typeof first.title === 'string' && first.title.length > 0, 'Title must not be empty');
    assert(typeof first.coverImage === 'string' && first.coverImage.startsWith('http'), 'Cover image URL must be valid');
  });

  await test('Home Page pipeline: getTrendingGL & getPopularGL return titles', async () => {
    const [trending, popular] = await Promise.all([
      index.getTrendingGL(10),
      index.getPopularGL(10),
    ]);
    assert(trending.length > 0, 'Unified getTrendingGL must return titles');
    assert(popular.length > 0, 'Unified getPopularGL must return titles');
  });

  await test('Home Page pipeline: getRecentGL & getCompletedGL return titles', async () => {
    const [recent, completed] = await Promise.all([
      index.getRecentGL(5),
      index.getCompletedGL(5),
    ]);
    assert(recent.length > 0, 'getRecentGL must return titles');
    assert(completed.length > 0, 'getCompletedGL must return titles');
  });

  await test('Unified searchGLTitles returns paginated results', async () => {
    const searchRes = await index.searchGLTitles({ query: 'Bloom' }, 1, 5);
    assert(searchRes && Array.isArray(searchRes.items), 'Search result must include items array');
    assert(searchRes.items.length > 0, 'Search for "Bloom" must return at least 1 result');
    assert(typeof searchRes.page === 'number');
  });

  await test('Single-title lookup: getTitleById resolves title metadata', async () => {
    const title = await index.getTitleById('ANILIST-86218');
    assert(title !== null, 'Title must be resolved');
    assert(title.title.toLowerCase().includes('bloom into you') || title.title.toLowerCase().includes('yagate'), `Unexpected title: ${title.title}`);
  });

  // ─── Test Suite 3: Cross-provider search merges ───────────────────────────
  console.log(`\n${colors.bold}3. Testing Cross-Provider Search Merges...${colors.reset}`);

  let canonical;

  await test('canonical.ts exports the merge used by searchGLTitles', async () => {
    canonical = await jiti.import('../src/lib/catalog/canonical.ts');
    assert.equal(typeof canonical.canonicalizeTitles, 'function', 'canonicalizeTitles must be exported');
    assert.equal(typeof canonical.canonicalizeTitle, 'function', 'canonicalizeTitle must be exported');
  });

  // Fixtures shaped like provider records: different titles and ids, one shared
  // MyAnimeList link. This is the exact pair canonical.ts documents merging.
  function searchFixture(overrides) {
    return {
      id: `${overrides.provider}-${overrides.providerId}`,
      providerId: overrides.providerId,
      provider: overrides.provider,
      title: overrides.title,
      altTitles: overrides.altTitles || [],
      contentType: 'MANGA',
      genres: ['Romance'],
      tags: [],
      status: 'FINISHED',
      externalLinks: overrides.externalLinks || [],
      relations: [],
      glClassification: 'CONFIRMED_GL',
      coverImage: overrides.coverImage,
      description: overrides.description,
    };
  }

  const malLink = 'https://myanimelist.net/manga/113813/Straight_Girl_Trap';
  const anilistRecord = searchFixture({
    provider: 'ANILIST',
    providerId: '113813',
    title: 'Straight Girl Trap',
    altTitles: ['Zhi Nu Xianjing'],
    coverImage: 'https://s4.anilist.co/file/anilistcdn/media/manga/cover/example.jpg',
    description: 'A woman wakes up in the body of a dating-sim character and must court her.',
    externalLinks: [
      { url: malLink, site: 'MyAnimeList', type: 'DATABASE' },
      { url: 'https://anilist.co/manga/113813', site: 'AniList', type: 'DATABASE' },
    ],
  });
  const mangadexRecord = searchFixture({
    provider: 'MANGADEX',
    providerId: '8f3a6a3e-6b1e-4f0c-9d3f-2b1d6f7c8e9a',
    title: 'Zhi Nu Xianjing',
    altTitles: ['Straight Girl Trap'],
    externalLinks: [
      { url: malLink, site: 'MyAnimeList', type: 'DATABASE' },
      {
        url: 'https://mangadex.org/title/8f3a6a3e-6b1e-4f0c-9d3f-2b1d6f7c8e9a',
        site: 'MangaDex',
        type: 'DATABASE',
      },
    ],
  });

  const namesOf = (entry) =>
    [entry.title, ...entry.altTitles].map((name) => name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());

  await test('search merge: "Straight Girl Trap" and "Zhi Nu Xianjing" collapse to one entry', () => {
    const merged = canonical.canonicalizeTitles([anilistRecord, mangadexRecord]);
    assert.equal(merged.length, 1, `Expected one merged entry, got ${merged.length}`);

    const entry = merged[0];
    const providers = (entry.sources || []).map((source) => source.provider);
    assert(providers.includes('ANILIST'), 'Merged entry must keep the AniList source');
    assert(providers.includes('MANGADEX'), 'Merged entry must keep the MangaDex source');

    const names = namesOf(entry);
    assert(names.includes('straight girl trap'), `Missing English title; got ${names.join(' | ')}`);
    assert(names.includes('zhi nu xianjing'), `Missing romanized title; got ${names.join(' | ')}`);
    assert(!/^(ANILIST|MANGADEX)-/.test(entry.id), `Merged id must be a YuriOrbit slug, got ${entry.id}`);
  });

  await test('search merge: the slug stays the same whichever provider comes first', () => {
    const forward = canonical.canonicalizeTitles([anilistRecord, mangadexRecord])[0];
    const reversed = canonical.canonicalizeTitles([mangadexRecord, anilistRecord])[0];
    assert.equal(reversed.id, forward.id, 'One story must keep one URL regardless of result order');
  });

  await test('search merge leaves unrelated works separate', () => {
    const unrelated = searchFixture({
      provider: 'ANILIST',
      providerId: '86218',
      title: 'Bloom Into You',
      altTitles: ['Yagate Kimi ni Naru'],
      externalLinks: [{ url: 'https://myanimelist.net/manga/104147/Yagate_Kimi_ni_Naru', site: 'MyAnimeList' }],
    });
    const merged = canonical.canonicalizeTitles([anilistRecord, unrelated]);
    assert.equal(merged.length, 2, 'Titles without a shared identity or name must not merge');
  });

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}─── Summary ───${colors.reset}`);
  console.log(`Passed: ${colors.green}${passed}${colors.reset} | Failed: ${failed > 0 ? colors.red : colors.reset}${failed}${colors.reset}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
