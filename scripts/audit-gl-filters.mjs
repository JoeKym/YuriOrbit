#!/usr/bin/env node
/**
 * Audit which provider results search discards at the GL allow-list stage.
 * Reports every title dropped by AniList, MangaDex or TMDB filtering, with the
 * provider's classification so weak/spoiler tags and non-GL works are visible.
 */
import { createJiti } from 'jiti';
import { fileURLToPath } from 'node:url';

const jiti = createJiti(import.meta.url, {
  alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
});

const queries = process.argv.slice(2);
const targets = queries.length
  ? queries
  : [
      'Bloom Into You',
      'When We Met',
      'Apple My Love',
      'Whisper Me a Love Song',
      'The Handmaiden',
      'Re:Zero',
      'Robber X Lover',
      'Yuri on Ice',
    ];

const index = await jiti.import('../src/lib/providers/index.ts');
const summary = new Map();

for (const query of targets) {
  const dropped = [];
  const result = await index.searchGLTitles({ query }, 1, 24, (title) => {
    dropped.push({
      title: title.title,
      provider: title.provider,
      classification: title.glClassification,
      contentType: title.contentType,
    });
  });

  console.log(`\n=== "${query}" — kept ${result.items.length}, dropped ${dropped.length}`);
  for (const item of dropped) {
    console.log(`  - [${item.provider}/${item.contentType}] ${item.title} (${item.classification})`);
    const key = `${item.provider}:${item.classification}`;
    summary.set(key, (summary.get(key) || 0) + 1);
  }
}

console.log('\n=== Summary by provider/classification');
for (const [key, count] of [...summary.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${key}: ${count}`);
}
