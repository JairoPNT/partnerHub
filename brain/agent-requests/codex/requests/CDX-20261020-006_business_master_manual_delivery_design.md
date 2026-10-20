# CDX-20261020-006 — Diseño de entrega manual Business

- Owner: Codex (definición técnica y handoff; aprobación de Jairo).
- Scope: acotar el flujo manual de Master Sites para la plantilla Business ya aprobada; sin ZIP ni variantes.
- Allowed files: esta solicitud, especificación `docs/superpowers/specs/2026-10-20-business-master-sites-manual-delivery-design.md`, plan `docs/superpowers/plans/2026-10-20-business-master-sites-manual-delivery.md` y reporte006; request frontend AGR-20261020-001.
- Excluded: código de producto, UI, infraestructura, credenciales, datos productivos, otras publicaciones.
- Dependencies: cierre CDX-20261020-002 y PR #210/#211; decisión de Jairo de usar las plantillas existentes.
- Parallel-safe with: ninguno activo que edite estas rutas; los futuros tickets backend/UI se dividen tras aprobar el contrato.
- Integration notes: se propone reutilizar generador, provisioning y worker actuales, no extender replicación PRODUCT por defecto.
- Status: especificación aprobada por Jairo el 2026-10-20. Plan técnico escrito y autorrevisado; pendiente revisión de Jairo antes de implementar. Método conservado: subagentes por tarea Codex y revisión entre entregas; frontend por Antigravity. No hay cambios de producto.
