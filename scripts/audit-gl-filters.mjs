#!/usr/bin/env node
/**
 * Audit which provider results search discards before rendering.
 * Reports GL classification drops, maturity drops, and moderation hides, with
 * the provider and the detail that caused each exclusion.
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

function describe(item) {
  if (item.reason === 'GL_CLASSIFICATION') return `GL: ${item.classification}`;
  if (item.reason === 'MATURITY') return `MATURITY: ${item.maturityRating}`;
  return 'MODERATION';
}

for (const query of targets) {
  const dropped = [];
  const result = await index.searchGLTitles(
    { query },
    1,
    24,
    (title) => {
      dropped.push({
        title: title.title,
        provider: title.provider,
        contentType: title.contentType,
        classification: title.glClassification,
        maturityRating: title.maturityRating,
        reason: 'GL_CLASSIFICATION',
      });
    },
    (title, reason) => {
      dropped.push({
        title: title.title,
        provider: title.provider,
        contentType: title.contentType,
        classification: title.glClassification,
        maturityRating: title.maturityRating,
        reason,
      });
    }
  );

  console.log(`\n=== "${query}" — kept ${result.items.length}, dropped ${dropped.length}`);
  for (const item of dropped) {
    console.log(
      `  - [${item.provider}/${item.contentType}] ${item.title} (${describe(item)})`
    );
    const key =
      item.reason === 'GL_CLASSIFICATION'
        ? `${item.provider}:GL:${item.classification}`
        : `${item.provider}:${item.reason}`;
    summary.set(key, (summary.get(key) || 0) + 1);
  }
}

console.log('\n=== Summary by provider/reason');
for (const [key, count] of [...summary.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${key}: ${count}`);
}
