/**
 * Produktions-Server: startet den Astro-Node-Handler (statische Dateien + /api/*)
 * und ergänzt Security-Header für alle Antworten.
 */
import http from 'node:http';

process.env.ASTRO_NODE_AUTOSTART = 'disabled';
const { handler } = await import('./dist/server/entry.mjs');

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
const FORWARDED_HEADERS = ['x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-port', 'forwarded'];

const port = Number(process.env.PORT ?? 4321);
const host = process.env.HOST ?? '0.0.0.0';

const server = http.createServer((req, res) => {
  // Ohne vorgeschalteten Reverse Proxy dürfen Clients keine Forwarded-Header setzen.
  if (!TRUST_PROXY) for (const h of FORWARDED_HEADERS) delete req.headers[h];
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value);
  res.removeHeader('X-Powered-By');
  // Gehashte Build-Assets langfristig cachen
  if (req.url?.startsWith('/_astro/')) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  handler(req, res);
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.listen(port, host, () => {
  console.log(JSON.stringify({ ts: new Date().toISOString(), scope: 'server', msg: `listening on http://${host}:${port}` }));
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
