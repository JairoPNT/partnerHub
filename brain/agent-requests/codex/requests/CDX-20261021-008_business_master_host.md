# CDX-20261021-008 — Host actual del master Negocio

Estado: DONE, pruebas/lint/build correctos y revisión independiente/scoped aprobada. Owner: Codex, contrato compartido/backend, tier balanced.

- Outcome: Master Sites abre y genera el master BUSINESS para negocio.ganomaster.pro y el inventario/verificación del servidor usa ese mismo host. ID ganomaster-business sin cambios.
- Evidencia: regla aprobada partnerHostnameContract ya declara negocio.ganomaster.pro, pero lib/ecosystem-contracts (label/URL/envío de formulario), ecosystemService (replicación/verificación) y domainInventoryBuilder aún declaran business.ganomaster.pro.
- Allowed: valores BUSINESS de app/web/lib/ecosystem-contracts.ts (datos compartidos, no JSX/interacción), server/services/ecosystemService.ts, domainInventoryBuilder.ts; nuevo scripts/business-master-host-contract.test.mjs; request/reporte propios y checkpoint puntual brain.
- Excluded: React/estilos/UX, plantillas/consentimiento, Product/Brand, IDs/directorios/rutas remotas, scripts históricos/manifiestos/journals, fuente/master real, DNS/SFTP/publicación/Ads. No reemplazo global de aliases históricos.
- Dependencies: contrato de nombres aprobado existente. Rama desde origin/main dd5d958; independiente de DRAFT235 y no incorpora su release pendiente.
- Parallel-safe: PR235 no cambia estos contratos ni inventario. Un solo writer; revisión secuencial de delta.
- Verify: RED por host antiguo en contrato consumido por Master Sites, lookup de verificación/replicación e inventario real; GREEN sin cambiar IDs, Product/Brand, aliases ni estados UNKNOWN. Suites de dominios/resolver/replicación/verificación pertinentes, lint/build/diff. Ningún test usa proveedores reales.
- Delivery: PR autónomo compatible; autorización humana previa para crear/fusionar PRs sigue vigente. Esto corrige la app después del deploy; no afirma que el host público ya sirva la plantilla.
