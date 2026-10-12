import { pricing, type BillingInterval } from '../config/pricing';
import { formatCurrency } from '../lib/format';
import { quote } from '../lib/pricing';

export function initPricing(): void {
  const root = document.querySelector<HTMLElement>('[data-pricing]');
  if (!root) return;

  const intervals = root.querySelectorAll<HTMLInputElement>('[data-interval]');
  const regionInputs = root.querySelectorAll<HTMLInputElement>('[data-region]');
  const out = (key: string) => root.querySelector<HTMLElement>(`[data-out="${key}"]`);
  const savingRow = root.querySelector<HTMLElement>('[data-annual-saving]');
  const regionRows = root.querySelectorAll<HTMLElement>('[data-region-row]');
  const unitRows = root.querySelectorAll<HTMLElement>('[data-out-unit-row]');
  const priceEl = out('price');
  let lastPrice = priceEl?.textContent ?? '';

  const update = () => {
    const interval = (Array.from(intervals).find((i) => i.checked)?.value ?? 'monthly') as BillingInterval;
    const selected = Array.from(regionInputs).filter((i) => i.checked);

    // Mindestens eine Region: die letzte aktive Region kann nicht abgewählt werden.
    regionInputs.forEach((i) => {
      i.disabled = selected.length <= pricing.minRegions && i.checked;
    });

    const ids = selected.map((i) => i.value);
    const names = pricing.regions.filter((r) => ids.includes(r.id)).map((r) => r.label);
    const q = quote({ regions: ids.length, interval, applyDiscount: true });
    const list = quote({ regions: ids.length, interval, applyDiscount: false });
    const per = interval === 'annual' ? '/ Jahr' : '/ Monat';

    const set = (key: string, value: string) => {
      const el = out(key);
      if (el) el.textContent = value;
    };
    set('regionCount', String(q.regions));
    set('regionWord', q.regions === 1 ? 'Region' : 'Regionen');
    set('regionNames', names.join(', '));
    set('listPrice', formatCurrency(list.price));
    set('price', formatCurrency(q.price));
    set('per', per);
    set('unit', `${formatCurrency(q.price / q.regions)} ${per}`);
    set('effectiveMonthly', formatCurrency(q.effectiveMonthly));
    set('annualCost', formatCurrency(q.annualCost));
    set('annualSavings', formatCurrency(q.annualSavingsVsMonthly));
    if (savingRow) savingRow.hidden = interval !== 'annual';

    // Aufschlüsselung je Region im Preisbereich
    regionRows.forEach((row) => {
      row.hidden = !ids.includes(row.dataset.regionRow ?? '');
    });
    unitRows.forEach((el) => {
      el.textContent = `${formatCurrency(q.price / q.regions)} ${per}`;
    });

    // Dezentes Feedback bei Preisänderung (per CSS bei reduzierter Bewegung deaktiviert)
    if (priceEl && priceEl.textContent !== lastPrice) {
      lastPrice = priceEl.textContent ?? '';
      priceEl.classList.remove('animate-bump');
      void priceEl.offsetWidth;
      priceEl.classList.add('animate-bump');
    }
  };

  root.addEventListener('change', update);
  update();
}
