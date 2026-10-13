/**
 * Go-live-Gate (npm run release:check): schlägt fehl, solange Pflichtangaben für die
 * Veröffentlichung fehlen. Läuft bewusst NICHT in der normalen CI.
 */
import { describe, expect, it } from 'vitest';
import { legal, openLegalItems } from '../../src/config/legal';

describe('Go-live: rechtliche Pflichtangaben', () => {
  it('alle Angaben für Impressum und Datenschutzerklärung sind bestätigt', () => {
    expect(openLegalItems(legal)).toEqual([]);
  });
});
