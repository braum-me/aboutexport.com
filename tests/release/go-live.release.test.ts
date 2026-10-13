/**
 * Go-live-Gate (npm run release:check): schlägt fehl, solange Pflichtangaben für die
 * Veröffentlichung fehlen. Läuft bewusst NICHT in der normalen CI.
 */
import { describe, expect, it } from 'vitest';
import { legal, openLegalItems } from '../../src/config/legal';
import { readUmami } from '../../src/lib/umami.mjs';

describe('Go-live: rechtliche Pflichtangaben', () => {
  it('alle Angaben für Impressum und Datenschutzerklärung sind bestätigt', () => {
    // Mit denselben UMAMI_*-Variablen wie beim Build ausführen, sonst entfällt die Umami-Prüfung
    expect(openLegalItems(legal, { analyticsEnabled: readUmami() !== null })).toEqual([]);
  });
});
