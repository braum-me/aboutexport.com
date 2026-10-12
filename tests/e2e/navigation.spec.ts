import { expect, test } from '@playwright/test';

const pages = ['/', '/impressum/', '/datenschutz/', '/blog/', '/category/news/'];

test.describe('Seitenstruktur', () => {
  for (const path of pages) {
    test(`${path}: genau eine H1, keine Konsolenfehler, kein horizontaler Overflow`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(/AboutExport/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://aboutexport.com${path}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors, errors.join('\n')).toEqual([]);
    });
  }

  test('Hero zeigt Kernbotschaft, Launch-Hinweis und Platzhalter-Kennzeichnung', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Export Compliance.');
    await expect(page.getByText('Geplanter Launch 2027').first()).toBeVisible();
    await expect(page.locator('[data-screenshot="placeholder"]').first()).toContainText('Konzeptdarstellung');
  });

  test('Security-Header werden gesetzt', async ({ request }) => {
    const res = await request.get('/');
    expect(res.headers()['x-content-type-options']).toBe('nosniff');
    expect(res.headers()['x-frame-options']).toBe('DENY');
    expect(res.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(res.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});

test.describe('Navigation', () => {
  test('Desktop-Navigation springt zu den Sektionen', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop only');
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
    for (const [label, id] of [
      ['Features', 'features'],
      ['Preise', 'preise'],
      ['ROI-Rechner', 'roi'],
      ['FAQ', 'faq'],
    ] as const) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
    await page.getByRole('link', { name: 'Early Access sichern' }).first().click();
    await expect(page.locator('#waitlist')).toBeInViewport();
  });

  test('Header bleibt beim Scrollen sichtbar (sticky)', async ({ page }) => {
    await page.goto('/');
    await page.locator('#faq').scrollIntoViewIfNeeded();
    const box = await page.locator('[data-header]').boundingBox();
    expect(box?.y).toBe(0);
  });

  test('Mobile-Menü öffnet, navigiert und schließt', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only');
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Menü öffnen' });
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    const menu = page.getByRole('navigation', { name: 'Mobile Navigation' });
    await expect(menu).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menü schließen' })).toHaveAttribute('aria-expanded', 'true');

    await menu.getByRole('link', { name: 'Preise' }).click();
    await expect(menu).toBeHidden();
    await expect(page.locator('#preise')).toBeInViewport();

    await page.getByRole('button', { name: 'Menü öffnen' }).click();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(page.getByRole('button', { name: 'Menü öffnen' })).toBeFocused();
  });

  test('Skip-Link ist per Tastatur erreichbar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Tastatur-Test nur Desktop');
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Zum Inhalt springen' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();
  });

  test('FAQ-Einträge lassen sich öffnen', async ({ page }) => {
    await page.goto('/#faq');
    const faq = page.locator('#faq');
    const answer = faq.getByText(/Der Launch ist für 2027 geplant/);
    await expect(answer).toBeHidden();
    await faq.getByText('Wann startet AboutExport?').click();
    await expect(answer).toBeVisible();
  });
});
