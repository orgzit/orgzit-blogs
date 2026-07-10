// scripts/strip-legacy-toc.mjs
// Run ONCE with: node scripts/strip-legacy-toc.mjs [--dry]
// Removes the leftover WordPress "ez-toc" Table of Contents block
// (Table of Contents / [Toggle](#) / bullet link list) from post bodies.
// The site now auto-generates its own TOC, so this legacy block is
// pure duplication with stale anchor links.

import fs from 'fs';
import path from 'path';

const dir = 'src/content/blog';
const dryRun = process.argv.includes('--dry');

const BLOCK_RE = /Table of Contents\r?\n\r?\n\[Toggle\]\(#\)\r?\n\r?\n((?:[ \t]*[-*][ \t]+\[.*\]\(.*\).*\r?\n)+)\r?\n?/gi;

let changedCount = 0;

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.md')) continue;
  const fullPath = path.join(dir, file);
  const original = fs.readFileSync(fullPath, 'utf8');

  if (!BLOCK_RE.test(original)) continue;
  BLOCK_RE.lastIndex = 0;

  const updated = original.replace(BLOCK_RE, '');

  if (updated === original) continue;
  changedCount++;

  if (dryRun) {
    const removed = original.match(BLOCK_RE);
    console.log(`--- ${file} ---`);
    console.log(removed?.[0]?.trim().split('\n').slice(0, 4).join('\n'), '\n  ...\n');
  } else {
    fs.writeFileSync(fullPath, updated, 'utf8');
    console.log(`✓ cleaned ${file}`);
  }
}

console.log(`\n${dryRun ? 'Would clean' : 'Cleaned'} ${changedCount} file(s).`);
