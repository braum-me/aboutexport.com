import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/** Veröffentlichte Beiträge (Entwürfe und Beiträge mit pubDate in der Zukunft ausgenommen), neueste zuerst. */
export async function getPosts(): Promise<Post[]> {
  const now = Date.now();
  const posts = await getCollection('blog', ({ data }) => !data.draft && data.pubDate.getTime() <= now);
  return posts.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export function postUrl(post: Post): string {
  // Ursprüngliche WordPress-Permalinks (/<slug>/) bleiben erhalten.
  return `/${post.id}/`;
}

const dateFmt = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });
const shortFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' });

export const formatDate = (d: Date): string => dateFmt.format(d);
export const formatDateShort = (d: Date): string => shortFmt.format(d);

/** Lesezeit in Minuten (≈ 200 Wörter/Minute), mindestens 1. */
export function readingTime(markdown: string): number {
  const words = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
