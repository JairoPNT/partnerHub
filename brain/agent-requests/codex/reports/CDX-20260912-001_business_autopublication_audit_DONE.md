# CDX-20260912-001 — Auditoría de autopublicación Business — DONE

## Resultado

La automatización durable existente está correctamente conectada para cambios de activación y para cambios de la fuente del sitio exacto. Su puerta de entrada es fail-closed: requiere `recordState: ACTIVE`, estado `PAID` o `CONVERTED`, entitlement comercial conocido, ownership exacto, ecosistema incluido y PublishingTarget `READY`.

Una cortesía no publica ni encola nada. `complimentaryEcosystemGrantService.create` solo persiste la cortesía y amplía el entitlement. La publicación automática solo puede ocurrir después de que un operador cambie el lead a `CONVERTED`; desde entonces se aplica la misma validación que a `PAID`.

Se detectó una brecha delimitada: al generar o editar una fuente de **Producto**, las rutas llaman `afterSourceChange(result.siteId)` solo para Producto. La correlación del póster Business existe y es correcta cuando se genera Negocio, pero no existe un puente que regenere la fuente Business asociada ni la encole tras cambiar el hero de Producto. Por eso un Business ya publicado puede conservar el póster anterior/genérico hasta que se regenere explícitamente Business.

## Evidencia

- `activation-leads/[id]/route.ts` llama `afterActivationChange` después de cambio de estado, vinculación de sitio o actualización del lead.
- `product-pages/generate/route.ts` y `product-pages/[siteId]/route.ts` llaman `afterSourceChange` para el `siteId` resultante.
- `publicationEventEnqueueService.ts` restringe la automatización a `ACTIVE` + `PAID`/`CONVERTED`, verifica entitlement/owner/target y encola mediante `publicationJobService`; los fallos inesperados devuelven `FAILED_SAFE` sin exponer detalles.
- `complimentaryEcosystemGrantService.ts` no importa ni llama el servicio de cola.
- `productPageGenerationService.ts` aplica el hero de Producto a `vsl.thumbnailUrl` únicamente al generar un Business de partner, mediante `businessProductHeroCorrelationService` y `applyBusinessVslPoster`.
- `businessProductHeroCorrelationService.ts` resuelve el Producto por `ownerKey` inmutable, pero no ofrece un disparador inverso desde Producto hacia Business.

## Verificación

- Las pruebas de correlación/póster ejecutables en el worktree aislado aprobaron: **9/9**.
- La prueba de `publicationEventEnqueueService` no pudo iniciarse en este worktree porque no contiene dependencias instaladas (`zod` no está disponible); no se instaló nada ni se alteró el entorno. La cobertura existente fue revisada estáticamente: cubre PAID, no aprobado, aislamiento por owner, idempotencia, artefacto ausente y fallos seguros; falta un caso positivo explícito para `CONVERTED`.

## Riesgos y follow-up requerido

Crear un ticket backend separado para la propagación controlada **Producto hero → regeneración Business asociada → evento de fuente Business**, con pruebas de `CONVERTED`, de cortesía sin publicación y de aislamiento por `ownerKey`. Debe evitar republicación si el artefacto derivado no cambió y no debe tocar proveedores ni el frontend.

## Cambios

- Solo documentación de request y reporte.
- Sin mutaciones de código, datos, publicación, DNS, SFTP ni proveedores.
