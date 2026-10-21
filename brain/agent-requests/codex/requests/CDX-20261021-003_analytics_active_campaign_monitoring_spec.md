# CDX-20261021-003 — Analítica y Métricas: seguimiento de campañas activas

Estado: aprobado como alcance documental por Jairo el 2026-10-21. Analítica y Métricas no crea ni opera campañas.

- Owner: Codex Backend Lead.
- Scope: documentar, con evidencia de código, la situación actual de Analítica y Métricas y el contrato/product requirements para seguimiento de campañas publicitarias ya activas y sus datos, incluidas conversiones de Google Ads cuando haya fuente disponible.
- Allowed: lectura de `analytics-and-metrics-view.tsx`, rutas/servicios relacionados y módulos de campañas; tests locales de lectura si son útiles; crear el reporte DONE y actualizar esta solicitud.
- Excluded: cambios de código/UI, APIs externas, conectar cuentas, configurar tokens/credenciales, crear/editar/activar/pausar campañas o anuncios, presupuestos/pujas, conversiones externas, publicar páginas o alterar integraciones en producción.
- Dependencies: especificación aprobada `docs/superpowers/specs/2026-10-21-business-paid-traffic-readiness-design.md`; no depende del perfil `businessLandingContent`.
- Parallel-safe with: CDX-20261021-001, CDX-20261021-002 y AGR-20261021-001; esta tarea es read-only y el reporte es su único archivo de salida.
- Required findings: controles actuales visibles, fuentes persistidas, estados/modelos internos existentes, qué información de campaña/conversión no existe todavía, aislamiento por partner/site, frescura/periodo de datos a mostrar, semántica de conversión, y decisiones/credenciales que requeriría una integración futura de solo lectura.
- Safety: diferenciar datos de GA4/Meta de conversiones de Google Ads; un clic en WhatsApp no equivale a conversación, registro, compra o venta; no presentar un evento de la landing como conversión de plataforma sin evidencia de esa atribución.
- Delivery: `brain/agent-requests/codex/reports/CDX-20261021-003_analytics_active_campaign_monitoring_spec_DONE.md`, con rutas y líneas, desconocidos, bloqueos y tickets de implementación recomendados. No modificar código del producto.
