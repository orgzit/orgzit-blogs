import type { Post } from '@app-types/blog';

export function getRelatedPosts(
  current: Post,
  all: Post[],
  limit = 3
): Post[] {
  return all
    .filter(p => p.slug !== current.slug && !p.draft)
    .map(post => {
      const sharedTags = post.tags.filter(t => current.tags.includes(t)).length;
      const sharedCats = post.categories.filter(c => current.categories.includes(c)).length;
      return { post, score: sharedTags * 2 + sharedCats };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ post }) => post);
}
