const eur0 = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});
const eur2 = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pct = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });

/** Formatiert Euro-Beträge im deutschen Format. Ganze Beträge ohne Nachkommastellen. */
export function formatCurrency(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  // Intl liefert für -0 ein "-0 €"; vermeiden.
  const v = Object.is(rounded, -0) ? 0 : rounded;
  return Number.isInteger(v) ? eur0.format(v) : eur2.format(v);
}

/** Ganzzahliger Prozentwert, z. B. "124 %". */
export function formatPercent(value: number): string {
  const v = Math.round(value);
  return `${pct.format(Object.is(v, -0) ? 0 : v)} %`;
}
