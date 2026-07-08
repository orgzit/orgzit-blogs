export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

export function isoDate(dateStr: string): string {
  return new Date(dateStr).toISOString();
}
