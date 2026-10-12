import { expect, test } from '@playwright/test';

const norm = (s: string | null) => (s ?? '').replace(/\u00a0/g, ' ').trim();

test.describe('ROI-Rechner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#roi');
  });

  const out = (page: import('@playwright/test').Page, key: string) =>
    page.locator(`[data-roi-out="${key}"]`).textContent().then(norm);

  test('Standardwerte (30 min, 65 €/h, 2 Regionen, jährlich)', async ({ page }) => {
    expect(await out(page, 'annualManualCost')).toBe('7.150 €');
    expect(await out(page, 'annualSubscriptionCost')).toBe('980 €');
    expect(await out(page, 'annualSavings')).toBe('6.170 €');
    expect(await out(page, 'monthlySavings')).toBe('514,17 €');
    expect(await out(page, 'roiPercent')).toBe('ROI 630 %');
  });

  test('Live-Update bei Eingaben, Regionen, Intervall und Rabatt', async ({ page }) => {
    await page.getByLabel('Manuelle Recherche pro Arbeitstag').fill('60');
    await page.getByLabel('Interner Stundensatz').fill('50');
    expect(await out(page, 'annualManualCost')).toBe('11.000 €');

    await page.getByText('3 Regionen').click();
    await page.locator('form[data-roi]').getByText('Monatlich', { exact: true }).click();
    expect(await out(page, 'annualSubscriptionCost')).toBe('1.764 €');

    await page.getByLabel(/Early-Access-Rabatt einrechnen/).check();
    expect(await out(page, 'annualSubscriptionCost')).toBe('1.411,20 €');
  });

  test('Negative Ersparnis wird als Mehrkosten dargestellt', async ({ page }) => {
    await page.getByLabel('Manuelle Recherche pro Arbeitstag').fill('0');
    expect(await out(page, 'savingsLabel')).toBe('Mehrkosten pro Jahr');
    expect(await out(page, 'annualSavings')).toBe('980 €');
    expect(await out(page, 'roiPercent')).toBe('ROI -100 %');
    await expect(page.locator('[data-roi-highlight]')).toHaveAttribute('data-state', 'cost');
  });

  test('Ungültige Eingaben werden abgefangen', async ({ page }) => {
    const minutes = page.getByLabel('Manuelle Recherche pro Arbeitstag');
    await minutes.fill('-10');
    await expect(minutes).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('[data-roi-error="minutesPerDay"]')).toBeVisible();
    expect(await out(page, 'annualSavings')).toBe('–');

    await minutes.fill('');
    await expect(minutes).toHaveAttribute('aria-invalid', 'true');

    await minutes.fill('45');
    await expect(minutes).toHaveAttribute('aria-invalid', 'false');
    await expect(page.locator('[data-roi-error="minutesPerDay"]')).toBeHidden();
  });

  test('Annahmen sind dokumentiert', async ({ page }) => {
    await page.getByText('Annahmen & Berechnung').click();
    await expect(page.getByText('220 Arbeitstage pro Jahr.')).toBeVisible();
    await expect(page.getByText(/keine zugesicherte Ersparnis/)).toBeVisible();
  });
});
