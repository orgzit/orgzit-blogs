import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Dev-only: rewrites Tina Media Manager's thumbnail requests (missing the /blog
// base path) so previews work locally too, matching the public/_redirects fix used in production.
const tinaMediaBaseFix = {
  name: 'tina-media-base-fix',
  hooks: {
    'astro:server:setup': ({ server }) => {
      // prependListener runs before Vite/Astro's own request handler, so the
      // URL is rewritten in time for their router to see the corrected path.
      server.httpServer?.prependListener('request', (req) => {
        if (req.url && req.url.startsWith('/blog-images/')) {
          req.url = '/blog' + req.url;
        }
      });
    },
  },
};

export default defineConfig({
  site: 'https://orgzit.com',
  base: '/blog',
  trailingSlash: 'always',
  output: 'static',
  devToolbar: { enabled: false },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
    tinaMediaBaseFix,
  ],
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  build: {
    assets: 'assets',
  },
});
