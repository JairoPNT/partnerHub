# AGR-20261021-008 — Campo CTA neutro requerido por master Business

Estado: DONE (implementación local; pendiente revisión e integración por CDX006), corrección de integración dentro de la entrega aprobada AGR005/CDX006. Owner: subagente Antigravity/frontend, tier balanced, revisión independiente.

- Outcome: canonical config compatible con el contrato existente del empaquetador, sin URL ni navegación de registro ficticia.
- Evidence: CDX006 con bytes Git reales falla create `BUSINESS_CANONICAL_MASTER_CTA_NOT_EMPTY:directRegisterUrl` y refresh `BUSINESS_MASTER_PACKAGE_REFRESH_CANONICAL_CTA_NOT_EMPTY`. El campo NO existe en config actual; los guardas exigen exactamente cadena vacía, `undefined !== ''`. No hay URL real a sustituir.
- Allowed: solo `plantillas-de-pagina/business/config.js` (restaurar `cta.directRegisterUrl: ''`), nuevo `app/web/scripts/business-template-master-readiness.test.mjs`, request/reporte propios.
- Excluded: app/index/styles/runtime/UI, copy/FAQ/contactos, backend/validadores/registry/package/lock, source/master/clientes/proveedores/publicación reales. No debilitar guardas ni sanear fixture en lugar del canonical.
- Dependencies: config aprobado de plantilla fc47b4d + UI5c0b9b8 y guardas de CDX005 revisados. Parallel-safe CDX006 en scripts/registry distintos, solo lectura de commits; no escritor concurrente de config.
- Verify: RED sobre plantilla canonical real copiada a temp sin editar su configuración; CLI create y refresh reales con output/jobs explícitos bajo temp. GREEN después de única propiedad vacía. Mantener contacto/datos del master neutros y otras propiedades sin cambios. No test que solo busque texto; no aprobación de fuente/registro real. Node20 cuando se use packaging; no sustituir con24 ni modificar validador para verde.
- Delivery: rama aislada, commit/reporte `brain/agent-requests/antigravity/reports/AGR-20261021-008_business_master_neutral_cta_DONE.md`, revisión antes de integrar. No push/merge/publicación por implementer. Los cuatro digests ejecutables de aprobación deben quedar intactos; config no pertenece a esa tabla.
