// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';
import { externalLinksPlugin } from './src/lib/external-links-plugin.mjs';

export default defineConfig({
  site: 'https://aboutexport.com',
  trailingSlash: 'ignore',
  // Statische Seiten per Default; nur /api/* läuft serverseitig (prerender = false).
  output: 'static',
  adapter: node({ mode: 'standalone', bodySizeLimit: 32 * 1024 }),
  build: { format: 'directory', inlineStylesheets: 'never' },
  compressHTML: true,
  markdown: {
    processor: satteri({
      hastPlugins: [externalLinksPlugin],
      // Historische Texte zeichengenau erhalten (keine automatische Typografie)
      features: { smartPunctuation: false },
    }),
  },
  // Permanente Weiterleitungen alter WordPress-URLs (301 für GET, 308 sonst)
  redirects: {
    '/category/export-compliance': '/blog/',
    '/category/maerkte-regionen': '/blog/',
    '/author/aboutadmin': '/blog/',
    '/Datenschutz': '/datenschutz/',
    // Cookie-Richtlinie entfällt (keine Cookies) → Abschnitt in der Datenschutzerklärung
    '/cookie-richtlinie': '/datenschutz/',
    // WordPress-Feeds (Kommentare, Kategorien, Autor, Beitrag) → zentraler RSS-Feed
    '/comments/feed': '/feed/',
    '/category/news/feed': '/feed/',
    '/category/regulierung/feed': '/feed/',
    '/category/export-compliance/feed': '/feed/',
    '/category/maerkte-regionen/feed': '/feed/',
    '/author/aboutadmin/feed': '/feed/',
    '/aboutexport-waitlist-early-access/feed': '/feed/',
    '/bafa-exportkontrolle-april-2026/feed': '/feed/',
    '/vision-export-compliance-monitoring/feed': '/feed/',
    // Yoast-/WordPress-Sitemaps (in der Search Console hinterlegt) → neue Sitemap
    '/sitemap_index.xml': '/sitemap.xml',
    '/post-sitemap.xml': '/sitemap.xml',
    '/page-sitemap.xml': '/sitemap.xml',
    '/category-sitemap.xml': '/sitemap.xml',
    '/author-sitemap.xml': '/sitemap.xml',
    '/wp-sitemap.xml': '/sitemap.xml',
    // WordPress-Paginierung (alle Beiträge stehen auf /blog/)
    '/blog/page/2': '/blog/',
    '/blog/page/3': '/blog/',
  },
  devToolbar: { enabled: false },
  image: { service: { entrypoint: 'astro/assets/services/noop' } },
  security: {
    checkOrigin: true,
    // Host-Header, denen Astro für Request-URL/Origin-Check vertraut
    allowedDomains: [
      { hostname: 'aboutexport.com', protocol: 'https' },
      { hostname: 'www.aboutexport.com', protocol: 'https' },
      { hostname: 'staging.aboutexport.com', protocol: 'https' },
      { hostname: 'localhost' },
      { hostname: '127.0.0.1' },
    ],
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
    // Server-Bundle ohne externe node_modules → schlankes Runtime-Image
    ssr: { noExternal: true },
  },
});
