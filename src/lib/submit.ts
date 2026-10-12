import {
  buildContactMail,
  buildWaitlistMail,
  type OutgoingMail,
  type SendMail,
  type SmtpConfig,
} from './mail';
import { RateLimiter } from './rateLimit';
import { isLikelySpam, validateContact, validateWaitlist, type FieldErrors, type FormKind } from './validation';

export interface SubmissionResponse {
  status: number;
  body: { ok: boolean; message: string; errors?: FieldErrors };
}

export interface SubmissionDeps {
  smtp: SmtpConfig | null;
  createSender: (config: SmtpConfig) => SendMail;
  limiter: RateLimiter;
  now?: () => number;
  log?: (event: Record<string, unknown>) => void;
}

const MESSAGES = {
  waitlistOk: 'Vielen Dank! Sie stehen auf der Waitlist. Wir melden uns vor dem Launch bei Ihnen.',
  contactOk: 'Vielen Dank für Ihre Nachricht. Wir melden uns so schnell wie möglich.',
  invalid: 'Bitte prüfen Sie Ihre Eingaben.',
  rejected: 'Ihre Anfrage konnte nicht verarbeitet werden. Bitte versuchen Sie es erneut oder schreiben Sie uns eine E-Mail.',
  rateLimited: 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.',
  unavailable:
    'Der Versand ist derzeit nicht möglich. Bitte versuchen Sie es später erneut oder schreiben Sie direkt an info@aboutexport.com.',
} as const;

/** Strukturiertes Logging ohne personenbezogene Daten (keine E-Mail, kein Name, keine IP). */
export const defaultLog = (event: Record<string, unknown>): void => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), scope: 'forms', ...event }));
};

export async function handleSubmission(
  kind: FormKind,
  fields: Record<string, unknown>,
  clientKey: string,
  deps: SubmissionDeps,
): Promise<SubmissionResponse> {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? defaultLog;

  if (!deps.limiter.consume(`${kind}:${clientKey}`, now())) {
    log({ kind, outcome: 'rate_limited' });
    return { status: 429, body: { ok: false, message: MESSAGES.rateLimited } };
  }

  if (isLikelySpam(fields, now())) {
    log({ kind, outcome: 'spam_rejected' });
    return { status: 400, body: { ok: false, message: MESSAGES.rejected } };
  }

  let mailFor: (config: SmtpConfig) => OutgoingMail;
  if (kind === 'waitlist') {
    const v = validateWaitlist(fields);
    if (!v.ok) {
      log({ kind, outcome: 'invalid', fields: Object.keys(v.errors) });
      return { status: 422, body: { ok: false, message: MESSAGES.invalid, errors: v.errors } };
    }
    mailFor = (c) => buildWaitlistMail(v.data, c);
  } else {
    const v = validateContact(fields);
    if (!v.ok) {
      log({ kind, outcome: 'invalid', fields: Object.keys(v.errors) });
      return { status: 422, body: { ok: false, message: MESSAGES.invalid, errors: v.errors } };
    }
    mailFor = (c) => buildContactMail(v.data, c);
  }

  if (!deps.smtp) {
    log({ kind, outcome: 'smtp_not_configured' });
    return { status: 503, body: { ok: false, message: MESSAGES.unavailable } };
  }

  try {
    await deps.createSender(deps.smtp)(mailFor(deps.smtp));
  } catch (err) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : 'unknown';
    log({ kind, outcome: 'delivery_failed', code });
    return { status: 502, body: { ok: false, message: MESSAGES.unavailable } };
  }

  log({ kind, outcome: 'delivered' });
  return { status: 200, body: { ok: true, message: kind === 'waitlist' ? MESSAGES.waitlistOk : MESSAGES.contactOk } };
}
