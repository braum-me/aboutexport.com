import { describe, expect, it } from 'vitest';
import { legal, openLegalItems, type LegalConfig } from '../../src/config/legal';

describe('legal config', () => {
  it('erfindet keine Angaben: offene Punkte bleiben null', () => {
    expect(legal.operator.company).toBe('Braum Consulting');
    expect(legal.operator.legalForm).toBe('Einzelunternehmen');
    expect(legal.vatId).toBeNull();
    expect(JSON.stringify(legal)).not.toMatch(/Steuer-?ID/i);
  });

  it('meldet fehlende Pflichtangaben und ist vollständig, sobald alles bestätigt ist', () => {
    expect(openLegalItems(legal).length).toBeGreaterThan(0);
    const complete: LegalConfig = {
      ...legal,
      hosting: { ...legal.hosting!, serverLocationVerified: true },
      accessLogRetention: 'none',
    };
    expect(openLegalItems(complete)).toEqual([]);
  });

  it('akzeptiert „keine USt-IdNr.“ und erkennt Widersprüche', () => {
    const base: LegalConfig = { ...legal, hosting: { ...legal.hosting!, serverLocationVerified: true }, accessLogRetention: 14 };
    expect(openLegalItems({ ...base, vatId: null, noVatId: true })).toEqual([]);
    expect(openLegalItems({ ...base, vatId: 'DE123456789', noVatId: false })).toEqual([]);
    expect(openLegalItems({ ...base, vatId: null, noVatId: false })).toHaveLength(1);
    expect(openLegalItems({ ...base, vatId: 'DE123456789', noVatId: true })).toHaveLength(1);
  });
});
