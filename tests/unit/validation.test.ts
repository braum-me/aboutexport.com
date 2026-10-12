import { describe, expect, it } from 'vitest';
import {
  cleanMultiLine,
  isLikelySpam,
  isValidEmail,
  LIMITS,
  validateContact,
  validateWaitlist,
} from '../../src/lib/validation';

describe('isValidEmail()', () => {
  it.each(['max@example.com', 'first.last+tag@sub.example.co.uk', "o'neil@firma.de"])('accepts %s', (e) =>
    expect(isValidEmail(e)).toBe(true),
  );
  it.each([
    '',
    'plain',
    'a@b',
    'a@@b.de',
    'a b@c.de',
    '.a@b.de',
    'a..b@c.de',
    'a@b.de\r\nBcc: x@y.de',
    'a@b.de\nX',
    'a@-b.de',
    '<a@b.de>',
    'a@b.de,c@d.de',
    `${'a'.repeat(65)}@b.de`,
    `a@${'b'.repeat(250)}.de`,
  ])('rejects %j', (e) => expect(isValidEmail(e)).toBe(false));
});

describe('validateWaitlist()', () => {
  it('requires only the e-mail address', () => {
    const r = validateWaitlist({ email: '  max@example.com ' });
    expect(r).toEqual({ ok: true, data: { email: 'max@example.com', name: '', company: '' } });
  });
  it('rejects missing e-mail', () => {
    const r = validateWaitlist({ name: 'Max' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.email).toBeDefined();
  });
  it('rejects header injection in name and company', () => {
    const r = validateWaitlist({ email: 'a@b.de', name: 'Max\r\nBcc: evil@x.de', company: 'ACME\nX' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name).toBeDefined();
      expect(r.errors.company).toBeDefined();
    }
  });
  it('enforces length limits', () => {
    const r = validateWaitlist({ email: 'a@b.de', name: 'x'.repeat(LIMITS.name + 1) });
    expect(r.ok).toBe(false);
  });
  it('ignores non-string values', () => {
    const r = validateWaitlist({ email: ['a@b.de'] as unknown as string });
    expect(r.ok).toBe(false);
  });
});

describe('validateContact()', () => {
  const valid = { name: 'Max Muster', email: 'max@example.com', message: 'Hallo, ich habe eine Frage.' };
  it('accepts valid input', () => expect(validateContact(valid).ok).toBe(true));
  it.each(['name', 'email', 'message'])('requires %s', (field) => {
    const r = validateContact({ ...valid, [field]: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[field]).toBeDefined();
  });
  it('enforces message length', () => {
    expect(validateContact({ ...valid, message: 'kurz' }).ok).toBe(false);
    expect(validateContact({ ...valid, message: 'x'.repeat(LIMITS.messageMax + 1) }).ok).toBe(false);
  });
  it('keeps line breaks in the message but strips control characters', () => {
    expect(cleanMultiLine('Zeile 1\r\nZeile 2\u0000\u0007')).toBe('Zeile 1\nZeile 2');
    const r = validateContact({ ...valid, message: 'Zeile eins\r\nZeile zwei' });
    expect(r.ok && r.data.message).toBe('Zeile eins\nZeile zwei');
  });
});

describe('isLikelySpam()', () => {
  const now = 1_000_000_000;
  it('flags a filled honeypot', () => expect(isLikelySpam({ website: 'http://spam' }, now)).toBe(true));
  it('flags submissions that are too fast', () => expect(isLikelySpam({ ts: String(now - 500) }, now)).toBe(true));
  it('flags stale or invalid timestamps', () => {
    expect(isLikelySpam({ ts: String(now - 2 * 24 * 3600 * 1000) }, now)).toBe(true);
    expect(isLikelySpam({ ts: 'abc' }, now)).toBe(true);
  });
  it('accepts normal submissions', () => {
    expect(isLikelySpam({ website: '', ts: String(now - 10_000) }, now)).toBe(false);
    expect(isLikelySpam({}, now)).toBe(false);
  });
});
