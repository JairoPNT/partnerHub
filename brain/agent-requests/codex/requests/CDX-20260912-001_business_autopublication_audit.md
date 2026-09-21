# CDX-20260912-001 — Auditoría de autopublicación Business

- **Owner:** Codex
- **Scope:** Trazar, sin mutaciones, los disparadores existentes de publicación para cambios de activación, `PAID`/`CONVERTED`, cortesías y cambios de fuente; determinar si el hero de Producto se propaga a la fuente y publicación de Negocio.
- **Allowed files/modules:** lectura de `app/web/app/api/internal/activation-leads/[id]/route.ts`, `app/web/app/api/internal/product-pages/**`, `app/web/server/services/publicationEventEnqueueService.ts`, `complimentaryEcosystemGrantService.ts`, `productPageGenerationService.ts`, correlación Business/Product y sus pruebas; documentación de este ticket.
- **Excluded files/modules:** cualquier ruta frontend, plantillas, credenciales, SFTP, DNS, Hostinger, Cloudflare, publicaciones, datos persistidos y configuración de despliegue.
- **Dependencies:** CDX-20260902-006, CDX-20260911-002 y la validación desplegada de PR #201.
- **Parallel-safe with:** tareas que no modifiquen los módulos permitidos ni esta documentación.
- **Integration notes:** El resultado debe proponer tickets separados para cualquier corrección; esta auditoría no cambia comportamiento ni encola trabajos.

## Preguntas verificables

1. ¿El cambio de estado de un lead elegible dispara la cola durable con aislamiento por owner y entitlement?
2. ¿Una cortesía por sí sola evita publicación, y `CONVERTED` sigue la misma puerta que `PAID`?
3. ¿Un cambio del hero de Producto actualiza y publica el Business asociado con el póster derivado?
