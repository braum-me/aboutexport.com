import { site } from '../config/site';
import { blogCategories } from '../config/blog';
import { getPosts, postUrl } from '../lib/blog';

export const prerender = true;

function entry(path: string, lastmod?: Date): string {
  const loc = new URL(path, site.url).toString();
  return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ''}</url>`;
}

export async function GET(): Promise<Response> {
  const posts = await getPosts();
  const latest = posts[0] ? (posts[0].data.updatedDate ?? posts[0].data.pubDate) : undefined;
  const latestIn = (cat: string) => {
    const p = posts.find((x) => x.data.category === cat);
    return p ? (p.data.updatedDate ?? p.data.pubDate) : undefined;
  };
  const urls = [
    entry('/'),
    entry('/blog/', latest),
    ...Object.keys(blogCategories).map((c) => entry(`/category/${c}/`, latestIn(c))),
    ...posts.map((p) => entry(postUrl(p), p.data.updatedDate ?? p.data.pubDate)),
    entry('/impressum/'),
    entry('/datenschutz/'),
  ].join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
