import nodemailer from 'nodemailer';
import { isValidEmail, type ContactData, type WaitlistData } from './validation';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  /** STARTTLS erzwingen (Default: true, wenn nicht implizit TLS) */
  requireTLS: boolean;
  user: string;
  password: string;
  from: string;
  recipient: string;
}

export interface OutgoingMail {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
}

export type SendMail = (mail: OutgoingMail) => Promise<void>;

export const DEFAULT_RECIPIENT = 'info@aboutexport.com';

/**
 * Liest die SMTP-Konfiguration aus Umgebungsvariablen.
 * Gibt null zurück, wenn Pflichtwerte fehlen – Formulare melden dann einen Fehler
 * statt Anfragen stillschweigend zu verwerfen.
 */
export function readSmtpConfig(env: Record<string, string | undefined> = process.env): SmtpConfig | null {
  const host = env.SMTP_HOST?.trim();
  const port = Number(env.SMTP_PORT ?? '587');
  const user = env.SMTP_USER?.trim() ?? '';
  const password = env.SMTP_PASSWORD ?? '';
  const from = env.SMTP_FROM?.trim();
  const recipient = (env.CONTACT_RECIPIENT?.trim() || DEFAULT_RECIPIENT).toLowerCase();

  if (!host || !from) return null;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return null;
  if (!isValidEmail(recipient)) return null;
  // SMTP_FROM darf "Name <adresse>" oder nur "adresse" sein – keine Zeilenumbrüche.
  if (/[\r\n]/.test(from)) return null;

  const secureEnv = env.SMTP_SECURE?.trim().toLowerCase();
  const secure = secureEnv ? secureEnv === 'true' : port === 465;
  // Nur für lokale Tests abschaltbar (z. B. SMTP-Sink ohne TLS)
  const requireTLS = !secure && env.SMTP_REQUIRE_TLS?.trim().toLowerCase() !== 'false';

  return { host, port, secure, requireTLS, user, password, from, recipient };
}

export function createSmtpSender(config: SmtpConfig): SendMail {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    // Bei Port 587 STARTTLS erzwingen
    requireTLS: config.requireTLS,
    auth: config.user ? { user: config.user, pass: config.password } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  return async (mail) => {
    await transport.sendMail({
      to: mail.to,
      from: mail.from,
      replyTo: mail.replyTo,
      subject: mail.subject,
      text: mail.text,
      // Kein HTML: Nutzereingaben werden ausschließlich als Plain Text übertragen.
    });
  };
}

function stamp(now: Date): string {
  return now.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });
}

export function buildWaitlistMail(data: WaitlistData, config: SmtpConfig, now = new Date()): OutgoingMail {
  return {
    to: config.recipient,
    from: config.from,
    replyTo: data.email,
    subject: 'Neue Waitlist-Anmeldung – AboutExport',
    text: [
      'Neue Anmeldung zur AboutExport-Waitlist',
      '',
      `E-Mail:       ${data.email}`,
      `Name:         ${data.name || '–'}`,
      `Unternehmen:  ${data.company || '–'}`,
      `Eingang:      ${stamp(now)}`,
      '',
      'Hinweis: Die Anmeldung zur Waitlist ist KEINE Einwilligung in Newsletter/Marketing-E-Mails.',
      'Für Marketing-Kommunikation ist eine separate Einwilligung (Double-Opt-In) erforderlich.',
    ].join('\n'),
  };
}

export function buildContactMail(data: ContactData, config: SmtpConfig, now = new Date()): OutgoingMail {
  return {
    to: config.recipient,
    from: config.from,
    replyTo: data.email,
    subject: 'Neue Kontaktanfrage – AboutExport',
    text: [
      'Neue Kontaktanfrage über aboutexport.com',
      '',
      `Name:     ${data.name}`,
      `E-Mail:   ${data.email}`,
      `Eingang:  ${stamp(now)}`,
      '',
      'Nachricht:',
      '----------',
      data.message,
    ].join('\n'),
  };
}
