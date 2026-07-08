export interface Post {
  slug:             string;
  title:            string;
  date:             string;
  updatedDate?:     string;
  author:           string;
  authorSlug:       string;
  authorAvatar?:    string;
  authorBio?:       string;
  categories:       string[];
  tags:             string[];
  featuredImage:    string;
  featuredImageAlt: string;
  excerpt:          string;
  seoTitle:         string;
  seoDescription:   string;
  ogImage?:         string;
  twitterCard:      string;
  noIndex:          boolean;
  canonicalUrl:     string;
  draft:            boolean;
  featured:         boolean;
  readingTime:      number;
  body?:            string;
}
