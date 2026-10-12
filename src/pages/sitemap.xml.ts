import { site } from '../config/site';
import { categories } from '../config/blog';
import { getPosts, postPath } from '../lib/blog';

export const prerender = true;

const staticPages = ['/', '/blog/', '/impressum/', '/datenschutz/'];

export async function GET(): Promise<Response> {
  const posts = await getPosts();
  const entries = [
    ...staticPages.map((p) => ({ loc: p, lastmod: undefined as Date | undefined })),
    ...Object.values(categories).map((c) => ({ loc: `/category/${c.slug}/`, lastmod: undefined as Date | undefined })),
    ...posts.map((p) => ({ loc: postPath(p), lastmod: p.data.updatedDate ?? p.data.pubDate })),
  ];
  const urls = entries
    .map(({ loc, lastmod }) => {
      const mod = lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : '';
      return `  <url><loc>${new URL(loc, site.url).toString()}</loc>${mod}</url>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
