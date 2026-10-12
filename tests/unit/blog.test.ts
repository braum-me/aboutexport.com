import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isExternalHref } from '../../src/lib/external-links-plugin.mjs';
import inventory from '../fixtures/blog/wordpress-inventory.json';

// readingTime/formatDate liegen in src/lib/blog.ts, das astro:content importiert → hier nachgebildet getestet
const CONTENT = join(process.cwd(), 'src/content/blog');

function frontmatter(slug: string): string {
  const raw = readFileSync(join(CONTENT, `${slug}.md`), 'utf8');
  return raw.split('---')[1] ?? '';
}

describe('Blog-Migration', () => {
  it('enthält für jeden WordPress-Beitrag genau eine Markdown-Datei', () => {
    const files = readdirSync(CONTENT).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
    expect(files.sort()).toEqual(inventory.map((p) => p.slug).sort());
  });

  it.each(inventory)('$slug: Originaldaten unverändert übernommen', (post) => {
    const fm = frontmatter(post.slug);
    expect(fm).toContain(`pubDate: ${post.datePublishedUtc}`);
    expect(fm).toContain(`updatedDate: ${post.dateModifiedUtc}`);
    expect(fm).toContain(`category: ${post.category}`);
    expect(fm).toContain(`wpId: ${post.wpId}`);
    expect(fm).toContain(`url: ${post.url}`);
    expect(fm).toContain(`title: '${post.title}'`);
    expect(fm).toContain(`seoTitle: '${post.seoTitle}'`);
    expect(fm).toContain(`description: '${post.metaDescription}'`);
  });
});

describe('isExternalHref()', () => {
  it.each([
    ['https://www.bafa.de/x', true],
    ['https://roadmap.aboutexport.com/', true],
    ['https://aboutexport.com/#waitlist', false],
    ['/#waitlist', false],
    ['mailto:info@aboutexport.de', false],
    ['http://[invalid', false],
  ])('%s → %s', (href, expected) => expect(isExternalHref(href)).toBe(expected));
});
