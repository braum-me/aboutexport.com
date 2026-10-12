/**
 * Hast-Plugins für Astros Markdown-Prozessor Sätteri (ohne zusätzliche Dependencies).
 */

const umlauts = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

/** Lesbare ASCII-Slugs (ä → ae, ß → ss …) – Anker bleiben ohne Prozent-Kodierung teilbar. */
export function slugifyAscii(text) {
  return String(text)
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => umlauts[c])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Setzt ASCII-IDs für Überschriften, bevor Astro eigene IDs vergibt (vorhandene IDs werden respektiert). */
export function asciiHeadingIds() {
  return () => {
    const seen = new Map();
    return {
      name: 'ascii-heading-ids',
      element: {
        filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        visit(node, ctx) {
          if (typeof node.properties?.id === 'string') return;
          const base = slugifyAscii(ctx.textContent(node)) || 'abschnitt';
          const n = seen.get(base) ?? 0;
          seen.set(base, n + 1);
          ctx.setProperty(node, 'id', n ? `${base}-${n}` : base);
        },
      },
    };
  };
}

/** Externe Links: rel="external noopener noreferrer", öffnen in neuem Tab. */
export function externalLinks() {
  return {
    name: 'external-links',
    element: {
      filter: ['a'],
      visit(node, ctx) {
        const href = String(node.properties?.href ?? '');
        if (!/^https?:\/\//i.test(href)) return;
        ctx.setProperty(node, 'rel', 'external noopener noreferrer');
        ctx.setProperty(node, 'target', '_blank');
      },
    },
  };
}
