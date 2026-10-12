import { expect, test } from '@playwright/test';

const unconfirmed = [/14 Tage/, /dauerhaft(?:er)? Rabatt/i, /ersten Anmeldungen/, /kostenlose[rn]? Testzeitraum/];

test.describe('Rechtstexte und öffentliche Angaben', () => {
  for (const path of ['/impressum/', '/datenschutz/']) {
    test(`${path}: keine internen Prüfhinweise, keine Steuer-ID`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('[data-review-note], [data-review-notes]')).toHaveCount(0);
      const text = ((await page.locator('main').textContent()) ?? '').replace(/\s+/g, ' ');
      expect(text).not.toMatch(/Prüfhinweis/);
      expect(text).not.toMatch(/Steuer-ID/i);
      expect(text).not.toMatch(/\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/);
    });
  }

  test('Startseite enthält keine unbestätigten Konditionen', async ({ page }) => {
    await page.goto('/');
    const text = ((await page.locator('main').textContent()) ?? '').replace(/\s+/g, ' ');
    for (const re of unconfirmed) expect(text).not.toMatch(re);
    expect(text).toContain('49');
    expect(text).toMatch(/20\s?%/);
  });
});
