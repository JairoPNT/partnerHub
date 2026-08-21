# AGR-20260821-003 — Business Master Full Demo Sanitization — DONE

## Request ID

AGR-20260821-003_business_master_full_demo_sanitization

## Resumen de cambios realizados

1. **Saneamiento Total de Identidades y Contactos en `config.js`**:
   - Se eliminaron todos los valores demostrativos de distribuidor (`brandName: ''`, `firstName: ''`, `fullName: ''`, `role: ''`, `whatsappNumber: ''`, `phoneNumber: ''`, `displayPhone: ''`, `ctaUrl: ''`, `defaultMessage: ''`).
   - Se eliminó el número `573000000000` y cualquier enlace `wa.me` demostrativo.
   - Se eliminó la mención `'Nexus Team'`.
   - Se desactivó `socialProof` (`enabled: false`, `avatars: []`) eliminando todas las rutas de avatares placeholder (`/comunes/placeholders/avatar-*.webp`).
   - Se desactivó `testimonials` (`enabled: false`, `items: []`) eliminando los testimonios de demostración (`Diana Ramos`, `Carlos Mendoza`).
   - Se estableció `cta.secondaryUrl: ''` para evitar enlaces salientes a números de prueba.

2. **Preservación Estricta de Assets Canónicos Aprobados**:
   - Hero Desktop: `https://media.partnerhub.club/comunes/business/v1/hero-desktop.webp`
   - Hero Mobile: `https://media.partnerhub.club/comunes/business/v1/hero-mobile.webp`
   - VSL Video: `https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.mp4` (`provider: 'custom'`)
   - VSL Poster: `https://media.partnerhub.club/comunes/business/v1/vsl/business-vsl-pilot-v1.webp`

3. **Resiliencia de Renderizado y Fallbacks Seguros en `app.js`**:
   - Se eliminaron los fallbacks hardcodeados a `'Nexus Team'` y `'Jairo Pinto'`.
   - Se corrigió trailing whitespace en la invocación de `map` de avatares.
   - Se añadió control de visibilidad para ocultar gracefully el badge del header, la información de contacto y el brand del footer cuando los campos de distribuidor están vacíos en el master sin personalizar.
   - Se aseguró que los enlaces secundarios a WhatsApp y primarios de registro hagan fallback seguro a `#contacto` sin abrir pestañas en blanco ni generar URLs rotas.
   - Se ocultó condicionalmente `#hero-social-proof` cuando `socialProof.enabled === false` o no hay avatares.
   - Se ocultó condicionalmente la sección `#testimonios` cuando `testimonials.enabled === false` o `items` está vacío.

4. **Saneamiento de Marcado Estático en `index.html`**:
   - Se limpiaron los textos estáticos fallback en `<span class="brand-name">`, `<span class="contact-name">`, `<h2 class="footer-brand">` y el copyright del footer.

## Archivos modificados

- `plantillas-de-pagina/business/config.js`
- `plantillas-de-pagina/business/app.js`
- `plantillas-de-pagina/business/index.html`
- `brain/agent-requests/antigravity/requests/AGR-20260821-003_business_master_full_demo_sanitization.md`
- `brain/agent-requests/antigravity/reports/AGR-20260821-003_business_master_full_demo_sanitization_DONE.md`

## SHA-256 de config.js

- `df2fe057bdf723f71487c6d4c466e7ffd27fe982e7a260b84e2860e16fddf26b`

## Verificación realizada

- `git grep -i -E "dQw4w9WgXcQ|GrupoMomentumStarter|images\.unsplash\.com|Nexus Team|573000000000|Diana Ramos|Carlos Mendoza|avatar-[1-4]\.webp" -- plantillas-de-pagina/business/config.js plantillas-de-pagina/business/app.js plantillas-de-pagina/business/index.html` — PASS (0 coincidencias).
- `npm run test:jairo-business-source-dry-run` — PASS (11/11 tests).
- `npm run test:business-vsl-correlation` — PASS (9/9 tests).
- `npm run test:business-vsl-poster` — PASS (5/5 tests).
- `npm run test:ecosystem-templates` — PASS (8/8 tests).
- `npm run test:ecosystem-generation-contract` — PASS (14/14 tests).
- `git diff --check origin/main...HEAD` — PASS (0 errores de whitespace).

## Resultado del build

- `npm run build` en `app/web` — Exitoso (Next.js 16.2.12 Turbopack, 36 rutas generadas/optimizadas).

## Rama y commit

- Rama: `antigravity/AGR-20260821-003-business-master-full-demo-sanitization`
- PR: No abierto (de acuerdo a la política estricta).

## Riesgos pendientes

- Ninguno. La plantilla maestra Business/VSL se encuentra 100% limpia de datos de prueba e identidades ficticias, conservando íntegros los medios canónicos aprobados y soportando perfectamente la inyección posterior de datos por `CDX-013`/`CDX-014`.

## Follow-up

- No requiere follow-up de diseño frontend. Listo para auditoría del orquestador.
