import { formatCurrency, formatPercent } from '../lib/format';
import { calculateRoi, type RoiField } from '../lib/roi';

/** Leere Felder → NaN, damit die Validierung greift statt 0 anzunehmen. */
function num(value: string): number {
  const v = value.trim().replace(',', '.');
  return v === '' ? Number.NaN : Number(v);
}

export function initRoi(): void {
  const form = document.querySelector<HTMLFormElement>('[data-roi]');
  if (!form) return;

  const out = (key: string) => form.querySelector<HTMLElement>(`[data-roi-out="${key}"]`);
  const set = (key: string, value: string) => {
    const el = out(key);
    if (el) el.textContent = value;
  };
  const highlight = form.querySelector<HTMLElement>('[data-roi-highlight]');
  const invalidNote = form.querySelector<HTMLElement>('[data-roi-invalid]');
  const results = form.querySelector<HTMLElement>('[data-roi-results]');

  const fieldInputs: Partial<Record<RoiField, HTMLInputElement>> = {
    minutesPerDay: form.elements.namedItem('minutesPerDay') as HTMLInputElement,
    hourlyRate: form.elements.namedItem('hourlyRate') as HTMLInputElement,
  };

  const showErrors = (errors: Partial<Record<RoiField, string>>) => {
    (Object.keys(fieldInputs) as RoiField[]).forEach((key) => {
      const input = fieldInputs[key];
      const errEl = form.querySelector<HTMLElement>(`[data-roi-error="${key}"]`);
      const msg = errors[key];
      input?.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (errEl) {
        errEl.textContent = msg ?? '';
        errEl.hidden = !msg;
      }
    });
  };

  const update = () => {
    const data = new FormData(form);
    const outcome = calculateRoi({
      minutesPerDay: num(String(data.get('minutesPerDay') ?? '')),
      hourlyRate: num(String(data.get('hourlyRate') ?? '')),
      regions: Number(data.get('regions')),
      interval: data.get('interval'),
      applyDiscount: data.get('applyDiscount') === 'on',
    });

    if (!outcome.ok) {
      showErrors(outcome.errors);
      invalidNote?.classList.remove('hidden');
      results?.classList.add('opacity-60');
      ['annualManualCost', 'annualSubscriptionCost', 'annualSavings', 'monthlySavings'].forEach((k) => set(k, '–'));
      set('roiPercent', 'ROI –');
      return;
    }

    showErrors({});
    invalidNote?.classList.add('hidden');
    results?.classList.remove('opacity-60');
    const r = outcome.result;
    set('annualManualCost', formatCurrency(r.annualManualCost));
    set('annualSubscriptionCost', formatCurrency(r.annualSubscriptionCost));
    set('annualSavings', formatCurrency(Math.abs(r.annualSavings)));
    set('monthlySavings', formatCurrency(Math.abs(r.monthlySavings)));
    set('savingsLabel', r.isSaving ? 'Mögliche Ersparnis pro Jahr' : 'Mehrkosten pro Jahr');
    set('monthlyLabel', r.isSaving ? 'pro Monat' : 'Mehrkosten pro Monat');
    set('roiPercent', `ROI ${r.roiPercent === null ? '–' : formatPercent(r.roiPercent)}`);
    highlight?.classList.toggle('bg-ink-900', r.isSaving);
    highlight?.classList.toggle('bg-slate-700', !r.isSaving);
    highlight?.setAttribute('data-state', r.isSaving ? 'saving' : 'cost');
  };

  // Schieberegler ↔ Zahlenfeld synchronisieren
  form.querySelectorAll<HTMLInputElement>('[data-roi-sync]').forEach((range) => {
    const target = fieldInputs[range.dataset.roiSync as RoiField];
    if (!target) return;
    range.addEventListener('input', () => {
      target.value = range.value;
      update();
    });
    target.addEventListener('input', () => {
      const v = num(target.value);
      if (Number.isFinite(v)) range.value = String(Math.min(Number(range.max), Math.max(Number(range.min), v)));
    });
  });

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  form.addEventListener('submit', (e) => e.preventDefault());
  update();
}
