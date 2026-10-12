import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Blog-Beiträge (migriert von der bisherigen WordPress-Seite).
 * Der Dateiname ist der Slug – die URLs bleiben unverändert: /<slug>/
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    /** SEO-Titel (ohne " | AboutExport"), übernommen aus dem bisherigen SEO-Plugin */
    seoTitle: z.string().optional(),
    description: z.string(),
    excerpt: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['news', 'regulierung']),
    author: z.string().default('Das AboutExport Team'),
    /** Beitragsbild unter /public */
    image: z.string(),
    imageAlt: z.string().optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
