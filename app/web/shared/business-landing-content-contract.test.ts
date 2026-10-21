import assert from 'node:assert/strict';
import { test } from 'node:test';
import { businessLandingContentSchema } from './business-landing-content-contract.ts';

const profile = () => ({
  hero: { headline: 'Explora una actividad independiente', subheadline: 'Conoce las tareas y decide con información.' },
  benefits: [{ title: 'Acompañamiento', description: 'Resuelve tus dudas sobre la actividad.' }],
  theme: { fontPreset: 'modern', palettePreset: 'indigo-lime' },
  dedicationText: 'Puedes empezar desde 2 horas semanales, con acompañamiento desde el inicio. La dedicación para desarrollar la actividad depende de tus objetivos y tareas; no garantiza resultados'
});

test('accepts approved neutral copy and exact text boundaries', () => {
  assert.equal(businessLandingContentSchema.safeParse(profile()).success, true);
  const value = profile();
  value.hero.headline = 'a'.repeat(160); value.hero.subheadline = 'b'.repeat(400);
  value.benefits = Array.from({ length: 4 }, () => ({ title: 'a'.repeat(80), description: 'b'.repeat(240) }));
  value.dedicationText = 'a'.repeat(300);
  assert.equal(businessLandingContentSchema.safeParse(value).success, true);
  for (const field of ['headline', 'subheadline'] as const) {
    for (const text of ['', ' '.repeat(5), 'x'.repeat(field === 'headline' ? 161 : 401)]) {
      const bad = profile(); bad.hero[field] = text;
      assert.equal(businessLandingContentSchema.safeParse(bad).success, false);
    }
  }
  for (const benefits of [[], Array.from({ length: 5 }, () => profile().benefits[0]), [{ title: '', description: 'a' }], [{ title: 'a'.repeat(81), description: 'b' }], [{ title: 'a', description: '' }], [{ title: 'a', description: 'b'.repeat(241) }]])
    assert.equal(businessLandingContentSchema.safeParse({ ...profile(), benefits }).success, false);
  for (const dedicationText of ['', 'x'.repeat(301)]) assert.equal(businessLandingContentSchema.safeParse({ ...profile(), dedicationText }).success, false);
});

test('rejects unknown fields at every profile level and unofficial theme presets', () => {
  for (const value of [{ ...profile(), ctaUrl: 'https://evil.test' }, { ...profile(), hero: { ...profile().hero, html: 'x' } }, { ...profile(), benefits: [{ ...profile().benefits[0], icon: 'x' }] }, { ...profile(), theme: { ...profile().theme, color: '#fff' } }, { ...profile(), theme: { fontPreset: 'arbitrary', palettePreset: 'indigo-lime' } }, { ...profile(), theme: { fontPreset: 'modern', palettePreset: 'arbitrary' } }])
    assert.equal(businessLandingContentSchema.safeParse(value).success, false);
});

test('accepts only canonical images inside the approved Business media path', () => {
  for (const url of ['https://media.partnerhub.club/comunes/business/v1/hero.webp', 'https://media.partnerhub.club/comunes/business/hero-mobile.jpg'])
    assert.equal(businessLandingContentSchema.safeParse({ ...profile(), hero: { ...profile().hero, desktopImageUrl: url, mobileImageUrl: url } }).success, true);
  for (const url of ['http://media.partnerhub.club/comunes/business/a.webp', 'https://evil.test/comunes/business/a.webp', 'https://media.partnerhub.club.evil.test/comunes/business/a.webp', 'https://evil@media.partnerhub.club/comunes/business/a.webp', 'https://media.partnerhub.club/comunes/business/../private/a.webp', 'https://media.partnerhub.club/comunes/business/%2e%2e/private/a.webp', 'https://media.partnerhub.club/comunes/business/%252e%252e/a.webp', 'https://media.partnerhub.club/comunes/business/a.webp?redirect=https://evil.test', 'https://media.partnerhub.club/comunes/producto/a.webp', 'https://media.partnerhub.club:8443/comunes/business/a.webp'])
    assert.equal(businessLandingContentSchema.safeParse({ ...profile(), hero: { ...profile().hero, desktopImageUrl: url } }).success, false, url);
});

test('rejects markup and known unsubstantiated claims without banning neutral results language', () => {
  for (const text of ['<script>alert(1)</script>', '<b>Hola</b>', 'Libertad financiera', 'Ingresos residuales sostenibles', 'Ganas cada vez que alguien toma café', 'Resultados desde las primeras semanas', 'Cero inventarios', 'Logística 100% cubierta', 'Formación sin costo', 'Presencia internacional', 'Registros sanitarios', 'Respaldo financiero', 'Cupos limitados', 'Asegura tu posición', '8 a 12 horas']) {
    assert.equal(businessLandingContentSchema.safeParse({ ...profile(), hero: { ...profile().hero, headline: text } }).success, false, text);
    assert.equal(businessLandingContentSchema.safeParse({ ...profile(), benefits: [{ title: 'Actividad', description: text }] }).success, false, text);
  }
  assert.equal(businessLandingContentSchema.safeParse({ ...profile(), hero: { headline: 'Revisa tus objetivos', subheadline: 'Los resultados dependen de tus tareas; no se garantizan resultados.' } }).success, true);
});
