# CDX-20261020-006 — Especificación aprobada y plan técnico

- Owner: Codex (diseño técnico/documentación); aprobación de alcance: Jairo, 2026-10-20.
- Resultado: especificación aprobada y plan de implementación escrito/autorrevisado para entrega manual Business desde Master Sites. La revisión del plan por Jairo está pendiente; no se implementó producto.
- Spec: `docs/superpowers/specs/2026-10-20-business-master-sites-manual-delivery-design.md`.
- Plan: `docs/superpowers/plans/2026-10-20-business-master-sites-manual-delivery.md`.
- División: 007 autorización/contrato; 008 preview/input; 009 coordinación por sitio; 010 comandos; AGR-001 UI; 011 integración/gate productivo. Subagentes por tarea y revisión entre entregas, conservando propiedad de Antigravity.
- Auditoría independiente read-only: locks existentes son por job hash, no por sitio. Generación/source-save/publicación legacy permiten entradas externas al worker. El plan cubre estos escritores, reentrada interna, lock ordering, deferral sin fallo ni consumo de intentos, journal recovery y no robo por TTL. No se deshabilitan automatizaciones.
- Verificación: lectura del código y políticas, autorrevisión de cobertura/contratos/límites y `git diff --check`; sin pruebas de producto ni build por ser documentación. No declarar features listas basándose en este reporte.
- Seguridad/gates: allowlist Super Admin humana fail-closed; determinar identidad real administrativa antes de configuración productiva. Publicación solo por acción explícita y partners elegibles; no más credenciales por chat.
- Estado productivo sin cambios: Claudia permanece publicada/verificada; no se pidió regeneración de ningún sitio ni se lanzó publicidad.
- Branch: `codex/CDX-20261020-006-business-master-manual-design`. Sin PR ni merge de esta propuesta antes de revisar el plan.
