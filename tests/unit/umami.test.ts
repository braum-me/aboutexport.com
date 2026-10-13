import { describe, expect, it } from 'vitest';
import { readUmami } from '../../src/lib/umami.mjs';

const ID = '123e4567-e89b-12d3-a456-426614174000';

describe('readUmami()', () => {
  it('ist ohne Variablen aus', () => {
    expect(readUmami({})).toBeNull();
    expect(readUmami({ UMAMI_SCRIPT_URL: '  ', UMAMI_WEBSITE_ID: '' })).toBeNull();
  });

  it('liefert Skript-URL, Origin, ID und Standard-Domains', () => {
    expect(readUmami({ UMAMI_SCRIPT_URL: 'https://stats.example.com/script.js', UMAMI_WEBSITE_ID: ID })).toEqual({
      scriptUrl: 'https://stats.example.com/script.js',
      origin: 'https://stats.example.com',
      websiteId: ID,
      domains: 'aboutexport.com,www.aboutexport.com',
    });
  });

  it('erlaubt eigene Domains', () => {
    expect(readUmami({ UMAMI_SCRIPT_URL: 'https://s.example.com/x.js', UMAMI_WEBSITE_ID: ID, UMAMI_DOMAINS: 'a.de' })?.domains).toBe('a.de');
  });

  it.each([
    [{ UMAMI_SCRIPT_URL: 'https://s.example.com/x.js' }],
    [{ UMAMI_WEBSITE_ID: ID }],
    [{ UMAMI_SCRIPT_URL: 'http://s.example.com/x.js', UMAMI_WEBSITE_ID: ID }],
    [{ UMAMI_SCRIPT_URL: 'kein url', UMAMI_WEBSITE_ID: ID }],
    [{ UMAMI_SCRIPT_URL: 'https://s.example.com/x.js', UMAMI_WEBSITE_ID: 'abc' }],
  ])('bricht bei unvollständiger oder ungültiger Konfiguration ab: %j', (env) => {
    expect(() => readUmami(env)).toThrow(/Umami/);
  });
});
