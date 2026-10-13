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
    const incomplete: LegalConfig = {
      ...legal,
      hosting: { ...legal.hosting!, serverLocationVerified: false },
      accessLogRetention: null,
    };
    expect(openLegalItems(incomplete)).toHaveLength(2);
    const complete: LegalConfig = {
      ...incomplete,
      hosting: { ...legal.hosting!, serverLocationVerified: true },
      accessLogRetention: 'none',
    };
    expect(openLegalItems(complete)).toEqual([]);
  });

  it('verlangt Umami-Angaben nur, wenn Umami aktiv ist', () => {
    const base: LegalConfig = { ...legal, hosting: { ...legal.hosting!, serverLocationVerified: true }, accessLogRetention: 'none' };
    expect(openLegalItems(base)).toEqual([]);
    // Betreiber ist angegeben (selbst betrieben), nur die rechtliche Prüfung fehlt
    expect(openLegalItems({ ...base, analytics: { instance: 'self', verified: false } }, { analyticsEnabled: true })).toHaveLength(1);
    const none = { ...base, analytics: { instance: null, verified: false } };
    expect(openLegalItems(none, { analyticsEnabled: true })).toHaveLength(2);
    expect(openLegalItems({ ...none, analytics: { instance: 'self', verified: true } }, { analyticsEnabled: true })).toEqual([]);
    expect(openLegalItems({ ...none, analytics: { instance: base.cloudflare, verified: true } }, { analyticsEnabled: true })).toEqual([]);
  });

  it('akzeptiert „keine USt-IdNr.“ und erkennt Widersprüche', () => {
    const base: LegalConfig = { ...legal, hosting: { ...legal.hosting!, serverLocationVerified: true }, accessLogRetention: 14 };
    expect(openLegalItems({ ...base, vatId: null, noVatId: true })).toEqual([]);
    expect(openLegalItems({ ...base, vatId: 'DE123456789', noVatId: false })).toEqual([]);
    expect(openLegalItems({ ...base, vatId: null, noVatId: false })).toHaveLength(1);
    expect(openLegalItems({ ...base, vatId: 'DE123456789', noVatId: true })).toHaveLength(1);
  });
});
