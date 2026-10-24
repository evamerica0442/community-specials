import { z } from 'zod';

export const LOCALES = ['en', 'af'] as const;
export type Locale = (typeof LOCALES)[number];

export const CATEGORIES = [
  'food',
  'retail',
  'services',
  'automotive',
  'health',
  'education',
  'liquor',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dateString = /^\d{4}-\d{2}-\d{2}$/;
// Lowercase kebab-case file path inside /flyers, optionally in subfolders.
const flyerPath = /^(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:webp|jpg|jpeg|png)$/;

export const siteSchema = z.object({
  id: z
    .string()
    .regex(kebabCase, 'Site id must be kebab-case, e.g. "groenberg-school".'),
  name: z.string().min(1, 'Site name is required.'),
  url: z.string().min(1, 'Site url is required (use "TODO" until the site is live).'),
  locales: z.array(z.enum(LOCALES)).min(1, 'A site needs at least one locale.'),
  blockedCategories: z.array(z.string()).default([]),
  childFocused: z.boolean().default(false),
});
export type Site = z.infer<typeof siteSchema>;

export const specialSchema = z.object({
  id: z
    .string()
    .regex(kebabCase, 'Special id must be kebab-case, e.g. "anna-bakery-bread-deal".'),
  businessId: z.string().min(1, 'businessId is required.'),
  businessName: z.string().min(1, 'businessName is required.'),
  category: z.enum(CATEGORIES),
  flyer: z
    .string()
    .regex(flyerPath, 'Flyer must be a webp, jpg or png path inside /flyers, e.g. "flyers/my-flyer.webp".'),
  altEn: z.string().min(1, 'altEn (English alt text) is required.'),
  altAf: z.string().min(1, 'altAf (Afrikaans alt text) is required.'),
  captionEn: z.string().min(1, 'captionEn is required.'),
  captionAf: z.string().min(1, 'captionAf is required.'),
  url: z.string().regex(/^https:\/\//, 'url must start with https (wa.me and facebook.com links are fine).'),
  startDate: z.string().regex(dateString, 'startDate must be YYYY-MM-DD.'),
  endDate: z.string().regex(dateString, 'endDate must be YYYY-MM-DD.'),
  showOn: z.array(z.string()).min(1, 'showOn needs at least one site id, or ["*"].'),
  approved: z.boolean().default(false),
});
export type Special = z.infer<typeof specialSchema>;

function uniqueIds(kind: string) {
  return (entries: Array<{ id: string }>, ctx: z.RefinementCtx) => {
    const seen = new Set<string>();
    for (const entry of entries) {
      if (seen.has(entry.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate ${kind} id "${entry.id}". Ids must be unique.`,
        });
        return;
      }
      seen.add(entry.id);
    }
  };
}

export const sitesFileSchema = z.array(siteSchema).superRefine(uniqueIds('site'));

export const specialsFileSchema = z
  .array(specialSchema)
  .superRefine(uniqueIds('special'))
  .superRefine((entries, ctx) => {
    entries.forEach((entry, index) => {
      if (entry.endDate < entry.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'endDate'],
          message: `"${entry.id}": endDate (${entry.endDate}) must not be before startDate (${entry.startDate}).`,
        });
      }
    });
  });
