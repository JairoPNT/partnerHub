# AGR-20261021-001 — Plantilla Business segura para tráfico pagado

Estado: aprobado para implementación por Jairo el 2026-10-21; respeta docs/superpowers/specs/2026-10-21-business-paid-traffic-readiness-design.md.

- Owner: Antigravity, Lead Product Designer.
- Scope: actualizar exclusivamente la plantilla canónica Business para representar de forma segura el perfil de contenido de landing configurado por partner y tener fallbacks neutrales listos para tráfico pagado.
- Allowed: plantillas-de-pagina/business/** y tests de plantilla correspondientes.
- Excluded: backend, Prisma, APIs, autorización, Master Sites UI, Product, Personal Brand, cuenta de Ads/Analytics, hosting, publicación externa.
- Dependencies: diseño aprobado el 2026-10-21; consume `window.CONFIG.businessLandingContent` with the exact schema there (hero headline/subheadline, optional approved hero media, 1–4 benefits, official theme presets, dedicationText). Do not change identity, domains, WhatsApp number or partner identity from the template.
- Parallel-safe with: CDX-20261021-001 y CDX-20261021-002, porque trabajan en módulos backend/auditoría; coordinar el nombre final del objeto de configuración mediante el contrato del spec, sin inventar campos. Esta tarea no crea ni administra campañas publicitarias.
- Review existing work: inspeccionar el resultado reportado como AGR-20261020-003 y reaprovecharlo únicamente tras verificar los archivos/commit; no asumir que está en main o desplegado. No duplicar cambios.
- Required behavior: eliminate income/time claims and unsupported urgency; use WhatsApp-intent CTA labels only; keep disclosure fixed/non-removable; show Claudia's exact approved dedication in her profile; VSL visible with generic title and no duration until asset verified; claims, testimonials and optional success navigation disabled by default; render profile text as text, validate media host, preserve existing selectors/events and do not change event semantics.
- Claudia: el perfil debe poder recibir el enfoque aprobado de autonomía, universitarios, acompañamiento y paleta juvenil azul/lima/blanco. No escribirlo como default del master común y no inventar credenciales, resultados o relación corporativa.
- Verification: pruebas de copy prohibido/permitido, CTAs/destinos, fallbacks, claims opcionales, VSL sin duración validada, contenido escapado, responsive desktop/móvil y regresiones de template. No desplegar ni generar/publicar páginas reales.
- Delivery: rama propia desde main actualizado y reporte DONE con archivos, pruebas, rama/commit/PR, riesgos de evidencia y follow-up.

## Handoff verificado por el orquestador — 2026-10-21

- El commit `cc73cff736ddf63fdd5b8e663efed7e6dc0f0db3` existe. Su rama también incluye `53a1c65` (personalizador visual). Partir de `origin/main` y portar solo los cambios necesarios del request; no fusionar la rama completa como sustituto de esta revisión.
- `config.js` compartido contiene nombre, WhatsApp y URL de Claudia; `index.html` también fija su identidad en microcopy y términos. Deben sustituirse por identidad derivada del partner o fallback genérico; la dedicación de dos horas corresponde al perfil de Claudia.
- No existe todavía lectura de `window.CONFIG.businessLandingContent` en ese commit. Consumir el contrato congelado de este request; los campos de perfil no pueden cambiar destinatarios, aviso obligatorio, VSL ni instrumentación.
- El renderer actual permite ocultar el aviso con `modelNotice.enabled: false`; el aviso obligatorio debe permanecer visible. `businessMasterContent.ts` selecciona campos del master y descarta `modelNotice`; la comprobación debe incluir CONFIG generado, no solo abrir el config canónico.
- El commit añade eventos `click_cta` / `WhatsAppClick`; esos listeners no están en la plantilla canónica de `origin/main`. No afirmar que se preservó medición ya instalada basándose solo en esos nombres. La auditoría CDX-20261021-002 determina el flujo real; no integrar cambios de consentimiento/tracking en este request de contenido.
- Siguen afirmaciones de compañía internacional, logística y conformidad normativa sin evidencia adjunta y el caption dice “Presentación oficial”. Neutralizar u ocultar cuando no exista evidencia; no describir la página o el video independiente como oficial corporativo.
- La política de privacidad heredada afirma que solo se tratan datos de WhatsApp; esto no describe la inyección de Meta Pixel encontrada en el generador. Coordinar su texto factual con el informe de consentimiento, sin certificar cumplimiento legal ni alterar proveedores.
- Revisar el personalizador heredado: `masterStyle=1` y hostname permiten habilitarlo en páginas cliente. Este request no debe añadir ese control al paquete de producción de partners.
- La aprobación del diseño y los planes ya está dada. Entregar PR/reporte revisable; la publicación de Claudia sigue su gate separado después de integrar y comprobar el paquete.
