import { pricing as defaultPricing, type BillingInterval, type PricingConfig } from '../config/pricing';

export interface PriceInput {
  regions: number;
  interval: BillingInterval;
  applyDiscount: boolean;
}

export interface PriceQuote {
  regions: number;
  interval: BillingInterval;
  discountApplied: boolean;
  discountPercent: number;
  /** Listenpreis für das gewählte Intervall (alle Regionen) */
  listPrice: number;
  /** Zu zahlender Preis für das gewählte Intervall (ggf. rabattiert) */
  price: number;
  /** Effektive monatliche Kosten */
  effectiveMonthly: number;
  /** Kosten pro Jahr bei diesem Intervall */
  annualCost: number;
  /** Ersparnis pro Jahr bei jährlicher statt monatlicher Zahlung (gleiche Rabattlogik) */
  annualSavingsVsMonthly: number;
}

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export function clampRegions(regions: number, config: PricingConfig = defaultPricing): number {
  if (!Number.isFinite(regions)) return config.minRegions;
  return Math.min(config.maxRegions, Math.max(config.minRegions, Math.trunc(regions)));
}

export function discountFactor(applyDiscount: boolean, config: PricingConfig = defaultPricing): number {
  const d = config.earlyAccessDiscount;
  if (!applyDiscount || !d.enabled) return 1;
  const percent = Math.min(100, Math.max(0, d.percent));
  return 1 - percent / 100;
}

/** Preis pro Region für ein Intervall, ggf. rabattiert. */
export function pricePerRegion(
  interval: BillingInterval,
  applyDiscount: boolean,
  config: PricingConfig = defaultPricing,
): number {
  const base = interval === 'annual' ? config.annualPricePerRegion : config.monthlyPricePerRegion;
  return round2(base * discountFactor(applyDiscount, config));
}

/** Jahreskosten pro Region für ein Intervall (monatlich = 12 × Monatspreis). */
export function annualPricePerRegion(
  interval: BillingInterval,
  applyDiscount: boolean,
  config: PricingConfig = defaultPricing,
): number {
  const p = pricePerRegion(interval, applyDiscount, config);
  return round2(interval === 'annual' ? p : p * 12);
}

export function quote(input: PriceInput, config: PricingConfig = defaultPricing): PriceQuote {
  const regions = clampRegions(input.regions, config);
  const discountApplied = input.applyDiscount && config.earlyAccessDiscount.enabled;
  const listUnit = pricePerRegion(input.interval, false, config);
  const unit = pricePerRegion(input.interval, discountApplied, config);
  const price = round2(unit * regions);
  const annualCost = round2(annualPricePerRegion(input.interval, discountApplied, config) * regions);
  const monthlyAnnualCost = round2(annualPricePerRegion('monthly', discountApplied, config) * regions);
  const annualAnnualCost = round2(annualPricePerRegion('annual', discountApplied, config) * regions);

  return {
    regions,
    interval: input.interval,
    discountApplied,
    discountPercent: discountApplied ? config.earlyAccessDiscount.percent : 0,
    listPrice: round2(listUnit * regions),
    price,
    effectiveMonthly: round2(annualCost / 12),
    annualCost,
    annualSavingsVsMonthly: round2(Math.max(0, monthlyAnnualCost - annualAnnualCost)),
  };
}
