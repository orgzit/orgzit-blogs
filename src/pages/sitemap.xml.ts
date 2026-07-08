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
