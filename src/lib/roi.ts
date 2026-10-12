import type { BillingInterval, PricingConfig } from '../config/pricing';
import { pricing as defaultPricing } from '../config/pricing';
import { roiConfig } from '../config/roi';
import { quote, round2 } from './pricing';

export interface RoiInput {
  minutesPerDay: number;
  hourlyRate: number;
  regions: number;
  interval: BillingInterval;
  applyDiscount: boolean;
  workingDaysPerYear?: number;
}

export type RoiField = 'minutesPerDay' | 'hourlyRate' | 'regions' | 'interval' | 'workingDaysPerYear';

export interface RoiResult {
  annualManualCost: number;
  annualSubscriptionCost: number;
  /** Positiv = Ersparnis, negativ = Mehrkosten */
  annualSavings: number;
  monthlySavings: number;
  /** null, wenn die Abokosten 0 sind (Division durch 0) */
  roiPercent: number | null;
  isSaving: boolean;
}

export type RoiOutcome =
  | { ok: true; input: Required<RoiInput>; result: RoiResult }
  | { ok: false; errors: Partial<Record<RoiField, string>> };

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** Validiert Rohwerte (z. B. aus Formularfeldern). Keine stillen Korrekturen. */
export function validateRoiInput(
  raw: Partial<Record<keyof RoiInput, unknown>>,
  config: PricingConfig = defaultPricing,
): { ok: true; value: Required<RoiInput> } | { ok: false; errors: Partial<Record<RoiField, string>> } {
  const errors: Partial<Record<RoiField, string>> = {};
  const { limits } = roiConfig;

  const minutes = raw.minutesPerDay;
  if (!isNum(minutes)) errors.minutesPerDay = 'Bitte eine Zahl eingeben.';
  else if (minutes < limits.minutesPerDay.min) errors.minutesPerDay = 'Der Wert darf nicht negativ sein.';
  else if (minutes > limits.minutesPerDay.max)
    errors.minutesPerDay = `Maximal ${limits.minutesPerDay.max} Minuten pro Tag.`;

  const rate = raw.hourlyRate;
  if (!isNum(rate)) errors.hourlyRate = 'Bitte eine Zahl eingeben.';
  else if (rate < limits.hourlyRate.min) errors.hourlyRate = 'Der Wert darf nicht negativ sein.';
  else if (rate > limits.hourlyRate.max) errors.hourlyRate = `Maximal ${limits.hourlyRate.max} € pro Stunde.`;

  const regions = raw.regions;
  if (!isNum(regions) || !Number.isInteger(regions) || regions < config.minRegions || regions > config.maxRegions)
    errors.regions = `Bitte ${config.minRegions} bis ${config.maxRegions} Regionen wählen.`;

  const interval = raw.interval;
  if (interval !== 'monthly' && interval !== 'annual') errors.interval = 'Ungültiges Abrechnungsintervall.';

  const days = raw.workingDaysPerYear ?? roiConfig.workingDaysPerYear;
  if (!isNum(days) || !Number.isInteger(days) || days < 1 || days > 366)
    errors.workingDaysPerYear = 'Ungültige Anzahl Arbeitstage.';

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      minutesPerDay: minutes as number,
      hourlyRate: rate as number,
      regions: regions as number,
      interval: interval as BillingInterval,
      applyDiscount: raw.applyDiscount === true,
      workingDaysPerYear: days as number,
    },
  };
}

export function calculateRoi(
  raw: Partial<Record<keyof RoiInput, unknown>>,
  config: PricingConfig = defaultPricing,
): RoiOutcome {
  const v = validateRoiInput(raw, config);
  if (!v.ok) return v;
  const input = v.value;

  const annualManualCost = round2((input.minutesPerDay / 60) * input.hourlyRate * input.workingDaysPerYear);
  const annualSubscriptionCost = quote(
    { regions: input.regions, interval: input.interval, applyDiscount: input.applyDiscount },
    config,
  ).annualCost;
  const annualSavings = round2(annualManualCost - annualSubscriptionCost);
  const roiPercent = annualSubscriptionCost > 0 ? round2((annualSavings / annualSubscriptionCost) * 100) : null;

  return {
    ok: true,
    input,
    result: {
      annualManualCost,
      annualSubscriptionCost,
      annualSavings,
      monthlySavings: round2(annualSavings / 12),
      roiPercent,
      isSaving: annualSavings > 0,
    },
  };
}
