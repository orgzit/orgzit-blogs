import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const sorted = posts.sort((a, b) =>
    new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  return rss({
    title:       'Orgzit Blog',
    description: 'Practical insights on CRM, productivity, and no-code tools.',
    site:        'https://orgzit.com/blog',
    items: sorted.map(post => ({
      title:       post.data.title,
      description: post.data.excerpt,
      pubDate:     new Date(post.data.date),
      link:        `/blog/${post.slug}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
