import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import inventory from '../fixtures/blog/wordpress-inventory.json' with { type: 'json' };

const fixtureText = (slug: string) =>
  readFileSync(join(process.cwd(), 'tests/fixtures/blog', `${slug}.txt`), 'utf8').trim();
const source = (slug: string) => readFileSync(join(process.cwd(), 'src/content/blog', `${slug}.md`), 'utf8');

/** Aktuelles Änderungsdatum und dokumentierte Korrekturen aus dem Frontmatter */
function meta(slug: string) {
  const raw = source(slug);
  const updated = raw.match(/^updatedDate: (\S+)$/m)![1]!;
  const changes = [...raw.matchAll(/- from: '((?:[^']|'')*)'\n\s+to: '((?:[^']|'')*)'/g)].map((m) =>
    [m[1]!, m[2]!].map((x) => x.replace(/''/g, "'").replace(/^<|>$/g, '')),
  ) as [string, string][];
  return { updated: new Date(updated).toISOString(), changes };
}

/** Original-Klartext mit angewendeten, dokumentierten Korrekturen */
function expectedText(slug: string): string {
  return meta(slug).changes.reduce((t, [from, to]) => t.replace(from, to), fixtureText(slug));
}
const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

test.describe('Blog-Artikel unter Original-URLs', () => {
  for (const post of inventory) {
    const path = new URL(post.url).pathname;

    test(`${path}: Rendering, Metadaten und Inhaltstreue`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

      const res = await page.goto(path, { waitUntil: 'networkidle' });
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(post.title);
      await expect(page).toHaveTitle(post.seoTitle);

      // SEO
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', post.url);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', post.metaDescription);
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
      await expect(page.locator('meta[property="article:published_time"]')).toHaveAttribute(
        'content',
        new Date(post.datePublishedUtc).toISOString(),
      );
      const { updated, changes } = meta(post.slug);
      await expect(page.locator('meta[property="article:modified_time"]')).toHaveAttribute('content', updated);
      const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(ogImage).toMatch(/^https:\/\/aboutexport\.com\/images\/blog\/.+-og\.jpg$/);

      // Strukturierte Daten
      const ld = (await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => x.textContent ?? ''))).map(
        (x) => JSON.parse(x),
      );
      const article = ld.find((x) => x['@type'] === 'BlogPosting');
      expect(article).toBeTruthy();
      expect(article.headline).toBe(post.title);
      expect(article.datePublished).toBe(new Date(post.datePublishedUtc).toISOString());
      expect(article.dateModified).toBe(updated);
      expect(article.mainEntityOfPage['@id']).toBe(post.url);
      expect(ld.some((x) => x['@type'] === 'BreadcrumbList')).toBe(true);

      // Originaldatum sichtbar
      await expect(page.locator('[data-pubdate]')).toHaveAttribute('datetime', new Date(post.datePublishedUtc).toISOString());

      // Inhalt = WordPress-Original + ausschließlich dokumentierte Korrekturen
      const body = await page.locator('[data-article-body]').innerText();
      expect(norm(body)).toBe(norm(expectedText(post.slug)));

      // Korrekturen transparent ausgewiesen, interne Prüfhinweise nicht öffentlich
      await expect(page.locator('[data-corrections]')).toHaveCount(changes.length > 0 ? 1 : 0);
      await expect(page.locator('[data-review-note], [data-review-notes]')).toHaveCount(0);

      // Kontext-Hinweis: historisch vs. Produktnews
      const expected = post.category === 'regulierung' ? 'historical' : 'archive';
      await expect(page.locator(`[data-context-notice="${expected}"]`)).toBeVisible();

      // Waitlist-CTA am Ende
      const cta = page.locator('[data-article-cta]');
      await expect(cta).toBeVisible();
      await expect(cta.getByRole('link', { name: /Early Access sichern/ })).toHaveAttribute('href', '/#waitlist');

      // Externe Links sicher
      for (const link of await page.locator('[data-article-body] a[href^="http"]').all()) {
        await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        await expect(link).toHaveAttribute('target', '_blank');
      }

      // Interne Verlinkung: Brotkrumen + weitere Beiträge
      await expect(page.getByRole('navigation', { name: 'Brotkrumen' }).getByRole('link', { name: 'Blog' })).toHaveAttribute(
        'href',
        '/blog/',
      );
      await expect(page.locator('#related-title')).toBeVisible();

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('Regulierungsmeldung ist als historisch gekennzeichnet', async ({ page }) => {
    await page.goto('/bafa-exportkontrolle-april-2026/');
    const notice = page.locator('[data-context-notice="historical"]');
    await expect(notice).toContainText('Historische Regulierungsmeldung');
    await expect(notice).toContainText('4. April 2026');
  });

  test('Korrigierter Produktbeitrag: Originaldatum + transparente Aktualisierung', async ({ page }) => {
    await page.goto('/aboutexport-waitlist-early-access/');
    await expect(page.locator('[data-pubdate]')).toHaveText('4. April 2026');
    const corr = page.locator('[data-corrections]');
    await expect(corr).toContainText('Nachträglich aktualisiert');
    await expect(corr).toContainText('pro Region');
    await expect(corr).toContainText('Ursprünglich veröffentlicht am 4. April 2026');
    const body = page.locator('[data-article-body]');
    await expect(body).toContainText('Jede Region kostet 49 € pro Monat und kann');
    await expect(body).not.toContainText('pro Monat und Nutzer');
    await expect(body).toContainText('info@aboutexport.com');
    await expect(body).not.toContainText('aboutexport.de');
    await expect(body).toContainText('der Launch ist für 2027 geplant');
    // Nicht bestätigte Konditionen sind neutralisiert
    await expect(body).not.toContainText('dauerhaft');
    await expect(body).not.toContainText('ersten Anmeldungen');
    await expect(body).not.toContainText('14 Tage');
  });

  test('Regulierungsmeldung: Produktabsatz ohne Echtzeit-Zusage, Korrektur ausgewiesen', async ({ page }) => {
    await page.goto('/bafa-exportkontrolle-april-2026/');
    await expect(page.locator('[data-pubdate]')).toHaveText('4. April 2026');
    await expect(page.locator('[data-corrections]')).toContainText('regulatorischen Inhalte sind unverändert');
    const body = page.locator('[data-article-body]');
    await expect(body).not.toContainText('Alerts in Echtzeit');
    await expect(body).not.toContainText('stellt sicher');
    await expect(body).toContainText('Sanktions-Compliance-Erklärung');
  });
});

test.describe('Blog-Übersicht und Kategorien', () => {
  test('/blog/ listet alle Beiträge, neueste zuerst', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.locator('h1')).toHaveText('Blog');
    const cards = page.locator('[data-post-card]');
    await expect(cards).toHaveCount(inventory.length);
    const newestFirst = [...inventory].sort((a, b) => b.datePublishedUtc.localeCompare(a.datePublishedUtc));
    await expect(cards.first().getByRole('heading')).toHaveText(newestFirst[0]!.title);
    for (const p of inventory) {
      await expect(page.getByRole('link', { name: p.title })).toHaveAttribute('href', new URL(p.url).pathname);
    }
  });

  for (const [slug, label] of [
    ['news', 'Produktnews'],
    ['regulierung', 'Regulierung & Recht'],
  ] as const) {
    test(`/category/${slug}/ filtert korrekt`, async ({ page }) => {
      const res = await page.goto(`/category/${slug}/`);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveText(label);
      await expect(page.locator('[data-post-card]')).toHaveCount(inventory.filter((p) => p.category === slug).length);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://aboutexport.com/category/${slug}/`);
    });
  }

  test('Startseite zeigt Blog-Teaser und Blog in der Navigation', async ({ page, isMobile }) => {
    await page.goto('/');
    const teaser = page.locator('#blog');
    await expect(teaser.locator('[data-post-card]')).toHaveCount(Math.min(3, inventory.length));
    await expect(teaser.getByRole('link', { name: /Alle Beiträge/ })).toHaveAttribute('href', '/blog/');
    if (!isMobile) {
      await expect(page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Blog' })).toHaveAttribute(
        'href',
        '/blog/',
      );
    }
  });
});

test.describe('Redirects, Sitemap und Feed', () => {
  const redirects: [string, string][] = [
    ['/category/export-compliance/', '/blog/'],
    ['/category/maerkte-regionen/', '/blog/'],
    ['/author/aboutadmin/', '/blog/'],
    ['/Datenschutz/', '/datenschutz/'],
    ['/bafa-exportkontrolle-april-2026', '/bafa-exportkontrolle-april-2026/'],
    ['/blog', '/blog/'],
  ];
  for (const [from, to] of redirects) {
    test(`301 ${from} → ${to}`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(new URL(res.headers()['location']!, 'http://x').pathname).toBe(to);
    });
  }

  test('Sitemap enthält Blog, Kategorien und Beiträge mit Original-Änderungsdatum', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    for (const p of inventory) {
      expect(xml).toContain(`<url><loc>${p.url}</loc><lastmod>${meta(p.slug).updated}</lastmod></url>`);
    }
    for (const path of ['/blog/', '/category/news/', '/category/regulierung/']) {
      expect(xml).toContain(`<loc>https://aboutexport.com${path}</loc>`);
    }
    expect(xml).not.toContain('/author/');
  });

  test('RSS-Feed unter /feed/', async ({ request }) => {
    const res = await request.get('/feed/');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/rss+xml');
    const xml = await res.text();
    for (const p of inventory) {
      expect(xml).toContain(`<link>${p.url}</link>`);
      expect(xml).toContain(`<pubDate>${new Date(p.datePublishedUtc).toUTCString()}</pubDate>`);
    }
  });
});
