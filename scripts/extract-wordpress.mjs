// scripts/extract-wordpress.mjs
// Run ONCE with: npm run extract-wp
// Extracts all WordPress posts to Markdown files in src/content/blog/

import fetch from 'node-fetch';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import fs from 'fs-extra';
import path from 'path';
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = process.env.WP_API || 'https://orgzit.com/blog/wp-json/wp/v2';

// ─── AUTHOR FALLBACK ───────────────────────────────────────────
// Wordfence blocks the /wp/v2/users endpoint for unauthenticated requests
// (rest_user_cannot_view), so real author data can't be fetched from the
// API. These IDs come directly from WP Admin → Users and must match each
// post's numeric `author` field for attribution to work.
function gravatarUrl(email) {
  const hash = crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?s=96&d=identicon`;
}

const FALLBACK_AUTHORS = [
  {
    id: 1, slug: 'pavan', name: 'Pavan Verma',
    description: "Pavan is the CTO of Orgzit. When not hacking code or helping customers, Pavan loves to listen to different kinds of music and travel with his 8-year old son and 1-year old daughter. Talk with Pavan on <a href=\"https://twitter.com/yinyangpavan\">Twitter</a> and connect with him on <a href=\"https://in.linkedin.com/in/pavanv0\">LinkedIn</a>.",
    avatar_urls: { '96': gravatarUrl('pavan@orgzit.com') },
  },
  { id: 2,  slug: 'nitin',       name: 'Nitin Verma',     description: '', avatar_urls: { '96': gravatarUrl('nitin@orgzit.com') } },
  { id: 5,  slug: 'kartik',      name: 'Kartik Dulloo',   description: '', avatar_urls: { '96': gravatarUrl('kartik@p3infotech.in') } },
  { id: 19, slug: 'orgzit-guest-blogger', name: 'Guest Blogger', description: '', avatar_urls: { '96': gravatarUrl('nitinv8@gmail.com') } },
  { id: 29, slug: 'olivia_davis', name: 'Olivia Davis',   description: '', avatar_urls: { '96': gravatarUrl('marketing@orgzit.com') } },
];

// ─── TURNDOWN CONFIG ──────────────────────────────────────────
const td = new TurndownService({
  headingStyle:    'atx',
  bulletListMarker:'-',
  codeBlockStyle:  'fenced',
  hr:              '---',
});
td.use(gfm);

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
    .replace(/<div[^>]*(?:id="ez-toc-container"|class="[^"]*ez-toc[^"]*")[^>]*>[\s\S]*?<\/div>\s*(?:<\/div>\s*){1,3}/gi, '')
    .replace(/\s+class="[^"]*(?:wp-block|has-text-color|has-medium-font-size|has-large-font-size|is-layout|wp-image|aligncenter|alignleft|alignright)[^"]*"/gi, '')
    .replace(/<figure[^>]*>/gi, '')
    .replace(/<\/figure>/gi, '')
    .replace(/<figcaption[^>]*>.*?<\/figcaption>/gi, '')
    .replace(/<p[^>]*>\s*(&nbsp;)?\s*<\/p>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\[caption[^\]]*\]|\[\/caption\]/gi, '')
    .trim();
}

// ─── HTML ENTITY DECODER ──────────────────────────────────────
function decodeEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// ─── IMAGE DOWNLOADER ─────────────────────────────────────────
async function downloadImage(url, destPath) {
  if (!url || !url.startsWith('http')) return false;
  await fs.ensureDir(path.dirname(destPath));
  if (await fs.pathExists(destPath)) return true;
  const client = url.startsWith('https') ? https : http;
  return new Promise((resolve) => {
    try {
      const file = fs.createWriteStream(destPath);
      client.get(url, (res) => {
        if (res.statusCode !== 200) { resolve(false); return; }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(true)));
      }).on('error', () => resolve(false));
    } catch {
      resolve(false);
    }
  });
}

// ─── IMAGE URL REWRITER ───────────────────────────────────────
function rewriteImageUrls(markdown) {
  return markdown.replace(
    /!\[([^\]]*)\]\((https?:\/\/orgzit\.com\/blog\/wp-content\/uploads\/[^)]+)\)/g,
    (match, alt, url) => {
      const filename = path.basename(url.split('?')[0]);
      return `![${alt}](/blog/blog-images/${filename})`;
    }
  );
}

// ─── FRONTMATTER BUILDER ──────────────────────────────────────
function buildFrontmatter(post, authors) {
  const author   = authors.find(a => a.id === post.author);
  const allTerms = post._embedded?.['wp:term'] ?? [];
  const categories = (allTerms[0] ?? []).map(t => decodeEntities(t.name));
  const tags       = (allTerms[1] ?? []).map(t => decodeEntities(t.name));
  const media      = post._embedded?.['wp:featuredmedia']?.[0];
  const y          = post.yoast_head_json ?? {};
  const featuredImageUrl = media?.source_url ?? '';
  const featuredFilename = featuredImageUrl ? path.basename(featuredImageUrl.split('?')[0]) : '';

  return {
    title:            decodeEntities(post.title.rendered),
    slug:             post.slug,
    date:             post.date.split('T')[0],
    updatedDate:      post.modified.split('T')[0],
    author:           author?.name ?? 'Orgzit',
    authorSlug:       author?.slug ?? 'orgzit',
    authorBio:        (author?.description ?? '').replace(/"/g, '\\"'),
    authorAvatar:     author?.avatar_urls?.['96'] ?? '',
    categories,
    tags,
    featuredImage:    featuredFilename ? `/blog/blog-images/${featuredFilename}` : '',
    featuredImageAlt: media?.alt_text ?? decodeEntities(post.title.rendered),
    excerpt:          decodeEntities(post.excerpt.rendered.replace(/<[^>]+>/g, '').trim()).substring(0, 200),
    seoTitle:         decodeEntities(y.title ?? post.title.rendered),
    seoDescription:   decodeEntities(y.description ?? ''),
    ogImage:          y.og_image?.[0]?.url
      ? `/blog/blog-images/${path.basename(y.og_image[0].url.split('?')[0])}`
      : (featuredFilename ? `/blog/blog-images/${featuredFilename}` : ''),
    twitterCard:      y.twitter_card ?? 'summary_large_image',
    noIndex:          y.robots?.index === 'noindex',
    canonicalUrl:     post.link,
    draft:            false,
    featured:         false,
  };
}

// ─── YAML FRONTMATTER SERIALIZER ──────────────────────────────
function toYAML(fm) {
  const esc = (s) => String(s).replace(/"/g, '\\"');
  const arr = (a) => a.length === 0 ? '[]' : '\n' + a.map(v => `  - "${esc(v)}"`).join('\n');
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
  const separator = endpoint.includes('?') ? '&' : '?';
  while (true) {
    const url = `${API}/${endpoint}${separator}per_page=100&page=${page}&_embed=true`;
    console.log(`  Fetching: ${url}`);
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`  ⚠ ${url} → ${res.status}`);
      break;
    }
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

  await fs.ensureDir('src/content/blog');
  await fs.ensureDir('src/content/data');
  await fs.ensureDir('public/blog-images');

  console.log('Step 1: Fetching WordPress data...');
  const posts           = await fetchAll('posts?status=publish');
  const rawCategories   = await fetchAll('categories?hide_empty=true');
  const rawTags         = await fetchAll('tags?hide_empty=true');
  const categories = rawCategories.map(c => ({ ...c, name: decodeEntities(c.name) }));
  const tags       = rawTags.map(t => ({ ...t, name: decodeEntities(t.name) }));
  let authors = await fetchAll('users');
  if (authors.length === 0) {
    console.log('  ⚠ /users endpoint blocked (Wordfence) — using hardcoded author fallback');
    authors = FALLBACK_AUTHORS;
  }
  console.log(`  ✓ ${posts.length} posts, ${categories.length} categories, ${tags.length} tags, ${authors.length} authors\n`);

  await fs.writeJSON('src/content/data/categories.json', categories, { spaces: 2 });
  await fs.writeJSON('src/content/data/tags.json',       tags,       { spaces: 2 });
  await fs.writeJSON('src/content/data/authors.json',    authors,    { spaces: 2 });
  console.log('Step 2: Saved reference data ✓\n');

  console.log('Step 3: Converting posts to Markdown...');
  let imageCount = 0, errorCount = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    process.stdout.write(`  [${i + 1}/${posts.length}] ${post.slug.substring(0, 55)}...`);

    try {
      const fm = buildFrontmatter(post, authors);

      if (fm.featuredImage) {
        const originalUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
        const destPath = `public/blog-images/${path.basename(fm.featuredImage)}`;
        if (originalUrl && await downloadImage(originalUrl, destPath)) imageCount++;
      }

      if (post.yoast_head_json?.og_image?.[0]?.url) {
        const ogUrl      = post.yoast_head_json.og_image[0].url;
        const ogFilename = path.basename(ogUrl.split('?')[0]);
        await downloadImage(ogUrl, `public/blog-images/${ogFilename}`);
      }

      const cleanedHTML = cleanHTML(post.content.rendered);
      let markdown = td.turndown(cleanedHTML);

      const imgUrls = [...new Set(cleanedHTML.match(/https?:\/\/orgzit\.com\/blog\/wp-content\/uploads\/[^\s"')>]+/g) ?? [])];
      for (const imgUrl of imgUrls) {
        const filename = path.basename(imgUrl.split('?')[0]);
        if (await downloadImage(imgUrl, `public/blog-images/${filename}`)) imageCount++;
      }
      markdown = rewriteImageUrls(markdown);

      await fs.writeFile(`src/content/blog/${post.slug}.md`, `${toYAML(fm)}\n\n${markdown}\n`, 'utf8');
      process.stdout.write(' ✓\n');
    } catch (err) {
      process.stdout.write(` ✗ ${err.message}\n`);
      errorCount++;
    }
  }

  console.log(`\n==========================================`);
  console.log(`✅ Done! ${posts.length - errorCount} posts saved, ${errorCount} errors, ${imageCount} images downloaded`);
  console.log(`\nNext: git add . && git commit -m "feat: import WordPress content"`);
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
