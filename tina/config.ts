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
      mediaRoot:    'blog-images',
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
            readonly: false,
            slugify:  (values: any) =>
              values?.slug ??
              values?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ??
              'new-post',
          },
          beforeSubmit: async ({ values }: { values: any }) => {
            const slug =
              values?.slug ??
              values?.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ??
              'new-post';
            return {
              ...values,
              canonicalUrl: values?.canonicalUrl || `https://orgzit.com/blog/${slug}/`,
            };
          },
        },

        fields: [
          { type: 'boolean', name: 'draft',    label: '🔒 Draft (hidden from site)',        description: 'Turn OFF to publish live' },
          { type: 'boolean', name: 'featured', label: '⭐ Featured Post',                   description: 'Shows as hero on homepage' },
          { type: 'string',  name: 'title',    label: 'Post Title',    isTitle: true, required: true },
          { type: 'string',  name: 'slug',     label: 'URL Slug',      required: true },
          { type: 'datetime',name: 'date',     label: 'Publish Date',  required: true, ui: { dateFormat: 'YYYY-MM-DD' } },
          { type: 'string',  name: 'excerpt',  label: 'Short Excerpt', ui: { component: 'textarea' } },
          {
            type:    'string',
            name:    'author',
            label:   'Author Name',
            required: true,
            options: ['Olivia Davis', 'Pavan Verma', 'Nitin Verma', 'Kartik Dulloo', 'Guest Blogger'],
          },
          { type: 'string', name: 'authorSlug', label: 'Author Slug', ui: { component: 'hidden' } },
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
          { type: 'string', name: 'tags',             label: 'Tags',                 list: true },
          { type: 'image',  name: 'featuredImage',    label: 'Featured Image',       description: 'Upload at 1200×675px (16:9)' },
          { type: 'string', name: 'featuredImageAlt', label: 'Featured Image Alt Text' },
          { type: 'string', name: 'seoTitle',         label: 'SEO Title',            description: 'Max 60 characters' },
          { type: 'string', name: 'seoDescription',   label: 'SEO Description',      description: '130–155 characters', ui: { component: 'textarea' } },
          { type: 'image',  name: 'ogImage',          label: 'Social Share Image',   description: '1200×630px' },
          { type: 'string', name: 'canonicalUrl',     label: 'Canonical URL',        ui: { component: 'hidden' } },
          { type: 'boolean',name: 'noIndex',          label: 'Hide from Google',     ui: { component: 'hidden' } },
          { type: 'string', name: 'twitterCard',      label: 'Twitter Card',         ui: { component: 'hidden' } },
          { type: 'rich-text', name: 'body',          label: 'Content', isBody: true },
        ],
      },
    ],
  },
});
