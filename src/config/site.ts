/**
 * Zentrale Site-Konfiguration. Inhalte stammen von der bisherigen Website
 * aboutexport.com (Stand Oktober 2026), angepasst an den Launch 2027.
 */
export const site = {
  name: 'AboutExport',
  url: 'https://aboutexport.com',
  locale: 'de_DE',
  lang: 'de',
  title: 'AboutExport – Export Control Monitoring & Alerts',
  description:
    'Export Compliance Software für EU, USA und China: AboutExport überwacht Exportkontrollvorschriften, erkennt relevante Änderungen und liefert verständliche Updates per E-Mail. Launch geplant 2027.',
  launch: 'Geplanter Launch 2027',
  contactEmail: 'info@aboutexport.com',
  owner: 'AboutExport – A Brand of Braum Consulting',
  ogImage: '/images/branding/og-image.png',
} as const;

export const nav = [
  { href: '/#features', label: 'Features' },
  { href: '/#preise', label: 'Preise' },
  { href: '/#roi', label: 'ROI-Rechner' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/blog/', label: 'Blog' },
] as const;

export const legalNav = [
  { href: '/impressum/', label: 'Impressum' },
  { href: '/datenschutz/', label: 'Datenschutz' },
] as const;
