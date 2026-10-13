/**
 * Produktions-Server: startet den Astro-Node-Handler (statische Dateien + /api/*)
 * und ergänzt Security-Header, vorkomprimierte Auslieferung (br/gzip) und Proxy-Handling.
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildStaticIndex, cacheControlFor, pickEncoding, resolveClientIp } from './server-utils.mjs';

process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { handler } = await import('./dist/server/entry.mjs');

const log = (msg, extra = {}) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), scope: 'server', msg, ...extra }));

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  // Ergänzt die per <meta> gesetzte CSP (Hashes für Skripte/Styles) um Direktiven, die nur als Header wirken.
  'Content-Security-Policy': "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
};

const TRUST_PROXY = process.env.TRUST_PROXY === 'true';
// Anzahl vertrauenswürdiger Proxies, die X-Forwarded-For ergänzen (z. B. 2 = Cloudflare + lokaler Reverse Proxy)
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS ?? 1);
// Optional: Header mit der echten Client-IP, den der vorderste Proxy setzt (z. B. cf-connecting-ip)
const CLIENT_IP_HEADER = (process.env.CLIENT_IP_HEADER ?? '').trim().toLowerCase();
const FORWARDED_HEADERS = ['x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-port', 'forwarded'];

const port = Number(process.env.PORT ?? 4321);
const host = process.env.HOST ?? '0.0.0.0';

// Vorkomprimierte statische Dateien (scripts/precompress.mjs beim Build)
const clientRoot = fileURLToPath(new URL('./dist/client/', import.meta.url));
const staticIndex = buildStaticIndex(clientRoot);

function servePrecompressed(req, res, pathname) {
  const entry = staticIndex.get(pathname);
  if (!entry) return false;
  res.setHeader('Vary', 'Accept-Encoding');
  const enc = pickEncoding(req.headers['accept-encoding'], entry.variants);
  if (!enc) return false; // unkomprimiert über den Astro-Handler
  const variant = entry.variants[enc];
  const etag = `W/"${enc}-${entry.size.toString(16)}-${entry.mtime.getTime().toString(16)}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', entry.mtime.toUTCString());
  res.setHeader('Cache-Control', cacheControlFor(pathname) ?? 'public, max-age=0');
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304);
    res.end();
    return true;
  }
  res.writeHead(200, { 'Content-Type': entry.type, 'Content-Encoding': enc, 'Content-Length': variant.size });
  if (req.method === 'HEAD') {
    res.end();
    return true;
  }
  createReadStream(variant.path)
    .on('error', () => res.destroy())
    .pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  if (TRUST_PROXY) {
    // Nur die vom vertrauenswürdigen Proxy ermittelte Client-IP weitergeben (Rate Limiting)
    const ip = resolveClientIp(req.headers, { hops: TRUST_PROXY_HOPS, clientIpHeader: CLIENT_IP_HEADER });
    if (ip) req.headers['x-forwarded-for'] = ip;
    else delete req.headers['x-forwarded-for'];
  } else {
    // Ohne vorgeschalteten Reverse Proxy dürfen Clients keine Forwarded-Header setzen.
    for (const h of FORWARDED_HEADERS) delete req.headers[h];
  }
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value);
  res.removeHeader('X-Powered-By');

  const [rawPath, query] = (req.url ?? '/').split('?', 2);
  let pathname = rawPath;
  try {
    pathname = decodeURIComponent(rawPath);
  } catch {
    /* ungültige Kodierung → Astro-Handler antwortet */
  }

  if (pathname === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : 'ok');
    return;
  }

  const isRead = req.method === 'GET' || req.method === 'HEAD';
  // Wie bisher unter WordPress: Seiten-URLs ohne Slash permanent auf die Slash-Variante umleiten –
  // nur wenn die Seite existiert, damit Redirects/404 ohne Zwischenschritt beantwortet werden.
  if (isRead && pathname.length > 1 && !pathname.endsWith('/') && staticIndex.has(`${pathname}/`)) {
    res.writeHead(301, { location: `${rawPath}/${query ? `?${query}` : ''}` });
    res.end();
    return;
  }

  const cacheControl = cacheControlFor(pathname);
  if (cacheControl) res.setHeader('Cache-Control', cacheControl);
  if (isRead && servePrecompressed(req, res, pathname)) return;
  handler(req, res);
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 65_000; // länger als typische Proxy-Idle-Timeouts (vermeidet 502 bei Keep-Alive)
server.listen(port, host, () => {
  log(`listening on http://${host}:${port}`, { precompressed: staticIndex.size, trustProxy: TRUST_PROXY });
});

let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  log('shutdown', { signal });
  server.close(() => process.exit(0));
  server.closeIdleConnections();
  // Spätestens nach 10 s beenden (Docker stop_grace_period: 15 s)
  setTimeout(() => process.exit(0), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => log('unhandledRejection', { error: String(err) }));
process.on('uncaughtException', (err) => {
  log('uncaughtException', { error: String(err) });
  process.exit(1); // Container-Restart-Policy startet neu
});
