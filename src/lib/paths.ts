// Prefixes a root-relative path (e.g. "/blog-images/x.png") with the site's
// configured base path (import.meta.env.BASE_URL), so content can store
// clean paths that match TinaCMS's mediaRoot convention while the rendered
// site still resolves correctly under astro.config.mjs's `base: '/blog'`.
export function withBase(pathname: string): string {
  if (!pathname) return pathname;
  if (pathname.startsWith('http')) return pathname;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
