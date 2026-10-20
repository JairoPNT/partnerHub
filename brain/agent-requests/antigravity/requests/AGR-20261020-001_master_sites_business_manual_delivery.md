# AGR-20261020-001 — Master Sites: entrega manual de Negocio

Status: DRAFT / BLOCKED por aprobación de especificación y contrato backend. No ejecutar todavía ni simular controles productivos.

- Owner: Antigravity.
- Outcome: operar la plantilla Business aprobada y publicar partners seleccionados desde Master Sites, sin comandos.
- Allowed files: `app/web/components/master-site-management-view.tsx`, nuevos componentes/tests frontend Business de Master Sites y este request/reporte.
- Excluded: backend/routes/services/auth, Prisma, Docker/env, plantillas HTML/CSS/JS publicadas, fuentes/targets/jobs productivos, otras pantallas.
- Dependencies: aprobación de `docs/superpowers/specs/2026-10-20-business-master-sites-manual-delivery-design.md`; contrato y backend manual Business revisados. No reutilizar `/product-pages/replicate` omitiendo ecosistema.
- Parallel-safe with: futuro ticket Codex backend (rutas/servicios separados), solo después de fijar contrato. Detenerse si otro request toca MasterSiteManagementView.
- Integration notes: Codex provee datos autoritativos y comandos seguros; Antigravity no calcula entitlement, roles, ownerKey, rutas ni payloads de identidad.

## UX requerida

Conservar selector Producto/Negocio/Marca Personal; hacer operativa Negocio. Mostrar una única plantilla Business existente con preview/versión, partners habilitados y bloqueos concretos. Selección inicial vacía, nunca todos preseleccionados. Confirmar versión y partners explícitos. Diferenciar preparación de destino de generación/publicación; ambas son acciones manuales. Seguir jobs hasta estado real, sin convertir un HTTP 201 en «Publicado».

No mezclar fuentes Producto con Negocio ni mostrar información del partner anterior durante una carga. Manejar sesión vencida, acceso denegado, cambio de versión/datos, jobs activos y fallos parciales. No mostrar tokens, hashes técnicos innecesarios ni rutas remotas. No republicar Claudia ni otros sitios desde una apertura de pantalla o una prueba visual.

## Entrega y verificación

Tests de cambio de ecosistema/partner, selección, confirmación, acceso, errores y resultado parcial. Lint/build y revisión responsive/accesibilidad. Reportar archivos, resultados, rama/commit/PR y pendientes en `brain/agent-requests/antigravity/reports/AGR-20261020-001_master_sites_business_manual_delivery_DONE.md` solo cuando se implemente realmente. No producir DONE para este borrador.
