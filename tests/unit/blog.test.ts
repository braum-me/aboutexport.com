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

  it.each(inventory)('$slug: Originaldaten erhalten', (post) => {
    const fm = frontmatter(post.slug);
    expect(fm).toContain(`pubDate: ${post.datePublishedUtc}`);
    const updated = fm.match(/^updatedDate: (\S+)$/m)?.[1];
    if (fm.includes('corrections:')) {
      // Nach Korrekturen: WordPress-Änderungsdatum bleibt dokumentiert, updatedDate liegt danach
      expect(fm).toContain(`modifiedDate: ${post.dateModifiedUtc}`);
      expect(new Date(updated!).getTime()).toBeGreaterThan(new Date(post.dateModifiedUtc).getTime());
    } else {
      expect(updated).toBe(post.dateModifiedUtc);
    }
    expect(fm).toContain(`category: ${post.category}`);
    expect(fm).toContain(`wpId: ${post.wpId}`);
    expect(fm).toContain(`url: ${post.url}`);
    expect(fm).toContain(`title: '${post.title}'`);
    expect(fm).toContain(`seoTitle: '${post.seoTitle}'`);
    expect(fm).toContain(`description: '${post.metaDescription}'`);
  });
});

describe('Korrekturen', () => {
  it.each(inventory)('$slug: jede Korrektur ist im Original belegt und im Text umgesetzt', (post) => {
    const raw = readFileSync(join(CONTENT, `${post.slug}.md`), 'utf8');
    const original = readFileSync(join(process.cwd(), 'tests/fixtures/blog', `${post.slug}.txt`), 'utf8');
    const body = raw.slice(raw.indexOf('\n---\n', 4) + 5);
    const pairs = [...raw.matchAll(/- from: '((?:[^']|'')*)'\n\s+to: '((?:[^']|'')*)'/g)].map((m) => [
      m[1]!.replace(/''/g, "'"),
      m[2]!.replace(/''/g, "'"),
    ]);
    const plain = (s: string) => s.replace(/^<|>$/g, '');
    for (const [from, to] of pairs) {
      expect(original).toContain(plain(from!));
      expect(body).toContain(to!);
      expect(body).not.toContain(from!);
    }
  });

  it('regulatorischer Beitrag: nur der abschließende Produktabsatz ist korrigiert', () => {
    const slug = 'bafa-exportkontrolle-april-2026';
    const raw = readFileSync(join(CONTENT, `${slug}.md`), 'utf8');
    const original = readFileSync(join(process.cwd(), 'tests/fixtures/blog', `${slug}.txt`), 'utf8');
    const productSection = original.indexOf('Echtzeit-Monitoring als Antwort');
    expect(productSection).toBeGreaterThan(0);
    const froms = [...raw.matchAll(/- from: '((?:[^']|'')*)'/g)].map((m) => m[1]!.replace(/''/g, "'"));
    expect(froms.length).toBeGreaterThan(0);
    for (const from of froms) expect(original.indexOf(from)).toBeGreaterThanOrEqual(productSection);
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
