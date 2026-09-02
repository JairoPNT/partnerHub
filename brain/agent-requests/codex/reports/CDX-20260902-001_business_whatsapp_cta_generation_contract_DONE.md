# CDX-20260902-001 — DONE

## Resultado

Se corrigió el contrato de generación Business que eliminaba el bloque `cta`
antes de construir `config.js`. El generador ahora emite ambos enlaces de
WhatsApp desde el número y mensaje ya validados, conserva únicamente el copy
permitido y mantiene deshabilitado el registro directo.

## Cambios

- Helper puro para derivar `primaryUrl` y `secondaryUrl` de WhatsApp.
- Validación fail-closed de número y mensaje.
- El schema acepta solo textos CTA; URLs y campos arbitrarios de la fuente se
  descartan antes de normalizar.
- `directRegisterUrl` siempre queda vacío para Business.
- La normalización Product/Personal Brand no recibe este contrato.
- Regresión directa sobre la normalización productiva, además de pruebas del
  helper contra URLs maliciosas.

## Archivos

- `app/web/server/services/productPageGenerationService.ts`
- `app/web/server/services/businessWhatsappCta.ts`
- `app/web/server/services/businessWhatsappCta.test.ts`
- `app/web/server/services/productPageGenerationBusinessCta.test.ts`
- `app/web/package.json`
- Request y este reporte

## Verificación

- Business WhatsApp CTA: 5/5 PASS.
- Jairo Business source dry-run: 14/14 PASS.
- Guarded ecosystem publication: 18/18 PASS.
- Jairo Business publication preparation: 7/7 PASS.
- Total focalizado/regresión: 44/44 PASS.
- ESLint focalizado `--max-warnings=0`: PASS.
- Next.js production build y TypeScript: PASS; solo warnings preexistentes de
  workspace root/NFT.
- `git diff --check`: PASS.

## Git

- Base: `origin/main` `dad5ba1505440cfeca2e3cb618e1f1131da84901`.
- Rama: `codex/CDX-20260902-001-business-whatsapp-cta-contract`.
- Commit de implementación: `4806a4e`.
- PR: https://github.com/JairoPNT/partnerHub/pull/184

## Seguridad y operaciones

- No se ejecutaron SFTP, Hostinger, DNS, SSL, EasyPanel APPLY ni publicación.
- No se modificaron fuentes, paquetes generados ni PublishingTarget.
- Ninguna URL CTA suministrada por la fuente puede atravesar el normalizador.

## Follow-up

Sí. Después de merge/autodeploy se debe renovar la capability SFTP, repetir el
PREVIEW de preparación y autorizar por separado los nuevos hashes de
preparación y publicación.
