/**
 * Redaktionelle Inhalte der Startseite.
 * Basis: bestehende Website aboutexport.com. Unbelegte Kennzahlen (z. B. Zeitersparnis in %,
 * "< 5 Min bis zum Alarm", Anzahl Beiträge) wurden bewusst nicht übernommen.
 */
import { pricing } from './pricing';

export type FeatureStatus = 'launch' | 'planned' | 'future';

export const problems = [
  {
    icon: 'layers',
    title: 'Fragmentierte Quellen',
    text: 'Amtsblätter, Behördenportale und Listen in mehreren Sprachen – jede Jurisdiktion veröffentlicht anders.',
  },
  {
    icon: 'search',
    title: 'Manuelles Monitoring',
    text: 'Quellen werden täglich von Hand geprüft. Relevantes geht in der Masse unter.',
  },
  {
    icon: 'clock',
    title: 'Hoher Rechercheaufwand',
    text: 'Zeit für Recherche und Einordnung fehlt für Klassifizierung, Prüfungen und Beratung im Unternehmen.',
  },
  {
    icon: 'alert',
    title: 'Risiko verpasster Änderungen',
    text: 'Eine übersehene Änderung kann Genehmigungspflichten, Lieferstopps oder Bußgelder nach sich ziehen.',
  },
  {
    icon: 'eye-off',
    title: 'Keine zentrale Übersicht',
    text: 'Änderungen und Trends sind verstreut dokumentiert – Nachweise für Audits sind mühsam.',
  },
] as const;

export const features = [
  {
    id: 'monitoring',
    icon: 'radar',
    title: 'Export Control Monitoring',
    text: 'AboutExport überwacht verlässliche regulatorische Quellen automatisiert und erkennt neue Veröffentlichungen und Änderungen.',
    status: 'launch',
  },
  {
    id: 'alerts',
    icon: 'bell',
    title: 'Critical Regulatory Alerts',
    text: 'Bei kritischen Export-Control-Änderungen erhalten Sie eine Benachrichtigung per E-Mail und im Dashboard.',
    status: 'launch',
  },
  {
    id: 'newsfeed',
    icon: 'newspaper',
    title: 'Täglicher Compliance-Newsfeed',
    text: 'Jeden Morgen die wichtigsten Export-Compliance-News – kuratiert, gefiltert und nach Relevanz sortiert.',
    status: 'launch',
  },
  {
    id: 'ai',
    icon: 'sparkles',
    title: 'KI-Zusammenfassungen',
    text: 'Komplexe regulatorische Texte in Kernaussagen: Die KI fasst Updates zusammen und ordnet mögliche Auswirkungen ein.',
    status: 'launch',
  },
  {
    id: 'coverage',
    icon: 'globe',
    title: 'Multi-Jurisdiktion',
    text: 'EU, USA und China – die wichtigsten Export-Jurisdiktionen. Weitere Regionen folgen nach dem Launch.',
    status: 'launch',
  },
  {
    id: 'translation',
    icon: 'languages',
    title: 'Deutsche Übersetzungen',
    text: 'Alle Updates und News automatisch auf Deutsch – ohne externe Übersetzungstools.',
    status: 'launch',
  },
] as const satisfies readonly { status: FeatureStatus; [k: string]: string }[];

export const roadmap = [
  { title: 'Weitere Regionen: UK, Indien, Japan', status: 'planned' },
  { title: 'Alerts per Microsoft Teams & Slack', status: 'planned' },
  { title: 'KI-Fragen zur Compliance-Historie', status: 'future' },
] as const satisfies readonly { title: string; status: FeatureStatus }[];

export const steps = [
  {
    title: 'Regionen wählen',
    text: 'Sie buchen genau die Jurisdiktionen, die für Ihr Geschäft relevant sind – EU, USA, China.',
  },
  {
    title: 'Änderungen überwachen',
    text: 'AboutExport prüft die Quellen der gewählten Regionen laufend und automatisiert.',
  },
  {
    title: 'Relevante Alerts erhalten',
    text: 'Kritische Änderungen kommen als Alert, alles Weitere gebündelt im täglichen Newsfeed.',
  },
  {
    title: 'Mit KI verstehen',
    text: 'Zusammenfassung und Übersetzung zeigen auf Deutsch, was sich ändert – mit Link zur Originalquelle.',
  },
] as const;

/** Jurisdiktionen und typische Quellen (Nennung ohne Partnerschaft oder Billigung). */
export const jurisdictions = [
  {
    id: 'eu',
    code: 'EU',
    name: 'Europäische Union',
    sources: ['Europäische Kommission', 'Amtsblatt der Europäischen Union'],
  },
  {
    id: 'us',
    code: 'US',
    name: 'Vereinigte Staaten',
    sources: ['U.S. Department of Commerce', 'Bureau of Industry and Security (BIS)'],
  },
  {
    id: 'cn',
    code: 'CN',
    name: 'China',
    sources: ['Ministry of Commerce of the PRC (MOFCOM)'],
  },
] as const;

const d = pricing.earlyAccessDiscount;
const m = pricing.monthlyPricePerRegion;
const y = pricing.annualPricePerRegion;

export const faqs: { q: string; a: string[] }[] = [
  {
    q: 'Wann startet AboutExport?',
    a: [
      'Der Launch ist für 2027 geplant. Waitlist-Mitglieder erhalten bevorzugten Early Access und werden per E-Mail informiert, sobald AboutExport verfügbar ist.',
    ],
  },
  {
    q: 'Welche Regionen werden unterstützt?',
    a: [
      'Zum Launch stehen die Regionen EU, USA und China zur Verfügung. Weitere Regionen – darunter UK, Indien und Japan – sind für die Zeit nach dem Launch geplant. Gebuchte Regionen lassen sich jederzeit erweitern.',
    ],
  },
  {
    q: 'Wie funktioniert die Preisgestaltung?',
    a: [
      `Sie zahlen pro Region: ${m} € pro Monat bei monatlicher Zahlung oder ${y} € pro Jahr bei jährlicher Zahlung. Sie wählen eine, zwei oder alle drei Regionen. ${pricing.taxNote}`,
      d.enabled
        ? `Für Waitlist-Mitglieder ist ein ${d.label} von ${d.percent} % vorgesehen. ${d.note}`
        : 'Aktuell ist kein Early-Access-Rabatt vorgesehen.',
    ],
  },
  {
    q: 'Kann ich zusätzliche Regionen oder Funktionen anfragen?',
    a: [
      'Ja. AboutExport wird eng mit den künftigen Nutzern weiterentwickelt – Länderwünsche und Feature Requests fließen direkt in die Priorisierung ein. Schreiben Sie uns einfach über das Kontaktformular.',
    ],
  },
  {
    q: 'Wie funktionieren Alerts?',
    a: [
      'AboutExport prüft die Quellen Ihrer gebuchten Regionen laufend automatisiert. Kritische Änderungen werden als Alert per E-Mail zugestellt; die Benachrichtigungen lassen sich nach Dringlichkeit und Thema konfigurieren. Weniger dringliche Updates erscheinen im täglichen Newsfeed.',
      'Integrationen für Microsoft Teams und Slack sind für die Zeit nach dem Launch geplant.',
    ],
  },
  {
    q: 'Kann ich AboutExport testen?',
    a: [
      'Nach dem Launch ist ein kostenloser Testzeitraum vorgesehen. Die genauen Bedingungen veröffentlichen wir zum Launch; Waitlist-Mitglieder erfahren sie zuerst.',
    ],
  },
  {
    q: 'Was passiert, nachdem ich mich auf die Waitlist eingetragen habe?',
    a: [
      'Wir speichern Ihre Angaben ausschließlich, um Sie über den Start von AboutExport und Ihren Early-Access-Zugang zu informieren. Sie erhalten keinen Newsletter, sofern Sie dem nicht gesondert zustimmen. Eine Austragung ist jederzeit per E-Mail an info@aboutexport.com möglich.',
    ],
  },
  {
    q: 'Für welche Unternehmen eignet sich AboutExport?',
    a: [
      'AboutExport richtet sich an Unternehmen mit Export-Compliance-Pflichten – etwa aus Maschinen- und Anlagenbau, Elektronik und Halbleiter, Chemie und Pharma, Automotive sowie Luft- und Raumfahrt, Logistik und Zoll. Die Plattform ist für kleine Compliance-Teams ebenso konzipiert wie für größere Abteilungen.',
    ],
  },
];
