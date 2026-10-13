import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildStaticIndex, cacheControlFor, pickEncoding, resolveClientIp } from '../../server-utils.mjs';

describe('resolveClientIp', () => {
  it('nimmt bei einem Proxy den letzten X-Forwarded-For-Eintrag (Client-Spoofing links wird ignoriert)', () => {
    expect(resolveClientIp({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }, { hops: 1 })).toBe('203.0.113.7');
  });

  it('berücksichtigt mehrere vertrauenswürdige Proxies (Cloudflare + lokaler Proxy)', () => {
    const headers = { 'x-forwarded-for': '6.6.6.6, 203.0.113.7, 172.70.1.1' };
    expect(resolveClientIp(headers, { hops: 2 })).toBe('203.0.113.7');
  });

  it('bevorzugt einen konfigurierten Client-IP-Header', () => {
    const headers = { 'cf-connecting-ip': '203.0.113.9', 'x-forwarded-for': '6.6.6.6, 172.70.1.1' };
    expect(resolveClientIp(headers, { clientIpHeader: 'CF-Connecting-IP' })).toBe('203.0.113.9');
  });

  it('fällt bei fehlendem Header auf X-Forwarded-For zurück und kommt mit zu wenigen Einträgen klar', () => {
    expect(resolveClientIp({ 'x-forwarded-for': '203.0.113.7' }, { hops: 3, clientIpHeader: 'cf-connecting-ip' })).toBe(
      '203.0.113.7',
    );
    expect(resolveClientIp({}, { hops: 1 })).toBeUndefined();
    expect(resolveClientIp({ 'x-forwarded-for': ' , ' }, { hops: 1 })).toBeUndefined();
  });
});

describe('pickEncoding', () => {
  const both = { br: {}, gzip: {} };
  it('bevorzugt Brotli, respektiert q=0 und fehlende Varianten', () => {
    expect(pickEncoding('gzip, deflate, br', both)).toBe('br');
    expect(pickEncoding('br;q=0, gzip', both)).toBe('gzip');
    expect(pickEncoding('br', { gzip: {} })).toBeNull();
    expect(pickEncoding('identity', both)).toBeNull();
    expect(pickEncoding(undefined, both)).toBeNull();
    expect(pickEncoding('*', both)).toBe('br');
  });
});

describe('buildStaticIndex', () => {
  it('indexiert Seiten (auch ohne Kompression) und komprimierte Assets', () => {
    const root = mkdtempSync(join(tmpdir(), 'static-'));
    mkdirSync(join(root, 'blog'));
    writeFileSync(join(root, 'index.html'), 'x');
    writeFileSync(join(root, 'index.html.br'), 'b');
    writeFileSync(join(root, 'blog', 'index.html'), 'y');
    writeFileSync(join(root, 'app.css'), 'c');
    writeFileSync(join(root, 'app.css.gz'), 'g');
    writeFileSync(join(root, 'plain.css'), 'p');
    const index = buildStaticIndex(root);
    expect(index.get('/')?.variants.br).toBeDefined();
    expect(index.has('/blog/')).toBe(true);
    expect(index.get('/blog/')?.variants).toEqual({});
    expect(index.get('/app.css')?.type).toContain('text/css');
    expect(index.has('/plain.css')).toBe(false);
  });
});

describe('cacheControlFor', () => {
  it('cacht gehashte Assets dauerhaft, Bilder einen Tag, Seiten nicht', () => {
    expect(cacheControlFor('/_astro/a.B1.css')).toContain('immutable');
    expect(cacheControlFor('/images/blog/x.webp')).toBe('public, max-age=86400');
    expect(cacheControlFor('/blog/')).toBeNull();
  });
});
