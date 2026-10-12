import { site } from '../config/site';

export const prerender = true;

const pages = ['/', '/impressum/', '/datenschutz/'];

export function GET(): Response {
  const urls = pages.map((p) => `  <url><loc>${new URL(p, site.url).toString()}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
