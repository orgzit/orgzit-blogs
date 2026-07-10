// scripts/localize-old-domain-images.mjs
// Run ONCE with: node scripts/localize-old-domain-images.mjs
// Downloads images still hotlinked from the old blog.orgzit.com WordPress
// site into public/blog-images/, and rewrites post bodies to reference the
// local copy — removing the live dependency on the old site.

import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

const dir = 'src/content/blog';
const destDir = 'public/blog-images';
fs.mkdirSync(destDir, { recursive: true });

const IMG_RE = /\((https?:\/\/(?:blog\.orgzit\.com\/wp-content|orgzit\.com\/blog\/wp-content)\/uploads\/[^\s)]+)\)/gi;

function downloadImage(url, destPath) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    client.get(url, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        resolve(false);
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(true)));
    }).on('error', () => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      resolve(false);
    });
  });
}

async function main() {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  const downloaded = new Map(); // url -> local filename (or false on failure)
  let filesChanged = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    const matches = [...content.matchAll(IMG_RE)];
    if (matches.length === 0) continue;

    let changed = false;
    for (const m of matches) {
      const [full, url] = m;
      if (!downloaded.has(url)) {
        const filename = path.basename(url.split('?')[0]);
        const destPath = path.join(destDir, filename);
        if (fs.existsSync(destPath)) {
          downloaded.set(url, filename);
        } else {
          process.stdout.write(`  downloading ${filename}...`);
          const ok = await downloadImage(url, destPath);
          console.log(ok ? ' ✓' : ' ✗ FAILED');
          downloaded.set(url, ok ? filename : false);
        }
      }
      const filename = downloaded.get(url);
      if (filename) {
        content = content.replace(full, `(/blog/blog-images/${filename})`);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(fullPath, content, 'utf8');
      filesChanged++;
      console.log(`✓ rewrote ${file}`);
    }
  }

  const failed = [...downloaded.entries()].filter(([, v]) => v === false);
  console.log(`\nDone. ${filesChanged} file(s) rewritten. ${downloaded.size - failed.length} image(s) localized.`);
  if (failed.length) {
    console.log(`\n⚠ ${failed.length} image(s) failed to download (left pointing at old domain):`);
    failed.forEach(([url]) => console.log('  ' + url));
  }
}

main();
