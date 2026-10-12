/**
 * Beispieldaten für die Konzeptdarstellungen (Mockups).
 * Keine realen Meldungen, keine Kennzahlen – nur typische Kategorien von Änderungen,
 * damit die Interfaces nachvollziehbar zeigen, was AboutExport tut.
 */
export type Severity = 'critical' | 'notice' | 'info';
export type RegionCode = 'EU' | 'US' | 'CN';

export const severityMeta: Record<Severity, { label: string; chip: string; bar: string; dot: string }> = {
  critical: {
    label: 'Kritisch',
    chip: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/15',
    bar: 'bg-red-500',
    dot: 'bg-red-500',
  },
  notice: {
    label: 'Hinweis',
    chip: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20',
    bar: 'bg-amber-400',
    dot: 'bg-amber-400',
  },
  info: {
    label: 'Info',
    chip: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/15',
    bar: 'bg-slate-300',
    dot: 'bg-slate-400',
  },
};

export const regionMeta: Record<RegionCode, { label: string; name: string }> = {
  EU: { label: 'EU', name: 'Europäische Union' },
  US: { label: 'USA', name: 'Vereinigte Staaten' },
  CN: { label: 'CN', name: 'China' },
};

export interface SampleUpdate {
  severity: Severity;
  region: RegionCode;
  title: string;
  source: string;
  topic: string;
  time: string;
}

export const sampleUpdates: SampleUpdate[] = [
  {
    severity: 'critical',
    region: 'EU',
    title: 'Aktualisierung von Anhang I der Dual-Use-Verordnung',
    source: 'Amtsblatt der EU',
    topic: 'Dual-Use',
    time: '07:42',
  },
  {
    severity: 'critical',
    region: 'US',
    title: 'Neue Einträge auf der Entity List',
    source: 'BIS',
    topic: 'Entity List',
    time: '06:15',
  },
  {
    severity: 'notice',
    region: 'CN',
    title: 'Bekanntmachung zur Exportkontrollliste',
    source: 'MOFCOM',
    topic: 'Exportkontrolle',
    time: 'Gestern',
  },
  {
    severity: 'info',
    region: 'EU',
    title: 'Leitlinien zur Umsetzung von Sanktionen',
    source: 'Europäische Kommission',
    topic: 'Sanktionen',
    time: 'Gestern',
  },
  {
    severity: 'notice',
    region: 'US',
    title: 'Änderung der Export Administration Regulations',
    source: 'U.S. Department of Commerce',
    topic: 'EAR',
    time: 'Mo.',
  },
];
