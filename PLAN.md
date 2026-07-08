
# Orgzit Blog — Master Production Plan
## WordPress → Markdown → Astro → TinaCMS → Cloudflare
### Complete code, architecture, and phase-by-phase execution plan
> Based on live audit of orgzit.com/blog — July 2026
> WordPress 6.3.8 · Shufflehound theme · 200+ posts · Yoast SEO · ez-toc plugin

---

## System Architecture (Complete Picture)

```
┌─────────────────────────────────────────────────────────────────┐
│                    WRITER LAYER                                  │
│                                                                  │
│   Olivia opens app.tina.io in browser                           │
│   Writes post in visual editor (no code, no Markdown)           │
│   Clicks Save → TinaCMS commits .md file to GitHub              │
└─────────────────────────────┬───────────────────────────────────┘
                              │ git push
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTENT LAYER                                 │
│                                                                  │
│   GitHub Repository: orgzit/orgzit-blog                         │
│   src/content/blog/[slug].md  ← every post as a .md file        │
│   public/blog-images/         ← all images downloaded from WP   │
│   src/content/data/           ← categories.json, authors.json   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ triggers
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BUILD LAYER                                   │
│                                                                  │
│   GitHub Actions (.github/workflows/deploy.yml)                  │
│   1. npm ci                                                      │
│   2. astro build (reads all .md files → generates HTML)         │
│   3. pagefind --site dist (indexes all posts for search)        │
│   4. Deploy dist/ to Cloudflare Pages                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │ deploys
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DELIVERY LAYER                                │
│                                                                  │
│   Cloudflare Pages — 200+ global edge nodes                     │
│   orgzit.com/blog/                    → static HTML             │
│   orgzit.com/blog/[slug]/             → static HTML             │
│   orgzit.com/blog/category/[cat]/     → static HTML             │
│   orgzit.com/blog/tag/[tag]/          → static HTML             │
│   orgzit.com/blog/author/[author]/    → static HTML             │
│   orgzit.com/blog/sitemap.xml         → auto-generated          │
│   orgzit.com/blog/rss.xml             → auto-generated          │
│   orgzit.com/blog/search/             → Pagefind static search  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Accounts to create (all free)
```
1. GitHub          → github.com              (stores code + content)
2. Cloudflare      → cloudflare.com          (hosts the site)
3. TinaCMS         → app.tina.io             (writer editor)
```

### Software to install (developer machine only)
```
Node.js 20 LTS    → nodejs.org/en/download
npm               → comes with Node.js
Git               → git-scm.com
```

### Verify installation
```bash
node --version    # should show v20.x.x
npm --version     # should show 10.x.x
git --version     # should show 2.x.x
```

---

## Phase 0 — Pre-Migration Fixes in WordPress
### Goal: Fix broken things before we extract content
### Time: 1 day

### Fix 1 — The redirect loop on /blog/ (URGENT — broken right now)
```
WordPress Admin → Settings → General

Check both fields say exactly:
WordPress Address (URL): https://orgzit.com/blog
Site Address (URL):      https://orgzit.com/blog

Then: Settings → Permalinks → click Save Changes button
(this regenerates the .htaccess file)

Test: open https://orgzit.com/blog/ in incognito window
Expected: page loads without redirect error
```

### Fix 2 — Export full WordPress backup
```
WordPress Admin → Tools → Export → All Content → Download Export File
Save file as: orgzit-wordpress-backup-july-2026.xml
Store in: Google Drive (permanent backup)
```

### Fix 3 — Create Application Password
```
WordPress Admin → Users → Your Profile → scroll to bottom
Application Passwords section → Add New Application Password
Name: Astro Migration Script
Copy the generated password: xxxx xxxx xxxx xxxx xxxx xxxx
Save this password — shown only once
```

### Fix 4 — Fix Uncategorized posts
```
WordPress Admin → Posts → All Posts → Filter: Uncategorized
For each post: Edit → assign a real category → Update
Posts → Categories → delete Uncategorized
```

### Phase 0 done when
```
✓ https://orgzit.com/blog/ loads without redirect error
✓ WordPress XML backup saved to Google Drive
✓ Application Password saved somewhere safe
✓ Zero posts in Uncategorized
```

---

## Phase 1 — Extract WordPress Content to Markdown
### Goal: All 200+ posts saved as .md files in GitHub
### Time: 2–3 days

### Step 1.1 — Create GitHub repository

```
1. Go to github.com → New repository
2. Name: orgzit-blog
3. Visibility: Private
4. Initialize with README: Yes
5. Click Create repository
```

### Step 1.2 — Clone and set up project

```bash
git clone https://github.com/YOUR_ORG/orgzit-blog.git
cd orgzit-blog

# Create project structure
mkdir -p scripts
mkdir -p src/content/blog
mkdir -p src/content/data
mkdir -p public/blog-images

# Initialize npm
npm init -y
```

### Step 1.3 — Install extraction dependencies

```bash
npm install node-fetch@3 turndown turndown-plugin-gfm fs-extra
```

### Step 1.4 — Create environment file

```bash
# Create .env file
cat > .env << 'EOF'
WP_API=https://orgzit.com/blog/wp-json/wp/v2
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
node_modules/
.env
dist/
.tina/__generated__/
EOF
```

### Step 1.5 — Create the extraction script

```javascript
// scripts/extract-wordpress.mjs
// Run with: node scripts/extract-wordpress.mjs
// This script runs ONCE and is never needed again after that

import fetch from 'node-fetch';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = process.env.WP_API || 'https://orgzit.com/blog/wp-json/wp/v2';

// ─── TURNDOWN CONFIG (HTML → Markdown) ────────────────────────
const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  hr: '---',
});
td.use(gfm);

// Keep iframes (YouTube embeds etc.)
td.addRule('iframe', {
  filter: 'iframe',
  replacement: (content, node) => {
    const src = node.getAttribute('src') || '';
    if (src.includes('youtube')) {
      const id = src.match(/embed\/([^?]+)/)?.[1];
      return id ? `\n\n[Video: https://youtube.com/watch?v=${id}]\n\n` : '';
    }
    return '';
  },
});

// ─── CONTENT CLEANER ──────────────────────────────────────────
function cleanHTML(html) {
  return html
    // Remove ez-toc Table of Contents — confirmed in your posts
    .replace(
      /<div[^>]*(?:id="ez-toc-container"|class="[^"]*ez-toc[^"]*")[^>]*>[\s\S]*?<\/div>\s*(?:<\/div>\s*){1,3}/gi,
      ''
    )
    // Remove WP Gutenberg block CSS classes
    .replace(
      /\s+class="[^"]*(?:wp-block|has-text-color|has-medium-font-size|has-large-font-size|is-layout|wp-image|aligncenter|alignleft|alignright)[^"]*"/gi,
      ''
    )
    // Remove figure/figcaption WP wrappers but keep img
    .replace(/<figure[^>]*>/gi, '')
    .replace(/<\/figure>/gi, '')
    .replace(/<figcaption[^>]*>.*?<\/figcaption>/gi, '')
    // Clean empty paragraphs
    .replace(/<p[^>]*>\s*(&nbsp;)?\s*<\/p>/gi, '')
    // Clean non-breaking spaces
    .replace(/&nbsp;/g, ' ')
    // Clean WP caption shortcode remnants
    .replace(/\[caption[^\]]*\]|\[\/caption\]/gi, '')
    .trim();
}

// ─── HTML ENTITY DECODER ──────────────────────────────────────
function decodeEntities(str) {
  return str
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

// ─── IMAGE DOWNLOADER ─────────────────────────────────────────
async function downloadImage(url, destPath) {
  if (!url || !url.startsWith('http')) return false;
  await fs.ensureDir(path.dirname(destPath));
  if (await fs.pathExists(destPath)) return true; // already downloaded
  return new Promise((resolve) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) { resolve(false); return; }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(true)));
    }).on('error', () => { resolve(false); });
  });
}

// ─── IMAGE URL REWRITER ───────────────────────────────────────
function rewriteImageUrls(markdown) {
  // Rewrite all WP upload URLs to local /blog-images/ path
  return markdown.replace(
    /!\[([^\]]*)\]\((https?:\/\/orgzit\.com\/blog\/wp-content\/uploads\/[^)]+)\)/g,
    (match, alt, url) => {
      const filename = path.basename(url.split('?')[0]);
      return `![${alt}](/blog-images/${filename})`;
    }
  );
}

// ─── FRONTMATTER BUILDER ──────────────────────────────────────
function buildFrontmatter(post, authors) {
  const author = authors.find(a => a.id === post.author);
  const allTerms = post._embedded?.['wp:term'] ?? [];
  const categories = (allTerms[0] ?? []).map(t => t.name);
  const tags = (allTerms[1] ?? []).map(t => t.name);
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  const y = post.yoast_head_json ?? {};
  const featuredImageUrl = media?.source_url ?? '';
  const featuredFilename = featuredImageUrl
    ? path.basename(featuredImageUrl.split('?')[0])
    : '';

  return {
    title: decodeEntities(post.title.rendered),
    slug: post.slug,
    date: post.date.split('T')[0],
    updatedDate: post.modified.split('T')[0],
    author: author?.name ?? 'Orgzit',
    authorSlug: author?.slug ?? 'orgzit',
    authorBio: (author?.description ?? '').replace(/"/g, '\\"'),
    authorAvatar: author?.avatar_urls?.['96'] ?? '',
    categories,
    tags,
    featuredImage: featuredFilename ? `/blog-images/${featuredFilename}` : '',
    featuredImageAlt: media?.alt_text ?? decodeEntities(post.title.rendered),
    excerpt: decodeEntities(
      post.excerpt.rendered.replace(/<[^>]+>/g, '').trim()
    ).substring(0, 200),
    seoTitle: decodeEntities(y.title ?? post.title.rendered),
    seoDescription: decodeEntities(y.description ?? ''),
    ogImage: y.og_image?.[0]?.url
      ? `/blog-images/${path.basename(y.og_image[0].url.split('?')[0])}`
      : (featuredFilename ? `/blog-images/${featuredFilename}` : ''),
    twitterCard: y.twitter_card ?? 'summary_large_image',
    noIndex: y.robots?.index === 'noindex',
    canonicalUrl: post.link,
    draft: false,
    featured: false,
  };
}

// ─── YAML FRONTMATTER SERIALIZER ──────────────────────────────
function toYAML(fm) {
  const esc = (s) => String(s).replace(/"/g, '\\"');
  const arr = (a) => a.length === 0
    ? '[]'
    : '\n' + a.map(v => `  - "${esc(v)}"`).join('\n');

  return `---
title: "${esc(fm.title)}"
slug: "${fm.slug}"
date: "${fm.date}"
updatedDate: "${fm.updatedDate}"
author: "${esc(fm.author)}"
authorSlug: "${fm.authorSlug}"
authorAvatar: "${fm.authorAvatar}"
authorBio: "${fm.authorBio}"
categories: ${arr(fm.categories)}
tags: ${arr(fm.tags)}
featuredImage: "${fm.featuredImage}"
featuredImageAlt: "${esc(fm.featuredImageAlt)}"
excerpt: "${esc(fm.excerpt)}"
seoTitle: "${esc(fm.seoTitle)}"
seoDescription: "${esc(fm.seoDescription)}"
ogImage: "${fm.ogImage}"
twitterCard: "${fm.twitterCard}"
noIndex: ${fm.noIndex}
canonicalUrl: "${fm.canonicalUrl}"
draft: ${fm.draft}
featured: ${fm.featured}
---`;
}

// ─── WP REST API FETCHER ──────────────────────────────────────
async function fetchAll(endpoint) {
  const items = [];
  let page = 1;
  while (true) {
    const url = `${API}/${endpoint}?per_page=100&page=${page}&_embed=true`;
    console.log(`  Fetching: ${url}`);
    const res = await fetch(url);
    if (!res.ok) break;
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    items.push(...batch);
    if (batch.length < 100) break;
    page++;
  }
  return items;
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Orgzit WordPress → Markdown Extractor');
  console.log('==========================================\n');

  // Ensure directories
  await fs.ensureDir('src/content/blog');
  await fs.ensureDir('src/content/data');
  await fs.ensureDir('public/blog-images');

  // Step 1: Fetch all WordPress data
  console.log('Step 1: Fetching WordPress data...');
  console.log('  Fetching posts...');
  const posts = await fetchAll('posts?status=publish');
  console.log(`  ✓ ${posts.length} posts fetched`);

  console.log('  Fetching categories...');
  const categories = await fetchAll('categories?hide_empty=true');
  console.log(`  ✓ ${categories.length} categories`);

  console.log('  Fetching tags...');
  const tags = await fetchAll('tags?hide_empty=true');
  console.log(`  ✓ ${tags.length} tags`);

  console.log('  Fetching authors...');
  const authors = await fetchAll('users');
  console.log(`  ✓ ${authors.length} authors\n`);

  // Step 2: Save reference data
  await fs.writeJSON('src/content/data/categories.json', categories, { spaces: 2 });
  await fs.writeJSON('src/content/data/tags.json', tags, { spaces: 2 });
  await fs.writeJSON('src/content/data/authors.json', authors, { spaces: 2 });
  console.log('Step 2: Saved categories, tags, authors ✓\n');

  // Step 3: Process each post
  console.log('Step 3: Converting posts to Markdown...');
  let imageCount = 0;
  let errorCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    process.stdout.write(`  [${i + 1}/${posts.length}] ${post.slug.substring(0, 50)}...`);

    try {
      // Build frontmatter
      const fm = buildFrontmatter(post, authors);

      // Download featured image
      if (fm.featuredImage) {
        const originalUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        if (originalUrl) {
          const dest = `public${fm.featuredImage}`;
          const ok = await downloadImage(originalUrl, dest);
          if (ok) imageCount++;
        }
      }

      // Download OG image if different from featured
      if (post.yoast_head_json?.og_image?.[0]?.url) {
        const ogUrl = post.yoast_head_json.og_image[0].url;
        const ogFilename = path.basename(ogUrl.split('?')[0]);
        const ogDest = `public/blog-images/${ogFilename}`;
        await downloadImage(ogUrl, ogDest);
      }

      // Clean HTML content
      const cleanedHTML = cleanHTML(post.content.rendered);

      // Convert to Markdown
      let markdown = td.turndown(cleanedHTML);

      // Download inline images and rewrite URLs
      const imgRegex = /https?:\/\/orgzit\.com\/blog\/wp-content\/uploads\/[^\s"')>]+/g;
      const imgUrls = [...new Set(cleanedHTML.match(imgRegex) ?? [])];
      for (const imgUrl of imgUrls) {
        const filename = path.basename(imgUrl.split('?')[0]);
        await downloadImage(imgUrl, `public/blog-images/${filename}`);
        imageCount++;
      }
      markdown = rewriteImageUrls(markdown);

      // Write .md file
      const content = `${toYAML(fm)}\n\n${markdown}\n`;
      await fs.writeFile(`src/content/blog/${post.slug}.md`, content, 'utf8');
      process.stdout.write(' ✓\n');

    } catch (err) {
      process.stdout.write(` ✗ ${err.message}\n`);
      errorCount++;
    }
  }

  console.log(`\n==========================================`);
  console.log(`✅ Extraction complete!`);
  console.log(`   Posts: ${posts.length - errorCount} saved, ${errorCount} errors`);
  console.log(`   Images: ${imageCount} downloaded`);
  console.log(`   Output: src/content/blog/ and public/blog-images/`);
  console.log(`\nNext: git add . && git commit -m "feat: import WordPress content"`);
  console.log(`Then: node scripts/extract-wordpress.mjs  ← run this once only`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
```

### Step 1.6 — Run the extraction

```bash
# Load env and run
export $(cat .env | xargs)
node scripts/extract-wordpress.mjs
```

### Step 1.7 — Verify output

```bash
# Count posts saved
ls src/content/blog/ | wc -l
# Expected: 200+

# Count images downloaded
ls public/blog-images/ | wc -l
# Expected: 500+

# Check one post looks correct
cat "src/content/blog/manufacturers-reps-is-your-crm-more-of-a-hassle-than-a-help.md" | head -30
```

### Step 1.8 — Commit to GitHub

```bash
git add .
git commit -m "feat: import all WordPress content as Markdown files"
git push origin main
```

### Phase 1 done when
```
✓ 200+ .md files in src/content/blog/
✓ 500+ images in public/blog-images/
✓ categories.json, tags.json, authors.json in src/content/data/
✓ All committed and pushed to GitHub
```

---

## Phase 2 — Build Astro Site
### Goal: Full site built from .md files, deployed to Cloudflare Pages
### Time: 3–4 weeks

### Step 2.1 — Install Astro and dependencies

```bash
# Install Astro into existing project
npx astro add --yes

npm install astro@latest
npm install @astrojs/tailwind @astrojs/sitemap
npm install tailwindcss @tailwindcss/typography
npm install pagefind
npm install sharp          # image optimisation

# Dev dependencies
npm install -D typescript @types/node
```

### Step 2.2 — astro.config.mjs

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://orgzit.com',
  base: '/blog',
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    tailwind({ applyBaseStyles: false }),
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  build: {
    assets: 'assets',
  },
});
```

### Step 2.3 — tailwind.config.mjs

```javascript
// tailwind.config.mjs
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        serif: ['Georgia', ...defaultTheme.fontFamily.serif],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.slate.700'),
            '--tw-prose-headings': theme('colors.slate.900'),
            '--tw-prose-links': theme('colors.brand.600'),
            maxWidth: '68ch',
            fontSize: '1.125rem',
            lineHeight: '1.8',
            fontFamily: 'Georgia, serif',
            'h2': {
              fontSize: '1.5rem',
              fontWeight: '700',
              fontFamily: 'Inter, sans-serif',
              marginTop: '2em',
            },
            'h3': {
              fontSize: '1.25rem',
              fontWeight: '600',
              fontFamily: 'Inter, sans-serif',
            },
            'a': {
              color: theme('colors.brand.600'),
              textDecorationThickness: '1px',
              textUnderlineOffset: '2px',
            },
            'code': {
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.875em',
            },
            'img': {
              borderRadius: '8px',
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
```

### Step 2.4 — tsconfig.json

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@components/*": ["src/components/*"],
      "@layouts/*": ["src/layouts/*"],
      "@lib/*": ["src/lib/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

### Step 2.5 — Content Collections schema

```typescript
// src/content/config.ts
import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title:           z.string(),
    slug:            z.string(),
    date:            z.string(),
    updatedDate:     z.string().optional(),
    author:          z.string(),
    authorSlug:      z.string(),
    authorAvatar:    z.string().optional(),
    authorBio:       z.string().optional(),
    categories:      z.array(z.string()).default([]),
    tags:            z.array(z.string()).default([]),
    featuredImage:   z.string(),
    featuredImageAlt:z.string().default(''),
    excerpt:         z.string(),
    seoTitle:        z.string(),
    seoDescription:  z.string(),
    ogImage:         z.string().optional(),
    twitterCard:     z.string().default('summary_large_image'),
    noIndex:         z.boolean().default(false),
    canonicalUrl:    z.string(),
    draft:           z.boolean().default(false),
    featured:        z.boolean().default(false),
  }),
});

export const collections = { blog };
```

### Step 2.6 — Types

```typescript
// src/types/blog.ts
export interface Post {
  slug:             string;
  title:            string;
  date:             string;
  updatedDate?:     string;
  author:           string;
  authorSlug:       string;
  authorAvatar?:    string;
  authorBio?:       string;
  categories:       string[];
  tags:             string[];
  featuredImage:    string;
  featuredImageAlt: string;
  excerpt:          string;
  seoTitle:         string;
  seoDescription:   string;
  ogImage?:         string;
  twitterCard:      string;
  noIndex:          boolean;
  canonicalUrl:     string;
  draft:            boolean;
  featured:         boolean;
  readingTime:      number;
  body?:            string;
}
```

### Step 2.7 — Utility functions

```typescript
// src/lib/readingTime.ts
export function getReadingTime(content: string): number {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.ceil(words / 200); // 200 words per minute
}
```

```typescript
// src/lib/dates.ts
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function isoDate(dateStr: string): string {
  return new Date(dateStr).toISOString();
}
```

```typescript
// src/lib/toc.ts
export interface TOCItem {
  level: 2 | 3;
  text:  string;
  id:    string;
}

export function extractTOC(html: string): TOCItem[] {
  const items: TOCItem[] = [];
  const regex = /<h([23])[^>]*id="([^"]+)"[^>]*>(.*?)<\/h[23]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    items.push({
      level: parseInt(match[1]) as 2 | 3,
      id:    match[2],
      text:  match[3].replace(/<[^>]+>/g, ''),
    });
  }
  return items;
}

export function addHeadingIds(html: string): string {
  return html.replace(
    /<(h[23])([^>]*)>(.*?)<\/h[23]>/gi,
    (match, tag, attrs, content) => {
      if (attrs.includes('id=')) return match;
      const text = content.replace(/<[^>]+>/g, '');
      const id = text.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return `<${tag}${attrs} id="${id}">${content}</${tag}>`;
    }
  );
}
```

```typescript
// src/lib/related.ts
import type { Post } from '@types/blog';

export function getRelatedPosts(
  current: Post,
  all: Post[],
  limit = 3
): Post[] {
  const others = all.filter(p => p.slug !== current.slug && !p.draft);

  return others
    .map(post => {
      // Score by shared tags (2 pts each) + shared categories (1 pt each)
      const sharedTags = post.tags.filter(t => current.tags.includes(t)).length;
      const sharedCats = post.categories
        .filter(c => current.categories.includes(c)).length;
      return { post, score: sharedTags * 2 + sharedCats };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post);
}
```

### Step 2.8 — BaseLayout

```astro
---
// src/layouts/BaseLayout.astro
import '../styles/global.css';

interface Props {
  title:       string;
  description: string;
  canonical:   string;
  ogImage?:    string;
  ogType?:     string;
  noIndex?:    boolean;
  publishedAt?: string;
  updatedAt?:  string;
  author?:     string;
}

const {
  title, description, canonical,
  ogImage, ogType = 'website',
  noIndex = false, publishedAt, updatedAt, author,
} = Astro.props;

const siteUrl = 'https://orgzit.com';
const ogImageFull = ogImage
  ? (ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`)
  : `${siteUrl}/blog-images/default-og.png`;
---
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <!-- Primary -->
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={canonical} />
  {noIndex && <meta name="robots" content="noindex, nofollow" />}

  <!-- Open Graph -->
  <meta property="og:type"        content={ogType} />
  <meta property="og:title"       content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url"         content={canonical} />
  <meta property="og:image"       content={ogImageFull} />
  <meta property="og:site_name"   content="Orgzit Blog" />
  <meta property="og:locale"      content="en_US" />

  <!-- Twitter -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:site"        content="@orgzit" />
  <meta name="twitter:title"       content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image"       content={ogImageFull} />

  <!-- Article-specific -->
  {publishedAt && <meta property="article:published_time" content={publishedAt} />}
  {updatedAt   && <meta property="article:modified_time"  content={updatedAt} />}
  {author      && <meta property="article:author"         content={author} />}

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

  <!-- Favicon -->
  <link rel="icon" href="/blog/favicon.ico" />

  <!-- Pagefind (search) -->
  <link rel="preload" href="/blog/pagefind/pagefind.js" as="script" />
</head>
<body class="bg-slate-50 text-slate-800 antialiased">
  <a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>
  <slot />
</body>
</html>
```

### Step 2.9 — Navbar component

```astro
---
// src/components/layout/Navbar.astro
import { getCollection } from 'astro:content';
import categoriesData from '@/content/data/categories.json';

const topCategories = categoriesData
  .sort((a: any, b: any) => b.count - a.count)
  .slice(0, 6);
---
<header class="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
  <nav class="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

    <!-- Logo -->
    <a href="/blog/" class="flex items-center gap-2 font-bold text-slate-900 text-lg">
      <img src="/blog/orgzit-logo.svg" alt="Orgzit" class="h-7 w-auto" />
      <span class="text-slate-500 font-normal text-sm">Blog</span>
    </a>

    <!-- Desktop nav -->
    <div class="hidden md:flex items-center gap-6">
      <a href="/blog/" class="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors">
        All Posts
      </a>

      <!-- Categories dropdown -->
      <div class="relative group">
        <button class="text-sm font-medium text-slate-600 hover:text-brand-600 flex items-center gap-1">
          Categories
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 py-2">
          {topCategories.map((cat: any) => (
            <a
              href={`/blog/category/${cat.slug}/`}
              class="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-brand-600"
            >
              {cat.name}
              <span class="text-slate-400 text-xs ml-1">({cat.count})</span>
            </a>
          ))}
        </div>
      </div>

      <!-- Search -->
      <a href="/blog/search/" class="text-sm font-medium text-slate-600 hover:text-brand-600">
        🔍 Search
      </a>
    </div>

    <!-- CTA Button -->
    <a
      href="https://orgzit.com/book-demo/"
      class="hidden md:inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold
             px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
    >
      Book a Demo →
    </a>

    <!-- Mobile menu button -->
    <button id="mobile-menu-btn" class="md:hidden p-2 text-slate-600">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  </nav>

  <!-- Mobile menu -->
  <div id="mobile-menu" class="hidden md:hidden border-t border-slate-200 bg-white px-6 py-4">
    <a href="/blog/" class="block py-2 text-sm font-medium text-slate-700">All Posts</a>
    <div class="py-2">
      <div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Categories</div>
      {topCategories.map((cat: any) => (
        <a href={`/blog/category/${cat.slug}/`} class="block py-1.5 text-sm text-slate-600 pl-2">
          {cat.name}
        </a>
      ))}
    </div>
    <a href="/blog/search/" class="block py-2 text-sm font-medium text-slate-700">Search</a>
    <a href="https://orgzit.com/book-demo/" class="block mt-3 bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg text-center">
      Book a Demo →
    </a>
  </div>
</header>

<script>
  document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
    document.getElementById('mobile-menu')?.classList.toggle('hidden');
  });
</script>
```

### Step 2.10 — Blog listing page (homepage)

```astro
---
// src/pages/index.astro
import { getCollection } from 'astro:content';
import BaseLayout from '@layouts/BaseLayout.astro';
import Navbar from '@components/layout/Navbar.astro';
import Footer from '@components/layout/Footer.astro';
import BlogCard from '@components/blog/BlogCard.astro';
import Pagination from '@components/ui/Pagination.astro';

const POSTS_PER_PAGE = 12;
const currentPage = 1;

const allPosts = await getCollection('blog', ({ data }) => !data.draft);
const sorted = allPosts.sort((a, b) =>
  new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
);

const featured = sorted.find(p => p.data.featured) ?? sorted[0];
const regular = sorted.filter(p => p.slug !== featured.slug);
const paginated = regular.slice(0, POSTS_PER_PAGE - 1);
const totalPages = Math.ceil(sorted.length / POSTS_PER_PAGE);
---
<BaseLayout
  title="Orgzit Blog — Insights for Modern Teams"
  description="Practical guides on CRM, productivity, no-code tools, and business automation for growing teams."
  canonical="https://orgzit.com/blog/"
>
  <Navbar />

  <main id="main-content" class="max-w-6xl mx-auto px-6 py-12">

    <!-- Featured post -->
    {featured && (
      <section class="mb-16">
        <a href={`/blog/${featured.slug}/`} class="group block">
          <div class="grid md:grid-cols-2 gap-8 bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all">
            <div class="aspect-video bg-slate-100 overflow-hidden">
              <img
                src={featured.data.featuredImage}
                alt={featured.data.featuredImageAlt}
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="eager"
                width="600"
                height="338"
              />
            </div>
            <div class="p-8 flex flex-col justify-center">
              <div class="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-3">
                Featured Post
              </div>
              <h2 class="text-2xl font-bold text-slate-900 group-hover:text-brand-700 mb-4 leading-tight">
                {featured.data.title}
              </h2>
              <p class="text-slate-600 leading-relaxed mb-6">
                {featured.data.excerpt}
              </p>
              <div class="flex items-center gap-3 text-sm text-slate-500">
                <span>{featured.data.author}</span>
                <span>·</span>
                <span>{new Date(featured.data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </a>
      </section>
    )}

    <!-- Blog grid -->
    <section>
      <h2 class="text-xl font-bold text-slate-900 mb-8">Latest Articles</h2>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginated.map(post => <BlogCard post={post.data} slug={post.slug} />)}
      </div>
    </section>

    <!-- Pagination -->
    <Pagination currentPage={1} totalPages={totalPages} baseUrl="/blog" />
  </main>

  <Footer />
</BaseLayout>
```

### Step 2.11 — Individual blog post page

```astro
---
// src/pages/[slug].astro
import { getCollection } from 'astro:content';
import BaseLayout from '@layouts/BaseLayout.astro';
import Navbar from '@components/layout/Navbar.astro';
import Footer from '@components/layout/Footer.astro';
import TableOfContents from '@components/blog/TableOfContents.astro';
import AuthorCard from '@components/blog/AuthorCard.astro';
import RelatedPosts from '@components/blog/RelatedPosts.astro';
import Breadcrumb from '@components/ui/Breadcrumb.astro';
import ShareButtons from '@components/ui/ShareButtons.astro';
import NewsletterCTA from '@components/ui/NewsletterCTA.astro';
import ReadingProgress from '@components/blog/ReadingProgress.astro';
import { addHeadingIds, extractTOC } from '@lib/toc';
import { getReadingTime } from '@lib/readingTime';
import { getRelatedPosts } from '@lib/related';
import { formatDate, isoDate } from '@lib/dates';
import type { Post } from '@types/blog';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content, remarkPluginFrontmatter } = await post.render();

// Process content
const rawHTML = await post.render().then(r => r.Content);
const processedBody = addHeadingIds(post.body ?? '');
const toc = extractTOC(processedBody);
const readingTime = getReadingTime(post.body ?? '');

// Related posts
const allPosts = await getCollection('blog', ({ data }) => !data.draft);
const postData: Post = { ...post.data, slug: post.slug, readingTime };
const relatedPosts = getRelatedPosts(
  postData,
  allPosts.map(p => ({ ...p.data, slug: p.slug, readingTime: 5 })),
);

const postUrl = `https://orgzit.com/blog/${post.slug}/`;
---
<BaseLayout
  title={post.data.seoTitle}
  description={post.data.seoDescription}
  canonical={post.data.canonicalUrl}
  ogImage={post.data.ogImage ?? post.data.featuredImage}
  ogType="article"
  noIndex={post.data.noIndex}
  publishedAt={isoDate(post.data.date)}
  updatedAt={post.data.updatedDate ? isoDate(post.data.updatedDate) : undefined}
  author={post.data.author}
>
  <!-- Article JSON-LD -->
  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.data.title,
    "description": post.data.seoDescription,
    "image": post.data.ogImage ?? post.data.featuredImage,
    "datePublished": isoDate(post.data.date),
    "dateModified": post.data.updatedDate
      ? isoDate(post.data.updatedDate)
      : isoDate(post.data.date),
    "author": {
      "@type": "Person",
      "name": post.data.author,
      "url": `https://orgzit.com/blog/author/${post.data.authorSlug}/`
    },
    "publisher": {
      "@type": "Organization",
      "name": "Orgzit",
      "logo": { "@type": "ImageObject", "url": "https://orgzit.com/logo.png" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl }
  })} />

  <!-- BreadcrumbList JSON-LD -->
  <script type="application/ld+json" set:html={JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://orgzit.com/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://orgzit.com/blog/" },
      { "@type": "ListItem", "position": 3, "name": post.data.categories[0] ?? "Article",
        "item": `https://orgzit.com/blog/category/${post.data.categories[0]?.toLowerCase().replace(/\s+/g, '-')}/` },
      { "@type": "ListItem", "position": 4, "name": post.data.title }
    ]
  })} />

  <Navbar />
  <ReadingProgress />

  <main id="main-content" class="max-w-6xl mx-auto px-6 py-8">

    <!-- Breadcrumb -->
    <Breadcrumb
      items={[
        { label: 'Blog', href: '/blog/' },
        { label: post.data.categories[0] ?? 'Article',
          href: `/blog/category/${post.data.categories[0]?.toLowerCase().replace(/\s+/g, '-')}/` },
        { label: post.data.title }
      ]}
    />

    <div class="mt-6 grid lg:grid-cols-[1fr_280px] gap-12">

      <!-- Main content -->
      <article data-pagefind-body data-pagefind-filter={`category:${post.data.categories[0] ?? ''}`}>

        <!-- Post header -->
        <header class="mb-8">
          <!-- Category badge -->
          {post.data.categories[0] && (
            <a
              href={`/blog/category/${post.data.categories[0].toLowerCase().replace(/\s+/g, '-')}/`}
              class="inline-block text-xs font-semibold bg-brand-50 text-brand-700 px-3 py-1 rounded-full mb-4 hover:bg-brand-100 transition-colors"
            >
              {post.data.categories[0]}
            </a>
          )}

          <h1 class="text-3xl md:text-4xl font-bold text-slate-900 leading-tight mb-4">
            {post.data.title}
          </h1>

          <!-- Meta row -->
          <div class="flex flex-wrap items-center gap-3 text-sm text-slate-500 mb-6">
            {post.data.authorAvatar && (
              <img
                src={post.data.authorAvatar}
                alt={post.data.author}
                class="w-8 h-8 rounded-full"
                width="32"
                height="32"
              />
            )}
            <span class="font-medium text-slate-700">{post.data.author}</span>
            <span>·</span>
            <time datetime={isoDate(post.data.date)}>
              {formatDate(post.data.date)}
            </time>
            <span>·</span>
            <span>{readingTime} min read</span>
            {post.data.updatedDate && post.data.updatedDate !== post.data.date && (
              <>
                <span>·</span>
                <span>Updated {formatDate(post.data.updatedDate)}</span>
              </>
            )}
          </div>

          <!-- Featured image -->
          {post.data.featuredImage && (
            <div class="aspect-video rounded-xl overflow-hidden bg-slate-100 mb-8">
              <img
                src={post.data.featuredImage}
                alt={post.data.featuredImageAlt}
                class="w-full h-full object-cover"
                loading="eager"
                fetchpriority="high"
                width="1200"
                height="675"
              />
            </div>
          )}
        </header>

        <!-- Table of Contents (mobile) -->
        {toc.length > 2 && (
          <div class="lg:hidden mb-8">
            <TableOfContents items={toc} />
          </div>
        )}

        <!-- Post body -->
        <div class="prose prose-lg prose-slate max-w-none">
          <Content />
        </div>

        <!-- Tags -->
        {post.data.tags.length > 0 && (
          <div class="mt-8 pt-8 border-t border-slate-200">
            <div class="flex flex-wrap gap-2">
              {post.data.tags.map(tag => (
                <a
                  href={`/blog/tag/${tag.toLowerCase().replace(/\s+/g, '-')}/`}
                  class="text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1 rounded-full transition-colors"
                >
                  #{tag}
                </a>
              ))}
            </div>
          </div>
        )}

        <!-- Share buttons -->
        <ShareButtons url={postUrl} title={post.data.title} />

        <!-- Author card -->
        <AuthorCard
          name={post.data.author}
          slug={post.data.authorSlug}
          bio={post.data.authorBio ?? ''}
          avatar={post.data.authorAvatar ?? ''}
        />

      </article>

      <!-- Sticky sidebar (desktop only) -->
      {toc.length > 2 && (
        <aside class="hidden lg:block">
          <div class="sticky top-24">
            <TableOfContents items={toc} />
          </div>
        </aside>
      )}
    </div>

    <!-- Related posts -->
    {relatedPosts.length > 0 && (
      <RelatedPosts posts={relatedPosts} />
    )}

    <!-- Newsletter CTA -->
    <NewsletterCTA />
  </main>

  <Footer />
</BaseLayout>
```

### Step 2.12 — Category page

```astro
---
// src/pages/category/[category].astro
import { getCollection } from 'astro:content';
import BaseLayout from '@layouts/BaseLayout.astro';
import Navbar from '@components/layout/Navbar.astro';
import Footer from '@components/layout/Footer.astro';
import BlogCard from '@components/blog/BlogCard.astro';
import categoriesData from '@/content/data/categories.json';

export async function getStaticPaths() {
  const categories = categoriesData as any[];
  return categories.map(cat => ({
    params: { category: cat.slug },
    props: { category: cat },
  }));
}

const { category } = Astro.props;
const allPosts = await getCollection('blog', ({ data }) => !data.draft);

const posts = allPosts
  .filter(p => p.data.categories
    .map(c => c.toLowerCase().replace(/\s+/g, '-'))
    .includes(category.slug)
  )
  .sort((a, b) =>
    new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );
---
<BaseLayout
  title={`${category.name} Articles — Orgzit Blog`}
  description={category.description || `Browse all ${category.name} articles on the Orgzit Blog.`}
  canonical={`https://orgzit.com/blog/category/${category.slug}/`}
>
  <Navbar />
  <main id="main-content" class="max-w-6xl mx-auto px-6 py-12">
    <div class="mb-10">
      <h1 class="text-3xl font-bold text-slate-900">{category.name}</h1>
      {category.description && (
        <p class="text-slate-600 mt-3 text-lg max-w-2xl">{category.description}</p>
      )}
      <p class="text-sm text-slate-500 mt-2">{posts.length} articles</p>
    </div>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map(post => <BlogCard post={post.data} slug={post.slug} />)}
    </div>
  </main>
  <Footer />
</BaseLayout>
```

### Step 2.13 — Sitemap and RSS

```typescript
// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const site = 'https://orgzit.com';

  const urls = [
    `<url><loc>${site}/blog/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...posts.map(p => `
      <url>
        <loc>${site}/blog/${p.slug}/</loc>
        <lastmod>${new Date(p.data.updatedDate ?? p.data.date).toISOString().split('T')[0]}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
      </url>
    `),
  ];

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}
</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } }
  );
};
```

```typescript
// src/pages/rss.xml.ts
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const sorted = posts.sort((a, b) =>
    new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  return rss({
    title: 'Orgzit Blog',
    description: 'Practical insights on CRM, productivity, and no-code tools.',
    site: 'https://orgzit.com/blog',
    items: sorted.map(post => ({
      title:       post.data.title,
      description: post.data.excerpt,
      pubDate:     new Date(post.data.date),
      link:        `/blog/${post.slug}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
```

### Step 2.14 — Cloudflare configuration files

```
# public/robots.txt
User-agent: *
Allow: /blog/
Disallow: /admin/

Sitemap: https://orgzit.com/blog/sitemap.xml
```

```
# public/_headers
/blog/assets/*
  Cache-Control: public, max-age=31536000, immutable
  X-Content-Type-Options: nosniff

/blog-images/*
  Cache-Control: public, max-age=31536000, immutable

/blog/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

```
# public/_redirects
# Add any URL changes here
# Format: /old-url/   /new-url/   301
```

### Step 2.15 — package.json scripts

```json
{
  "type": "module",
  "scripts": {
    "extract-wp": "node scripts/extract-wordpress.mjs",
    "dev":        "astro dev",
    "build":      "astro build && npx pagefind --site dist --output-path dist/pagefind",
    "preview":    "astro preview",
    "check":      "astro check"
  }
}
```

### Step 2.16 — Test locally

```bash
npm run dev
# Open http://localhost:4321/blog/
# Verify: posts list, individual post, category page, sitemap
```

### Phase 2 done when
```
✓ npm run build completes with zero errors
✓ All 200+ posts accessible at /blog/[slug]/
✓ Category pages work
✓ Tag pages work
✓ Author pages work
✓ Sitemap.xml has all posts
✓ Lighthouse Performance >= 90 on sample post
```

---

## Phase 3 — Deploy to Cloudflare Pages
### Goal: Site live on the internet
### Time: 1 day

### Step 3.1 — Create Cloudflare Pages project

```
1. Log into dash.cloudflare.com
2. Pages → Create a project → Connect to Git
3. Select GitHub → select orgzit/orgzit-blog
4. Configure build:
   Framework preset:   None (or Astro)
   Build command:      npm run build
   Build output dir:   dist
   Root directory:     /  (leave blank)
5. Environment variables:
   NODE_VERSION = 20
6. Click Save and Deploy
```

### Step 3.2 — GitHub Actions for automatic deploys

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]        # every push to main deploys
  workflow_dispatch:         # manual trigger from GitHub UI

jobs:
  deploy:
    name: Deploy to Cloudflare Pages
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build site
        run: npm run build
        # builds Astro + runs Pagefind search indexer

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken:    ${{ secrets.CF_API_TOKEN }}
          accountId:   ${{ secrets.CF_ACCOUNT_ID }}
          projectName: orgzit-blog
          directory:   dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}

      - name: Notify on success
        if: success()
        run: echo "✅ Deployed successfully to Cloudflare Pages"
```

### Step 3.3 — Add GitHub Secrets

```
GitHub repository → Settings → Secrets and variables → Actions → New secret

CF_API_TOKEN  → Cloudflare Dashboard → My Profile → API Tokens
               → Create Token → Cloudflare Pages: Edit
CF_ACCOUNT_ID → Cloudflare Dashboard → right sidebar → Account ID
```

### Step 3.4 — Custom domain

```
Cloudflare Pages → your project → Custom domains
Add: orgzit.com/blog  (or blog.orgzit.com if preferred)
Follow DNS setup instructions
```

### Phase 3 done when
```
✓ Site live at Cloudflare Pages URL (xxx.pages.dev)
✓ Custom domain working (orgzit.com/blog/)
✓ GitHub push → site rebuilds automatically
✓ All existing URLs return 200 status
```

---

## Phase 4 — TinaCMS for Writers
### Goal: Olivia writes and publishes without WordPress or GitHub
### Time: 3–4 days

### Step 4.1 — Install TinaCMS

```bash
npx @tinacms/cli@latest init
```

This command:
- Installs tinacms package
- Creates tina/config.ts
- Updates package.json scripts
- Creates example content

### Step 4.2 — tina/config.ts (complete)

```typescript
// tina/config.ts
import { defineConfig } from 'tinacms';

export default defineConfig({
  branch:   process.env.GITHUB_BRANCH ?? 'main',
  clientId: process.env.TINA_CLIENT_ID ?? '',
  token:    process.env.TINA_TOKEN ?? '',

  build: {
    outputFolder: 'admin',
    publicFolder: 'public',
  },

  media: {
    tina: {
      mediaRoot:   'blog-images',
      publicFolder: 'public',
    },
  },

  schema: {
    collections: [
      {
        name:   'blog',
        label:  'Blog Posts',
        path:   'src/content/blog',
        format: 'md',

        defaultItem: () => ({
          draft:       true,
          twitterCard: 'summary_large_image',
          noIndex:     false,
          featured:    false,
          date:        new Date().toISOString().split('T')[0],
          author:      'Olivia Davis',
          authorSlug:  'olivia_davis',
        }),

        ui: {
          filename: {
            readonly:  false,
            slugify:   (values: any) => values?.slug
              ?? values?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-')
              ?? 'new-post',
          },
        },

        fields: [
          // ── STATUS ──────────────────────────────────────
          {
            type:        'boolean',
            name:        'draft',
            label:       '🔒 Draft (hidden from site)',
            description: 'Turn OFF to publish the post live',
          },
          {
            type:        'boolean',
            name:        'featured',
            label:       '⭐ Featured Post',
            description: 'Shows as the large hero post on the homepage',
          },

          // ── BASICS ──────────────────────────────────────
          {
            type:        'string',
            name:        'title',
            label:       'Post Title',
            isTitle:     true,
            required:    true,
            description: 'The headline — keep it clear and keyword-rich',
          },
          {
            type:        'string',
            name:        'slug',
            label:       'URL Slug',
            required:    true,
            description: 'The URL: orgzit.com/blog/your-slug-here/',
          },
          {
            type:        'datetime',
            name:        'date',
            label:       'Publish Date',
            required:    true,
            ui:          { dateFormat: 'YYYY-MM-DD' },
          },
          {
            type:     'string',
            name:     'excerpt',
            label:    'Short Excerpt',
            description: 'Shown on blog listing cards — 1–2 sentences',
            ui:       { component: 'textarea' },
          },

          // ── AUTHOR ──────────────────────────────────────
          {
            type:    'string',
            name:    'author',
            label:   'Author Name',
            required: true,
            options: ['Olivia Davis', 'Pavan Verma'],
          },
          {
            type:  'string',
            name:  'authorSlug',
            label: 'Author Slug',
            ui:    { component: 'hidden' },
          },

          // ── CATEGORIES & TAGS ────────────────────────────
          {
            type:    'string',
            name:    'categories',
            label:   'Categories',
            list:    true,
            options: [
              { value: 'B2B Business',             label: 'B2B Business' },
              { value: 'CRM',                      label: 'CRM' },
              { value: 'Productivity',             label: 'Productivity' },
              { value: 'Tips & Tricks',            label: 'Tips & Tricks' },
              { value: 'No Code',                  label: 'No Code' },
              { value: 'Customer Success Stories', label: 'Customer Success Stories' },
              { value: 'Manufacturing CRMs',       label: 'Manufacturing CRMs' },
              { value: 'Project Management',       label: 'Project Management' },
              { value: 'Sales',                    label: 'Sales' },
              { value: 'Orgzit News',              label: 'Orgzit News' },
            ],
          },
          {
            type:        'string',
            name:        'tags',
            label:       'Tags',
            list:        true,
            description: 'Add relevant tags (press Enter after each)',
          },

          // ── IMAGES ──────────────────────────────────────
          {
            type:        'image',
            name:        'featuredImage',
            label:       'Featured Image',
            description: 'Upload at 1200×675px (16:9 ratio) for best results',
          },
          {
            type:        'string',
            name:        'featuredImageAlt',
            label:       'Featured Image Alt Text',
            description: 'Describe the image in 5–10 words (for SEO and accessibility)',
          },

          // ── SEO ─────────────────────────────────────────
          {
            type:        'string',
            name:        'seoTitle',
            label:       'SEO Title',
            description: 'Shown in Google search results — max 60 characters',
          },
          {
            type:        'string',
            name:        'seoDescription',
            label:       'SEO Description',
            description: 'Shown in Google — 130–155 characters is ideal',
            ui:          { component: 'textarea' },
          },
          {
            type:        'image',
            name:        'ogImage',
            label:       'Social Share Image',
            description: 'Image shown on LinkedIn and Twitter — 1200×630px',
          },
          {
            type:  'string',
            name:  'canonicalUrl',
            label: 'Canonical URL',
            ui:    { component: 'hidden' },
          },
          {
            type:  'boolean',
            name:  'noIndex',
            label: 'Hide from Google',
            ui:    { component: 'hidden' },
          },
          {
            type:  'string',
            name:  'twitterCard',
            label: 'Twitter Card',
            ui:    { component: 'hidden' },
          },

          // ── CONTENT ─────────────────────────────────────
          {
            type:  'rich-text',
            name:  'body',
            label: 'Content',
            isBody: true,
          },
        ],
      },
    ],
  },
});
```

### Step 4.3 — Add TinaCMS environment variables

```bash
# Add to .env
TINA_CLIENT_ID=get-from-app.tina.io
TINA_TOKEN=get-from-app.tina.io
GITHUB_BRANCH=main
```

### Step 4.4 — Add TinaCMS env vars to GitHub Actions

```yaml
# Add to .github/workflows/deploy.yml under env:
env:
  TINA_CLIENT_ID: ${{ secrets.TINA_CLIENT_ID }}
  TINA_TOKEN:     ${{ secrets.TINA_TOKEN }}
```

### Step 4.5 — Connect TinaCMS to your repo

```
1. Go to app.tina.io
2. Sign up (free)
3. Add new project → Connect to GitHub
4. Select orgzit/orgzit-blog
5. Copy Client ID and Token
6. Add to .env and GitHub Secrets
```

### Step 4.6 — Test Olivia's workflow

```
1. Go to app.tina.io
2. Log in as Olivia (invite her from TinaCMS dashboard)
3. Click New Post
4. Fill in title, content, categories, featured image, SEO fields
5. Set draft: false
6. Click Save
7. Watch GitHub Actions run
8. Post appears live at orgzit.com/blog/ in ~2 minutes
```

### Phase 4 done when
```
✓ Olivia can log into app.tina.io
✓ She can create a new post with all fields
✓ Clicking Save triggers a GitHub Actions build
✓ Post is live on the site within 3 minutes
✓ She can edit existing posts
```

---

## Phase 5 — SEO Hardening
### Goal: Better SEO than WordPress ever had
### Time: 3 days

### Step 5.1 — Pagefind search

```astro
---
// src/pages/search.astro
import BaseLayout from '@layouts/BaseLayout.astro';
import Navbar from '@components/layout/Navbar.astro';
import Footer from '@components/layout/Footer.astro';
---
<BaseLayout
  title="Search — Orgzit Blog"
  description="Search all articles on the Orgzit Blog."
  canonical="https://orgzit.com/blog/search/"
>
  <Navbar />
  <main id="main-content" class="max-w-3xl mx-auto px-6 py-16">
    <h1 class="text-2xl font-bold text-slate-900 mb-8">Search</h1>
    <div id="search"></div>
  </main>
  <Footer />
</BaseLayout>

<link href="/blog/pagefind/pagefind-ui.css" rel="stylesheet" />
<script>
  import('/blog/pagefind/pagefind-ui.js').then(({ PagefindUI }) => {
    new PagefindUI({
      element: '#search',
      showSubResults: true,
      excerptLength: 25,
      resetStyles: false,
    });
  });
</script>
```

### Step 5.2 — Newsletter CTA component

```astro
---
// src/components/ui/NewsletterCTA.astro
---
<section class="my-16 bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-10 text-center text-white">
  <h2 class="text-2xl font-bold mb-3">Get the latest CRM insights</h2>
  <p class="text-brand-100 mb-8 max-w-md mx-auto">
    Join 2,000+ business leaders reading Orgzit's weekly insights on CRM,
    productivity, and no-code tools.
  </p>
  <form
    id="newsletter-form"
    class="flex gap-3 max-w-sm mx-auto"
    onsubmit="handleSubmit(event)"
  >
    <input
      type="email"
      placeholder="your@email.com"
      required
      class="flex-1 px-4 py-3 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-white"
    />
    <button
      type="submit"
      class="bg-white text-brand-700 font-semibold px-5 py-3 rounded-lg text-sm hover:bg-brand-50 transition-colors"
    >
      Subscribe
    </button>
  </form>
  <p class="text-brand-200 text-xs mt-4">No spam. Unsubscribe anytime.</p>
</section>

<script>
  async function handleSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.querySelector('input[type=email]') as HTMLInputElement).value;

    // Replace with your ConvertKit or Mailchimp form ID
    const FORM_ID = 'YOUR_CONVERTKIT_FORM_ID';

    try {
      const res = await fetch(`https://api.convertkit.com/v3/forms/${FORM_ID}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: 'YOUR_CONVERTKIT_API_KEY',
          email,
        }),
      });
      if (res.ok) {
        form.innerHTML = '<p class="text-white font-semibold">✓ You\'re subscribed! Check your inbox.</p>';
      }
    } catch (err) {
      console.error(err);
    }
  }
  (window as any).handleSubmit = handleSubmit;
</script>
```

### Phase 5 done when
```
✓ Pagefind search returns relevant results
✓ Newsletter form submits successfully
✓ Google Rich Results Test passes on 5 sample posts
✓ Sitemap submitted to Google Search Console
✓ Lighthouse Performance >= 95 on all page types
```

---

## Phase 6 — Launch
### Goal: Go live. WordPress retired.
### Time: 2 days

### Pre-launch checklist

```bash
# Run this script to verify all old WordPress URLs exist on new site
node scripts/verify-urls.mjs

# The script should output:
# ✓ 200/200 URLs return 200 status
# ✓ 0 URLs return 404
```

### Step 6.1 — verify-urls.mjs script

```javascript
// scripts/verify-urls.mjs
import fetch from 'node-fetch';
import fs from 'fs-extra';

const BASE = 'https://orgzit-blog.pages.dev'; // your Cloudflare Pages URL
const posts = await fs.readdir('src/content/blog');

let ok = 0, fail = 0;

for (const file of posts) {
  const slug = file.replace('.md', '');
  const url = `${BASE}/blog/${slug}/`;
  const res = await fetch(url, { method: 'HEAD' });
  if (res.status === 200) {
    ok++;
    process.stdout.write('✓');
  } else {
    fail++;
    console.log(`\n✗ ${url} → ${res.status}`);
  }
}

console.log(`\n\n${ok} OK, ${fail} failed`);
```

### Step 6.2 — DNS cutover

```
Before switching (have this ready):
  WordPress still running at its current URL
  New site tested at Cloudflare Pages URL

Switch (takes 5 minutes):
  Cloudflare DNS → point orgzit.com/blog → Cloudflare Pages

Verify immediately after:
  1. Open https://orgzit.com/blog/ in incognito
  2. Open a sample post — check it loads
  3. Check sitemap: https://orgzit.com/blog/sitemap.xml
  4. Submit sitemap to Google Search Console

Rollback plan (if something breaks):
  Revert DNS → users back on WordPress in < 5 minutes
  WordPress content is untouched — nothing was deleted
```

### Step 6.3 — Shut down WordPress (30 days after launch)

```
Wait 30 days with no issues:
  ✓ Google Search Console shows no coverage errors
  ✓ All 200+ posts indexed
  ✓ Rankings stable or improving
  ✓ Olivia using TinaCMS successfully

Then:
  1. Final export: WordPress Admin → Tools → Export → Save to Drive
  2. Cancel WordPress hosting plan
  3. WordPress is retired permanently
```

---

## Complete Folder Structure (Final State)

```
orgzit-blog/
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── scripts/
│   ├── extract-wordpress.mjs    ← Phase 1 (run once, then archive)
│   └── verify-urls.mjs          ← Phase 6 (pre-launch check)
│
├── tina/
│   └── config.ts                ← TinaCMS configuration
│
├── public/
│   ├── blog-images/             ← all 500+ images from WordPress
│   │   ├── 3-3-1200x675.png
│   │   ├── 2-6-1024x576.png
│   │   └── ... (500+ files)
│   ├── robots.txt
│   ├── _headers                 ← Cloudflare cache rules
│   ├── _redirects               ← Cloudflare redirects
│   └── favicon.ico
│
├── src/
│   ├── content/
│   │   ├── config.ts            ← Astro content collections schema
│   │   ├── blog/
│   │   │   ├── manufacturers-reps-is-your-crm-more-of-a-hassle-than-a-help.md
│   │   │   ├── why-spreadsheets-could-be-holding-your-business-back.md
│   │   │   └── ... (200+ .md files)
│   │   └── data/
│   │       ├── categories.json
│   │       ├── tags.json
│   │       └── authors.json
│   │
│   ├── components/
│   │   ├── blog/
│   │   │   ├── BlogCard.astro
│   │   │   ├── BlogGrid.astro
│   │   │   ├── TableOfContents.astro
│   │   │   ├── ReadingProgress.astro
│   │   │   ├── RelatedPosts.astro
│   │   │   └── AuthorCard.astro
│   │   ├── ui/
│   │   │   ├── Navbar.astro
│   │   │   ├── Footer.astro
│   │   │   ├── Breadcrumb.astro
│   │   │   ├── Pagination.astro
│   │   │   ├── ShareButtons.astro
│   │   │   ├── NewsletterCTA.astro
│   │   │   └── SearchBar.astro
│   │   └── seo/
│   │       └── ArticleSchema.astro
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── BlogLayout.astro
│   │   └── ListingLayout.astro
│   │
│   ├── pages/
│   │   ├── index.astro              → /blog/
│   │   ├── [...page].astro          → /blog/page/2/, /blog/page/3/ etc
│   │   ├── [slug].astro             → /blog/[post-slug]/
│   │   ├── category/[cat].astro     → /blog/category/[cat]/
│   │   ├── tag/[tag].astro          → /blog/tag/[tag]/
│   │   ├── author/[author].astro    → /blog/author/[name]/
│   │   ├── search.astro             → /blog/search/
│   │   ├── sitemap.xml.ts           → /blog/sitemap.xml
│   │   └── rss.xml.ts               → /blog/rss.xml
│   │
│   ├── lib/
│   │   ├── readingTime.ts
│   │   ├── dates.ts
│   │   ├── toc.ts
│   │   └── related.ts
│   │
│   ├── types/
│   │   └── blog.ts
│   │
│   └── styles/
│       └── global.css
│
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── tina/config.ts
└── package.json
```

---

## Environment Variables Summary

```bash
# .env (never commit — add to .gitignore)

# WordPress extraction (Phase 1 only — remove after extraction done)
WP_API=https://orgzit.com/blog/wp-json/wp/v2

# TinaCMS (Phase 4 onwards)
TINA_CLIENT_ID=get-from-app.tina.io
TINA_TOKEN=get-from-app.tina.io
GITHUB_BRANCH=main
```

```
# GitHub Repository Secrets (Settings → Secrets → Actions)
CF_API_TOKEN      ← Cloudflare API token (Pages: Edit permission)
CF_ACCOUNT_ID     ← Cloudflare account ID
TINA_CLIENT_ID    ← TinaCMS client ID
TINA_TOKEN        ← TinaCMS token
```

---

## Phase Timeline Summary

```
Phase 0 — Pre-migration fixes          Week 1    (1 dev day)
Phase 1 — WordPress → Markdown         Week 1    (2–3 dev days)
Phase 2 — Build Astro site             Weeks 2–4 (main development)
Phase 3 — Deploy to Cloudflare         Week 4    (1 dev day)
Phase 4 — TinaCMS for writers          Week 5    (3 dev days)
Phase 5 — SEO hardening                Week 6    (3 dev days)
Phase 6 — Launch + retire WordPress    Week 7    (2 days)
─────────────────────────────────────────────────────
Total: 7 weeks. WordPress retired at end of Week 7.
```

---

## What You Have at the End

```
✓ WordPress: retired and shut down (saving $30-50/month)
✓ Content:   200+ posts as .md files in GitHub (version controlled)
✓ Writer:    Olivia uses TinaCMS visual editor (no code needed)
✓ New posts: written in browser, live in ~2 minutes after Save
✓ Site:      Astro static HTML on Cloudflare Pages
✓ Speed:     < 300ms page loads (from 2–5 seconds)
✓ SEO:       Article schema, FAQ schema, sitemap, all Yoast data migrated
✓ Search:    Pagefind full-text search across all 200+ posts
✓ Images:    All converted to WebP, served from Cloudflare CDN
✓ Security:  No PHP, no database, no attack surface
✓ Cost:      ~$0/month (all free tiers)
```