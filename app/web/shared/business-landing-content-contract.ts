import { z } from 'zod';

// Regression guard for the known unsupported claims; human editorial review is
// still required. Match normalized copy, not a generic ban on "results".
const prohibitedCopy = /libertad financiera|ingresos residuales sostenibles|ganas cada vez que alguien toma cafe|resultados desde las primeras semanas|cero inventarios|logistica\s+100%\s+cubierta|(?:formacion|capacitacion)[\s\S]*sin costo|presencia internacional|registros? sanitarios?|respaldo financiero|cupos limitados|asegura tu posicion|8\s+a\s+12\s+horas/;
const normalizeCopy = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ');
const copy = (max: number) => z.string().trim().min(1).max(max).refine(
  (value) => !/[<>]/.test(value) && ![...value].some((character) => {
    const code = character.charCodeAt(0);
    return (code < 32 && ![9, 10, 13].includes(code)) || code === 127;
  }) && !prohibitedCopy.test(normalizeCopy(value)),
  'Content must be plain text without unsupported claims'
);
const imageUrl = z.string().url().refine((value) => {
  // No encoded paths, credentials, query overrides or dot-segment normalization.
  if (!/^https:\/\/media\.partnerhub\.club\/comunes\/business\/[a-zA-Z0-9_./-]+$/.test(value)) return false;
  const path = value.slice('https://media.partnerhub.club'.length);
  return !path.split('/').some((segment) => segment === '.' || segment === '..') && !path.endsWith('/');
}, 'Image must use the approved Business media path');

export const businessLandingContentSchema = z.object({
  hero: z.object({ headline: copy(160), subheadline: copy(400), desktopImageUrl: imageUrl.optional(), mobileImageUrl: imageUrl.optional() }).strict(),
  benefits: z.array(z.object({ title: copy(80), description: copy(240) }).strict()).min(1).max(4),
  theme: z.object({
    fontPreset: z.enum(['executive', 'modern', 'editorial', 'friendly', 'premium', 'minimal', 'serif-chic', 'romantic-serif', 'luxury-serif']),
    palettePreset: z.enum(['cobalt-cyan', 'emerald-slate', 'coffee-gold', 'rose-graphite', 'indigo-lime', 'teal-navy', 'wine-blush', 'forest-mint', 'charcoal-amber', 'sky-stone'])
  }).strict(),
  dedicationText: copy(300)
}).strict();

export type BusinessLandingContent = z.infer<typeof businessLandingContentSchema>;
export const businessLandingContentQuerySchema = z.object({ activationLeadId: z.string().uuid() }).strict();
export const businessLandingContentPutSchema = businessLandingContentQuerySchema.extend({
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), profile: businessLandingContentSchema
}).strict();
export const businessLandingContentResponseSchema = businessLandingContentQuerySchema.extend({
  displayName: z.string(), siteId: z.string(), publicHost: z.string(),
  revision: z.string().regex(/^[a-f0-9]{64}$/), profile: businessLandingContentSchema.nullable()
}).strict();
