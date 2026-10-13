/**
 * Angaben für Impressum und Datenschutzerklärung (Single Source of Truth).
 *
 * `null` = Angabe noch nicht bestätigt. Solche Werte werden NICHT als Platzhalter angezeigt,
 * sondern von `npm run release:check` als Go-live-Blocker gemeldet. Keine Angaben erfinden.
 * Die Texte sind ein Entwurf zur rechtlichen Freigabe und nicht rechtlich geprüft.
 */
export interface Provider {
  name: string;
  address: string;
  /** Zweck in der Datenschutzerklärung */
  purpose: string;
  /** Serverstandort / Sitz in Bezug auf Drittlandübermittlung */
  location: string;
}

export interface LegalConfig {
  updated: string;
  operator: {
    brand: string;
    company: string;
    /** Vor- und Nachname des Inhabers (Einzelunternehmen, § 5 Abs. 1 Nr. 1 DDG) */
    owner: string | null;
    legalForm: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
  };
  /** USt-IdNr. (§ 27a UStG) – nur eintragen, wenn tatsächlich vorhanden */
  vatId: string | null;
  /** Bestätigt, dass keine USt-IdNr. existiert (dann entfällt die Angabe) */
  noVatId: boolean;
  hosting: (Provider & { serverLocation: string }) | null;
  cloudflare: Provider;
  smtp: Provider;
  /** Anbieter des Postfachs, an das Cloudflare Email Routing info@ weiterleitet */
  mailbox: Provider | null;
  /** Tatsächliche Aufbewahrungsdauer der Zugriffs-Logs (Reverse Proxy) in Tagen */
  logRetentionDays: number | null;
}

export const legal: LegalConfig = {
  updated: 'Oktober 2026 (Entwurf zur rechtlichen Freigabe)',
  operator: {
    brand: 'AboutExport – A Brand of Braum Consulting',
    company: 'Braum Consulting',
    owner: null,
    legalForm: 'Einzelunternehmen',
    street: 'Schlüchterner Straße 31',
    postalCode: '36391',
    city: 'Sinntal',
    country: 'Deutschland',
  },
  vatId: null,
  noVatId: false,
  hosting: null,
  cloudflare: {
    name: 'Cloudflare, Inc.',
    address: '101 Townsend St., San Francisco, CA 94107, USA',
    purpose: 'DNS, Content Delivery Network (Reverse Proxy), Schutz vor Angriffen und Weiterleitung von E-Mails an unser Postfach (Email Routing)',
    location: 'USA (zertifiziert nach dem EU-U.S. Data Privacy Framework)',
  },
  smtp: {
    name: 'Sendinblue SAS (Brevo)',
    address: '9-17 rue Salneuve, 75017 Paris, Frankreich',
    purpose: 'Versand der über die Formulare übermittelten Nachrichten an unser Postfach (SMTP-Relay)',
    location: 'EU',
  },
  mailbox: null,
  logRetentionDays: null,
};

/** Offene Pflichtangaben (für release:check und Doku) */
export function openLegalItems(c: LegalConfig = legal): string[] {
  const open: string[] = [];
  if (!c.operator.owner) open.push('operator.owner: Vor- und Nachname des Inhabers (Impressum, Verantwortlicher)');
  if (!c.vatId && !c.noVatId) open.push('vatId/noVatId: USt-IdNr. eintragen oder bestätigen, dass keine existiert');
  if (!c.hosting) open.push('hosting: VPS-Anbieter (Name, Anschrift, Serverstandort)');
  if (!c.mailbox) open.push('mailbox: Anbieter des Ziel-Postfachs von info@aboutexport.com');
  if (c.logRetentionDays === null) open.push('logRetentionDays: tatsächliche Aufbewahrung der Zugriffs-Logs');
  return open;
}
