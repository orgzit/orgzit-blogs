// scripts/relativize-internal-links.mjs
// Run ONCE with: node scripts/relativize-internal-links.mjs
// Converts absolute internal links (https://orgzit.com/blog/<slug>/...)
// inside post bodies to relative links (/blog/<slug>/...), so they resolve
// against whatever host the site is served from (localhost in dev,
// orgzit.com in production) instead of always hardcoding the domain.
// Frontmatter (canonicalUrl etc.) is left untouched — those must stay absolute.

import fs from 'fs';

const dir = 'src/content/blog';
let filesChanged = 0, linksChanged = 0;

for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith('.md')) continue;
  const fullPath = `${dir}/${file}`;
  const content = fs.readFileSync(fullPath, 'utf8');

  const fmEnd = content.indexOf('\n---', 3) + 4;
  const frontmatter = content.slice(0, fmEnd);
  const body = content.slice(fmEnd);

  const count = (body.match(/https?:\/\/orgzit\.com\/blog\//gi) || []).length;
  if (count === 0) continue;

  const updatedBody = body.replace(/https?:\/\/orgzit\.com\/blog\//gi, '/blog/');

  fs.writeFileSync(fullPath, frontmatter + updatedBody, 'utf8');
  filesChanged++;
  linksChanged += count;
  console.log(`✓ ${file} (${count} link${count > 1 ? 's' : ''})`);
}

console.log(`\nDone. ${filesChanged} file(s) changed, ${linksChanged} link(s) relativized.`);
