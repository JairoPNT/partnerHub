# CDX-20261020-006 — Diseño de entrega manual Business

- Owner: Codex (definición técnica y handoff; aprobación de Jairo).
- Scope: acotar el flujo manual de Master Sites para la plantilla Business ya aprobada; sin ZIP ni variantes.
- Allowed files: esta solicitud y la especificación `docs/superpowers/specs/2026-10-20-business-master-sites-manual-delivery-design.md`; request frontend AGR-20261020-001.
- Excluded: código de producto, UI, infraestructura, credenciales, datos productivos, otras publicaciones.
- Dependencies: cierre CDX-20261020-002 y PR #210/#211; decisión de Jairo de usar las plantillas existentes.
- Parallel-safe with: ninguno activo que edite estas rutas; los futuros tickets backend/UI se dividen tras aprobar el contrato.
- Integration notes: se propone reutilizar generador, provisioning y worker actuales, no extender replicación PRODUCT por defecto.
- Status: especificación escrita y autorrevisada; pendiente revisión de Jairo. No se ha iniciado implementación.
