# AGR-20261020-001 — Entrega manual Business en Master Sites

- Request ID: `AGR-20261020-001`
- Estado: implementado; pendiente build/revisión de integración antes de merge o habilitación productiva.
- Rama actual de integración: `codex/CDX-20261023-001-master-sites-business-integration`
- Commits frontend: `e8cb723`, `cbf36d2`, `f4ca0d1`
- PR: ninguno creado por este ticket.

## Resumen y archivos

La pestaña Negocio ahora muestra la plantilla Business aprobada, vista previa validada, partners y bloqueos, selección vacía de máximo 10, confirmación de versión/URLs, preparación de destino separada de generación/publicación, resultados individuales y estados reales de jobs. Los POST son individuales e idempotentes por requestId; conflictos requieren revisión nueva y respuestas inciertas conservan el cuerpo exacto para reintento explícito. Producto y Marca Personal conservan sus flujos.

Archivos modificados: `app/web/components/master-site-management-view.tsx`; nuevos `master-sites-business-delivery-view.tsx`, `master-sites-business-delivery-model.ts`, `master-sites-business-delivery-api.ts` y sus dos `.test.ts` bajo `app/web/components/`. Reporte detallado y capturas locales: `.superpowers/sdd/2026-10-20-business-master-sites-manual-delivery/task-5-report.md`.

## Verificación y build

- TDD y tests frontend/model/API de la última fuente: 23/23 pasan.
- ESLint de los seis archivos del ticket: exit 0, sin warnings.
- QA Chrome local con GET/POST falsos: desktop, móvil, teclado, resultado parcial, preparar→publicar, continuación TARGET_PENDING/FAILED/CANCELLED/CURRENT, sibling aislado y reintento exacto tras respuesta incierta; exit 0. Sin escrituras reales.
- `git diff --check`: exit 0.
- Build completo de `f4ca0d1`: pendiente de ejecución única por el controlador de integración. Un build previo del branch terminó bien, pero no cubre la última fuente. Typecheck general no verde por 29 errores preexistentes de tests ajenos; ninguno señala archivos de este ticket.

## Riesgos y follow-up

Revisión independiente/CDX-20261023-001 y verificación de autorización Super Admin siguen siendo gates antes de merge/producción. No se regeneró ni publicó Claudia ni otro cliente. Claudia conserva una restricción operativa por medición durable aún no integrada; este frontend no implementa un bloqueo backend específico. El requestId incierto solo permanece en memoria mientras la vista siga montada: al volver a entrar se debe consultar primero el estado servidor. No hay follow-up frontend solicitado; la integración/revisión sí es obligatoria.

## Corrección tras revisión independiente — ronda 1

Commit frontend `cbf36d2`. Se corrigieron tres hallazgos: un GET anterior ya no puede restaurar acceso tras POST 401/403 ni borrar el gate de refresco tras POST 409; una respuesta de comando para otro `activationLeadId` se trata como incierta y conserva el requestId/cuerpo original para reintento explícito. Pruebas TDD API/model actualizadas: 19/19 pasan. ESLint enfocado: exit 0. QA Chrome con HTTP falso: carreras de GET retenido frente a POST 401/403/409, refresco posterior a 409 y resultado de otro partner con reintento exacto; exit 0. `git diff --check`: exit 0. No se repitió el build/global suite: el build previo reportado por integración fue exit 0 en `3510cac`; build de `cbf36d2` queda pendiente del controlador. Detalle y comandos exactos: `.superpowers/sdd/2026-10-20-business-master-sites-manual-delivery/task-5-report.md`.

## Corrección final de flujo montado — revisión integral

Commit frontend `f4ca0d1` sobre `codex/CDX-20261023-001-master-sites-business-integration`. Se cerró el único P2 de `final-review-report.md`: un recibo aceptado no bloquea para siempre otra operación explícita si un GET iniciado después del recibo confirma que el servidor vuelve a permitirla. El botón por fila archiva el recibo anterior; no selecciona ni confirma automáticamente. Preparación TARGET_PENDING, publicación tras job FAILED/CANCELLED y actualización posterior de CURRENT requieren nueva selección, confirmación, revisión vigente y requestId nuevo; CURRENT mantiene consentimiento individual. Un sibling exitoso permanece bloqueado y una respuesta incierta conserva el cuerpo original para reintento exacto.

TDD: tres regresiones de modelo y un caso de navegador fallaron antes de la corrección por el bloqueo esperado. Verificación final: API/model 23/23 pasan; ESLint enfocado exit 0; navegador Chrome local con HTTP falso cubre esos caminos, aislamiento del sibling y reintento incierto, exit 0; `git diff --check` exit 0. Node 24.16.0 conserva warnings conocidos de loader/tipo de paquete. Sin capturas nuevas ni escrituras reales. Build Next de este commit: **pendiente del controlador**; un build anterior del branch terminó bien, pero no certifica esta última fuente. Baseline global declarado por integración: 66/76 scripts, con diez fallos preexistentes; no se afirma verde global. Revisión final acotada y gates de autorización/cliente/producción siguen pendientes del controlador; no requiere otro follow-up frontend conocido.
