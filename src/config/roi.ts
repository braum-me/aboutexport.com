/** Defaults & Grenzen für den ROI-Rechner. Preise kommen aus ./pricing.ts */
export const roiConfig = {
  workingDaysPerYear: 220,
  defaults: {
    minutesPerDay: 30,
    hourlyRate: 65,
    regions: 2,
    interval: 'annual',
    applyDiscount: false,
  },
  limits: {
    minutesPerDay: { min: 0, max: 480, step: 5 },
    hourlyRate: { min: 0, max: 500, step: 5 },
  },
} as const;
