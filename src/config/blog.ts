/** Blog-Kategorien – Slugs entsprechen den bisherigen WordPress-URLs (/category/<slug>/). */
export const categories = {
  news: { slug: 'news', label: 'Produktnews', description: 'Neuigkeiten zu AboutExport, Waitlist und Launch.' },
  regulierung: {
    slug: 'regulierung',
    label: 'Regulierung & Recht',
    description: 'Einordnungen zu Exportkontrolle, Sanktionen und regulatorischen Änderungen.',
  },
} as const;

export type CategoryId = keyof typeof categories;
