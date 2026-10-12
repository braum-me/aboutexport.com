import { expect, test } from '@playwright/test';

test('alle internen Links und Anker sind erreichbar', async ({ page, request }) => {
  const visited = new Set<string>();
  const queue = ['/'];
  const checkedAnchors = new Set<string>();

  while (queue.length) {
    const path = queue.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);
    await page.goto(path);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') ?? ''));
    for (const href of hrefs) {
      if (href.startsWith('mailto:')) continue;
      expect(href.startsWith('http'), `Externer Link gefunden: ${href}`).toBe(false);
      const url = new URL(href, `http://127.0.0.1${path}`);
      if (url.hash && url.hash.length > 1) {
        const key = `${url.pathname}${url.hash}`;
        if (!checkedAnchors.has(key)) {
          checkedAnchors.add(key);
          if (url.pathname === path) {
            await expect(page.locator(url.hash), `Anker ${key}`).toHaveCount(1);
          } else {
            queue.push(url.pathname);
            const res = await request.get(url.pathname);
            expect(res.ok(), url.pathname).toBe(true);
            expect(await res.text(), `Anker ${key}`).toContain(`id="${url.hash.slice(1)}"`);
          }
        }
      }
      if (!visited.has(url.pathname)) {
        const res = await request.get(url.pathname);
        expect(res.status(), `${url.pathname} (von ${path})`).toBe(200);
        if (res.headers()['content-type']?.includes('text/html')) queue.push(url.pathname);
      }
    }
  }
  expect(visited).toContain('/impressum/');
  expect(visited).toContain('/datenschutz/');
});

test('SEO-Dateien und 404', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap: https://aboutexport.com/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  for (const p of ['/', '/impressum/', '/datenschutz/']) expect(xml).toContain(`<loc>https://aboutexport.com${p}</loc>`);
  const missing = await request.get('/gibt-es-nicht/');
  expect(missing.status()).toBe(404);
});

test('strukturierte Daten sind gültiges JSON', async ({ page }) => {
  await page.goto('/');
  const blocks = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => x.textContent ?? ''));
  expect(blocks.length).toBeGreaterThanOrEqual(3);
  const types = blocks.map((b) => JSON.parse(b)['@type']);
  expect(types).toEqual(expect.arrayContaining(['Organization', 'WebSite', 'FAQPage']));
});
