import { describe, expect, it, vi } from 'vitest';
import { buildContactMail, buildWaitlistMail, readSmtpConfig, type OutgoingMail, type SmtpConfig } from '../../src/lib/mail';
import { RateLimiter } from '../../src/lib/rateLimit';
import { handleSubmission, type SubmissionDeps } from '../../src/lib/submit';

const smtp: SmtpConfig = {
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  requireTLS: true,
  user: 'u',
  password: 'p',
  from: 'AboutExport <noreply@aboutexport.com>',
  recipient: 'info@aboutexport.com',
};

function deps(overrides: Partial<SubmissionDeps> = {}, sent: OutgoingMail[] = []): SubmissionDeps {
  return {
    smtp,
    createSender: () => async (mail) => {
      sent.push(mail);
    },
    limiter: new RateLimiter(100, 60_000),
    now: () => 1_000_000,
    log: () => {},
    ...overrides,
  };
}

const waitlist = { email: 'kunde@firma.de', name: 'Erika', company: 'Firma GmbH', website: '', ts: String(1_000_000 - 5000) };
const contact = { name: 'Erika', email: 'kunde@firma.de', message: 'Bitte um Rückruf zu den Preisen.', website: '' };

describe('handleSubmission()', () => {
  it('delivers a waitlist notification to the fixed recipient with Reply-To', async () => {
    const sent: OutgoingMail[] = [];
    const r = await handleSubmission('waitlist', waitlist, 'ip1', deps({}, sent));
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe('info@aboutexport.com');
    expect(sent[0]?.replyTo).toBe('kunde@firma.de');
    expect(sent[0]?.text).toContain('kunde@firma.de');
    expect(sent[0]?.text).toContain('Firma GmbH');
  });

  it('delivers a contact message', async () => {
    const sent: OutgoingMail[] = [];
    const r = await handleSubmission('contact', contact, 'ip1', deps({}, sent));
    expect(r.status).toBe(200);
    expect(sent[0]?.text).toContain('Bitte um Rückruf');
    expect(sent[0]?.subject).not.toMatch(/[\r\n]/);
  });

  it('never uses user input as recipient', async () => {
    const sent: OutgoingMail[] = [];
    await handleSubmission('contact', { ...contact, to: 'evil@x.de', recipient: 'evil@x.de' }, 'ip', deps({}, sent));
    expect(sent[0]?.to).toBe('info@aboutexport.com');
  });

  it('does not report success when delivery fails', async () => {
    const log = vi.fn();
    const r = await handleSubmission(
      'waitlist',
      waitlist,
      'ip1',
      deps({
        createSender: () => async () => {
          throw Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' });
        },
        log,
      }),
    );
    expect(r.status).toBe(502);
    expect(r.body.ok).toBe(false);
    expect(log).toHaveBeenCalledWith({ kind: 'waitlist', outcome: 'delivery_failed', code: 'ECONNREFUSED' });
  });

  it('logs without personal data', async () => {
    const log = vi.fn();
    await handleSubmission('waitlist', waitlist, '203.0.113.9', deps({ log }));
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain('kunde@firma.de');
    expect(logged).not.toContain('Erika');
    expect(logged).not.toContain('203.0.113.9');
  });

  it('returns 503 when SMTP is not configured', async () => {
    const r = await handleSubmission('contact', contact, 'ip1', deps({ smtp: null }));
    expect(r.status).toBe(503);
    expect(r.body.ok).toBe(false);
  });

  it('returns 422 with field errors for invalid input', async () => {
    const sent: OutgoingMail[] = [];
    const r = await handleSubmission('contact', { ...contact, email: 'kaputt' }, 'ip1', deps({}, sent));
    expect(r.status).toBe(422);
    expect(r.body.errors?.email).toBeDefined();
    expect(sent).toHaveLength(0);
  });

  it('rejects honeypot submissions without sending', async () => {
    const sent: OutgoingMail[] = [];
    const r = await handleSubmission('waitlist', { ...waitlist, website: 'x' }, 'ip1', deps({}, sent));
    expect(r.status).toBe(400);
    expect(r.body.ok).toBe(false);
    expect(sent).toHaveLength(0);
  });

  it('rate limits per client and form', async () => {
    const d = deps({ limiter: new RateLimiter(2, 60_000) });
    expect((await handleSubmission('waitlist', waitlist, 'ip1', d)).status).toBe(200);
    expect((await handleSubmission('waitlist', waitlist, 'ip1', d)).status).toBe(200);
    expect((await handleSubmission('waitlist', waitlist, 'ip1', d)).status).toBe(429);
    expect((await handleSubmission('waitlist', waitlist, 'ip2', d)).status).toBe(200);
    expect((await handleSubmission('contact', contact, 'ip1', d)).status).toBe(200);
  });
});

describe('RateLimiter', () => {
  it('resets after the window', () => {
    const l = new RateLimiter(1, 1000);
    expect(l.consume('k', 0)).toBe(true);
    expect(l.consume('k', 500)).toBe(false);
    expect(l.consume('k', 1000)).toBe(true);
  });
  it('bounds memory usage', () => {
    const l = new RateLimiter(1, 60_000, 3);
    for (let i = 0; i < 10; i++) l.consume(`k${i}`, 0);
    expect(l.consume('k9', 1)).toBe(false);
  });
});

describe('readSmtpConfig()', () => {
  const env = {
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '465',
    SMTP_USER: 'u',
    SMTP_PASSWORD: 'p',
    SMTP_FROM: 'AboutExport <noreply@aboutexport.com>',
  };
  it('reads a complete configuration and defaults the recipient', () => {
    const c = readSmtpConfig(env);
    expect(c?.secure).toBe(true);
    expect(c?.recipient).toBe('info@aboutexport.com');
  });
  it('uses STARTTLS on 587', () => {
    const c = readSmtpConfig({ ...env, SMTP_PORT: '587' });
    expect(c?.secure).toBe(false);
    expect(c?.requireTLS).toBe(true);
  });
  it('returns null for missing or invalid values', () => {
    expect(readSmtpConfig({})).toBeNull();
    expect(readSmtpConfig({ ...env, SMTP_PORT: 'abc' })).toBeNull();
    expect(readSmtpConfig({ ...env, CONTACT_RECIPIENT: 'nope' })).toBeNull();
    expect(readSmtpConfig({ ...env, SMTP_FROM: 'a@b.de\r\nBcc: x@y.de' })).toBeNull();
  });
});

describe('mail builders', () => {
  it('waitlist mail states that it is no marketing consent', () => {
    const m = buildWaitlistMail({ email: 'a@b.de', name: '', company: '' }, smtp);
    expect(m.text).toContain('KEINE Einwilligung');
    expect(m.from).toBe(smtp.from);
  });
  it('contact mail uses fixed subject', () => {
    const m = buildContactMail({ name: 'X', email: 'a@b.de', message: 'Hallo Welt!!' }, smtp);
    expect(m.subject).toBe('Neue Kontaktanfrage – AboutExport');
  });
});
