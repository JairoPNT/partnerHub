# AGR-20261021-002 — Controles de contenido Business en Master Sites

Estado: aprobado para implementación después de fusionar CDX-20261021-001; respeta docs/superpowers/specs/2026-10-21-business-paid-traffic-readiness-design.md.

- Owner: Antigravity, Lead Product Designer.
- Scope: añadir a Master Sites la experiencia de Super Admin para leer, editar, guardar y previsualizar el perfil de contenido de la landing de un partner Business. Esto edita la landing; Analítica y Métricas solo sigue campañas activas y resultados y no administra campañas.
- Allowed: componentes de Master Sites, componentes frontend nuevos exclusivos de contenido Business, tipos client-safe ya publicados por CDX-001 y tests frontend.
- Excluded: backend/routes/services, Prisma, autorización, archivos de la plantilla HTML/CSS/JS, Product, Personal Brand, pagos/cortesías, publicación automática, DNS/SFTP, proveedores y operaciones de Google/Meta Ads.
- Dependencies: CDX-20261021-001 fusionado y contrato API client-safe final. Consume `businessLandingContentSchema` and only `GET/PUT /api/internal/master-sites/business/content`; fields are hero headline/subheadline, approved media URLs, benefits, official theme presets and dedicationText. No campaign label, state, budget, or bid controls. If the contract differs, stop and request integration/correction; do not copy types or guess payloads.
- Parallel-safe with: CDX-20261021-002 (auditoría de consentimiento) y AGR-20261021-001 (plantilla), porque los módulos son distintos.
- Required behavior: selección inicial vacía; identidad y elegibilidad exclusivamente desde backend; cambios explícitos con revisión esperada; guardar no genera ni publica; vista previa sin mutaciones ni proveedores; un perfil activo de landing por partner en el MVP; ocultar claims no verificados; errores de acceso/revisión sin mostrar datos anteriores como actuales.
- Boundary: Analítica y Métricas solo dará seguimiento de campañas ya activas y datos resultantes; esta vista de Master Sites configura contenido de landing y no crea/edita/activa/pausa campañas ni anuncios.
- Security: no enviar ownerKey, dominio, WhatsApp, entitlement, roles, IDs de seguimiento o rutas de hosting desde el cliente. No renderizar texto recibido como HTML. No hacer selección masiva implícita.
- Verification: estados loading/empty/success/validation/401/403/409/network, respuesta tardía/cambio de partner, selección y guardado explícitos, accesibilidad y responsive. Usar mocks locales, sin escribir datos de un partner real.
- Delivery: rama propia después de CDX-001, reporte DONE con archivos, pruebas, rama/commit/PR, gaps y dependencias de integración. Revisión independiente antes de merge.
