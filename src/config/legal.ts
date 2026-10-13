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
  /** serverLocationVerified: Rechenzentrum technisch bestätigt (OVH-Kundenbereich / Server-Standortcode) */
  hosting: (Provider & { serverLocation: string; serverLocationVerified: boolean }) | null;
  cloudflare: Provider;
  smtp: Provider;
  /** Anbieter des Postfachs, an das Cloudflare Email Routing info@ weiterleitet */
  mailbox: Provider | null;
  /**
   * Zugriffs-Logs des Reverse Proxy (Traefik/Coolify) mit IP-Adressen:
   * Anzahl Tage, 'none' (keine Access-Logs aktiv) oder null (noch nicht geprüft)
   */
  accessLogRetention: number | 'none' | null;
  /**
   * Optionale Reichweitenmessung mit Umami (nur relevant, wenn UMAMI_* gesetzt ist).
   * instance: 'self' = von uns selbst auf demselben Hosting wie die Website betrieben, sonst der
   * externe Betreiber (Provider), null = noch nicht angegeben.
   * verified: Rechtsgrundlage, Cookie-/Speicherfreiheit und Auftragsverarbeitung rechtlich geprüft.
   */
  analytics: { instance: 'self' | Provider | null; verified: boolean };
}

export const legal: LegalConfig = {
  updated: 'Oktober 2026 (Entwurf zur rechtlichen Freigabe)',
  operator: {
    brand: 'AboutExport – A Brand of Braum Consulting',
    company: 'Braum Consulting',
    owner: 'Stefan Braum',
    legalForm: 'Einzelunternehmen',
    street: 'Schlüchterner Straße 31',
    postalCode: '36391',
    city: 'Sinntal',
    country: 'Deutschland',
  },
  vatId: null,
  noVatId: true,
  hosting: {
    name: 'OVH SAS',
    address: '2 rue Kellermann, 59100 Roubaix, Frankreich',
    purpose: 'Hosting (virtueller Server)',
    location: 'EU',
    serverLocation: 'Frankreich (Rechenzentrum Gravelines)',
    // Rechenzentrum Gravelines, vom Betreiber im OVH-Kundenbereich bestätigt (13.10.2026)
    serverLocationVerified: true,
  },
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
  mailbox: {
    name: 'Microsoft Ireland Operations Limited (Microsoft 365 / Exchange Online)',
    address: 'One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland',
    purpose: 'Empfang und Speicherung der an info@aboutexport.com weitergeleiteten E-Mails (Postfach)',
    location:
      'EU; Übermittlungen in die USA im Einzelfall (z. B. Support) möglich – Microsoft Corporation ist nach dem EU-U.S. Data Privacy Framework zertifiziert',
  },
  // Traefik (coolify-proxy) ohne Access-Log, geprüft am 13.10.2026; Variante A, Bestätigung Betreiber
  accessLogRetention: 'none',
  // Betreiber 13.10.2026: Umami-Instanz (analytics.jetzt.group) selbst betrieben, gleiches Hosting wie die Website
  analytics: { instance: 'self', verified: true },
};

/** Offene Pflichtangaben (für release:check und Doku) */
export function openLegalItems(c: LegalConfig = legal, opts: { analyticsEnabled?: boolean } = {}): string[] {
  const open: string[] = [];
  if (!c.operator.owner) open.push('operator.owner: Vor- und Nachname des Inhabers (Impressum, Verantwortlicher)');
  if (!c.vatId && !c.noVatId) open.push('vatId/noVatId: USt-IdNr. eintragen oder bestätigen, dass keine existiert');
  if (c.vatId && c.noVatId) open.push('vatId/noVatId: widersprüchlich (USt-IdNr. gesetzt und „keine vorhanden“)');
  if (!c.hosting) open.push('hosting: VPS-Anbieter (Name, Anschrift, Serverstandort)');
  else if (!c.hosting.serverLocationVerified)
    open.push('hosting.serverLocationVerified: Rechenzentrum im OVH-Kundenbereich bestätigen');
  if (!c.mailbox) open.push('mailbox: Anbieter des Ziel-Postfachs von info@aboutexport.com');
  if (c.accessLogRetention === null)
    open.push('accessLogRetention: Access-Logs des Reverse Proxy prüfen (Tage oder "none")');
  if (opts.analyticsEnabled) {
    if (!c.analytics.instance) open.push('analytics.instance: Betreiber und Standort der Umami-Instanz');
    if (!c.analytics.verified)
      open.push('analytics.verified: Umami rechtlich prüfen (Rechtsgrundlage, Cookie-/Speicherfreiheit, Auftragsverarbeitung)');
  }
  return open;
}
