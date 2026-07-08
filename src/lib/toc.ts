export interface TOCItem {
  level: 2 | 3;
  text:  string;
  id:    string;
}

export function extractTOC(html: string): TOCItem[] {
  const items: TOCItem[] = [];
  const regex = /<h([23])[^>]*id="([^"]+)"[^>]*>(.*?)<\/h[23]>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    items.push({
      level: parseInt(match[1]) as 2 | 3,
      id:    match[2],
      text:  match[3].replace(/<[^>]+>/g, ''),
    });
  }
  return items;
}

export function addHeadingIds(html: string): string {
  return html.replace(
    /<(h[23])([^>]*)>(.*?)<\/h[23]>/gi,
    (match, tag, attrs, content) => {
      if (attrs.includes('id=')) return match;
      const text = content.replace(/<[^>]+>/g, '');
      const id = text.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      return `<${tag}${attrs} id="${id}">${content}</${tag}>`;
    }
  );
}
