// Matches WordPress's own slug convention: strips punctuation entirely
// (rather than converting it to hyphens) before collapsing whitespace.
// e.g. "Tips & Tricks" -> "tips-tricks", matching the real WP category
// slug, instead of "tips-&-tricks" which no post ever actually has.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
