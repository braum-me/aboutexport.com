// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';
import { asciiHeadingIds, externalLinks } from './src/lib/markdown/plugins.mjs';

export default defineConfig({
  site: 'https://aboutexport.com',
  trailingSlash: 'ignore',
  // Statische Seiten per Default; nur /api/* läuft serverseitig (prerender = false).
  output: 'static',
  adapter: node({ mode: 'standalone', bodySizeLimit: 32 * 1024 }),
  build: { format: 'directory', inlineStylesheets: 'never' },
  compressHTML: true,
  devToolbar: { enabled: false },
  image: { service: { entrypoint: 'astro/assets/services/noop' } },
  // Blog (Content Collections): Shiki nutzt Inline-Styles (CSP-inkompatibel) und wird nicht gebraucht.
  markdown: {
    syntaxHighlight: false,
    processor: satteri({ hastPlugins: [asciiHeadingIds(), externalLinks()] }),
  },
  security: {
    checkOrigin: true,
    // Host-Header, denen Astro für Request-URL/Origin-Check vertraut
    allowedDomains: [
      { hostname: 'aboutexport.com', protocol: 'https' },
      { hostname: 'www.aboutexport.com', protocol: 'https' },
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
