import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(process.cwd(), 'src/content/blog');
const field = (fm: string, key: string) => fm.match(new RegExp(`^${key}: '?(.*?)'?$`, 'm'))?.[1];

export interface SitePost {
  slug: string;
  title: string;
  category: string;
  pubDate: string;
  updated: string;
  draft: boolean;
  /** true, wenn der Beitrag nicht aus WordPress stammt */
  native: boolean;
}

/** Alle Beiträge aus src/content/blog (Frontmatter), unabhängig von der Sichtbarkeit. */
export function allSitePosts(): SitePost[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const fm = readFileSync(join(DIR, f), 'utf8').split('---')[1] ?? '';
      const pubDate = new Date(field(fm, 'pubDate')!).toISOString();
      const updated = field(fm, 'updatedDate');
      return {
        slug: f.replace(/\.md$/, ''),
        title: field(fm, 'title')!.replace(/''/g, "'"),
        category: field(fm, 'category')!,
        pubDate,
        updated: updated ? new Date(updated).toISOString() : pubDate,
        draft: field(fm, 'draft') === 'true',
        native: !fm.includes('legacy:'),
      };
    });
}

/** Beiträge, die zum Build-Zeitpunkt sichtbar sind (kein Entwurf, pubDate nicht in der Zukunft), neueste zuerst. */
export function visibleSitePosts(now = Date.now()): SitePost[] {
  return allSitePosts()
    .filter((p) => !p.draft && new Date(p.pubDate).getTime() <= now)
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate));
}
