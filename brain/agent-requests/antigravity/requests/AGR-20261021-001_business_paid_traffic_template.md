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
