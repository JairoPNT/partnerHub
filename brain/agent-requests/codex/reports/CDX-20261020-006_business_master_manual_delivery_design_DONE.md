# CDX-20261020-006 — Especificación aprobada y plan técnico

- Owner: Codex (diseño técnico/documentación); aprobación de alcance: Jairo, 2026-10-20.
- Resultado: especificación y plan de implementación aprobados por Jairo para entrega manual Business desde Master Sites. PR #212 fusionó los documentos; la ejecución se realiza por tickets separados. Este ticket006 no implementa producto.
- Spec: `docs/superpowers/specs/2026-10-20-business-master-sites-manual-delivery-design.md`.
- Plan: `docs/superpowers/plans/2026-10-20-business-master-sites-manual-delivery.md`.
- División: 007 autorización/contrato; 008 preview/input; 009 coordinación por sitio; 010 comandos; AGR-001 UI; 011 integración/gate productivo. Subagentes por tarea y revisión entre entregas, conservando propiedad de Antigravity.
- Auditoría independiente read-only: locks existentes son por job hash, no por sitio. Generación/source-save/publicación legacy permiten entradas externas al worker. El plan cubre estos escritores, reentrada interna, lock ordering, deferral sin fallo ni consumo de intentos, journal recovery y no robo por TTL. No se deshabilitan automatizaciones.
- Verificación: lectura del código y políticas, autorrevisión de cobertura/contratos/límites y `git diff --check`; sin pruebas de producto ni build por ser documentación. No declarar features listas basándose en este reporte.
- Seguridad/gates: allowlist Super Admin humana fail-closed; determinar identidad real administrativa antes de configuración productiva. Publicación solo por acción explícita y partners elegibles; no más credenciales por chat.
- Estado productivo sin cambios: Claudia permanece publicada/verificada; no se pidió regeneración de ningún sitio ni se lanzó publicidad.
- Branch original: `codex/CDX-20261020-006-business-master-manual-design`; PR [#212](https://github.com/JairoPNT/partnerHub/pull/212), merge `d9b737a793f27c8fc9ec8a861717e03e5206872f` después de aprobación. Seguimiento documental: `codex/CDX-20261020-006-master-sites-ui-handoff`.

## Handoff de ejecución — 2026-10-20

007 completó auth/DTO, pasó revisión independiente y se fusionó por PR #213 (`b84c942906837464933dc723bf55e329e894fa48`).008 y009 trabajan en archivos/worktrees separados. Se actualizó AGR-20261020-001 a READY para frontend contra el contrato007 congelado; backend010 e integración011 siguen siendo dependencias para habilitarlo realmente. El request contiene rutas/tipos exactos, confirmaciones, selección máxima10 vacía, reintento idempotente, aislamiento de respuestas tardías y pruebas requeridas. No modifica UI ni afirma endpoint o feature productiva listos. La prueba productiva no republicará Claudia automáticamente.
