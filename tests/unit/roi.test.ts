import { describe, expect, it } from 'vitest';
import { calculateRoi, validateRoiInput } from '../../src/lib/roi';
import { roiConfig } from '../../src/config/roi';
import { formatCurrency, formatPercent } from '../../src/lib/format';

const base = { minutesPerDay: 30, hourlyRate: 60, regions: 1, interval: 'monthly', applyDiscount: false } as const;

function ok(input: Record<string, unknown>) {
  const r = calculateRoi(input);
  if (!r.ok) throw new Error(JSON.stringify(r.errors));
  return r.result;
}

describe('calculateRoi()', () => {
  it('uses 220 working days by default', () => {
    expect(roiConfig.workingDaysPerYear).toBe(220);
    // 0,5 h × 60 € × 220 = 6.600 €
    expect(ok(base).annualManualCost).toBe(6600);
  });

  it.each([
    [1, 588],
    [2, 1176],
    [3, 1764],
  ])('monthly billing with %i region(s)', (regions, cost) => {
    const r = ok({ ...base, regions });
    expect(r.annualSubscriptionCost).toBe(cost);
    expect(r.annualSavings).toBe(6600 - cost);
  });

  it.each([
    [1, 490],
    [2, 980],
    [3, 1470],
  ])('annual billing with %i region(s)', (regions, cost) => {
    const r = ok({ ...base, regions, interval: 'annual' });
    expect(r.annualSubscriptionCost).toBe(cost);
  });

  it('applies the early-access discount to the subscription cost', () => {
    expect(ok({ ...base, regions: 3, interval: 'annual', applyDiscount: true }).annualSubscriptionCost).toBe(1176);
    expect(ok({ ...base, regions: 1, applyDiscount: true }).annualSubscriptionCost).toBe(470.4);
  });

  it('computes positive savings, monthly savings and ROI', () => {
    const r = ok({ ...base, regions: 1, interval: 'annual' });
    expect(r.annualSavings).toBe(6110);
    expect(r.monthlySavings).toBe(509.17);
    expect(r.roiPercent).toBeCloseTo((6110 / 490) * 100, 2);
    expect(r.isSaving).toBe(true);
  });

  it('reports additional costs when savings are negative', () => {
    // 5 min × 30 €/h × 220 = 550 € < 1.764 €
    const r = ok({ minutesPerDay: 5, hourlyRate: 30, regions: 3, interval: 'monthly', applyDiscount: false });
    expect(r.annualManualCost).toBe(550);
    expect(r.annualSavings).toBe(-1214);
    expect(r.monthlySavings).toBe(-101.17);
    expect(r.isSaving).toBe(false);
    expect(r.roiPercent).toBeLessThan(0);
  });

  it('handles zero manual effort (ROI −100 %)', () => {
    const r = ok({ ...base, minutesPerDay: 0 });
    expect(r.annualManualCost).toBe(0);
    expect(r.annualSavings).toBe(-588);
    expect(r.roiPercent).toBe(-100);
    expect(r.isSaving).toBe(false);
  });

  it('treats exact break-even as no saving', () => {
    // 1 Region monatlich = 588 €/Jahr → 60 min/Tag × (588/220) €/h × 220 Tage = 588 €
    const r = ok({ minutesPerDay: 60, hourlyRate: 588 / 220, regions: 1, interval: 'monthly', applyDiscount: false });
    expect(r.annualSavings).toBe(0);
    expect(r.isSaving).toBe(false);
    expect(r.roiPercent).toBe(0);
  });

  it('accepts boundary values', () => {
    expect(calculateRoi({ ...base, minutesPerDay: 0, hourlyRate: 0 }).ok).toBe(true);
    expect(calculateRoi({ ...base, minutesPerDay: 480, hourlyRate: 500 }).ok).toBe(true);
    const r = ok({ ...base, minutesPerDay: 480, hourlyRate: 500, regions: 3, interval: 'annual' });
    expect(r.annualManualCost).toBe(880000);
  });

  it.each([
    ['negative minutes', { minutesPerDay: -1 }, 'minutesPerDay'],
    ['too many minutes', { minutesPerDay: 481 }, 'minutesPerDay'],
    ['NaN minutes', { minutesPerDay: Number.NaN }, 'minutesPerDay'],
    ['string minutes', { minutesPerDay: '30' }, 'minutesPerDay'],
    ['negative rate', { hourlyRate: -5 }, 'hourlyRate'],
    ['infinite rate', { hourlyRate: Number.POSITIVE_INFINITY }, 'hourlyRate'],
    ['rate above max', { hourlyRate: 501 }, 'hourlyRate'],
    ['0 regions', { regions: 0 }, 'regions'],
    ['4 regions', { regions: 4 }, 'regions'],
    ['fractional regions', { regions: 1.5 }, 'regions'],
    ['unknown interval', { interval: 'weekly' }, 'interval'],
    ['invalid working days', { workingDaysPerYear: 0 }, 'workingDaysPerYear'],
  ])('rejects invalid input: %s', (_, patch, field) => {
    const r = calculateRoi({ ...base, ...patch });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveProperty(field);
  });

  it('only applies the discount for a strict boolean true', () => {
    const v = validateRoiInput({ ...base, applyDiscount: 'true' });
    expect(v.ok && v.value.applyDiscount).toBe(false);
  });
});

const plain = (s: string) => s.replace(/\u00a0/g, ' ');

describe('German formatting', () => {
  it('formats currency in de-DE', () => {
    expect(plain(formatCurrency(1764))).toBe('1.764 €');
    expect(plain(formatCurrency(39.2))).toBe('39,20 €');
    expect(plain(formatCurrency(-0.001))).toBe('0 €');
  });
  it('formats percentages', () => {
    expect(plain(formatPercent(124.4))).toBe('124 %');
    expect(plain(formatPercent(-100))).toBe('-100 %');
  });
});
