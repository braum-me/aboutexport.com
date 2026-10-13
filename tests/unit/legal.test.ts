import { describe, expect, it } from 'vitest';
import { legal, openLegalItems, type LegalConfig } from '../../src/config/legal';

describe('legal config', () => {
  it('erfindet keine Angaben: offene Punkte bleiben null', () => {
    expect(legal.operator.company).toBe('Braum Consulting');
    expect(legal.operator.legalForm).toBe('Einzelunternehmen');
    expect(JSON.stringify(legal)).not.toMatch(/Steuer-?ID/i);
  });

  it('meldet fehlende Pflichtangaben und ist vollständig, sobald alles bestätigt ist', () => {
    expect(openLegalItems(legal).length).toBeGreaterThan(0);
    const complete: LegalConfig = {
      ...legal,
      operator: { ...legal.operator, owner: 'Vorname Nachname' },
      noVatId: true,
      hosting: { name: 'H', address: 'A', purpose: 'Hosting', location: 'EU', serverLocation: 'Deutschland' },
      mailbox: { name: 'M', address: 'A', purpose: 'Postfach', location: 'EU' },
      logRetentionDays: 14,
    };
    expect(openLegalItems(complete)).toEqual([]);
  });
});
