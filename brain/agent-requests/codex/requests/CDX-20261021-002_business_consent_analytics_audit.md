# CDX-20261021-002 — Auditoría de consentimiento y eventos Business

Estado: auditoría de repositorio completada el 2026-10-21; consentimiento validado bloqueado por hallazgos. Aprobado por Jairo; respeta docs/superpowers/specs/2026-10-21-business-paid-traffic-readiness-design.md.

Reporte: `brain/agent-requests/codex/reports/CDX-20261021-002_business_consent_analytics_audit_DONE.md`. Meta 5/5 y Business WhatsApp CTA 5/5; build no ejecutado (solo documentación). Sin cambios de producto, publicación ni cuentas externas. Requiere follow-up separado para consentimiento Meta y decisión explícita sobre GA4/eventos ausentes en la plantilla canónica auditada.

- Owner: Codex Backend Lead.
- Scope: producir un mapa verificable, solo lectura, de consentimiento, carga de GA4/Meta y semántica de eventos de la landing Business. Analítica y Métricas solo monitorea campañas ya activas y sus resultados; no crea ni opera campañas.
- Allowed: inspección de código fuente, configuración tipada y tests; reporte técnico de hallazgos. Este request y su reporte.
- Excluded: cambios en código/producto, cuentas o integraciones externas, eventos y conversión de Ads, IDs de medición, publicación, datos de producción, modificaciones de consentimiento, PII.
- Dependencies: diseño aprobado el 2026-10-21. Revisar PH-044 y la inyección server-side de Meta Pixel junto a la instrumentación de la plantilla.
- Parallel-safe with: CDX-20261021-001 y AGR-20261021-001/002; solo inspección, sin editar archivos de fuente de esos tickets.
- Required findings: punto exacto donde se obtiene consentimiento; si GA4/Meta se cargan antes/después; comportamiento sin consentimiento y sin JavaScript; relación entre consentimiento y PageView/clic; nombres y semántica real de eventos; presencia de PII; gaps, tests existentes y follow-up mínimo.
- Safety: no hacer llamadas a proveedores ni inspeccionar cuentas live; usar solo código, fixtures y pruebas locales. No crear/editar/activar campañas ni asumir que mostrar un banner equivale a bloquear la carga de trackers.
- Verification: citar rutas y líneas, seguir flujo desde configuración/HTML generado hasta eventos, ejecutar únicamente tests locales read-only si hacen falta; declarar explícitamente los límites de evidencia.
- Delivery: rama independiente y reporte DONE. Si aparece un incumplimiento potencial, bloquear la afirmación de “consentimiento validado” y proponer un ticket de corrección con alcance separado; no implementar la corrección aquí.
