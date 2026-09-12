# CDX-20260912-002 — Propagación de hero Producto a Business

- **Owner:** Codex
- **Scope:** Al guardar un Producto de partner, recalcular el póster VSL del Business del mismo `ownerKey`. Si el valor derivado cambió, regenerar el paquete local Business y solicitar su encolado mediante la cola durable existente.
- **Allowed files/modules:** rutas internas de generación/actualización de Product Pages, servicios backend de correlación/propagación y sus pruebas, documentación de este ticket.
- **Excluded files/modules:** frontend, plantillas visuales, DNS, SFTP, Cloudflare, Hostinger, credenciales, migraciones, configuración de despliegue y publicación directa.
- **Dependencies:** CDX-20260818-007, CDX-20260902-006 y CDX-20260912-001.
- **Parallel-safe with:** tickets que no modifiquen las rutas `product-pages` ni los servicios de generación/correlación Business/Product.
- **Integration notes:** La propagación debe ser exacta por `ownerKey`, no generar trabajos cuando el póster ya coincide y delegar cualquier publicación a `publicationEventEnqueueService`.

## Criterios

1. No se lee ni modifica un Business de otro propietario.
2. No se regenera el Business cuando el hero derivado no cambió.
3. La cortesía no es un evento de publicación; la cola existente sigue validando `ACTIVE` + `PAID`/`CONVERTED` y entitlement.
4. Un fallo en el derivado no invalida el guardado del Producto ni expone el error interno.
