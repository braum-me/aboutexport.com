import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isExternalHref } from '../../src/lib/external-links-plugin.mjs';
import inventory from '../fixtures/blog/wordpress-inventory.json';
import republished from '../fixtures/blog/republished.json';

// readingTime/formatDate liegen in src/lib/blog.ts, das astro:content importiert → hier nachgebildet getestet
const CONTENT = join(process.cwd(), 'src/content/blog');

function frontmatter(slug: string): string {
  const raw = readFileSync(join(CONTENT, `${slug}.md`), 'utf8');
  return raw.split('---')[1] ?? '';
}

describe('Blog-Migration', () => {
  it('enthält für jeden WordPress-Beitrag genau eine Markdown-Datei', () => {
    const files = readdirSync(CONTENT).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
    const slugs = inventory.map((p) => p.slug);
    // Alle WordPress-Beiträge sind vorhanden; weitere Beiträge sind neu verfasst (ohne legacy-Block)
    for (const slug of slugs) expect(files).toContain(slug);
    for (const extra of files.filter((f) => !slugs.includes(f))) expect(frontmatter(extra)).not.toContain('legacy:');
  });

  it.each(inventory)('$slug: Originaldaten erhalten, neues Veröffentlichungsdatum gesetzt', (post) => {
    const fm = frontmatter(post.slug);
    expect(fm).toContain(`pubDate: ${(republished as Record<string, string>)[post.slug]}`);
    expect(fm).toContain(`publishedDate: ${post.datePublishedUtc}`);
    const updated = fm.match(/^updatedDate: (\S+)$/m)?.[1];
    if (fm.includes('corrections:')) {
      // Nach Korrekturen: WordPress-Änderungsdatum bleibt dokumentiert, updatedDate liegt danach
      expect(fm).toContain(`modifiedDate: ${post.dateModifiedUtc}`);
      expect(new Date(updated!).getTime()).toBeGreaterThan(new Date(post.dateModifiedUtc).getTime());
      // Änderung nie vor der Veröffentlichung
      expect(new Date(updated!).getTime()).toBeGreaterThanOrEqual(new Date((republished as Record<string, string>)[post.slug]!).getTime());
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
