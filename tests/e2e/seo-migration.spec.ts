import { expect, test } from '@playwright/test';

// Alle URLs der bisherigen WordPress-Seite (Yoast-Sitemaps + interne Links, Stand Oktober 2026)
const ok = [
  '/',
  '/blog/',
  '/aboutexport-waitlist-early-access/',
  '/bafa-exportkontrolle-april-2026/',
  '/vision-export-compliance-monitoring/',
  '/category/news/',
  '/category/regulierung/',
  '/impressum/',
  '/datenschutz/',
  '/feed/',
  '/sitemap.xml',
  '/robots.txt',
];

const redirects: [string, string][] = [
  ['/blog', '/blog/'],
  ['/impressum', '/impressum/'],
  ['/aboutexport-waitlist-early-access', '/aboutexport-waitlist-early-access/'],
  ['/category/export-compliance/', '/blog/'],
  ['/category/maerkte-regionen/', '/blog/'],
  ['/author/aboutadmin/', '/blog/'],
  ['/Datenschutz', '/datenschutz/'],
  ['/cookie-richtlinie/', '/datenschutz/'],
  ['/comments/feed/', '/feed/'],
  ['/category/news/feed/', '/feed/'],
  ['/category/regulierung/feed/', '/feed/'],
  ['/author/aboutadmin/feed/', '/feed/'],
  ['/bafa-exportkontrolle-april-2026/feed/', '/feed/'],
  ['/sitemap_index.xml', '/sitemap.xml'],
  ['/post-sitemap.xml', '/sitemap.xml'],
  ['/page-sitemap.xml', '/sitemap.xml'],
  ['/wp-sitemap.xml', '/sitemap.xml'],
  ['/blog/page/2/', '/blog/'],
];

test.describe('SEO-Migration: alte WordPress-URLs', () => {
  test.skip(({ isMobile }) => isMobile, 'HTTP-Prüfung nur einmal');

  for (const path of ok) {
    test(`${path} → 200`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBe(200);
    });
  }

  for (const [from, to] of redirects) {
    test(`${from} → 301 ${to} (ein Schritt)`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(new URL(res.headers()['location']!, 'http://x').pathname).toBe(to);
      const target = await request.get(to, { maxRedirects: 0 });
      expect(target.status()).toBe(200);
    });
  }

  test('Sitemap enthält alle Artikel und keine Weiterleitungsziele', async ({ request }) => {
    const xml = await (await request.get('/sitemap.xml')).text();
    for (const path of ok.filter((p) => !/\.(xml|txt)$|^\/feed\/$/.test(p)))
      expect(xml).toContain(`https://aboutexport.com${path}`);
    expect(xml).not.toContain('/author/');
  });

  test('robots.txt verweist auf die Sitemap', async ({ request }) => {
    expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://aboutexport.com/sitemap.xml');
  });

  test('statische Seiten werden komprimiert ausgeliefert', async ({ request }) => {
    const res = await request.get('/', { headers: { 'accept-encoding': 'br, gzip' } });
    expect(res.headers()['content-encoding']).toBe('br');
    expect(res.headers()['vary']).toContain('Accept-Encoding');
  });
});
