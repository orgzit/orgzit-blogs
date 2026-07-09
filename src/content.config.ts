import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title:            z.string(),
    slug:             z.string().optional(),
    date:             z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()),
    updatedDate:      z.preprocess((v) => (v instanceof Date ? v.toISOString() : v), z.string()).optional(),
    author:           z.string(),
    authorSlug:       z.string(),
    authorAvatar:     z.string().optional(),
    authorBio:        z.string().optional(),
    categories:       z.array(z.string()).default([]),
    tags:             z.array(z.string()).default([]),
    featuredImage:    z.string().default(''),
    featuredImageAlt: z.string().default(''),
    excerpt:          z.string(),
    seoTitle:         z.string(),
    seoDescription:   z.string(),
    ogImage:          z.string().optional(),
    twitterCard:      z.string().default('summary_large_image'),
    noIndex:          z.boolean().default(false),
    canonicalUrl:     z.string(),
    draft:            z.boolean().default(false),
    featured:         z.boolean().default(false),
  }),
});

export const collections = { blog };
