/**
 * Sätteri-HAST-Plugin: externe Links in Markdown-Inhalten öffnen in neuem Tab
 * und erhalten rel="noopener noreferrer". Interne Links bleiben unverändert.
 */
const SITE_HOSTS = new Set(['aboutexport.com', 'www.aboutexport.com']);

export function isExternalHref(href) {
  if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return false;
  try {
    return !SITE_HOSTS.has(new URL(href).hostname);
  } catch {
    return false;
  }
}

export function externalLinksPlugin() {
  return {
    name: 'external-links',
    element: {
      filter: ['a'],
      visit(node, ctx) {
        if (!isExternalHref(node.properties?.href)) return;
        ctx.setProperty(node, 'target', '_blank');
        ctx.setProperty(node, 'rel', 'noopener noreferrer');
      },
    },
  };
}
