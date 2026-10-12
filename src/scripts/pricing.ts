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
  };

  root.addEventListener('change', update);
  update();
}
