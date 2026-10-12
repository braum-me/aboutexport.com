import { site } from '../config/site';
import { blogMeta } from '../config/blog';
import { getPosts, postUrl } from '../lib/blog';

// Bisherige WordPress-Feed-URL /feed/ bleibt erhalten (serverseitig, damit kein Dateiendungs-Mapping nötig ist).
export const prerender = false;

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function GET(): Promise<Response> {
  const posts = await getPosts();
  const items = posts
    .map((p) => {
      const url = new URL(postUrl(p), site.url).toString();
      return `    <item>
      <title>${esc(p.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${p.data.pubDate.toUTCString()}</pubDate>
      <description>${esc(p.data.excerpt)}</description>
    </item>`;
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(site.name)} Blog</title>
    <link>${site.url}/blog/</link>
    <atom:link href="${site.url}/feed/" rel="self" type="application/rss+xml" />
    <description>${esc(blogMeta.description)}</description>
    <language>de-DE</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
