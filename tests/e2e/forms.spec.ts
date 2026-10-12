import { expect, test, type Page } from '@playwright/test';

const SINK = 'http://127.0.0.1:2526/messages';
const FAILING = 'http://127.0.0.1:4322';

type SinkMessage = { from: string; to: string[]; data: string };

async function messages(): Promise<SinkMessage[]> {
  return (await fetch(SINK)).json() as Promise<SinkMessage[]>;
}

/** Spam-Schutz verlangt eine Mindest-Ausfüllzeit. */
async function waitMinFillTime(page: Page) {
  await page.waitForTimeout(2700);
}

test.beforeEach(async () => {
  await fetch(SINK, { method: 'DELETE' });
});

test.describe('Waitlist', () => {
  test('erfolgreiche Anmeldung versendet E-Mail an info@aboutexport.com', async ({ page }) => {
    await page.goto('/#waitlist');
    const form = page.locator('form[data-form="waitlist"]');
    await form.getByLabel('E-Mail-Adresse').fill('erika@firma.de');
    await form.getByLabel('Name').fill('Erika Muster');
    await form.getByLabel('Unternehmen').fill('Firma GmbH');
    await waitMinFillTime(page);
    await form.getByRole('button', { name: 'Auf die Waitlist' }).click();

    const status = page.locator('#waitlist-status');
    await expect(status).toHaveAttribute('data-state', 'success');
    await expect(status).toContainText('Sie stehen auf der Waitlist');

    const mails = await messages();
    expect(mails).toHaveLength(1);
    expect(mails[0]!.to.join()).toContain('info@aboutexport.com');
    expect(mails[0]!.data).toContain('erika@firma.de');
    expect(mails[0]!.data).toMatch(/Reply-To: erika@firma\.de/i);
    expect(mails[0]!.data).toContain('Firma GmbH');
  });

  test('Client-Validierung verhindert Versand ohne E-Mail', async ({ page }) => {
    await page.goto('/#waitlist');
    const form = page.locator('form[data-form="waitlist"]');
    let requested = false;
    page.on('request', (r) => {
      if (r.url().includes('/api/')) requested = true;
    });
    await form.getByRole('button', { name: 'Auf die Waitlist' }).click();
    await expect(form.getByLabel('E-Mail-Adresse')).toHaveAttribute('aria-invalid', 'true');
    await expect(form.locator('[data-error-for="email"]')).toBeVisible();
    expect(requested).toBe(false);
    await expect(page.locator('#waitlist-status')).toHaveAttribute('data-state', 'error');
  });

  test('Datenschutzhinweis und Link vorhanden', async ({ page }) => {
    await page.goto('/#waitlist');
    const privacy = page.locator('#waitlist-privacy');
    await expect(privacy).toContainText('keine Newsletter-Anmeldung');
    await expect(privacy.getByRole('link', { name: 'Datenschutzerklärung' })).toHaveAttribute('href', '/datenschutz/');
  });
});

test.describe('Kontaktformular', () => {
  test('erfolgreiche Nachricht', async ({ page }) => {
    await page.goto('/#kontakt');
    const form = page.locator('form[data-form="contact"]');
    await form.getByLabel('Name').fill('Max Muster');
    await form.getByLabel('E-Mail-Adresse').fill('max@example.com');
    await form.getByLabel('Nachricht').fill('Gibt es Mengenrabatte für mehrere Standorte?');
    await waitMinFillTime(page);
    await form.getByRole('button', { name: 'Nachricht senden' }).click();
    await expect(page.locator('#contact-status')).toHaveAttribute('data-state', 'success');
    await expect(form.getByLabel('Name')).toHaveValue('');
    const mails = await messages();
    expect(mails).toHaveLength(1);
    expect(mails[0]!.data).toContain('Mengenrabatte');
  });

  test('Feldfehler bei ungültigen Eingaben', async ({ page }) => {
    await page.goto('/#kontakt');
    const form = page.locator('form[data-form="contact"]');
    await form.getByLabel('E-Mail-Adresse').fill('keine-mail');
    await form.getByLabel('Nachricht').fill('kurz');
    await form.getByRole('button', { name: 'Nachricht senden' }).click();
    for (const f of ['name', 'email', 'message']) await expect(form.locator(`[data-error-for="${f}"]`)).toBeVisible();
    expect(await messages()).toHaveLength(0);
  });
});

test.describe('Zustellfehler', () => {
  test('kein Erfolg, wenn der SMTP-Versand fehlschlägt', async ({ page }) => {
    await page.goto(`${FAILING}/#waitlist`);
    const form = page.locator('form[data-form="waitlist"]');
    await form.getByLabel('E-Mail-Adresse').fill('erika@firma.de');
    await waitMinFillTime(page);
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/waitlist')),
      form.getByRole('button', { name: 'Auf die Waitlist' }).click(),
    ]);
    expect(response.status()).toBe(502);
    const status = page.locator('#waitlist-status');
    await expect(status).toHaveAttribute('data-state', 'error');
    await expect(status).toContainText('nicht möglich');
    await expect(form.getByLabel('E-Mail-Adresse')).toHaveValue('erika@firma.de');
  });

  test('Netzwerkfehler wird angezeigt', async ({ page }) => {
    await page.route('**/api/contact', (route) => route.abort('failed'));
    await page.goto('/#kontakt');
    const form = page.locator('form[data-form="contact"]');
    await form.getByLabel('Name').fill('Max');
    await form.getByLabel('E-Mail-Adresse').fill('max@example.com');
    await form.getByLabel('Nachricht').fill('Eine ausreichend lange Nachricht.');
    await form.getByRole('button', { name: 'Nachricht senden' }).click();
    await expect(page.locator('#contact-status')).toHaveAttribute('data-state', 'error');
  });
});

test.describe('API-Härtung', () => {
  const origin = 'http://127.0.0.1:4321';
  const headers = { origin, accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' };

  test('Honeypot wird abgelehnt', async ({ request }) => {
    const res = await request.post('/api/waitlist', { headers, data: 'email=a%40b.de&website=spam' });
    expect(res.status()).toBe(400);
    expect(await messages()).toHaveLength(0);
  });

  test('Header-Injection wird abgelehnt', async ({ request }) => {
    const res = await request.post('/api/waitlist', {
      headers,
      data: `email=${encodeURIComponent('a@b.de\r\nBcc: evil@x.de')}&name=x`,
    });
    expect(res.status()).toBe(422);
    expect(await messages()).toHaveLength(0);
  });

  test('zu schnelle Übermittlung wird abgelehnt', async ({ request }) => {
    const res = await request.post('/api/waitlist', { headers, data: `email=a%40b.de&ts=${Date.now()}` });
    expect(res.status()).toBe(400);
  });

  test('GET und falscher Content-Type', async ({ request }) => {
    expect((await request.get('/api/contact')).status()).toBe(405);
    const res = await request.post('/api/contact', {
      headers: { ...headers, 'content-type': 'application/json' },
      data: JSON.stringify({ email: 'a@b.de' }),
    });
    expect([403, 415]).toContain(res.status());
  });

  test('Cross-Origin-POST wird blockiert', async ({ request }) => {
    const res = await request.post('/api/waitlist', {
      headers: { ...headers, origin: 'https://evil.example' },
      data: 'email=a%40b.de',
    });
    expect(res.status()).toBe(403);
  });

  test('Fallback ohne JavaScript leitet auf Ergebnisseite um', async ({ request }) => {
    const res = await request.post('/api/waitlist', {
      headers: { origin, 'content-type': 'application/x-www-form-urlencoded' },
      data: 'email=&website=',
      maxRedirects: 0,
    });
    expect(res.status()).toBe(303);
    expect(res.headers()['location']).toBe('/anfrage-fehlgeschlagen/');
  });
});
