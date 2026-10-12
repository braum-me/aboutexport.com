/**
 * Serverseitige Validierung & Sanitizing für Kontakt- und Waitlist-Formular.
 * Wird zusätzlich clientseitig für sofortiges Feedback genutzt.
 */

export type FormKind = 'waitlist' | 'contact';

export interface WaitlistData {
  email: string;
  name: string;
  company: string;
}

export interface ContactData {
  name: string;
  email: string;
  message: string;
}

export type FieldErrors = Record<string, string>;

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

export const LIMITS = {
  email: 254,
  name: 100,
  company: 150,
  messageMin: 10,
  messageMax: 5000,
} as const;

// Steuerzeichen inkl. CR/LF (für einzeilige Felder → Header-Injection-Schutz)
// eslint-disable-next-line no-control-regex
const LINE_BREAK_OR_CONTROL = /[\u0000-\u001F\u007F\u2028\u2029]/;
// Steuerzeichen außer \n und \t (für mehrzeilige Felder)
// eslint-disable-next-line no-control-regex
const CONTROL_EXCEPT_NEWLINE_TAB = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

// Pragmatische Prüfung: local@domain.tld, keine Leer-/Sonderzeichen, die in Headern problematisch sind.
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** Einzeilige Eingabe: trimmen, Mehrfach-Leerzeichen reduzieren. Zeilenumbrüche werden abgelehnt, nicht entfernt. */
export function cleanSingleLine(v: unknown): string {
  return asString(v).normalize('NFC').trim().replace(/[ \t]+/g, ' ');
}

/** Mehrzeilige Eingabe: Zeilenenden normalisieren, Steuerzeichen entfernen. */
export function cleanMultiLine(v: unknown): string {
  return asString(v)
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_EXCEPT_NEWLINE_TAB, '')
    .trim();
}

export function hasLineBreakOrControl(v: unknown): boolean {
  return LINE_BREAK_OR_CONTROL.test(asString(v));
}

export function isValidEmail(email: string): boolean {
  if (email.length === 0 || email.length > LIMITS.email) return false;
  if (hasLineBreakOrControl(email)) return false;
  const [local] = email.split('@');
  if (!local || local.length > 64) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  return EMAIL_RE.test(email);
}

function checkEmail(raw: unknown, errors: FieldErrors): string {
  if (hasLineBreakOrControl(raw)) {
    errors.email = 'Bitte eine gültige E-Mail-Adresse eingeben.';
    return '';
  }
  const email = cleanSingleLine(raw);
  if (!email) errors.email = 'Bitte eine E-Mail-Adresse eingeben.';
  else if (!isValidEmail(email)) errors.email = 'Bitte eine gültige E-Mail-Adresse eingeben.';
  return email;
}

function checkSingleLine(
  raw: unknown,
  field: string,
  max: number,
  errors: FieldErrors,
  required: boolean,
  label: string,
): string {
  if (hasLineBreakOrControl(raw)) {
    errors[field] = `${label} darf keine Zeilenumbrüche oder Steuerzeichen enthalten.`;
    return '';
  }
  const value = cleanSingleLine(raw);
  if (required && !value) errors[field] = `Bitte ${label} angeben.`;
  else if (value.length > max) errors[field] = `${label} darf maximal ${max} Zeichen lang sein.`;
  return value;
}

export function validateWaitlist(input: Record<string, unknown>): ValidationResult<WaitlistData> {
  const errors: FieldErrors = {};
  const email = checkEmail(input.email, errors);
  const name = checkSingleLine(input.name, 'name', LIMITS.name, errors, false, 'Name');
  const company = checkSingleLine(input.company, 'company', LIMITS.company, errors, false, 'Unternehmen');
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { email, name, company } };
}

export function validateContact(input: Record<string, unknown>): ValidationResult<ContactData> {
  const errors: FieldErrors = {};
  const name = checkSingleLine(input.name, 'name', LIMITS.name, errors, true, 'Name');
  const email = checkEmail(input.email, errors);
  const message = cleanMultiLine(input.message);
  if (!message) errors.message = 'Bitte eine Nachricht eingeben.';
  else if (message.length < LIMITS.messageMin)
    errors.message = `Die Nachricht muss mindestens ${LIMITS.messageMin} Zeichen lang sein.`;
  else if (message.length > LIMITS.messageMax)
    errors.message = `Die Nachricht darf maximal ${LIMITS.messageMax} Zeichen lang sein.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { name, email, message } };
}

/** Spam-Heuristik: Honeypot + Mindestbearbeitungszeit (falls Zeitstempel vorhanden). */
export const SPAM = {
  honeypotField: 'website',
  timestampField: 'ts',
  minFillMs: 2500,
  maxAgeMs: 24 * 60 * 60 * 1000,
} as const;

export function isLikelySpam(input: Record<string, unknown>, now: number): boolean {
  const honeypot = asString(input[SPAM.honeypotField]);
  if (honeypot.trim() !== '') return true;
  const tsRaw = asString(input[SPAM.timestampField]);
  if (tsRaw) {
    const ts = Number(tsRaw);
    if (!Number.isFinite(ts)) return true;
    const elapsed = now - ts;
    if (elapsed < SPAM.minFillMs || elapsed > SPAM.maxAgeMs) return true;
  }
  return false;
}
