// scripts/strip-duplicate-hero-image.mjs
// Run ONCE with: node scripts/strip-duplicate-hero-image.mjs
// Removes the leading body image on posts where it duplicates the
// auto-rendered featuredImage hero banner ([slug].astro renders
// post.data.featuredImage at the top of every post automatically).

import fs from 'fs';

const files = [
  'are-you-using-your-crm-to-its-full-potential.md',
  'benefits-of-automotive-dealer-management-systems.md',
  'difference-between-sales-readiness-vs-sales-enablement.md',
  'powerful-tips-for-deal-tracking-in-2023.md',
  'sales-optimization-practices.md',
  'the-power-of-consistency-a-manufacturer-reps-guide-to-flawless-quotes.md',
  'workflow-automation-benefits-for-business.md',
];

const dir = 'src/content/blog';

for (const file of files) {
  const fullPath = `${dir}/${file}`;
  const content = fs.readFileSync(fullPath, 'utf8');

  const endOfFrontmatter = content.indexOf('\n---', 3) + 4;
  const frontmatter = content.slice(0, endOfFrontmatter);
  let body = content.slice(endOfFrontmatter);

  const updatedBody = body.replace(/^\r?\n*!\[[^\]]*\]\([^)]*\)\r?\n+/, '\n\n');

  if (updatedBody === body) {
    console.log(`⚠ no leading image found, skipped: ${file}`);
    continue;
  }

  fs.writeFileSync(fullPath, frontmatter + updatedBody, 'utf8');
  console.log(`✓ cleaned ${file}`);
}
