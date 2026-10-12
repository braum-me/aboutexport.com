export const blogCategories = {
  news: {
    label: 'Produktnews',
    title: 'Produktnews',
    description: 'Neuigkeiten rund um AboutExport: Entwicklungsstand, Waitlist und Roadmap.',
  },
  regulierung: {
    label: 'Regulierung & Recht',
    title: 'Regulierung & Recht',
    description: 'Einordnungen zu regulatorischen Änderungen in der Exportkontrolle – mit Stand des jeweiligen Veröffentlichungsdatums.',
  },
} as const;

export type BlogCategory = keyof typeof blogCategories;

export const blogMeta = {
  title: 'Blog',
  description:
    'Produktnews von AboutExport und Einordnungen zu Änderungen in der Exportkontrolle – mit Originaldatum und klarem Stand der Information.',
} as const;
