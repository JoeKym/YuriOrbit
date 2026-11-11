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
// Node has no usable localStorage by default, but the saved-ref and slug
// redirect stores need one for resolution tests.
{
  const store = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
      key: (index) => [...store.keys()][index] ?? null,
      get length() {
        return store.size;
      },
    },
  });
}

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


  await test('MangaDex text search filters by GL tag and reports filtered totals', async () => {
    const originalFetch = globalThis.fetch;
    let requested = '';
    globalThis.fetch = async (input) => {
      requested = String(input);
      return new Response(
        JSON.stringify({
          result: 'ok',
          data: [
            {
              id: '11111111-2222-3333-4444-555555555555',
              type: 'manga',
              attributes: {
                title: { en: 'Bloom Into You' },
                altTitles: [],
                description: { en: 'Two girls fall in love at school.' },
                status: 'completed',
                year: 2015,
                contentRating: 'safe',
                originalLanguage: 'ja',
                tags: [
                  {
                    id: 'a3c67850-4684-404e-9b7f-c69850ee5da6',
                    attributes: { name: { en: "Girls' Love" }, group: 'genre' },
                  },
                ],
                links: {},
              },
              relationships: [],
            },
          ],
          limit: 24,
          offset: 24,
          total: 53,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    try {
      const result = await mangadex.mangadexSearchGL({ query: 'bloom' }, 2, 24);
      const url = new URL(requested);
      assert.equal(
        url.searchParams.get('includedTags[]'),
        'a3c67850-4684-404e-9b7f-c69850ee5da6',
        'Text search must constrain MangaDex to the GL tag'
      );
      assert.equal(
        url.searchParams.get('excludedTags[]'),
        '5920b825-4181-4a17-beeb-9baec0c9d5cc',
        'BL must stay excluded upstream'
      );
      assert.equal(url.searchParams.get('offset'), '24');
      assert.equal(url.searchParams.get('limit'), '24');
      assert.equal(result.total, 53, 'total must come from the GL-filtered query');
      assert.equal(result.hasNextPage, true);
      assert.equal(result.items.length, 1);
      assert.equal(result.items[0].title, 'Bloom Into You');
    } finally {
      globalThis.fetch = originalFetch;
    }
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

  await test('classifier uses strong GL evidence from a related franchise title', () => {
    const relatedGL = classify.classifyGL({
      genres: ['Comedy', 'Fantasy'],
      tags: [{ name: 'Yuri', rank: 20 }],
      description: 'A 4-koma side project by the manga adaptation artist.',
      relations: [
        {
          relationType: 'PARENT',
          genres: ['Fantasy', 'Romance'],
          tags: [{ name: 'Yuri', rank: 96 }],
        },
      ],
    });
    assert.equal(relatedGL, 'GL_RELATED', 'A GL parent must admit its weak-tagged spin-off');

    const withoutEvidence = classify.classifyGL({
      genres: ['Comedy', 'Fantasy'],
      tags: [{ name: 'Yuri', rank: 20 }],
      description: 'A 4-koma side project by the manga adaptation artist.',
    });
    assert.equal(withoutEvidence, 'NEEDS_REVIEW', 'Weak tags alone must still need review');

    const blRelated = classify.classifyGL({
      genres: ['Comedy', 'Fantasy'],
      description: 'A side project.',
      relations: [
        {
          relationType: 'PARENT',
          genres: ['Romance'],
          tags: [{ name: "Boys' Love", rank: 96 }],
        },
      ],
    });
    assert.notEqual(blRelated, 'GL_RELATED', 'Related BL works must not be inherited as GL');
  });

  await test('audit filters report maturity and moderation drops', async () => {
    const maturity = await jiti.import('../src/lib/content/maturity.ts');
    const moderation = await jiti.import('../src/lib/moderation/contentModeration.ts');

    const matureDropped = [];
    const matureKept = maturity.filterByMaturity(
      [{ id: 'x', maturityRating: 'PORNOGRAPHIC' }],
      'SAFE',
      (title) => matureDropped.push(title)
    );
    assert.equal(matureKept.length, 0);
    assert.equal(matureDropped.length, 1);

    const hiddenDropped = [];
    const moderationKept = moderation.filterModeratedTitles(
      [{ id: 'ANILIST-1' }, { id: 'ANILIST-2' }],
      { 'ANILIST-1': { titleId: 'ANILIST-1', action: 'takedown' } },
      (title) => hiddenDropped.push(title)
    );
    assert.deepEqual(moderationKept.map((title) => title.id), ['ANILIST-2']);
    assert.deepEqual(hiddenDropped.map((title) => title.id), ['ANILIST-1']);
  });

  await test('classifier ignores weak/spoiler Yuri tags and keeps explicit BL out', () => {
    const reZero = classify.classifyGL({
      genres: ['Action', 'Adventure', 'Drama', 'Fantasy', 'Romance'],
      tags: [{ name: 'Time Loop', rank: 90 }, { name: 'Yuri', rank: 40 }],
      description: 'Subaru is pulled back into another world and faces a cruel fate.',
    });
    assert.notEqual(reZero, 'CONFIRMED_GL', 'A low-ranked spoiler Yuri tag must not confirm GL');
    assert.notEqual(reZero, 'GL_RELATED', 'A low-ranked spoiler Yuri tag must not make Re:Zero GL-related');

    const robber = classify.classifyGL({
      genres: ['Comedy', 'Romance'],
      tags: [{ name: "Boys' Love", rank: 91 }, { name: 'Yuri', rank: 20 }],
      description: 'A university student takes in a robber who likes his stories.',
    });
    assert.equal(robber, 'EXCLUDED', 'A strongly tagged BL work must stay excluded');

    const genuine = classify.classifyGL({
      genres: ['Romance'],
      tags: [{ name: 'Yuri', rank: 90 }],
      description: 'Two women fall in love.',
    });
    assert.equal(genuine, 'CONFIRMED_GL', 'A strongly tagged GL work must still be confirmed');
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
      contentType: overrides.contentType || 'MANGA',
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

  // A live-action TMDB movie and an AniList screen record with different
  // titles. Only their shared TMDB identity link can prove they are one work.
  const tmdbLink = 'https://www.themoviedb.org/movie/290098';
  const handmaidenTmdb = searchFixture({
    provider: 'TMDB',
    providerId: '290098',
    title: 'Ah-ga-ssi',
    altTitles: ['The Handmaiden', 'Lady'],
    contentType: 'MOVIE',
    externalLinks: [{ url: tmdbLink, site: 'TMDB', type: 'METADATA' }],
    description: 'A young woman is hired as a handmaiden to a Japanese heiress.',
  });
  const handmaidenAnilist = searchFixture({
    provider: 'ANILIST',
    providerId: '101921',
    title: 'The Handmaiden',
    altTitles: ['Ah-ga-ssi'],
    contentType: 'MOVIE',
    coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/example.jpg',
    description: 'A con man schemes to defraud a Japanese heiress with the help of a thief.',
    externalLinks: [
      { url: tmdbLink, site: 'TMDB', type: 'DATABASE' },
      { url: 'https://anilist.co/anime/101921', site: 'AniList', type: 'DATABASE' },
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

  await test('search merge: a TMDB live-action movie joins AniList through its TMDB link', () => {
    const merged = canonical.canonicalizeTitles([handmaidenTmdb, handmaidenAnilist]);
    assert.equal(merged.length, 1, `Expected one merged entry, got ${merged.length}`);

    const entry = merged[0];
    const providers = (entry.sources || []).map((source) => source.provider);
    assert(providers.includes('TMDB'), 'Merged entry must keep the TMDB source');
    assert(providers.includes('ANILIST'), 'Merged entry must keep the AniList source');
    assert.equal(entry.contentType, 'MOVIE', 'Screen titles must stay in the screen family');
    assert(!/^(ANILIST|TMDB)-/.test(entry.id), `Merged id must be a YuriOrbit slug, got ${entry.id}`);

    const names = namesOf(entry);
    assert(names.includes('the handmaiden'), `Missing AniList title; got ${names.join(' | ')}`);
    assert(names.includes('ah ga ssi'), `Missing TMDB title; got ${names.join(' | ')}`);
    assert.equal(entry.id, 'the-handmaiden', `Unexpected canonical slug: ${entry.id}`);
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

  // ─── Test Suite 4: Screen-title search discoverability ────────────────────
  console.log(`\n${colors.bold}4. Testing Screen-Title Search Discoverability...${colors.reset}`);

  await test('search finds a TMDB movie whose metadata is not explicitly GL', async () => {
    const realFetch = globalThis.fetch;
    const json = (body) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    // A neutral description keeps the heuristics at NEEDS_REVIEW: only the
    // query match should make this findable, which is the reported bug.
    globalThis.fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('/movie/990001/keywords')) {
        return json({ id: 990001, keywords: [{ id: 9833, name: 'lesbian relationship' }] });
      }
      if (url.includes('/search/movie')) {
        return json({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [
            {
              id: 990001,
              title: 'When We Met',
              original_title: 'When We Met',
              overview:
                'Two former classmates meet again at a wedding and slowly realise what they mean to each other.',
              release_date: '2024-02-14',
              vote_average: 7.4,
              vote_count: 120,
              poster_path: null,
              adult: false,
              media_type: 'movie',
            },
          ],
        });
      }
      if (url.includes('/search/tv')) {
        return json({ page: 1, total_pages: 1, total_results: 0, results: [] });
      }
      if (url.includes('graphql')) {
        return json({ data: { Page: { media: [], pageInfo: { hasNextPage: false, total: 0 } } } });
      }
      if (url.includes('/manga')) {
        return json({ result: 'ok', data: [], limit: 0, offset: 0, total: 0 });
      }
      return json({ results: [] });
    };

    try {
      const direct = await tmdb.tmdbSearchGL({ query: 'When We Met' });
      assert.equal(direct.items.length, 1, 'TMDB text search must keep the query match');
      assert.equal(
        direct.items[0].glClassification,
        'GL_RELATED',
        'A query match must be classified as GL-related so later filters keep it'
      );

      const searched = await index.searchGLTitles({ query: 'When We Met' }, 1, 10);
      assert(
        searched.items.some((item) => item.title === 'When We Met'),
        'Unified search must return the TMDB movie, not just manga results'
      );

      // A slug-style URL is exactly what a saved library entry links to.
      const resolved = await index.getTitleById('when-we-met-2024');
      assert(resolved !== null, 'A search-produced slug must resolve instead of showing "not found"');
      assert.equal(resolved.title, 'When We Met');
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  await test('search does not assume a TMDB query match is GL without keywords', async () => {
    const realFetch = globalThis.fetch;
    const json = (body) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    globalThis.fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.url;

      if (url.includes('/movie/990002/keywords')) {
        return json({ id: 990002, keywords: [{ id: 10349, name: 'based on novel' }] });
      }
      if (url.includes('/search/movie')) {
        return json({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [
            {
              id: 990002,
              title: 'When We Met Again',
              original_title: 'When We Met Again',
              overview: 'Two former classmates reconnect at a reunion and compare their lives.',
              release_date: '2025-01-01',
              vote_average: 6.9,
              vote_count: 40,
              poster_path: null,
              adult: false,
              media_type: 'movie',
            },
          ],
        });
      }
      if (url.includes('/search/tv')) {
        return json({ page: 1, total_pages: 1, total_results: 0, results: [] });
      }
      if (url.includes('graphql')) {
        return json({ data: { Page: { media: [], pageInfo: { hasNextPage: false, total: 0 } } } });
      }
      if (url.includes('/manga')) {
        return json({ result: 'ok', data: [], limit: 0, offset: 0, total: 0 });
      }
      return json({ results: [] });
    };

    try {
      const dropped = [];
      const direct = await tmdb.tmdbSearchGL({ query: 'When We Met Again' }, 1, (title) =>
        dropped.push(title.title)
      );
      assert.equal(direct.items.length, 0, 'A name match without GL keywords must not be kept');
      assert(
        dropped.includes('When We Met Again'),
        'The audit reporter must receive titles dropped by the GL allow-list'
      );

      const searched = await index.searchGLTitles({ query: 'When We Met Again' }, 1, 10);
      assert(
        !searched.items.some((item) => item.title === 'When We Met Again'),
        'Unified search must not return an unconfirmed TMDB name match'
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  await test('manual GL overrides upgrade only the matching TMDB record', async () => {
    const { applyGLOverrides, glOverrideKey } = await jiti.import('../src/lib/moderation/glOverrides.ts');
    assert.equal(glOverrideKey('tv', '123'), 'tv:123');

    const map = { 'movie:990001': { title: 'When We Met' } };
    const [overridden] = applyGLOverrides(
      [{ provider: 'TMDB', providerId: '990001', contentType: 'MOVIE', glClassification: 'NEEDS_REVIEW' }],
      map
    );
    assert.equal(overridden.glClassification, 'GL_RELATED');

    const [otherId] = applyGLOverrides(
      [{ provider: 'TMDB', providerId: '990002', contentType: 'MOVIE', glClassification: 'NEEDS_REVIEW' }],
      map
    );
    assert.equal(otherId.glClassification, 'NEEDS_REVIEW');

    const [anilist] = applyGLOverrides(
      [{ provider: 'ANILIST', providerId: '990001', contentType: 'MOVIE', glClassification: 'NEEDS_REVIEW' }],
      map
    );
    assert.equal(anilist.glClassification, 'NEEDS_REVIEW', 'Overrides must not affect other providers');
  });

  await test('a saved old slug seeds a canonical redirect', async () => {
    const { rememberSavedRef } = await jiti.import('../src/lib/content/saved-refs.ts');
    const { getCachedCanonicalSlug } = await jiti.import('../src/lib/catalog/slug-redirects.ts');
    const realFetch = globalThis.fetch;
    const json = (body) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    rememberSavedRef({
      titleId: 'old-when-we-met',
      provider: 'TMDB',
      providerId: '990001',
      contentType: 'MOVIE',
      updatedAt: new Date().toISOString(),
    });

    globalThis.fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.url;
      if (url.includes('/movie/990001')) {
        return json({
          id: 990001,
          title: 'When We Met',
          original_title: 'When We Met',
          overview: 'Two former classmates meet again at a wedding.',
          release_date: '2024-02-14',
          vote_average: 7.4,
          vote_count: 120,
          poster_path: null,
          adult: false,
          genres: [],
          original_language: 'en',
        });
      }
      return json({ results: [] });
    };

    try {
      const resolved = await index.getTitleById('old-when-we-met');
      assert(resolved !== null, 'The saved provider reference must resolve');
      assert.equal(resolved.title, 'When We Met');
      assert.equal(
        getCachedCanonicalSlug('old-when-we-met'),
        'when-we-met',
        'Resolving a saved old slug must publish the canonical alias'
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  // ─── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}─── Summary ───${colors.reset}`);
  console.log(`Passed: ${colors.green}${passed}${colors.reset} | Failed: ${failed > 0 ? colors.red : colors.reset}${failed}${colors.reset}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
