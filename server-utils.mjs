/**
 * Hilfsfunktionen für server.mjs (ohne Seiteneffekte, per Vitest getestet).
 */
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** Content-Types der vorkomprimierten Dateitypen */
export const COMPRESSIBLE_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

/**
 * Ermittelt die Client-IP hinter Reverse Proxies.
 * - clientIpHeader (z. B. "cf-connecting-ip"): Header, den der vorderste Proxy selbst setzt
 * - sonst X-Forwarded-For: der Eintrag `hops` Positionen von rechts (jeder vertrauenswürdige Proxy hängt einen an),
 *   damit vom Client mitgeschickte Einträge links davon ignoriert werden.
 */
export function resolveClientIp(headers, { hops = 1, clientIpHeader = '' } = {}) {
  if (clientIpHeader) {
    const v = headers[clientIpHeader.toLowerCase()];
    const ip = (Array.isArray(v) ? v[0] : v)?.trim();
    if (ip) return ip;
  }
  const xff = headers['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff.join(',') : xff;
  if (!raw) return undefined;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return undefined;
  const n = Math.max(1, Math.floor(hops) || 1);
  return list[Math.max(0, list.length - n)];
}

/** Bevorzugte Kodierung aus Accept-Encoding (br vor gzip, q=0 respektiert) */
export function pickEncoding(acceptEncoding, available) {
  if (!acceptEncoding) return null;
  const accepted = new Map();
  for (const part of String(acceptEncoding).split(',')) {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    if (!name) continue;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    accepted.set(name, q ? Number(q.slice(2)) : 1);
  }
  const ok = (enc) => {
    const q = accepted.has(enc) ? accepted.get(enc) : accepted.get('*');
    return q !== undefined && q > 0;
  };
  if (available.br && ok('br')) return 'br';
  if (available.gzip && ok('gzip')) return 'gzip';
  return null;
}

/**
 * Indexiert dist/client: URL-Pfad → Datei mit vorkomprimierten Varianten (.br/.gz).
 * Verzeichnis-Index (/blog/ → /blog/index.html) wird berücksichtigt.
 */
export function buildStaticIndex(root) {
  const index = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const ext = entry.name.slice(entry.name.lastIndexOf('.'));
      const type = COMPRESSIBLE_TYPES[ext];
      if (!type) continue;
      const variants = {};
      for (const [enc, suffix] of [
        ['br', '.br'],
        ['gzip', '.gz'],
      ]) {
        try {
          variants[enc] = { path: full + suffix, size: statSync(full + suffix).size };
        } catch {
          /* keine Variante vorhanden */
        }
      }
      // HTML-Seiten immer indexieren (Slash-Redirect), andere Dateien nur mit komprimierter Variante
      if (!variants.br && !variants.gzip && ext !== '.html') continue;
      const st = statSync(full);
      const urlPath = '/' + relative(root, full).split(sep).join('/');
      const record = { type, mtime: st.mtime, size: st.size, variants };
      index.set(urlPath, record);
      if (urlPath.endsWith('/index.html')) index.set(urlPath.slice(0, -'index.html'.length), record);
    }
  };
  walk(root);
  return index;
}

/** Cache-Control für statische Dateien */
export function cacheControlFor(pathname) {
  if (pathname.startsWith('/_astro/')) return 'public, max-age=31536000, immutable';
  // Nicht gehashte Bilder/Icons: einen Tag cachen, danach per ETag revalidieren
  if (/\.(png|jpe?g|webp|avif|gif|ico|svg|woff2?)$/i.test(pathname)) return 'public, max-age=86400';
  return null;
}
