import { describe, expect, it } from 'vitest';
import { pricing, type PricingConfig } from '../../src/config/pricing';
import { annualPricePerRegion, clampRegions, pricePerRegion, quote } from '../../src/lib/pricing';

describe('pricing config', () => {
  it('matches the published base prices', () => {
    expect(pricing.monthlyPricePerRegion).toBe(49);
    expect(pricing.annualPricePerRegion).toBe(490);
    expect(pricing.regions.map((r) => r.id)).toEqual(['eu', 'us', 'cn']);
    expect(pricing.earlyAccessDiscount.percent).toBe(20);
  });
});

describe('quote()', () => {
  it.each([
    [1, 49, 588],
    [2, 98, 1176],
    [3, 147, 1764],
  ])('monthly list price for %i region(s)', (regions, price, annual) => {
    const q = quote({ regions, interval: 'monthly', applyDiscount: false });
    expect(q.price).toBe(price);
    expect(q.annualCost).toBe(annual);
    expect(q.effectiveMonthly).toBe(price);
    expect(q.annualSavingsVsMonthly).toBe(98 * regions);
  });

  it.each([
    [1, 490, 40.83],
    [2, 980, 81.67],
    [3, 1470, 122.5],
  ])('annual list price for %i region(s)', (regions, price, perMonth) => {
    const q = quote({ regions, interval: 'annual', applyDiscount: false });
    expect(q.price).toBe(price);
    expect(q.annualCost).toBe(price);
    expect(q.effectiveMonthly).toBe(perMonth);
  });

  it('applies the 20 % early-access discount', () => {
    expect(quote({ regions: 1, interval: 'monthly', applyDiscount: true }).price).toBe(39.2);
    expect(quote({ regions: 3, interval: 'monthly', applyDiscount: true }).annualCost).toBe(1411.2);
    const annual = quote({ regions: 3, interval: 'annual', applyDiscount: true });
    expect(annual.price).toBe(1176);
    expect(annual.listPrice).toBe(1470);
    expect(annual.discountPercent).toBe(20);
    // 3 × (39,20 × 12 − 392) = 3 × 78,40
    expect(annual.annualSavingsVsMonthly).toBe(235.2);
  });

  it('ignores the discount when it is disabled in the config', () => {
    const cfg: PricingConfig = { ...pricing, earlyAccessDiscount: { ...pricing.earlyAccessDiscount, enabled: false } };
    const q = quote({ regions: 2, interval: 'monthly', applyDiscount: true }, cfg);
    expect(q.price).toBe(98);
    expect(q.discountApplied).toBe(false);
  });

  it('uses a changed discount percentage from the config', () => {
    const cfg: PricingConfig = { ...pricing, earlyAccessDiscount: { ...pricing.earlyAccessDiscount, percent: 10 } };
    expect(pricePerRegion('annual', true, cfg)).toBe(441);
  });

  it('clamps region count to 1–3', () => {
    expect(clampRegions(0)).toBe(1);
    expect(clampRegions(5)).toBe(3);
    expect(clampRegions(Number.NaN)).toBe(1);
    expect(clampRegions(2.7)).toBe(2);
  });

  it('computes annual price per region for both intervals', () => {
    expect(annualPricePerRegion('monthly', false)).toBe(588);
    expect(annualPricePerRegion('annual', false)).toBe(490);
  });
});
