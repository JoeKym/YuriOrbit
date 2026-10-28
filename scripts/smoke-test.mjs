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

const jiti = createJiti(import.meta.url);

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

  let anilist, normalize, mangadex, jikan, tmdb, classify, index;

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

  await test('jikan.ts exports search, popular, and byId helpers', async () => {
    jikan = await jiti.import('../src/lib/providers/jikan.ts');
    assert.equal(typeof jikan.jikanSearchGL, 'function');
    assert.equal(typeof jikan.jikanGetPopular, 'function');
    assert.equal(typeof jikan.jikanGetById, 'function');
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

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}─── Summary ───${colors.reset}`);
  console.log(`Passed: ${colors.green}${passed}${colors.reset} | Failed: ${failed > 0 ? colors.red : colors.reset}${failed}${colors.reset}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
