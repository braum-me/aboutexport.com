import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Blog-Beiträge (migriert von WordPress, Stand 12.10.2026).
 * pubDate ist das Datum der Veröffentlichung auf dieser Website. Bei migrierten Beiträgen
 * steht das ursprüngliche WordPress-Datum in legacy.publishedDate und wird auf der Seite ausgewiesen.
 * Beiträge mit pubDate in der Zukunft erscheinen erst bei einem Build ab diesem Zeitpunkt.
 */
const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().min(1),
    /** Vollständiger <title>, unverändert aus Yoast SEO übernommen */
    seoTitle: z.string().optional(),
    description: z.string().min(1).max(200),
    excerpt: z.string().min(1),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['news', 'regulierung']),
    /** product = Produktnews, regulatory = historische Regulierungsmeldung */
    kind: z.enum(['product', 'regulatory']),
    author: z.string().default('AboutExport Team'),
    image: z.object({
      src: z.string().startsWith('/images/blog/'),
      og: z.string().startsWith('/images/blog/'),
      alt: z.string().min(1),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
    legacy: z
      .object({
        wpId: z.number().int(),
        url: z.url(),
        /** Ursprüngliches Veröffentlichungsdatum in WordPress (bleibt sichtbar, wenn pubDate neu gesetzt wurde) */
        publishedDate: z.coerce.date().optional(),
        /** Letztes Änderungsdatum in WordPress, falls danach korrigiert wurde */
        modifiedDate: z.coerce.date().optional(),
      })
      .optional(),
    /** Transparent ausgewiesene nachträgliche Änderungen (öffentlich sichtbar) */
    corrections: z
      .array(
        z.object({
          date: z.coerce.date(),
          summary: z.string().min(1),
          changes: z.array(z.object({ from: z.string(), to: z.string() })).default([]),
        }),
      )
      .default([]),
    /** Interne redaktionelle Prüfhinweise – nur im Repository, nicht öffentlich dargestellt */
    review: z
      .object({
        status: z.enum(['pending', 'done']),
        notes: z.array(z.string()).default([]),
        resolved: z.array(z.string()).default([]),
      })
      .default({ status: 'done', notes: [], resolved: [] }),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
