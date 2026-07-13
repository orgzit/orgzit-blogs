// scripts/fix-google-hosted-images.mjs
// Run ONCE with: node scripts/fix-google-hosted-images.mjs
// Google Docs-pasted images (lh*.googleusercontent.com) are temporary,
// permission-scoped links, not permanent public URLs. Most have already
// died (404); the rest are one Google-side change away from dying too.
// - Working ones: download locally into public/blog-images/, rewrite refs.
// - Dead ones: remove the broken image line entirely.

import fs from 'fs';
import https from 'https';

const dir = 'src/content/blog';
const destDir = 'public/blog-images';
fs.mkdirSync(destDir, { recursive: true });

const IMG_LINE_RE = /!\[([^\]]*)\]\((https:\/\/lh\d(?:-us)?\.googleusercontent\.com\/[A-Za-z0-9_-]+)\)/g;

function fetchStatusAndType(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ status: res.statusCode, contentType: res.headers['content-type'] || '' });
      res.resume();
    }).on('error', () => resolve({ status: 0, contentType: '' }));
  });
}

function download(url, destPath) {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) { file.close(); fs.unlinkSync(destPath); resolve(false); return; }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve(true)));
    }).on('error', () => { file.close(); if (fs.existsSync(destPath)) fs.unlinkSync(destPath); resolve(false); });
  });
}

function extFromContentType(ct) {
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif')) return 'gif';
  return 'jpg';
}

async function main() {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
  const urlInfo = new Map(); // url -> { status, localName } | { status: 404 }
  let removedCount = 0, localizedCount = 0, filesChanged = 0;

  for (const file of files) {
    const fullPath = `${dir}/${file}`;
    let content = fs.readFileSync(fullPath, 'utf8');
    const matches = [...content.matchAll(IMG_LINE_RE)];
    if (matches.length === 0) continue;

    let changed = false;

    for (const m of matches) {
      const [full, alt, url] = m;
      if (!urlInfo.has(url)) {
        process.stdout.write(`  checking ${url.slice(-12)}...`);
        const { status, contentType } = await fetchStatusAndType(url);
        if (status === 200) {
          const filename = `gdoc-${url.slice(-16).replace(/[^A-Za-z0-9]/g, '')}.${extFromContentType(contentType)}`;
          const ok = await download(url, `${destDir}/${filename}`);
          urlInfo.set(url, ok ? { status: 200, localName: filename } : { status: 0 });
          console.log(ok ? ` ✓ localized as ${filename}` : ' ✗ download failed');
        } else {
          urlInfo.set(url, { status });
          console.log(` ✗ dead (${status})`);
        }
      }

      const info = urlInfo.get(url);
      if (info.status === 200) {
        content = content.replace(full, `![${alt}](/blog/blog-images/${info.localName})`);
        localizedCount++;
        changed = true;
      } else {
        // remove the whole line (plus one trailing newline) to avoid leaving a blank gap
        content = content.replace(new RegExp(`^${full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\r?\\n?`, 'm'), '');
        removedCount++;
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(fullPath, content, 'utf8');
      filesChanged++;
      console.log(`✓ updated ${file}`);
    }
  }

  console.log(`\nDone. ${filesChanged} file(s) changed. ${localizedCount} image(s) localized, ${removedCount} dead reference(s) removed.`);
}

main();
