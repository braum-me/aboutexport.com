/**
 * Single Source of Truth für alle Preise.
 * Preisseite, ROI-Rechner, FAQ und strukturierte Daten lesen ausschließlich hier.
 */

export type RegionId = 'eu' | 'us' | 'cn';
export type BillingInterval = 'monthly' | 'annual';

export interface Region {
  id: RegionId;
  /** Kurzlabel, z. B. für Chips */
  label: string;
  /** Ausgeschriebener Name */
  name: string;
}

export interface EarlyAccessDiscount {
  enabled: boolean;
  /** Rabatt in Prozent (0–100) */
  percent: number;
  label: string;
  /** Hinweistext zu den Konditionen */
  note: string;
}

export interface PricingConfig {
  currency: 'EUR';
  regions: readonly Region[];
  /** Listenpreis pro Region und Monat bei monatlicher Zahlung (netto) */
  monthlyPricePerRegion: number;
  /** Listenpreis pro Region und Jahr bei jährlicher Zahlung (netto) */
  annualPricePerRegion: number;
  minRegions: number;
  maxRegions: number;
  earlyAccessDiscount: EarlyAccessDiscount;
  /** Hinweis zu Steuern */
  taxNote: string;
}

export const pricing: PricingConfig = {
  currency: 'EUR',
  regions: [
    { id: 'eu', label: 'EU', name: 'Europäische Union' },
    { id: 'us', label: 'USA', name: 'Vereinigte Staaten' },
    { id: 'cn', label: 'China', name: 'China' },
  ],
  monthlyPricePerRegion: 49,
  annualPricePerRegion: 490,
  minRegions: 1,
  maxRegions: 3,
  earlyAccessDiscount: {
    enabled: true,
    percent: 20,
    label: 'Early-Access-Rabatt',
    note: 'Für Mitglieder der Waitlist. Die verbindlichen Konditionen teilen wir vor dem Launch mit.',
  },
  taxNote: 'Alle Preise zzgl. gesetzlicher USt.',
};

export const includedFeatures = [
  'Export Control Alerts bei kritischen Änderungen',
  'Täglicher Compliance-Newsfeed',
  'KI-Zusammenfassungen regulatorischer Texte',
  'Deutsche Übersetzungen aller Inhalte',
  'Support per E-Mail & Chat',
] as const;
