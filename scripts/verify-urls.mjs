// scripts/verify-urls.mjs
// Pre-launch check: verify all post slugs return 200 on the new site
// Usage: BASE=https://orgzit-blog.pages.dev node scripts/verify-urls.mjs

import fetch from 'node-fetch';
import fs from 'fs-extra';

const BASE = process.env.BASE || 'https://orgzit-blog.pages.dev';
const posts = await fs.readdir('src/content/blog');

console.log(`\nVerifying ${posts.length} URLs against ${BASE}\n`);

let ok = 0, fail = 0;

for (const file of posts) {
  const slug = file.replace('.md', '');
  const url  = `${BASE}/blog/${slug}/`;
  const res  = await fetch(url, { method: 'HEAD' });
  if (res.status === 200) {
    ok++;
    process.stdout.write('✓');
  } else {
    fail++;
    console.log(`\n✗ ${url} → ${res.status}`);
  }
}

console.log(`\n\n${ok} OK, ${fail} failed`);
if (fail > 0) process.exit(1);
