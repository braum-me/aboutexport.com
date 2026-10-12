import { expect, test } from '@playwright/test';

const norm = (s: string | null) => (s ?? '').replace(/\u00a0/g, ' ').trim();

test.describe('Preisrechner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#preise');
  });

  test('Standard: 2 Regionen, monatlich, inkl. 20 % Rabatt', async ({ page }) => {
    const card = page.locator('[data-pricing]');
    expect(norm(await card.locator('[data-out="price"]').textContent())).toBe('78,40 €');
    expect(norm(await card.locator('[data-out="listPrice"]').textContent())).toBe('98 €');
    expect(norm(await card.locator('[data-out="per"]').textContent())).toBe('/ Monat');
    expect(norm(await card.locator('[data-out="regionNames"]').textContent())).toBe('EU, USA');
  });

  test('Jährliche Abrechnung zeigt Jahrespreis, Monatswert und Ersparnis', async ({ page }) => {
    const card = page.locator('[data-pricing]');
    await card.getByText('Jährlich').click();
    expect(norm(await card.locator('[data-out="price"]').textContent())).toBe('784 €');
    expect(norm(await card.locator('[data-out="listPrice"]').textContent())).toBe('980 €');
    expect(norm(await card.locator('[data-out="per"]').textContent())).toBe('/ Jahr');
    expect(norm(await card.locator('[data-out="effectiveMonthly"]').textContent())).toBe('65,33 €');
    await expect(card.locator('[data-annual-saving]')).toBeVisible();
    expect(norm(await card.locator('[data-out="annualSavings"]').textContent())).toBe('156,80 €');
  });

  test('Regionen wählen: 1 bis 3, letzte Region nicht abwählbar', async ({ page }) => {
    const card = page.locator('[data-pricing]');
    const region = (id: string) => card.locator('label').filter({ has: page.locator(`input[value="${id}"]`) });
    await region('cn').click();
    expect(norm(await card.locator('[data-out="regionCount"]').textContent())).toBe('3');
    expect(norm(await card.locator('[data-out="price"]').textContent())).toBe('117,60 €');

    await region('us').click();
    await region('cn').click();
    expect(norm(await card.locator('[data-out="regionCount"]').textContent())).toBe('1');
    expect(norm(await card.locator('[data-out="regionNames"]').textContent())).toBe('EU');
    expect(norm(await card.locator('[data-out="price"]').textContent())).toBe('39,20 €');
    await expect(card.locator('input[value="eu"]')).toBeDisabled();
  });

  test('Hinweis auf fehlende Verfügbarkeit und CTA zur Waitlist', async ({ page }) => {
    await expect(page.getByText('AboutExport ist noch nicht verfügbar')).toBeVisible();
    await expect(page.getByRole('link', { name: /Wartelistenplatz sichern/ })).toHaveAttribute('href', '#waitlist');
  });
});
