# PH-011: Archivar registros y limpiar pruebas

## Decision

El estado operativo del empresario (`NEW`, `CONTACTED`, `PAID`, `CONVERTED`, `CANCELLED`) se mantiene separado del estado del registro (`ACTIVE`, `ARCHIVED`).

## Backend contract

- `GET /api/internal/activation-leads` devuelve registros activos.
- `GET /api/internal/activation-leads?includeArchived=true` incluye archivados.
- `PATCH /api/internal/activation-leads/:id` con `{ "recordState": "ARCHIVED" | "ACTIVE" }` archiva o restaura.
- `DELETE /api/internal/activation-leads/:id` exige `{ "confirm": "DELETE_TEST" }`.
- El borrado solo permite registros sin `siteId` y que no estén en estado `PAID` o `CONVERTED`.

## UI handoff

- La vista administrativa debe ofrecer `Archivar` para cualquier registro activo.
- Debe ofrecer `Restaurar` desde la vista de archivados.
- Debe ofrecer `Eliminar prueba` solo cuando el registro no tenga `siteId` y no esté pagado/convertido.
- Ambas acciones requieren confirmación explícita y deben mostrar el impacto.
- El modal debe usar estilos claros por defecto y clases `dark:` coherentes con el tema; no debe forzar fondos oscuros si la vista está en modo claro.
